import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../../public/sw.js',import.meta.url),'utf8');
function worker(host='app.test.invalid'){
 const events={},origin='https://'+host;
 vm.runInNewContext(source,{URL,Response,Promise,self:{location:{hostname:host,origin},addEventListener:(name,fn)=>events[name]=fn},caches:{match:async()=>new Response('static fixture')},fetch:async()=>new Response('network fixture')});
 return {events,origin};
}
test('offline worker never caches APIs, signed private images or authenticated responses',()=>{
 const {events,origin}=worker();
 for(const [url,headers] of [[origin+'/api/cart',{}],['https://project.supabase.co/storage/v1/object/sign/private-images/a?token=private',{}],[origin+'/assets/app-aabbccdd.js',{authorization:'Bearer fixture'}]]){
  let intercepted=false;events.fetch({request:new Request(url,{headers}),respondWith:()=>{intercepted=true;}});assert.equal(intercepted,false);
 }
});
test('development modules always reach the running server',()=>{
 const {events,origin}=worker('localhost');
 for(const path of ['/src/main.jsx','/node_modules/.vite/deps/react.js?v=new','/assets/app-aabbccdd.js']){
  let intercepted=false;events.fetch({request:new Request(origin+path),respondWith:()=>{intercepted=true;}});assert.equal(intercepted,false);
 }
});
test('only immutable same-origin production assets use the static cache',async()=>{
 const {events,origin}=worker();let result;
 events.fetch({request:new Request(origin+'/assets/app-aabbccdd.js'),respondWith:p=>{result=p;}});
 assert.equal(await(await result).text(),'static fixture');
});
