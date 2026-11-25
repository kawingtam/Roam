import {useState,type FormEvent} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import './style.css';
import {signInError,requestsError} from './errors';
import {Accounts,type Account,type Change} from './accounts';
const OWNER='kawingtam7@gmail.com';
const config=window.ROAM_CONFIG;
const client=config?createClient(config.supabaseUrl,config.publishableKey,{auth:{storageKey:'roam-private-review',persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}}):null;
const target=new URLSearchParams(location.search).get('request');
function Review(){
 const [requests,setRequests]=useState<Account[]|null>(null),[total,setTotal]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function load(){
  if(!client)throw Error('Review service is not configured.');
  const {data,error}=await client.rpc('roam_manage_registration_accounts',{payload:{action:'list'}});
  if(error)throw Error(requestsError(error));
  setRequests(data.accounts as Account[]);setTotal(data.total);
 }
 async function login(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError('');
  const form=event.currentTarget,fields=new FormData(form);
  try{
   if(!client)throw Error('Review service is not configured.');
   const {data,error}=await client.auth.signInWithPassword({email:OWNER,password:String(fields.get('password')||'')});
   form.reset();
   if(error)throw Error(signInError(error));
   if(data.user.email?.toLowerCase()!==OWNER||!data.user.email_confirmed_at){await client.auth.signOut({scope:'local'});throw Error('Only the confirmed registration owner may use this page.');}
   await load();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function change(payload:Change){
  if(!client||busy)throw Error('Review service is busy.');
  setBusy(true);setError('');setMessage('');
  try{
   const rpc=payload.action==='review'?'roam_review_registrations':'roam_manage_registration_accounts';
   const {error}=await client.rpc(rpc,{payload});
   if(error)throw Error(error.message||'Could not save the account change.');
   setMessage(payload.action==='delete'?'Empty account deleted.':payload.action==='rename'?'Display name updated.':'Access decision saved.');await load();
  }catch(e){setError((e as Error).message);throw e;}finally{setBusy(false);}
 }
 async function refresh(){setBusy(true);setError('');try{await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <main><p className="eyebrow">ROAM · ADMINISTRATOR</p><h1>Accounts &amp; registrations</h1><p className="intro">Private account management outside the Roam app. Only you, the registration owner, can review access, edit display names, and delete empty accounts.</p>
 {error&&<p className="error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 {!requests?<form onSubmit={login}><label>Administrator<input value={OWNER} readOnly autoComplete="username"/></label><label>Password<input type="password" name="password" required autoComplete="current-password"/></label><p className="meta">Use your Roam account password, not your Gmail or Supabase dashboard password.</p><button disabled={busy}>{busy?'Signing in…':'Sign in to review'}</button></form>:<Accounts accounts={requests} total={total} busy={busy} target={target} onChange={change} onRefresh={refresh} onSignOut={async()=>{await client?.auth.signOut({scope:'local'});setRequests(null);setError('');setMessage('');}}/>}

 </main>;
}
createRoot(document.getElementById('review-root')!).render(<Review/>);
