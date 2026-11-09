import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import type {Session} from '@supabase/supabase-js';
import Ledger,{type User} from '../app/ledger';
import '../app/globals.css';
import './style.css';
import {supabase,configured,appUser,services,basePath} from './client';
function App(){
 const [offlineUser,setOfflineUser]=useState<User|null>(()=>{try{if(!navigator.onLine){const u=JSON.parse(localStorage.getItem('roam-pages-last-account')||'null');if(u&&typeof u.id==='string'&&typeof u.name==='string')return u;}}catch{}return null;}),[session,setSession]=useState<Session|null>(null),[loading,setLoading]=useState(true),[mode,setMode]=useState<'signin'|'signup'|'reset'|'recovery'>('signin'),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{if(!supabase){setLoading(false);return;}const {data:{subscription}}=supabase.auth.onAuthStateChange((event,next)=>{setSession(next);setLoading(false);if(next){try{localStorage.setItem('roam-pages-last-account',JSON.stringify(appUser(next.user)));}catch{}setOfflineUser(null);}else if(event==='SIGNED_OUT'){try{localStorage.removeItem('roam-pages-last-account');}catch{}setOfflineUser(null);}if(event==='PASSWORD_RECOVERY')setMode('recovery');});supabase.auth.getSession().then(({data,error})=>{if(error)setError('Please sign in again. Your offline entries are kept.');setSession(data.session);setLoading(false);});return()=>subscription.unsubscribe();},[]);
 useEffect(()=>{if(import.meta.env.DEV||!('serviceWorker'in navigator))return;navigator.serviceWorker.register(basePath+'sw.js').then(()=>navigator.serviceWorker.ready).then(async()=>{const cache=await caches.open(services.cacheName);const urls=[basePath,basePath+'config.js',basePath+'icon.svg',basePath+'manifest.webmanifest',...Array.from(document.querySelectorAll('script[src],link[rel=stylesheet]')).map(e=>(e as HTMLScriptElement).src||(e as HTMLLinkElement).href)];await cache.addAll([...new Set(urls.map(url=>new URL(url,location.href).href))]);}).catch(()=>setError('Offline setup could not finish. Reopen online before traveling.'));},[]);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy||!supabase)return;setBusy(true);setError('');setMessage('');const form=new FormData(event.currentTarget);const email=String(form.get('email')||'').trim(),password=String(form.get('password')||'');
  try{
   const redirect=location.origin+basePath+location.search;
   if(mode==='signin'){const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;}
   else if(mode==='signup'){const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:redirect,data:{name:String(form.get('name')||'').trim()}}});if(error)throw error;if(!data.session)setMessage('Check your email to confirm your account, then sign in.');}
   else if(mode==='reset'){const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:redirect});if(error)throw error;setMessage('If an account exists for that email, a reset link will arrive shortly.');}
   else {const {error}=await supabase.auth.updateUser({password});if(error)throw error;setMode('signin');setMessage('Password updated.');}
  }catch(error){setError((error as Error).message);}finally{setBusy(false);}
 }
 useEffect(()=>{const connected=()=>{if(!supabase)return;supabase.auth.getSession().then(({data})=>{setSession(data.session);setOfflineUser(null);setLoading(false);});};window.addEventListener('online',connected);return()=>window.removeEventListener('online',connected);},[]);
 if(loading&&!offlineUser)return <main className="auth-page"><p role="status">Opening Roam…</p></main>;
 if(configured&&(session||offlineUser)&&mode!=='recovery'){const user=session?appUser(session.user):offlineUser!;return <Ledger key={user.id} initialUser={user} services={services}/>;}
 return <><header className="app-header"><span className="brand">✈ roam</span></header><main className="auth-page">
 <h1>{!configured?'A new home for Roam':mode==='signup'?'Join the adventure':mode==='reset'?'Reset password':mode==='recovery'?'Choose a password':'Welcome back'}</h1>
 {!configured?<><p className="auth-intro">The full app is moving here. Private account setup is still in progress.</p><p className="auth-intro">Your existing trips are safe in the previous app. They have not been moved yet.</p><a className="button primary" href="https://roam-travel-ledger.kawingtam.chatgpt.site/">Open existing trips</a></>:<><p className="auth-intro">{mode==='signup'?'Your trips, receipts, and little adventures.':mode==='reset'?'We’ll email you a link to choose a new password.':mode==='recovery'?'Use at least 8 characters.':'Sign in to your trips.'}</p><form onSubmit={submit}>
 {mode==='signup'&&<label>Name<input name="name" autoComplete="name" required maxLength={100}/></label>}
 {mode!=='recovery'&&<label>Email<input name="email" type="email" autoComplete="email" required/></label>}
 {mode!=='reset'&&<label>Password<input name="password" type="password" autoComplete={mode==='signin'?'current-password':'new-password'} required minLength={mode==='signin'?1:8}/></label>}
 <button className="button primary" disabled={busy} type="submit">{busy?'Please wait…':mode==='signin'?'Sign in':mode==='signup'?'Create account':mode==='reset'?'Send reset link':'Save password'}</button>
 </form>{mode!=='recovery'&&<div className="auth-links"><button className="text-button" onClick={()=>{setMode(mode==='signin'?'signup':'signin');setError('');setMessage('');}}>{mode==='signin'?'Create an account':'Back to sign in'}</button>{mode==='signin'&&<button className="text-button" onClick={()=>{setMode('reset');setError('');setMessage('');}}>Forgot password?</button>}</div>}</>}
 {message&&<p className="auth-message" role="status">{message}</p>}{error&&<p className="auth-error" role="alert">{error}</p>}
 </main></>;
}
createRoot(document.getElementById('root')!).render(<App/>);
