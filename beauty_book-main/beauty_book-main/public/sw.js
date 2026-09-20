const CACHE_NAME='beautybook-static-v11';
const development=['localhost','127.0.0.1','[::1]'].includes(self.location.hostname);
self.addEventListener('install',event=>{event.waitUntil((development?Promise.resolve():caches.open(CACHE_NAME).then(cache=>cache.add('/index.html'))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(name=>name.startsWith('beautybook-')&&(development||name!==CACHE_NAME)).map(name=>caches.delete(name)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const {request}=event,url=new URL(request.url);
 // Never cache authentication, APIs, private media, cross-origin requests or
 // development modules. They may contain account-specific data or stale React.
 if(development||request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||request.headers.has('authorization'))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put('/index.html',copy)));}return response;}).catch(async()=>await caches.match('/index.html')||new Response('Connexion indisponible.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}})));
 }else if(/^\/assets\/[\w.-]+-[\w-]{8,}\.(js|css|woff2|png|webp|jpg|svg)$/.test(url.pathname)&&!url.search){
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)));}return response;})));
 }
});
self.addEventListener('push',event=>{
 let payload={};try{payload=event.data?.json()||{};}catch{}
 let destination='/';try{const url=new URL(payload.data?.url||'/',self.location.origin);if(url.origin===self.location.origin)destination=url.pathname+url.search;}catch{}
 event.waitUntil(self.registration.showNotification(typeof payload.title==='string'?payload.title:'BeautyBook',{body:typeof payload.body==='string'?payload.body:'Vous avez une nouvelle notification',icon:'/brand-icon.svg',badge:'/brand-icon.svg',tag:typeof payload.tag==='string'?payload.tag:undefined,data:{url:destination}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();let url;try{url=new URL(event.notification.data?.url||'/',self.location.origin);}catch{return;}if(url.origin!==self.location.origin)return;
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{for(const client of windows){if(new URL(client.url).origin===self.location.origin&&'focus' in client){await client.navigate(url.href);return client.focus();}}return clients.openWindow?.(url.href);}));
});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
