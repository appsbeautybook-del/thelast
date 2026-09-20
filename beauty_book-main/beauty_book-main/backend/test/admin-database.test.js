import test from 'node:test';
import assert from 'node:assert/strict';
import {databaseFixture,users} from './database-fixture.js';
import {createAdminOperations} from '../src/services/admin-operations.js';
test('administrative access changes are audited and cannot revoke the last owner',async()=>{
 const db=await databaseFixture();
 try{
  const admin=createAdminOperations(db);
  await db.query("INSERT INTO bb_admin_memberships(user_id,role,permissions) VALUES($1,'owner','{*}')",[users.admin.id]);
  await assert.rejects(admin.updateMembership(users.admin,users.admin.id,{role:'support',active:false},'self'),{code:'SELF_ACCESS_CHANGE'});
  await assert.rejects(admin.updateMembership(users.other,users.admin.id,{role:'support',active:false},'last'),{code:'LAST_OWNER'});
  const membership=await admin.updateMembership(users.admin,users.professional.id,{role:'moderator',active:true},'grant');
  assert(membership.permissions.includes('content:write'));
  assert(!membership.permissions.includes('*'));
  await assert.rejects(admin.updateMembership(users.admin,users.other.id,{role:'invented',active:true},'bad'),{code:'INVALID_MEMBERSHIP'});
  await admin.updateMembership(users.admin,users.professional.id,{role:'moderator',active:false},'revoke');
  assert.equal((await db.query('SELECT active FROM bb_admin_memberships WHERE user_id=$1',[users.professional.id])).rows[0].active,false);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM bb_audit_log')).rows[0].n,2);
 }finally{await db.close();}
});
