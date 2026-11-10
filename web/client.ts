import {createClient} from '@supabase/supabase-js';
import type {LedgerServices,User} from '../app/ledger';
export const basePath='/Roam/';
declare global {interface Window {ROAM_CONFIG?:{supabaseUrl:string,publishableKey:string}}}
const config=window.ROAM_CONFIG;
export const configured=!!config&&/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl)&&(/^(sb_publishable_)/.test(config.publishableKey)||/^eyJ/.test(config.publishableKey));
if(config?.publishableKey.startsWith('sb_secret_'))throw new Error('Only a public publishable key belongs in browser configuration.');
if(config?.publishableKey.startsWith('eyJ')){try{const claims=JSON.parse(atob(config.publishableKey.split('.')[1]));if(claims.role!=='anon')throw new Error();}catch{throw new Error('The browser key must be a public anon/publishable key.');}}
export const supabase=configured?createClient(config!.supabaseUrl,config!.publishableKey,{auth:{storageKey:'roam-pages-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export const appUser=(user:{id:string,email?:string,user_metadata?:Record<string,unknown>}):User=>({id:user.id,name:String(user.user_metadata?.name||user.email||'Traveler')});
async function data(payload?:unknown){
 if(!supabase)throw new Error('The private database is not connected yet.');
 const {data,error}=await supabase.rpc('roam_data',{payload:payload??null});
 if(error)throw new Error(error.message);return data;
}
export const services:LedgerServices={basePath,cacheName:'roam-pages-shell-v1',databaseName:'roam-pages-v1',data,
 async uploadReceipt(id,photo){
  if(!supabase)throw new Error('Sign in first.');
  if(!['image/jpeg','image/png'].includes(photo.type)||photo.size>8*1024*1024)throw new Error('Use a JPEG or PNG receipt smaller than 8 MB.');
  const {data:session,error:sessionError}=await supabase.auth.getSession();if(sessionError||!session.session)throw new Error('Sign in again to upload the pending receipt.');
  const path=session.session.user.id+'/'+id;
  const {error}=await supabase.storage.from('roam-receipts').upload(path,photo,{contentType:photo.type,upsert:true});
  if(error)throw new Error('Expense saved; receipt is still waiting. '+error.message);
  await data({action:'receipt',id});
 },
 async receiptUrl(id){
  const result=await data({action:'receipt_path',id});
  const {data:signed,error}=await supabase!.storage.from('roam-receipts').createSignedUrl(result.path,300);
  if(error)throw error;return signed.signedUrl;
 },
 async rates(){
  const currencies=['USD','HKD','EUR','GBP','JPY','CAD','AUD','SGD','CNY','TWD','THB','KRW'];
  const response=await fetch('https://api.frankfurter.dev/v2/rates?base=USD&quotes='+currencies.join(','),{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Rates unavailable');
  const rows=await response.json();if(!Array.isArray(rows))throw new Error('Invalid rates');
  const rates:Record<string,number>={USD:1},dates:Record<string,string>={};
  for(const row of rows){if(row.base==='USD'&&currencies.includes(row.quote)&&typeof row.rate==='number'&&Number.isFinite(row.rate)&&row.rate>0&&/^\d{4}-\d{2}-\d{2}$/.test(row.date)){rates[row.quote]=row.rate;dates[row.quote]=row.date;}}
  if(!rates.JPY)throw new Error('Missing yen rate');return {rates,dates,fetchedAt:Date.now()};
 },
 async signOut(){const {error}=await supabase!.auth.signOut({scope:'local'});if(error)throw error;}
};
