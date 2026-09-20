import test from 'node:test';
import assert from 'node:assert/strict';
import {requestImageJob} from '../../src/lib/imageJobsClient.js';
test('image client polls actual job states and submits the request only once',async()=>{
 const calls=[],states=['queued','processing','completed'];
 const result=await requestImageJob(async(path,options)=>{calls.push({path,options});const status=states.shift();return {id:'test-job',status,...(status==='completed'?{result_url:'https://test.invalid/output.png'}:{})};},{mode:'article'},{idempotencyKey:'one-logical-request',wait:async()=>{}});
 assert.equal(result.status,'completed');assert.equal(calls.filter(c=>c.options.method==='POST').length,1);
 assert.equal(calls[0].options.headers['Idempotency-Key'],'one-logical-request');assert.equal(calls[2].path,'/api/image-jobs/test-job');
});
test('closing tracking aborts polling without claiming to cancel an already submitted provider request',async()=>{
 const controller=new AbortController();let calls=0;
 await assert.rejects(requestImageJob(async()=>{calls++;return {id:'job',status:'processing'};},{},{signal:controller.signal,wait:async()=>controller.abort()}),{name:'AbortError'});
 assert.equal(calls,1);
});
test('failed or missing image results cannot become successful output',async()=>{
 for(const status of ['failed','uncertain','completed'])await assert.rejects(requestImageJob(async()=>({id:'job',status}),{},{wait:async()=>{}}));
});
