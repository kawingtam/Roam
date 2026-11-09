const CACHE='roam-pages-shell-v1';
const ROOT=new URL('./',self.location.href).pathname;
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==location.origin||!url.pathname.startsWith(ROOT))return;
 if(event.request.mode==='navigate'){
  event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(event.request);if(response.ok&&!response.redirected)await cache.put(ROOT,response.clone());return response;}catch{return await cache.match(ROOT)||new Response('Open Roam online once before traveling.',{status:503,headers:{'Content-Type':'text/plain'}});}})());
 }else if(url.pathname.includes('/assets/')||['icon.svg','manifest.webmanifest'].some(name=>url.pathname===ROOT+name)){
  event.respondWith((async()=>{const cache=await caches.open(CACHE);const hit=await cache.match(event.request);if(hit)return hit;const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;})());
 }else if(url.pathname===ROOT+'config.js'){
  event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(event.request,{cache:'no-store'});if(response.ok)await cache.put(event.request,response.clone());return response;}catch{return await cache.match(event.request)||Response.error();}})());
 }
});
