const OWNER='kawingtam7@gmail.com';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reply=(status,message)=>Response.json({message},{status});
async function equalSecret(a,b){
 const digest=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 const [x,y]=await Promise.all([digest(a),digest(b)]);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;
}
export function notificationHandler(env,fetcher=fetch){return async request=>{
 if(request.method!=='POST')return reply(405,'POST required');
 const secret=env('REGISTRATION_WEBHOOK_SECRET');
 const expectedHash=env('REGISTRATION_WEBHOOK_SECRET_SHA256');
 if(!secret&&!expectedHash)return reply(503,'Email notifications are not configured');
 const provided=request.headers.get('x-registration-secret')||'';
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(provided));
 const suppliedHash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
 if(!(expectedHash?await equalSecret(suppliedHash,expectedHash):await equalSecret(provided,secret)))return reply(401,'Unauthorized');
 const key=env('RESEND_API_KEY'),sender=env('REGISTRATION_FROM_EMAIL'),reviewUrl=env('REGISTRATION_REVIEW_URL'),project=env('SUPABASE_URL'),service=env('SUPABASE_SERVICE_ROLE_KEY')||(()=>{try{return Object.values(JSON.parse(env('SUPABASE_SECRET_KEYS')||'{}'))[0];}catch{return undefined;}})();
 if(!key||!sender||!project||!service)return reply(503,'Email notifications are not configured');
 let payload;try{const body=await request.text();if(body.length>16384)return reply(413,'Request too large');payload=JSON.parse(body);}catch{return reply(400,'Invalid request');}
 // A private, owner-only setup test contains no registration data or approval links.
 if(payload?.action==='test'){
  try{
   const sent=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'roam-registration-setup-v1'},body:JSON.stringify({from:sender,to:[OWNER],subject:'Roam: registration email connection test',text:'Your Roam registration email connection is working. This is a setup test only. Registration alerts will be enabled after your private review page is published. No registration access has changed.'})});
   return sent.ok?reply(200,'Setup email sent'):reply(502,'Setup email delivery failed');
  }catch{return reply(502,'Setup email delivery unavailable');}
 }
 if(!reviewUrl)return reply(503,'Review page is not configured');
 let url;try{url=new URL(reviewUrl);if(url.protocol!=='https:'||url.username||url.password)throw Error();}catch{return reply(503,'Invalid review page configuration');}
 const id=payload?.record?.user_id;
 if(payload?.type!=='INSERT'||payload?.schema!=='public'||payload?.table!=='roam_registration_requests'||typeof id!=='string'||!/^[-0-9a-f]{36}$/i.test(id))return reply(400,'Invalid registration event');
 try{
  // Read the canonical row; never trust an email recipient or name from the webhook.
  const record=await fetcher(project+'/rest/v1/roam_registration_requests?select=user_id,email,name,status&user_id=eq.'+encodeURIComponent(id),{headers:{apikey:service,Authorization:'Bearer '+service}});
  if(!record.ok)return reply(502,'Registration lookup failed');
  const rows=await record.json(),row=Array.isArray(rows)?rows[0]:null;
  if(!row||row.status!=='pending')return reply(200,'No pending request to notify');
  const link=intent=>{const target=new URL(url);target.searchParams.set('request',id);target.searchParams.set('intent',intent);return target.href;};
  const approve=link('approve'),deny=link('deny');
  const sent=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'roam-registration-'+id},body:JSON.stringify({from:sender,to:[OWNER],subject:'Roam: registration awaiting your review',text:`A new Roam registration is awaiting your review.\nName: ${row.name}\nEmail: ${row.email}\n\nApprove: ${approve}\nDeny: ${deny}\n\nSign in as the administrator and confirm your decision. Opening a link does not change access.`,html:`<h2>Roam registration request</h2><p><strong>${escape(row.name)}</strong><br>${escape(row.email)}</p><p><a href="${escape(approve)}">Approve registration</a> &nbsp; <a href="${escape(deny)}">Deny registration</a></p><p>Sign in as the administrator and confirm your decision. Opening either link does not change access.</p>`})});
  if(!sent.ok)return reply(502,'Notification delivery failed');
  return reply(200,'Administrator notified');
 }catch{return reply(502,'Notification delivery unavailable');}
};}
