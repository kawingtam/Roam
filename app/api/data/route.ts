import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function access(trip:string,user:string){return env.DB!.prepare('SELECT id FROM members WHERE trip=? AND user=?').bind(trip,user).first();}
export async function GET(){
 const u=await getChatGPTUser();if(!u)return json({error:'Please sign in online.'},401);
 const trips=await env.DB!.prepare('SELECT t.*, (SELECT COUNT(*) FROM members m WHERE m.trip=t.id) AS travelers FROM trips t JOIN members m ON m.trip=t.id WHERE m.user=? ORDER BY t.created DESC').bind(u.userId).all();
 const expenses=await env.DB!.prepare('SELECT e.* FROM expenses e JOIN members m ON m.trip=e.trip WHERE m.user=? AND (e.deleted=0 OR e.user=?) ORDER BY e.date DESC,e.updated DESC').bind(u.userId,u.userId).all();
 const categories=await env.DB!.prepare('SELECT c.* FROM categories c JOIN members m ON m.trip=c.trip WHERE m.user=?').bind(u.userId).all();
 return json({user:{id:u.userId,name:u.displayName},trips:trips.results,expenses:expenses.results,categories:categories.results.map(c=>({...c,aliases:JSON.parse(String(c.aliases||'[]'))}))});
}
export async function POST(req:Request){
 const u=await getChatGPTUser();if(!u)return json({error:'Please sign in online to sync.'},401);
 if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Invalid request origin'},403);
 try{
 const b=await req.json() as any;
 if(b.action==='trip'){
 if(typeof b.id!=='string'||!/^[\w-]{8,80}$/.test(b.id)||typeof b.name!=='string'||!b.name.trim()||b.name.length>100||typeof b.destination!=='string'||b.destination.length>150||!/^[A-Z]{3}$/.test(b.currency)||!/^\d{4}-\d{2}-\d{2}$/.test(b.start)||!/^\d{4}-\d{2}-\d{2}$/.test(b.end)||b.end<b.start)return json({error:'Check trip name, currency and dates.'},400);
 const existing=await env.DB!.prepare('SELECT owner FROM trips WHERE id=?').bind(b.id).first();if(existing)return existing.owner===u.userId?json({ok:true}):json({error:'Trip ID already in use.'},409);
 await env.DB!.batch([env.DB!.prepare('INSERT INTO trips VALUES(?,?,?,?,?,?,?,?)').bind(b.id,u.userId,b.name.trim(),b.destination,b.currency,b.start,b.end,Date.now()),env.DB!.prepare('INSERT INTO members VALUES(?,?,?)').bind(b.id+':'+u.userId,b.id,u.userId)]);return json({ok:true});
 }
 if(b.action==='invite'){
 const t=await env.DB!.prepare('SELECT owner FROM trips WHERE id=?').bind(b.trip).first();if(t?.owner!==u.userId)return json({error:'Only the trip creator can invite travelers.'},403);
 const token=crypto.randomUUID()+crypto.randomUUID();const hash=await digest(token);
 await env.DB!.prepare('INSERT INTO invites VALUES(?,?,?)').bind(hash,b.trip,Date.now()+7*86400000).run();return json({token});
 }
 if(b.action==='join'){
 if(typeof b.token!=='string'||b.token.length>100)return json({error:'Invalid invitation.'},400);
 const invite=await env.DB!.prepare('SELECT * FROM invites WHERE id=? AND expires>?').bind(await digest(b.token),Date.now()).first();if(!invite)return json({error:'Invitation expired or invalid. Ask for a new link.'},404);
 await env.DB!.prepare('INSERT OR IGNORE INTO members VALUES(?,?,?)').bind(invite.trip+':'+u.userId,invite.trip,u.userId).run();return json({ok:true,trip:invite.trip});
 }
 if(b.action==='category'){
 const defaults=['Food','Transport','Stay','Shopping','Activities','Other'];const iconIds=['food','transport','stay','shopping','activities','other','coffee','plane','car','fuel','health','groceries','gift','work','phone','drink'];
 if(typeof b.id!=='string'||!/^[\w-]{8,80}$/.test(b.id)||typeof b.name!=='string'||!b.name.trim()||b.name.trim().length>32||/[\u0000-\u001f]/.test(b.name)||b.icon!==undefined&&!iconIds.includes(b.icon))return json({error:'Choose a name of 1–32 characters and a valid icon.'},400);
 if(!await access(b.trip,u.userId))return json({error:'You do not belong to this trip.'},403);
 const name=b.name.trim(),icon=b.icon||'other';
 let old=await env.DB!.prepare('SELECT * FROM categories WHERE id=?').bind(b.id).first();if(old&&old.trip!==b.trip)return json({error:'Category belongs to another trip.'},403);
 const rows=(await env.DB!.prepare('SELECT * FROM categories WHERE trip=?').bind(b.trip).all()).results;
 const aliasesOf=(c:any):string[]=>JSON.parse(String(c.aliases||'[]'));
 if(!old&&typeof b.previousName==='string'&&defaults.includes(b.previousName)){old=rows.find(c=>[String(c.name),...aliasesOf(c)].some(n=>n.toLowerCase()===b.previousName.toLowerCase()))||null;}
 const previous=old?String(old.name):typeof b.previousName==='string'&&defaults.includes(b.previousName)?b.previousName:'';
 const aliases=[...new Set([...(old?aliasesOf(old):[]),...(previous?[previous]:[])])];
 const conflict=rows.find(c=>c.id!==old?.id&&[String(c.name),...aliasesOf(c)].some(n=>n.toLowerCase()===name.toLowerCase()));
 if(conflict){if(!old&&!previous&&String(conflict.name).toLowerCase()===name.toLowerCase())return json({ok:true});return json({error:'That category name is already in use.'},409);}
 if(defaults.some(n=>n.toLowerCase()===name.toLowerCase())&&!aliases.some(n=>n.toLowerCase()===name.toLowerCase()))return json({error:'That category already exists. Edit it instead.'},409);
 const id=old?String(old.id):b.id;
 const commands=[env.DB!.prepare('INSERT INTO categories(id,trip,name,icon,aliases,key,creator) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,icon=excluded.icon,aliases=excluded.aliases,key=excluded.key').bind(id,b.trip,name,icon,JSON.stringify(aliases),b.trip+':'+name.toLowerCase(),old?String(old.creator):u.userId)];
 if(aliases.length)commands.push(env.DB!.prepare('UPDATE expenses SET category=? WHERE trip=? AND lower(category) IN ('+aliases.map(()=>'?').join(',')+')').bind(name,b.trip,...aliases.map(n=>n.toLowerCase())));
 await env.DB!.batch(commands);return json({ok:true});
 }
 if(b.action==='delete'||b.action==='restore'){
 if(typeof b.id!=='string'||!/^[\w-]{8,80}$/.test(b.id))return json({error:'Invalid expense ID.'},400);
 const existing=await env.DB!.prepare('SELECT user,trip FROM expenses WHERE id=?').bind(b.id).first();if(!existing)return b.action==='restore'?json({ok:true}):json({error:'Expense not found.'},404);
 if(existing.user!==u.userId)return json({error:'Only the expense creator can delete or restore it.'},403);
 if(!await access(existing.trip as string,u.userId))return json({error:'You do not belong to this trip.'},403);
 await env.DB!.prepare('UPDATE expenses SET deleted=?,updated=? WHERE id=? AND user=?').bind(b.action==='delete'?1:0,Date.now(),b.id,u.userId).run();return json({ok:true});
 }
 if(b.action==='expense'){
 if(typeof b.id!=='string'||!/^[\w-]{8,80}$/.test(b.id)||!Number.isSafeInteger(b.amount)||b.amount<=0||b.amount>999999999999||!/^[A-Z]{3}$/.test(b.currency)||(typeof b.category!=='string'||!b.category.trim()||b.category.length>32)||typeof b.description!=='string'||b.description.length>500||!/^\d{4}-\d{2}-\d{2}$/.test(b.date))return json({error:'Check the amount, currency, category and date.'},400);
 if(!await access(b.trip,u.userId))return json({error:'You do not belong to this trip.'},403);
 const configured=(await env.DB!.prepare('SELECT name,aliases FROM categories WHERE trip=?').bind(b.trip).all()).results.find(c=>[String(c.name),...JSON.parse(String(c.aliases||'[]'))].some((n:string)=>n.toLowerCase()===b.category.toLowerCase()));const builtIn=['Food','Transport','Stay','Shopping','Activities','Other'].find(c=>c.toLowerCase()===b.category.toLowerCase());if(configured)b.category=configured.name;else if(builtIn)b.category=builtIn;else return json({error:'Create this category in the trip first.'},400);
 const old=await env.DB!.prepare('SELECT user,trip,deleted FROM expenses WHERE id=?').bind(b.id).first();if(old&&old.user!==u.userId)return json({error:'Only the expense creator can edit it.'},403);
 if(old?.deleted){if(b.deleting===true)return json({ok:true,deleted:true});return json({error:'Restore the deleted expense before editing it.'},409);}
 if(old&&old.trip!==b.trip)return json({error:'An expense cannot be moved to another trip.'},409);
 await env.DB!.prepare('INSERT INTO expenses(id,trip,user,amount,currency,category,description,date,updated,authorName) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET amount=excluded.amount,currency=excluded.currency,category=excluded.category,description=excluded.description,date=excluded.date,updated=excluded.updated,authorName=excluded.authorName WHERE expenses.user=excluded.user').bind(b.id,b.trip,u.userId,b.amount,b.currency,b.category,b.description,b.date,Date.now(),u.displayName).run();return json({ok:true});
 }
 return json({error:'Unknown action.'},400);
 }catch{return json({error:'Could not save. Your local entry is kept; try again.'},500);}
}
async function digest(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
