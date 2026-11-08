import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function access(trip:string,user:string){return env.DB!.prepare('SELECT id FROM members WHERE trip=? AND user=?').bind(trip,user).first();}
export async function GET(){
 const u=await getChatGPTUser();if(!u)return json({error:'Please sign in online.'},401);
 const trips=await env.DB!.prepare('SELECT t.*, (SELECT COUNT(*) FROM members m WHERE m.trip=t.id) AS travelers FROM trips t JOIN members m ON m.trip=t.id WHERE m.user=? ORDER BY t.created DESC').bind(u.userId).all();
 const expenses=await env.DB!.prepare('SELECT * FROM expenses WHERE user=? ORDER BY date DESC').bind(u.userId).all();
 return json({user:{id:u.userId,name:u.displayName},trips:trips.results,expenses:expenses.results});
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
 if(b.action==='expense'){
 if(typeof b.id!=='string'||!/^[\w-]{8,80}$/.test(b.id)||!Number.isSafeInteger(b.amount)||b.amount<=0||b.amount>999999999999||!/^[A-Z]{3}$/.test(b.currency)||!['Food','Transport','Stay','Shopping','Activities','Other'].includes(b.category)||typeof b.description!=='string'||b.description.length>500||!/^\d{4}-\d{2}-\d{2}$/.test(b.date))return json({error:'Check the amount, currency, category and date.'},400);
 if(!await access(b.trip,u.userId))return json({error:'You do not belong to this trip.'},403);
 const old=await env.DB!.prepare('SELECT user FROM expenses WHERE id=?').bind(b.id).first();if(old&&old.user!==u.userId)return json({error:'This expense is private.'},403);
 await env.DB!.prepare('INSERT INTO expenses(id,trip,user,amount,currency,category,description,date,updated) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET amount=excluded.amount,currency=excluded.currency,category=excluded.category,description=excluded.description,date=excluded.date,updated=excluded.updated').bind(b.id,b.trip,u.userId,b.amount,b.currency,b.category,b.description,b.date,Date.now()).run();return json({ok:true});
 }
 return json({error:'Unknown action.'},400);
 }catch{return json({error:'Could not save. Your local entry is kept; try again.'},500);}
}
async function digest(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
