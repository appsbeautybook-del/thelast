import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {backendProxy as root} from '../../../../api/_lib/backend-proxy.js';
import {backendProxy as nested} from '../../api/_lib/backend-proxy.js';
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(b){this.body=b;return this;},send(b){this.body=b;return this;}};}
for(const [name,proxy] of [['root',root],['nested',nested]])test(name+' proxy preserves query, signed bytes and response failure status',async()=>{
 const oldFetch=globalThis.fetch,oldBase=process.env.BEAUTYBOOK_BACKEND_URL;
 try{
  process.env.BEAUTYBOOK_BACKEND_URL='https://backend.test.invalid/api';
  const bytes=Buffer.from('{"spacing":   "must stay"}\n');
  let requests=0;
  globalThis.fetch=async(url,options)=>{requests++;assert.equal(url,'https://backend.test.invalid/api/webhooks/stripe?test=1');assert.deepEqual(options.body,bytes);assert.equal(options.headers['stripe-signature'],'signature');assert.equal(options.redirect,'error');return new Response('upstream error',{status:409,headers:{'x-request-id':'request-test'}});};
  const req=Readable.from([bytes.subarray(0,5),bytes.subarray(5)]);Object.assign(req,{url:'/api/webhooks/stripe?test=1',method:'POST',headers:{'content-type':'application/json','stripe-signature':'signature'}});
  const res=response();await proxy()(req,res);assert.equal(res.statusCode,409);assert.equal(res.headers['x-request-id'],'request-test');assert.equal(requests,1);
  for(const bad of [{url:'/api/../private'},{body:Buffer.alloc(12*1024*1024+1)}]){const denied=response();await proxy()({...req,url:'/api/test',...bad},denied);assert([400,413].includes(denied.statusCode));}
  assert.equal(requests,1);
  process.env.BEAUTYBOOK_BACKEND_URL='http://insecure.test.invalid';const denied=response();await proxy()(req,denied);assert.equal(denied.statusCode,503);
 }finally{globalThis.fetch=oldFetch;if(oldBase===undefined)delete process.env.BEAUTYBOOK_BACKEND_URL;else process.env.BEAUTYBOOK_BACKEND_URL=oldBase;}
});
