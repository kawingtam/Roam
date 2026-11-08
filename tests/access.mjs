import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
const db=new DatabaseSync(':memory:');
for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+f,'utf8'));
const statements=[];
globalThis.__env={
 DB:{
  prepare(sql){
   return {bind(...values){
    return {
     async first(){return db.prepare(sql).get(...values)||null;},
     async all(){return {results:db.prepare(sql).all(...values)};},
     async run(){return db.prepare(sql).run(...values);}
    };
   }};
  },
  async batch(items){db.exec('BEGIN');try{for(const item of items)await item.run();db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}
 },
 BUCKET:{async put(){},async get(){return null;}}
};
globalThis.__user={userId:'alice',displayName:'Alice',email:'alice@example.test'};
async function load(path){const source=readFileSync(path,'utf8').replace(/import \{ env \} from 'cloudflare:workers';/, 'const env=globalThis.__env;').replace(/import \{ getChatGPTUser \} from '..\/..\/chatgpt-auth';/,'const getChatGPTUser=async()=>globalThis.__user;');const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));}
const api=await load('app/api/data/route.ts'),receipt=await load('app/api/receipt/route.ts');
const request=body=>new Request('https://roam.test/api/data',{method:'POST',headers:{Origin:'https://roam.test','Content-Type':'application/json'},body:JSON.stringify(body)});
const post=body=>api.POST(request(body));
const trip={action:'trip',id:'trip-123456',name:'Japan',destination:'Kyoto',currency:'JPY',start:'2026-11-10',end:'2026-11-18'};
assert.equal((await post(trip)).status,200);assert.equal((await post(trip)).status,200);
assert.equal(db.prepare('SELECT COUNT(*) n FROM trips').get().n,1);
const expense={action:'expense',id:'expense-12345',trip:trip.id,amount:500,currency:'JPY',category:'Food',description:'Coffee',date:'2026-11-10'};
assert.equal((await post(expense)).status,200);assert.equal((await post(expense)).status,200);
assert.equal(db.prepare('SELECT COUNT(*) n FROM expenses').get().n,1);
const invited=await (await post({action:'invite',trip:trip.id})).json();assert.ok(invited.token);
globalThis.__user={userId:'bob',displayName:'Bob',email:'bob@example.test'};
assert.equal((await post({...expense,id:'expense-bob1'})).status,403);
assert.equal((await post({action:'join',token:invited.token})).status,200);
assert.equal((await post({...expense,id:'expense-bob1'})).status,200);
assert.equal((await post({...expense,amount:700})).status,403);
assert.equal((await post({action:'invite',trip:trip.id})).status,403);
const bob=await (await api.GET()).json();assert.equal(bob.trips.length,1);assert.equal(bob.trips[0].travelers,2);assert.equal(bob.expenses.length,1);assert.equal(bob.expenses[0].id,'expense-bob1');
assert.equal((await receipt.GET(new Request('https://roam.test/api/receipt?id=expense-12345'))).status,404);
assert.equal((await receipt.POST(new Request('https://roam.test/api/receipt?id=expense-12345',{method:'POST',headers:{Origin:'https://roam.test'},body:'image'}))).status,404);
assert.equal((await post({...expense,id:'negative123',amount:-100})).status,400);
assert.equal((await post({...trip,id:undefined})).status,400);
assert.equal((await api.POST(new Request('https://roam.test/api/data',{method:'POST',headers:{Origin:'https://evil.test'},body:JSON.stringify(trip)}))).status,403);
db.prepare('UPDATE invites SET expires=0').run();assert.equal((await post({action:'join',token:invited.token})).status,404);
globalThis.__user=null;assert.equal((await api.GET()).status,401);assert.equal((await post(trip)).status,401);
console.log('PASS: account isolation, membership, private receipt access, invite expiry, validation, origin checks, retry idempotency.');
