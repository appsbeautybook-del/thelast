import './config/env.js';
import {runOne} from './services/outbox.js';
import {commerce} from './services/commerce.js';
import {imageJobs} from './services/image-jobs.js';
import {getPool} from './config/pg.js';
let stopping=false;
process.on('SIGINT',()=>{stopping=true;});
process.on('SIGTERM',()=>{stopping=true;});
async function loop(name,task){
 while(!stopping){
  try{if(!await task())await new Promise(resolve=>setTimeout(resolve,5000));}
  catch(error){console.error(JSON.stringify({event:'worker_error',worker:name,code:error.code||'WORKER_FAILED'}));await new Promise(resolve=>setTimeout(resolve,10000));}
 }
}
// Independent workers keep provider outages and long image generations from
// holding up notifications, refunds or stock reconciliation.
await Promise.all([loop('notifications',runOne),loop('commerce',commerce.reconcileOne),loop('images',imageJobs.runOne)]);
if(process.env.DATABASE_URL)await getPool().end();
