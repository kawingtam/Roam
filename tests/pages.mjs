import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const listeners={},cacheItems=new Map();let online=true,calls=0;
const key=value=>typeof value==='string'?new URL(value,'https://kawingtam.github.io').href:value.url;
const cache={async put(request,response){cacheItems.set(key(request),response);},async match(request){return cacheItems.get(key(request));}};
vm.runInNewContext(readFileSync('web/public/sw.js','utf8'),{URL,Response,location:{origin:'https://kawingtam.github.io'},self:{location:{href:'https://kawingtam.github.io/Roam/sw.js'},skipWaiting(){},clients:{claim(){}},addEventListener(name,fn){listeners[name]=fn;}},caches:{async open(){return cache;}},async fetch(request){calls++;if(!online)throw new Error('offline');return new Response('public shell '+calls);}});
async function request(path,mode='cors'){let response;listeners.fetch({request:{url:new URL(path,'https://kawingtam.github.io').href,method:'GET',mode},respondWith(promise){response=promise;}});return response?await response:undefined;}
assert.equal(await request('https://project.supabase.co/rest/v1/rpc/roam_data'),undefined);
assert.equal(await request('/SpaBooking/'),undefined);
await request('/Roam/','navigate');online=false;
assert.match(await (await request('/Roam/?invite=example','navigate')).text(),/public shell/);
online=true;const first=await request('/Roam/assets/app.hash.js');online=false;assert.equal(await (await request('/Roam/assets/app.hash.js')).text(),await first.text());
online=true;const config1=await request('/Roam/config.js');const config2=await request('/Roam/config.js');assert.notEqual(await config1.text(),await config2.text());
const html=readFileSync('pages-dist/index.html','utf8');assert.ok(!html.includes('chatgpt.site'));assert.ok(html.includes('/Roam/assets/'));
for(const file of ['config.js','icon.svg','sw.js','manifest.webmanifest'])assert.ok(existsSync('pages-dist/'+file));
const manifest=JSON.parse(readFileSync('web/public/manifest.webmanifest','utf8'));assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
console.log('PASS: scoped static shell cache, offline navigation/assets, fresh public config, no database/other-site caching, portable build paths.');
