import test from 'node:test';
import assert from 'node:assert/strict';
import {databaseFixture,users} from './database-fixture.js';
import {createOutboxWorker} from '../src/services/outbox.js';
test('outbox delivers once and records retryable failures without reporting success',async()=>{
 const db=await databaseFixture();
 try{
  const {rows:[booking]}=await db.query('INSERT INTO "Reservation"(client_email,pro_email,service_name,date,time_slot) VALUES($1,$2,$3,$4,$5) RETURNING *',[users.client.email,users.professional.email,'Fixture','2099-01-01','10:00']);
  await db.query('INSERT INTO bb_outbox(topic,aggregate_id,payload) VALUES($1,$2,$3)',['booking.created',booking.id,JSON.stringify({reservation_id:booking.id})]);
  const worker=createOutboxWorker(db);
  assert.equal(await worker.runOne(),true);
  assert.equal(await worker.runOne(),false);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM "Notification"')).rows[0].n,2);
  await db.query("UPDATE bb_outbox SET status='pending'");
  await worker.runOne();
  assert.equal((await db.query('SELECT count(*)::int AS n FROM "Notification"')).rows[0].n,2);
  await db.query('INSERT INTO bb_outbox(topic,payload) VALUES($1,$2)',['unrecognized.event','{}']);
  await worker.runOne();
  const {rows:[failed]}=await db.query("SELECT * FROM bb_outbox WHERE topic='unrecognized.event'");
  assert.equal(failed.status,'failed');assert.equal(failed.last_error_code,'OUTBOX_TOPIC_UNSUPPORTED');
  assert.equal(failed.delivered_at,null);
 }finally{await db.close();}
});
