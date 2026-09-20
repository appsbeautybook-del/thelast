import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import {databaseFixture,users} from './database-fixture.js';
import {createPaymentService,verifyStripeEvent} from '../src/services/payments.js';

test('Stripe signatures reject unsigned or changed bodies',()=>{
 const oldKey=process.env.STRIPE_SECRET_KEY,oldSecret=process.env.STRIPE_WEBHOOK_SECRET;
 process.env.STRIPE_SECRET_KEY='sk_test_local_fixture_only';
 process.env.STRIPE_WEBHOOK_SECRET='whsec_local_fixture_only';
 try{
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
  const payload=JSON.stringify({id:'evt_test',type:'checkout.session.completed'});
  const header=stripe.webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_WEBHOOK_SECRET});
  assert.equal(verifyStripeEvent(Buffer.from(payload),header).id,'evt_test');
  assert.throws(()=>verifyStripeEvent(Buffer.from(payload+' '),header),{code:'INVALID_WEBHOOK_SIGNATURE'});
  assert.throws(()=>verifyStripeEvent(Buffer.from(payload),undefined),{code:'INVALID_WEBHOOK_SIGNATURE'});
 }finally{
  if(oldKey===undefined)delete process.env.STRIPE_SECRET_KEY;else process.env.STRIPE_SECRET_KEY=oldKey;
  if(oldSecret===undefined)delete process.env.STRIPE_WEBHOOK_SECRET;else process.env.STRIPE_WEBHOOK_SECRET=oldSecret;
 }
});

test('payment fulfillment checks owner, price and currency, is idempotent and handles cancelled appointments',async()=>{
 const db=await databaseFixture();
 try{
  const {rows:[booking]}=await db.query('INSERT INTO public."Reservation"(client_id,client_email,pro_email,service_name,date,time_slot,total_price,status,payment_status) VALUES($1,$2,$3,$4,$5,$6,42,$7,$8) RETURNING *',[users.client.id,users.client.email,users.professional.email,'Fixture appointment','2099-01-01','10:00','en_attente','non_paye']);
  let calls=0,submitted;
  const stripe={checkout:{sessions:{async create(input){calls++;submitted=input;return {id:'cs_local_fixture',url:'https://checkout.stripe.com/c/pay/local-fixture'};}}}};
  const payments=createPaymentService(db,()=>stripe,()=> 'https://beautybook.example.invalid');
  await assert.rejects(payments.bookingCheckout(users.other,booking.id),{code:'BOOKING_NOT_FOUND'});
  const checkout=await payments.bookingCheckout(users.client,booking.id);
  assert.equal(submitted.line_items[0].price_data.unit_amount,4200);
  assert.equal(new URL(submitted.success_url).pathname,'/rendez-vous');
  assert.equal(new URL(submitted.cancel_url).pathname,'/rendez-vous');
  assert.equal((await payments.bookingCheckout(users.client,booking.id)).session_id,checkout.session_id);
  assert.equal(calls,1);
  const session={id:checkout.session_id,payment_status:'paid',currency:'eur',amount_total:4200,metadata:{reservation_id:booking.id},client_reference_id:users.client.id,payment_intent:'pi_fixture'};
  const event={id:'evt_paid_fixture',type:'checkout.session.completed',data:{object:session}};
  await assert.rejects(payments.handleEvent({...event,data:{object:{...session,amount_total:1}}}),{code:'PAYMENT_MISMATCH'});
  await assert.rejects(payments.handleEvent({...event,data:{object:{...session,currency:'usd'}}}),{code:'PAYMENT_MISMATCH'});
  assert.equal((await db.query('SELECT payment_status FROM "Reservation" WHERE id=$1',[booking.id])).rows[0].payment_status,'non_paye');
  await payments.handleEvent(event);
  await payments.handleEvent(event);
  await payments.handleEvent({...event,id:'evt_other_delivery'});
  assert.equal((await db.query('SELECT payment_status FROM "Reservation" WHERE id=$1',[booking.id])).rows[0].payment_status,'paye');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM bb_outbox')).rows[0].n,1);
  await payments.handleEvent({...event,id:'evt_late_expiry',type:'checkout.session.expired'});
  assert.equal((await db.query('SELECT status FROM "Reservation" WHERE id=$1',[booking.id])).rows[0].status,'en_attente');
  await assert.rejects(payments.bookingCheckout(users.client,booking.id),{code:'ALREADY_PAID'});
  await db.query("UPDATE bb_payment_sessions SET status='open' WHERE reservation_id=$1",[booking.id]);
  await db.query('UPDATE "Reservation" SET status=$1,payment_status=$2 WHERE id=$3',['annule','non_paye',booking.id]);
  await payments.handleEvent({...event,id:'evt_payment_after_cancel'});
  assert.equal((await db.query('SELECT status FROM bb_payment_sessions WHERE reservation_id=$1',[booking.id])).rows[0].status,'refund_required');
  assert.equal((await db.query('SELECT status,payment_status FROM "Reservation" WHERE id=$1',[booking.id])).rows[0].status,'annule');
 }finally{await db.close();}
});
