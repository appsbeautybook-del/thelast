import test from 'node:test';
import assert from 'node:assert/strict';
import {databaseFixture} from './database-fixture.js';
import {createSellerService,validateProduct} from '../src/services/seller.js';

const one={id:'00000000-0000-0000-0000-000000000001',email:'one@test.invalid'};
const two={id:'00000000-0000-0000-0000-000000000002',email:'two@test.invalid'};
const product={name:'Test product',description:'Test fixture',price:12.50,old_price:null,category:'Test',brand:'Test',images:[],status:'actif',min_qty:1};

test('seller product rules reject malformed money, quantities and unsafe images',()=>{
  assert.equal(validateProduct(product).price,12.5);
  for(const invalid of [{price:NaN},{price:12.001},{old_price:'NaN'},{old_price:2},{min_qty:0},{min_qty:1.2},{images:['javascript:alert(1)']},{seller_user_id:two.id}])assert.throws(()=>validateProduct({...product,...invalid}));
});

test('seller database flow isolates stores, traces stock, prevents retry duplicates, and checks shipment transitions',async()=>{
 const fixture=await databaseFixture();const pg=fixture.pg;
 try{
  const service=createSellerService({query:(sql,p)=>pg.query(sql,p),transaction:work=>pg.transaction(tx=>work(tx))});
  const request=await service.applySeller(one,{shop_name:'Boutique test'});
  assert.equal(request.status,'pending');
  await assert.rejects(service.saveProduct(one,product),{code:'SELLER_APPROVAL_REQUIRED'});
  await pg.query('UPDATE bb_seller_accounts SET status=$1 WHERE user_id=$2',['active',one.id]);
  await service.applySeller(two,{shop_name:'Second store'});
  await pg.query('UPDATE bb_seller_accounts SET status=$1 WHERE user_id=$2',['active',two.id]);
  const p=await service.saveProduct(one,product);
  assert.equal(p.stock,0);
  await assert.rejects(service.saveProduct(two,{...product,name:'Attack'},p.id),{code:'PRODUCT_NOT_FOUND'});
  assert.equal((await service.sellerOverview(two)).products.length,0);
  const key='unique-stock-request-0001';
  const movement=await service.adjustInventory(one,p.id,{quantity:10,reason:'Reception fournisseur'},key);
  assert.equal(movement.stock_after,10);
  assert.equal((await service.adjustInventory(one,p.id,{quantity:10,reason:'Reception fournisseur'},key)).id,movement.id);
  assert.equal((await pg.query('SELECT stock FROM "Produit" WHERE id=$1',[p.id])).rows[0].stock,10);
  await assert.rejects(service.adjustInventory(one,p.id,{quantity:10,reason:'Changed reason'},key),{code:'IDEMPOTENCY_CONFLICT'});
  await assert.rejects(service.adjustInventory(one,p.id,{quantity:-11,reason:'Sortie'},'unique-stock-request-0002'),{code:'STOCK_UPDATE_REJECTED'});
  await assert.rejects(service.adjustInventory(two,p.id,{quantity:20,reason:'Intrusion'},'unique-stock-request-0003'),{code:'STOCK_UPDATE_REJECTED'});
  const {rows:[parent]}=await pg.query('INSERT INTO "Commande"(client_email,created_by_id) VALUES($1,$2) RETURNING id',[two.email,two.id]);
  await pg.query("INSERT INTO bb_order_payments(order_id,user_id,request_key,request_hash,amount_cents,status,expires_at) VALUES($1,$2,'fixture-payment','fixture-hash',2500,'paid',now())",[parent.id,two.id]);
  const {rows:[order]}=await pg.query("INSERT INTO bb_order_lines(order_id,seller_id,product_id,product_name,quantity,unit_price,status) VALUES($1,$2,$3,$4,2,12.5,'paid') RETURNING *",[parent.id,one.id,p.id,p.name]);
  await assert.rejects(service.fulfillOrder(two,order.id,{status:'preparing'}),{code:'ORDER_NOT_FOUND'});
  await assert.rejects(service.fulfillOrder(one,order.id,{status:'delivered'}),{code:'INVALID_TRANSITION'});
  await service.fulfillOrder(one,order.id,{status:'preparing'});
  await assert.rejects(service.fulfillOrder(one,order.id,{status:'shipped'}),{code:'TRACKING_REQUIRED'});
  await service.fulfillOrder(one,order.id,{status:'shipped',carrier:'Test carrier',tracking_number:'TEST-123'});
  await service.fulfillOrder(one,order.id,{status:'delivered'});
  const overview=await service.sellerOverview(one);
  assert.equal(Number(overview.stats.sales_total),25);
  assert.equal(overview.stats.to_prepare,0);
  assert.equal(overview.movements.length,1);
  assert.equal((await pg.query('SELECT count(*)::int AS n FROM bb_outbox')).rows[0].n,3);
  await pg.query('UPDATE bb_seller_accounts SET status=$1 WHERE user_id=$2',['suspended',one.id]);
  assert.equal((await service.applySeller(one,{shop_name:'Try reactivation'})).status,'suspended');
  await assert.rejects(service.sellerOverview(one),{code:'SELLER_APPROVAL_REQUIRED'});
 }finally{await pg.close();}
});
