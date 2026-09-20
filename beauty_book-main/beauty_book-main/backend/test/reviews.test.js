import test from 'node:test';
import assert from 'node:assert/strict';
import {databaseFixture,users} from './database-fixture.js';

test('reviews require a real appointment, protect identity and update ratings on the server',async t=>{
 const db=await databaseFixture();
 try{
  await db.query('UPDATE profiles SET full_name=$1 WHERE id=$2',['Cliente test',users.client.id]);
  const {rows:[pro]}=await db.query('INSERT INTO "ProfilPro"(user_email,salon_name,status) VALUES($1,$2,$3) RETURNING *',[users.professional.email,'Salon test','actif']);
  const {rows:[service]}=await db.query('INSERT INTO "Service"(pro_email,name,status) VALUES($1,$2,$3) RETURNING *',[users.professional.email,'Coupe test','actif']);
  const {rows:[booking]}=await db.query('INSERT INTO "Reservation"(service_id,client_id,client_email,pro_email,pro_name,service_name,status,date,time_slot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[service.id,users.client.id,users.client.email,users.professional.email,'Salon test','Coupe test','confirme','2026-09-01','10:00']);
  const insert=(changes={})=>db.query('INSERT INTO "Avis"(reservation_id,type,cible_email,note,commentaire,auteur_nom) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[booking.id,changes.type===undefined?'client_to_pro':changes.type,changes.target===undefined?users.professional.email:changes.target,changes.note??5,'Très bon accueil','Impersonated name']);
  let review;
  await t.test('pending appointment, wrong participant, missing target and invalid score cannot create an opinion',async()=>{
   await db.as(users.client); await assert.rejects(insert(),{code:'42501'});
   await db.privileged();await db.query('UPDATE "Reservation" SET status=$1 WHERE id=$2',['termine',booking.id]);
   await db.as(users.other);await assert.rejects(insert(),{code:'42501'});
   await db.as(users.client);await assert.rejects(insert({target:users.other.email}),{code:'42501'});
   await assert.rejects(insert({target:null}),{code:'42501'});await assert.rejects(insert({type:null}),{code:'42501'});
   await assert.rejects(insert({note:0}),{code:'23514'});
  });
  await t.test('author identity comes from the session; duplicate reviews are rejected',async()=>{
   review=(await insert()).rows[0];
   assert.equal(review.auteur_nom,'Cliente test');assert.equal(review.created_by_id,users.client.id);
   assert.equal(review.service_nom,'Coupe test');assert.equal(review.auteur_email,users.client.email);
   await assert.rejects(insert(),{code:'23505'});
   assert.equal(Number((await db.query('SELECT rating FROM "ProfilPro" WHERE id=$1',[pro.id])).rows[0].rating),5);
   assert.equal(Number((await db.query('SELECT rating FROM "Service" WHERE id=$1',[service.id])).rows[0].rating),5);
  });
  await t.test('client edits content while only the reviewed professional can respond',async()=>{
   await db.query('UPDATE "Avis" SET note=3,commentaire=$1 WHERE id=$2',['Avis corrigé',review.id]);
   await assert.rejects(db.query('UPDATE "Avis" SET cible_email=$1 WHERE id=$2',[users.other.email,review.id]),{code:'42501'});
   await assert.rejects(db.query('UPDATE "Avis" SET reponse_pro=$1 WHERE id=$2',['Fausse réponse',review.id]),{code:'42501'});
   await db.as(users.other);assert.equal((await db.query('UPDATE "Avis" SET reponse_pro=$1 WHERE id=$2 RETURNING id',['Intrusion',review.id])).rows.length,0);
   await db.as(users.professional);
   const {rows:[reply]}=await db.query('UPDATE "Avis" SET reponse_pro=$1 WHERE id=$2 RETURNING *',['Merci pour votre retour.',review.id]);
   assert(reply.response_at);assert.equal(reply.reponse_pro,'Merci pour votre retour.');
   await assert.rejects(db.query('UPDATE "Avis" SET note=5 WHERE id=$1',[review.id]),{code:'42501'});
   assert.equal(Number((await db.query('SELECT rating FROM "ProfilPro" WHERE id=$1',[pro.id])).rows[0].rating),3);
  });
  await t.test('deleting a review removes its rating without inventing a replacement score',async()=>{
   await db.as(users.client);await db.query('DELETE FROM "Avis" WHERE id=$1',[review.id]);
   const {rows:[rating]}=await db.query('SELECT rating,reviews_count FROM "ProfilPro" WHERE id=$1',[pro.id]);
   assert.equal(rating.rating,null);assert.equal(rating.reviews_count,0);
  });
 }finally{await db.close();}
});

test('client cannot publish live credentials or change viewer counters',async()=>{
 const db=await databaseFixture();
 try{
  await db.as(users.professional);
  await assert.rejects(db.query('INSERT INTO "LiveSession"(host_email,title,status,mux_stream_key) VALUES($1,$2,$3,$4)',[users.professional.email,'Test','live','test-secret']),{code:'42501'});
  const {rows:[live]}=await db.query('INSERT INTO "LiveSession"(host_email,title,status,viewers_count) VALUES($1,$2,$3,999) RETURNING *',[users.professional.email,'Test','live']);
  assert.equal(live.viewers_count,0);
  await assert.rejects(db.query('UPDATE "LiveSession" SET viewers_count=100 WHERE id=$1',[live.id]),{code:'42501'});
  await assert.rejects(db.query('SELECT * FROM bb_live_credentials'),{code:'42501'});
 }finally{await db.close();}
});
