import assert from 'node:assert/strict';
import {notificationHandler} from '../supabase/functions/registration-notification/handler.mjs';
const id='00000000-0000-4000-8000-000000000003';
const vars={REGISTRATION_WEBHOOK_SECRET:'test-only-hook-secret',RESEND_API_KEY:'test-only-api-key',REGISTRATION_FROM_EMAIL:'Roam <roam@example.test>',REGISTRATION_REVIEW_URL:'https://example.test/registration-review.html',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-only-service'};
const env=k=>vars[k];const event={type:'INSERT',schema:'public',table:'roam_registration_requests',record:{user_id:id,email:'injected@example.test'}};
const request=(secret=vars.REGISTRATION_WEBHOOK_SECRET,body=event)=>new Request('https://function.test',{method:'POST',headers:{'x-registration-secret':secret},body:JSON.stringify(body)});
let sent=[];let status='pending';
const handler=notificationHandler(env,async(url,options)=>{
 if(url.startsWith(vars.SUPABASE_URL))return Response.json([{user_id:id,email:'traveler@example.test',name:'<img src=x onerror=alert(1)>',status}]);
 assert.equal(url,'https://api.resend.com/emails');sent.push(options);return Response.json({id:'mock-email'});
});
assert.equal((await handler(new Request('https://function.test'))).status,405);
assert.equal((await handler(request('bad'))).status,401);assert.equal(sent.length,0);
assert.equal((await handler(request(undefined,{...event,record:{user_id:'bad'}}))).status,400);
assert.equal((await handler(request())).status,200);assert.equal(sent.length,1);
const mail=JSON.parse(sent[0].body);assert.deepEqual(mail.to,['kawingtam7@gmail.com']);assert(mail.text.includes('traveler@example.test'));assert(!mail.text.includes('injected@example.test'));assert(!mail.html.includes('<img'));assert(mail.html.includes('&lt;img'));assert(mail.html.includes('intent=approve'));assert(mail.html.includes('intent=deny'));assert.equal(sent[0].headers['Idempotency-Key'],'roam-registration-'+id);
status='approved';await handler(request());assert.equal(sent.length,1);
assert.equal((await notificationHandler(()=>undefined)(request())).status,503);
assert.equal((await notificationHandler(env,async()=>{throw Error('secret must not leak')})(request())).status,502);
console.log('PASS: authenticated notification trigger, fixed owner recipient, canonical pending requests, escaped email content, safe review links, idempotency, unconfigured sender and delivery failures. No real email sent.');

const rawHash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(vars.REGISTRATION_WEBHOOK_SECRET));
const hash=Buffer.from(rawHash).toString('hex');
const hashedEnv=name=>name==='REGISTRATION_WEBHOOK_SECRET'?undefined:name==='REGISTRATION_WEBHOOK_SECRET_SHA256'?hash:vars[name];
const hashedHandler=notificationHandler(hashedEnv,async()=>Response.json([]));
assert.equal((await hashedHandler(request())).status,200);
assert.equal((await hashedHandler(request('wrong'))).status,401);
console.log('PASS: hashed webhook secret verification; raw secret stays in database Vault.');

const setupEnv=name=>name==='REGISTRATION_REVIEW_URL'?undefined:env(name);
let setupMail;const setupHandler=notificationHandler(setupEnv,async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');setupMail=JSON.parse(options.body);return Response.json({id:'mock-setup'});});
assert.equal((await setupHandler(request(undefined,{action:'test'}))).status,200);
assert.deepEqual(setupMail.to,['kawingtam7@gmail.com']);assert(!setupMail.text.includes('https://'));
assert.equal((await setupHandler(request('bad',{action:'test'}))).status,401);
console.log('PASS: setup test requires webhook authentication, sends only to owner, and has no approval links.');
