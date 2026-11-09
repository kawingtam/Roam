import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context={window:{}};vm.runInNewContext(readFileSync('web/public/config.js','utf8'),context);
const c=context.window.ROAM_CONFIG;
if(!c||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(c.supabaseUrl))throw new Error('Connect the Roam Supabase project before publishing.');
if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(c.publishableKey)){
 let role;try{role=JSON.parse(Buffer.from(c.publishableKey.split('.')[1],'base64url').toString()).role;}catch{}
 if(role!=='anon')throw new Error('Use only the public anon/publishable key. Never publish an admin or service_role key.');
}
console.log('Public database configuration checked.');
