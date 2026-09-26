const CACHE_NAME='beautybook-static-v12';
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
  // Cache-first pour les assets versionnés. Si le fichier est introuvable
  // (ex. 404 pendant la propagation d'un déploiement, ou 404 mise en cache
  // par un proxy), on retente avec un paramètre anti-cache unique : l'URL
  // différente contourne tous les caches intermédiaires. En cas de succès,
  // la réponse est servie et mise en cache sous la clé d'origine.
  event.respondWith((async()=>{
    const cached=await caches.match(request);
    if(cached) return cached;
    let response=null;
    try{ response=await fetch(request); }catch(e){ response=null; }
    if(!response||!response.ok){
      try{
        const bust=new URL(request.url);
        bust.searchParams.set('swb',Date.now().toString(36));
        const retry=await fetch(bust.toString(),{cache:'reload'});
        if(retry&&retry.ok) response=retry;
      }catch(e){}
    }
    if(response&&response.ok){
      const copy=response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)).catch(()=>{}));
      return response;
    }
    return response||new Response('Ressource indisponible.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
  })());
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
