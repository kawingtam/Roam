import {useEffect,useState,type ReactNode} from 'react';
import type {User} from '../app/ledger';
import {supabase} from './client';
import {connectionOnline} from './connectivity';

export function RegistrationGate({user,children}:{user:User;children:ReactNode}){
 const [status,setStatus]=useState<string|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function check(){
  if(!supabase)return;setBusy(true);setError('');
  try{
   if(!connectionOnline()){
    const cached=JSON.parse(localStorage.getItem('roam-pages-last-account')||'null');
    if(cached?.id===user.id){setStatus('approved');return;}
    throw new Error('Connect to the internet to check your registration.');
   }
   const {data,error}=await supabase.rpc('roam_registration_status');
   if(error)throw error;
   if(!['approved','pending','rejected'].includes(data?.status))throw new Error('Could not check your registration.');
   if(data.status==='approved')localStorage.setItem('roam-pages-last-account',JSON.stringify(user));
   else localStorage.removeItem('roam-pages-last-account');
   setStatus(data.status);
  }catch(e){setError((e as Error).message);setStatus(null);}finally{setBusy(false);}
 }
 useEffect(()=>{void check();const online=()=>void check();window.addEventListener('online',online);return()=>window.removeEventListener('online',online);},[user.id]);
 if(status==='approved')return <>{children}</>;
 return <main className="auth-page"><h1>{status==='pending'?'Awaiting approval':status==='rejected'?'Registration not approved':'Checking your registration'}</h1>
 {status==='pending'&&<p className="auth-intro">Your account is registered. We’re reviewing new registrations to keep Roam’s community small and safe. Once approved, you can start using Roam.</p>}
 {status==='rejected'&&<p className="auth-intro">Your registration has not been approved. You cannot access trips or upload receipts.</p>}
 {error&&<p className="auth-error" role="alert">{error}</p>}
 <button className="button primary" disabled={busy} onClick={()=>void check()}>{busy?'Checking…':'Check again'}</button>
 <button className="text-button" disabled={busy} onClick={async()=>{const result=await supabase!.auth.signOut({scope:'local'});if(result.error)setError(result.error.message);}}>Sign out</button>
 </main>;
}
