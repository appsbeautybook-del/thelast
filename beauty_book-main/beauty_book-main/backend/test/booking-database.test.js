import test from 'node:test';
import assert from 'node:assert/strict';
import {databaseFixture,users} from './database-fixture.js';
import {createBookingService} from '../src/services/booking.js';

test('booking service persists authoritative prices, prevents overlaps and validates client/pro/admin lifecycle',async()=>{
 const db=await databaseFixture();
 try{
  const hours=Object.fromEntries(['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].map(day=>[day,{open:true,start:'09:00',end:'18:00'}]));
  await db.query('INSERT INTO public."ProfilPro"(user_email,owner_id,salon_name,status,horaires,seats_count) VALUES($1,$2,$3,$4,$5,1)',[users.professional.email,users.professional.id,'Fixture salon','actif',JSON.stringify(hours)]);
  const {rows:[service]}=await db.query('INSERT INTO public."Service"(pro_email,name,price,duration_min,status) VALUES($1,$2,45,45,$3) RETURNING *',[users.professional.email,'Fixture cut','actif']);
  const booking=createBookingService(db);
  const input={service_id:service.id,date:'2099-06-10',time_slot:'10:00',persons:1,total_price:0.01,payment_status:'paye'};
  const key='fixture-booking-request-001';
  const first=await booking.createBooking(users.client,input,{idempotencyKey:key});
  assert.equal(Number(first.total_price),45);
  assert.equal(first.payment_status,'non_paye');
  assert.equal(first.duration_min,45);
  assert.equal(first.end_time_slot,'10:45');
  assert.equal(first.client_id,users.client.id);
  assert.equal((await booking.createBooking(users.client,input,{idempotencyKey:key})).id,first.id);
  await assert.rejects(booking.createBooking(users.client,{...input,time_slot:'11:00'},{idempotencyKey:key}),{code:'IDEMPOTENCY_CONFLICT'});
  await assert.rejects(booking.createBooking(users.other,input,{idempotencyKey:'fixture-booking-request-002'}),{code:'SLOT_UNAVAILABLE'});
  const slots=await booking.getAvailability(input);
  assert(!slots.slots.some(slot=>slot.time==='10:00'));
  assert(slots.slots.some(slot=>slot.time==='10:45'));
  await assert.rejects(booking.updateBooking(users.client,first.id,{status:'confirme'}),{code:'PROFESSIONAL_ONLY'});
  await assert.rejects(booking.updateBooking(users.other,first.id,{status:'annule'}),{code:'BOOKING_FORBIDDEN'});
  await booking.updateBooking(users.professional,first.id,{status:'confirme'});
  await assert.rejects(booking.updateBooking(users.professional,first.id,{payment_status:'paye'}),{code:'PAYMENT_SERVER_ONLY'});
  await booking.updateBooking(users.admin,first.id,{status:'termine'},{admin:true,requestId:'fixture-admin'});
  assert.equal((await db.query('SELECT count(*)::int AS n FROM bb_audit_log')).rows[0].n,1);
  await assert.rejects(booking.updateBooking(users.admin,first.id,{status:'termine'},{admin:true}),{code:'INVALID_TRANSITION'});
  const cancelled=await booking.createBooking(users.client,{...input,time_slot:'12:00'},{channel:'maria',idempotencyKey:'fixture-booking-request-003'});
  await booking.updateBooking(users.client,cancelled.id,{status:'annule'});
  const next=await booking.createBooking(users.other,{...input,time_slot:'12:00'},{channel:'website',idempotencyKey:'fixture-booking-request-004'});
  assert.equal(next.source,'website');
 }finally{await db.close();}
});
