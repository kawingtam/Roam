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
const bob=await (await api.GET()).json();assert.equal(bob.trips.length,1);assert.equal(bob.trips[0].travelers,2);assert.equal(bob.expenses.length,2);assert.ok(bob.expenses.some(e=>e.id===expense.id));
db.prepare('UPDATE expenses SET receipt=? WHERE id=?').run('alice/receipt',expense.id);
globalThis.__env.BUCKET.get=async()=>({body:new Uint8Array([255,216,255]),httpMetadata:{contentType:'image/jpeg'}});
assert.equal((await receipt.GET(new Request('https://roam.test/api/receipt?id=expense-12345'))).status,200);
assert.equal((await receipt.POST(new Request('https://roam.test/api/receipt?id=expense-12345',{method:'POST',headers:{Origin:'https://roam.test'},body:'image'}))).status,404);
assert.equal((await post({...expense,id:'negative123',amount:-100})).status,400);
assert.equal((await post({...trip,id:undefined})).status,400);
assert.equal((await api.POST(new Request('https://roam.test/api/data',{method:'POST',headers:{Origin:'https://evil.test'},body:JSON.stringify(trip)}))).status,403);
const custom={action:'category',id:'category-12345',trip:trip.id,name:'Groceries'};
assert.equal((await post(custom)).status,200);
assert.equal((await post(custom)).status,200);
assert.equal(db.prepare('SELECT COUNT(*) n FROM categories').get().n,1);
assert.equal((await post({...expense,id:'expense-custom1',category:'groceries'})).status,200);
assert.equal((await post({...expense,id:'expense-invalid1',category:'Unknown'})).status,400);
assert.equal((await post({...custom,id:'category-invalid',name:'bad\nname'})).status,400);
assert.equal((await post({...expense,id:'expense-bob1',amount:900,user:'alice'})).status,200);
assert.equal(db.prepare('SELECT user,amount FROM expenses WHERE id=?').get('expense-bob1').user,'bob');
assert.equal((await post({...expense,amount:900,user:'alice'})).status,403);
const otherTrip={...trip,id:'trip-other123',name:'Other trip'};
assert.equal((await post(otherTrip)).status,200);
assert.equal((await post({...expense,id:'expense-bob1',trip:otherTrip.id})).status,409);
globalThis.__user={userId:'charlie',displayName:'Charlie',email:'charlie@example.test'};
assert.equal((await (await api.GET()).json()).expenses.length,0);
assert.equal((await receipt.GET(new Request('https://roam.test/api/receipt?id=expense-12345'))).status,404);
assert.equal((await post({...custom,id:'category-outsider'})).status,403);
globalThis.__user={userId:'alice',displayName:'Alice',email:'alice@example.test'};
const alice=await (await api.GET()).json();assert.equal(alice.expenses.length,3);assert.equal(alice.categories[0].name,'Groceries');
assert.equal((await post({...expense,amount:800})).status,200);
assert.equal(db.prepare('SELECT amount FROM expenses WHERE id=?').get(expense.id).amount,800);
assert.equal((await post({...expense,id:'expense-bob1',amount:1})).status,403);
db.prepare('UPDATE invites SET expires=0').run();assert.equal((await post({action:'join',token:invited.token})).status,404);
globalThis.__user=null;assert.equal((await api.GET()).status,401);assert.equal((await post(trip)).status,401);
console.log('PASS: shared trip reads, creator-only edits/uploads, outsider isolation, categories, validation, invite expiry, retries.');

const moneyJS=ts.transpileModule(readFileSync('app/money.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {parseAmount}=await import('data:text/javascript;base64,'+Buffer.from(moneyJS).toString('base64'));
assert.equal(parseAmount('12.50','USD'),1250);
assert.equal(parseAmount('550','JPY'),550);
for(const [amount,currency] of [['12.5','JPY'],['1.001','USD'],['','USD'],['-1','USD'],['Infinity','USD']])assert.throws(()=>parseAmount(amount,currency));
console.log('PASS: currency precision and invalid amounts.');

const statsJS=ts.transpileModule(readFileSync('app/trip-stats.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {tripStats}=await import('data:text/javascript;base64,'+Buffer.from(statsJS).toString('base64'));
const entries=[{amount:550,currency:'JPY',category:'Food',date:'2026-11-08'},{amount:1200,currency:'JPY',category:'Transport',date:'2026-11-08'},{amount:9800,currency:'JPY',category:'Stay',date:'2026-11-07'},{amount:1250,currency:'USD',category:'Food',date:'2026-11-08'}];
assert.deepEqual(tripStats(entries,'JPY','2026-11-08'),{total:11550,todayTotal:1750,topCategory:'Stay',topAmount:9800,count:3});
assert.equal(tripStats(entries,'USD','2026-11-08').total,1250);
assert.deepEqual(tripStats([],'USD','2026-11-08'),{total:0,todayTotal:0,topCategory:'',topAmount:0,count:0});
console.log('PASS: dashboard totals, highest category, today, empty states and currency isolation.');

const {categorySpending}=await import('data:text/javascript;base64,'+Buffer.from(statsJS).toString('base64'));
assert.deepEqual(categorySpending(entries,'JPY').map(c=>c.name),['Stay','Transport','Food']);
assert.equal(categorySpending(entries,'USD')[0].amount,1250);
assert.equal(categorySpending([{amount:2,currency:'USD',category:'__proto__',date:'2026-11-08'}],'USD')[0].amount,2);
console.log('PASS: category ranking, currency isolation and safe custom category names.');
