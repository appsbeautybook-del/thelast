export function backendProxy(endpoint){
 return async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const base=process.env.BEAUTYBOOK_BACKEND_URL;
  let upstream;
  try{upstream=new URL(base);}catch{}
  if(!upstream||upstream.protocol!=='https:'||upstream.username||upstream.password)return res.status(503).json({error:'Le service backend doit être configuré.',code:'BACKEND_NOT_CONFIGURED'});
  if(!['GET','POST','PUT','DELETE','PATCH','OPTIONS'].includes(req.method))return res.status(405).json({error:'Méthode non autorisée.'});
  try{
   const requested=new URL(req.url,'https://beautybook.invalid');
   const path=endpoint||requested.pathname;
   if(!/^\/api\/[a-z0-9/_-]+$/i.test(path))return res.status(400).json({error:'Chemin API invalide.'});
   const target=upstream.origin+upstream.pathname.replace(/\/+$/,'').replace(/\/api$/,'')+path+requested.search;
   let body;
   if(!['GET','OPTIONS'].includes(req.method)){
    if(Buffer.isBuffer(req.body))body=req.body;
    else if(req.body!==undefined)body=typeof req.body==='string'?req.body:JSON.stringify(req.body);
    else{
     const chunks=[];let size=0;
     for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>12*1024*1024)return res.status(413).json({error:'Requête trop volumineuse.'});chunks.push(bytes);}
     body=Buffer.concat(chunks);
    }
   }
   const headers={};
   if(body!==undefined&&Buffer.byteLength(body)>12*1024*1024)return res.status(413).json({error:'Requête trop volumineuse.'});
   for(const name of ['content-type','authorization','idempotency-key','stripe-signature','x-hub-signature-256','x-twilio-signature','origin'])if(typeof req.headers[name]==='string')headers[name]=req.headers[name];
   const response=await fetch(target,{method:req.method,headers,body,signal:AbortSignal.timeout(55000),redirect:'error'});
   for(const name of ['content-type','x-request-id','retry-after','access-control-allow-origin','access-control-allow-methods','access-control-allow-headers','vary']){const value=response.headers.get(name);if(value)res.setHeader(name,value);}
   return res.status(response.status).send(Buffer.from(await response.arrayBuffer()));
  }catch{return res.status(502).json({error:'Impossible de joindre le backend.',code:'BACKEND_UNAVAILABLE'});}
 };
}
