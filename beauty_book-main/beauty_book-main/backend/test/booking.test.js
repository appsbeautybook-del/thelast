import test from 'node:test';
import assert from 'node:assert/strict';
import { assertBookable, serviceQuote, minutes, assertTransition } from '../src/domain/booking.js';
const now=new Date('2026-09-20T12:00:00Z');
const professional={status:'actif',user_email:'pro@test.invalid',seats_count:1,timezone:'Europe/Paris',ouverture:{lundi:{open:true,start:'09:00',end:'18:00',pause_start:'12:00',pause_end:'13:00'}}};
const service={id:'s1',status:'actif',pro_email:professional.user_email,price:50,duration_min:60,addons:[]};
const input={professional,services:[service],reservations:[],date:'2026-09-21',time:'10:00',persons:1,now};
const reject=(value,code)=>assert.throws(()=>assertBookable({...input,...value}),error=>error.code===code);
test('real service price and duration determine the quote',()=>assert.equal(assertBookable(input).total,50));
test('promotion is used only before its expiry',()=>{
  assert.equal(serviceQuote([{...service,promo_price:30,promo_ends_at:'2026-09-21'}],1,[],now).total,30);
  assert.equal(serviceQuote([{...service,promo_price:30,promo_ends_at:'2026-09-19'}],1,[],now).total,50);
});
test('rejects negative and fractional capacity claims',()=>{reject({persons:-1},'INVALID_PERSONS');reject({persons:1.5},'INVALID_PERSONS');});
test('rejects missing and removed professional',()=>{reject({professional:null},'PROFESSIONAL_UNAVAILABLE');reject({professional:{...professional,status:'pause'}},'PROFESSIONAL_UNAVAILABLE');});
test('rejects deleted/disabled service and cross-professional service',()=>{
  reject({services:[{...service,status:'pause'}]},'SERVICE_UNAVAILABLE');
  reject({services:[{...service,pro_email:'other@test.invalid'}]},'PROFESSIONAL_MISMATCH');
});
test('requires hours and covers end of appointment',()=>{reject({professional:{...professional,ouverture:{}}},'CLOSED');reject({time:'17:30'},'OUTSIDE_OPENING_HOURS');});
test('detects breaks even when appointment starts before break',()=>reject({time:'11:30'},'BREAK'));
test('rejects vacations',()=>reject({professional:{...professional,conges:[{start:'2026-09-21',end:'2026-09-25'}]}},'HOLIDAY'));
test('rejects invalid calendar dates and past local time',()=>{reject({date:'2026-02-30'},'INVALID_DATE');reject({now:new Date('2026-09-21T09:30:00Z')},'PAST_BOOKING');});
test('rejects malformed hours',()=>{assert.throws(()=>minutes('25:00'));assert.throws(()=>minutes('09:99'));});
test('rejects overlapping booking but allows exact boundary',()=>{
  const booking={status:'confirme',time_slot:'09:30',end_time_slot:'10:30',persons:1};
  reject({reservations:[booking]},'SLOT_UNAVAILABLE');
  assert.doesNotThrow(()=>assertBookable({...input,reservations:[{...booking,end_time_slot:'10:00'}]}));
});
test('does not count cancelled appointments',()=>assert.doesNotThrow(()=>assertBookable({...input,reservations:[{status:'annule',time_slot:'10:00',end_time_slot:'11:00',persons:1}]})));
test('capacity sweep handles consecutive reservations correctly',()=>assert.doesNotThrow(()=>assertBookable({...input,professional:{...professional,seats_count:2},reservations:[
  {status:'confirme',time_slot:'10:00',end_time_slot:'10:30',persons:1},
  {status:'confirme',time_slot:'10:30',end_time_slot:'11:00',persons:1},
]})));
test('cannot purchase nonexistent addons',()=>reject({addonIds:['invented']},'ADDON_UNAVAILABLE'));
test('client cannot confirm or complete an appointment',()=>assert.throws(()=>assertTransition({status:'en_attente',client_email:'client@test.invalid',pro_email:professional.user_email},{email:'client@test.invalid'},'confirme'),error=>error.code==='PROFESSIONAL_ONLY'));
test('only participants can cancel; finished status cannot replay',()=>{
  assert.throws(()=>assertTransition({status:'confirme',pro_email:professional.user_email},{email:'stranger@test.invalid'},'annule'));
  assert.throws(()=>assertTransition({status:'termine',pro_email:professional.user_email},{email:professional.user_email},'termine'));
});
