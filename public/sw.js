const CACHE='roam-shell-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/')||u.pathname.includes('sign')||u.pathname==='/callback')return;
 if(event.request.mode==='navigate'&&u.pathname==='/'){
 event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(event.request);if(response.ok&&!response.redirected&&new URL(response.url).pathname==='/')await cache.put('/',response.clone());return response;}catch{return await cache.match('/')||new Response('Open Roam online once before traveling.',{status:503,headers:{'Content-Type':'text/plain'}});}})());
 }else if(u.pathname.startsWith('/_')||['script','style'].includes(event.request.destination)||['/icon.svg','/manifest.webmanifest'].includes(u.pathname)){
 event.respondWith((async()=>{const cache=await caches.open(CACHE);const hit=await cache.match(event.request);if(hit)return hit;const r=await fetch(event.request);if(r.ok)await cache.put(event.request,r.clone());return r;})());
 }
});
