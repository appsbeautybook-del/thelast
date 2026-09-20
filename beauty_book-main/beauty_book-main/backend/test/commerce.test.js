import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {databaseFixture,users} from './database-fixture.js';
import {createCommerceService,normalizeItems,validateShipping} from '../src/services/commerce.js';
import {createSellerService} from '../src/services/seller.js';
import {createSellerPayments} from '../src/services/seller-payments.js';
import {createOutboxWorker} from '../src/services/outbox.js';
const shipping={firstName:'Test',lastName:'Client',address1:'Adresse de test',city:'Paris',zip:'75001',country:'FR'};
test('commerce validates quantities and shipping; ignores client-provided prices',()=>{
 const id=randomUUID();
 assert.deepEqual(normalizeItems([{product_id:id,quantity:2,price:0},{product_id:id,quantity:1}]),[{product_id:id,quantity:3}]);
 for(const quantity of [0,-1,1.5,1001,NaN,'2'])assert.throws(()=>normalizeItems([{product_id:id,quantity}]));
 assert.throws(()=>validateShipping({...shipping,country:'anything'}));
 assert.throws(()=>validateShipping({...shipping,address1:''}));
});
test('commerce database flow connects checkout, seller fulfillment, refunds and inventory without trusting redirects',async t=>{
 const db=await databaseFixture();
 try{
  const sessions=new Map(),calls={transfers:[],reversals:[],refunds:[],checkout:[]};let timeoutOnce=false;
  const stripe={
   accounts:{retrieve:async()=>({capabilities:{transfers:'active'},payouts_enabled:true})},
   checkout:{sessions:{
    create:async(params,options)=>{calls.checkout.push({params,options});let s=sessions.get(options.idempotencyKey);if(!s){s={id:'cs_'+randomUUID(),url:'https://checkout.stripe.com/test',status:'open',payment_status:'unpaid',currency:'eur',amount_total:params.line_items[0].price_data.unit_amount,client_reference_id:params.client_reference_id,metadata:params.metadata,payment_intent:'pi_test'};sessions.set(options.idempotencyKey,s);}if(timeoutOnce){timeoutOnce=false;throw new Error('Simulated provider network timeout');}return s;},
    retrieve:async id=>[...sessions.values()].find(s=>s.id===id),
    list:async()=>({data:[...sessions.values()],has_more:false}),
    expire:async id=>{const s=[...sessions.values()].find(s=>s.id===id);s.status='expired';return s;},
   }},
   paymentIntents:{retrieve:async()=>({latest_charge:'ch_test'})},
   transfers:{create:async(p,o)=>{calls.transfers.push({p,o});return {id:'tr_'+calls.transfers.length};},createReversal:async(id,p,o)=>{calls.reversals.push({id,o});return {id:'rev_test'};}},
   refunds:{create:async(p,o)=>{calls.refunds.push({p,o});return {id:'re_test',status:'succeeded'};}},
  };
  const service=createCommerceService(db,{getStripe:()=>stripe,getAppUrl:()=> 'https://app.test.invalid',getCommission:()=>500});
  const sellers=createSellerService(db),settings=createSellerPayments(db,{getStripe:()=>stripe});
  const worker=createOutboxWorker(db,{commerceEvent:service.deliverEvent});
  const pids=[];
  for(const [user,name] of [[users.professional,'Salon test'],[users.other,'Boutique test']]){
   await sellers.applySeller(user,{shop_name:name});
   await db.query("UPDATE bb_seller_accounts SET status='active',stripe_account_id=$1 WHERE user_id=$2",['acct_'+user.id,user.id]);
   await settings.shipping(user,{shipping_countries:['FR'],shipping_fee_cents:300,free_shipping_from_cents:5000});
   const p=await sellers.saveProduct(user,{name:'Produit test',price:12.5,description:'Fixture',images:[],min_qty:1,status:'actif'});
   await sellers.adjustInventory(user,p.id,{quantity:10,reason:'Stock de test'},randomUUID());pids.push(p.id);
  }
  const input={items:pids.map(product_id=>({product_id,quantity:2,price:0})),shipping_address:shipping,expected_total_cents:5600};
  const stock=async id=>(await db.query('SELECT stock FROM "Produit" WHERE id=$1',[id])).rows[0].stock;
  const event=(result,type='checkout.session.completed')=>{
   const s=sessions.get('commerce-'+result.order_id);
   return {id:'evt_'+randomUUID(),type,data:{object:{...s,...(type==='checkout.session.completed'?{payment_status:'paid',status:'complete'}:{})}}};
  };
  let result;
  await t.test('server recalculates shipping, rejects price tampering, preserves stock on failure',async()=>{
   const quote=await service.getQuote({...input,country:'FR'});
   assert.equal(quote.total_cents,5600);assert.equal(quote.shipments.length,2);
   assert.equal(quote.shipments[0].stripe_account_id,undefined);
   await assert.rejects(service.checkout(users.client,{...input,expected_total_cents:1},randomUUID()),{code:'PRICE_CHANGED'});
   await assert.rejects(service.getQuote({...input,country:'CA'}),{code:'SHIPPING_UNAVAILABLE'});
   assert.equal(await stock(pids[0]),10);
  });
  await t.test('network retry uses one order, one stock reservation and same provider idempotency key',async()=>{
   const key=randomUUID();timeoutOnce=true;
   await assert.rejects(service.checkout(users.client,input,key),/network timeout/);
   result=await service.checkout(users.client,input,key);
   assert.equal(await stock(pids[0]),8);
   assert.equal(calls.checkout.at(-1).options.idempotencyKey,calls.checkout.at(-2).options.idempotencyKey);
   assert.equal((await db.query('SELECT count(*)::int AS n FROM "Commande"')).rows[0].n,1);
   assert.equal((await service.orderDetail(users.client,result.order_id)).order.payment_status,'non_paye');
   await assert.rejects(service.checkout(users.client,{...input,shipping_address:{...shipping,city:'Lyon'}},key),{code:'IDEMPOTENCY_CONFLICT'});
   await assert.rejects(service.orderDetail(users.other,result.order_id),{code:'ORDER_NOT_FOUND'});
  });
  await t.test('verified payment checks amount, confirms both sellers once, creates exact transfers',async()=>{
   const bad=event(result);bad.data.object.amount_total=1;
   await assert.rejects(service.handleEvent(bad),{code:'PAYMENT_MISMATCH'});
   assert.equal((await service.orderDetail(users.client,result.order_id)).order.payment_status,'non_paye');
   const paid=event(result);await service.handleEvent(paid);assert.equal((await service.handleEvent(paid)).duplicate,true);
   await worker.runOne();
   assert.equal(calls.transfers.length,2);
   assert.equal(calls.transfers[0].p.amount,2675);
   assert.equal((await service.orderDetail(users.client,result.order_id)).order.payment_status,'paye');
   const overview=await sellers.sellerOverview(users.professional);
   assert.equal(overview.orders.length,1);assert.equal(overview.orders[0].shipping_address.city,'Paris');
   await sellers.fulfillOrder(users.professional,overview.orders[0].id,{status:'preparing'});
   assert.equal((await service.orderDetail(users.client,result.order_id)).order.status,'en_preparation');
  });
  await t.test('refund request blocks fulfillment; worker reverses transfers and restocks only once',async()=>{
   await assert.rejects(service.requestRefund(users.other,result.order_id),{code:'ORDER_NOT_FOUND'});
   await service.requestRefund(users.client,result.order_id);
   const line=(await sellers.sellerOverview(users.professional)).orders[0];
   await assert.rejects(sellers.fulfillOrder(users.professional,line.id,{status:'shipped',tracking_number:'123',carrier:'Test'}),{code:'ORDER_NOT_PAID'});
   while(await worker.runOne()){}
   assert.equal(calls.reversals.length,2);assert.equal(calls.refunds.length,1);
   assert.equal(await stock(pids[0]),10);
   assert.equal((await service.requestRefund(users.client,result.order_id)).status,'refunded');
   assert.equal(await stock(pids[0]),10);
  });
  await t.test('expiry releases stock once and late payment is refunded without restoring twice',async()=>{
   const second=await service.checkout(users.client,input,randomUUID());
   await service.handleEvent(event(second,'checkout.session.expired'));
   await service.handleEvent(event(second,'checkout.session.expired'));
   assert.equal(await stock(pids[0]),10);
   await service.handleEvent(event(second));while(await worker.runOne()){}
   assert.equal(await stock(pids[0]),10);
   assert.equal((await service.orderDetail(users.client,second.order_id)).payment_status,'refunded');
  });
  await t.test('reconciliation finds timed-out provider sessions before releasing stock',async()=>{
   timeoutOnce=true;await assert.rejects(service.checkout(users.client,input,randomUUID()));
   assert.equal(await stock(pids[0]),8);
   await db.query("UPDATE bb_order_payments SET expires_at=now()-interval '1 minute' WHERE status='creating'");
   assert.equal(await service.reconcileOne(),true);
   assert.equal(await stock(pids[0]),10);
  });
  await t.test('cart isolates users and surfaces unavailable stock without fabricated fallback',async()=>{
   const r=await service.cart(users.client,{action:'add',item:{product_id:pids[0],quantity:2,price:0}});
   assert.equal(r.panier.items[0].price,12.5);
   assert.equal((await service.cart(users.other)).panier.items.length,0);
   await assert.rejects(service.cart(users.client,{action:'add',item:{product_id:pids[0],quantity:20}}),{code:'PRODUCT_UNAVAILABLE'});
   assert.equal((await service.cart(users.client)).panier.items[0].quantity,2);
  });
 }finally{await db.close();}
});
