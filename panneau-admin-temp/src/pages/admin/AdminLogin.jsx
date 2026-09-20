import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import apiClient from '@/lib/apiClient';

export default function AdminLogin(){
 const navigate=useNavigate();
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[visible,setVisible]=useState(false);
 const [error,setError]=useState(''),[loading,setLoading]=useState(false),[phase,setPhase]=useState('login');
 const [code,setCode]=useState(''),[factorId,setFactorId]=useState(''),[qr,setQr]=useState('');
 async function checkAccess(){
   try{await apiClient.get('/api/admin/session');navigate('/admin/dashboard',{replace:true});}
   catch(err){
     if(err.code!=='MFA_REQUIRED')throw err;
     const {data,error:factorError}=await supabase.auth.mfa.listFactors();
     if(factorError)throw factorError;
     const factor=data.totp?.find(f=>f.status==='verified');
     if(factor){setFactorId(factor.id);setPhase('mfa');}
     else setPhase('enroll');
   }
 }
 async function submit(event){
   event.preventDefault();setLoading(true);setError('');
   try{
     if(phase==='login'){
       const result=await apiClient.post('/auth/admin/login',{email:email.trim(),password});
       if(!result?.session?.access_token||!result?.session?.refresh_token)throw new Error('Session administrateur indisponible.');
       const {error:sessionError}=await supabase.auth.setSession({access_token:result.session.access_token,refresh_token:result.session.refresh_token});
       if(sessionError)throw sessionError;
       await checkAccess();
     }else{
       const {error:mfaError}=await supabase.auth.mfa.challengeAndVerify({factorId,code});
       if(mfaError)throw new Error('Code de vérification incorrect ou expiré.');
       await checkAccess();
     }
   }catch(err){
     const code=err?.code;
     setError(code==='ADMIN_INVITATION_REQUIRED'?'La création d’un compte administrateur se fait sur invitation.':code==='ADMIN_FORBIDDEN'?'Ce compte n’est pas habilité pour la console administrateur.':code==='BACKEND_NOT_CONFIGURED'?'Le serveur BeautyBook n’est pas encore configuré. Vérifiez la connexion à la base de données.':err.message||'Connexion administrateur impossible.');
   }finally{setLoading(false);}
 }
 async function enroll(){
   setLoading(true);setError('');
   try{
     const {data,error:enrollError}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'BeautyBook Administration'});
     if(enrollError)throw enrollError;
     setFactorId(data.id);setQr(data.totp.qr_code);setPhase('mfa');
   }catch(err){setError(err.message);}finally{setLoading(false);}
 }
 return <main className="min-h-screen bg-gray-950 text-white grid place-items-center p-6">
  <section className="w-full max-w-sm">
   <div className="mb-8"><ShieldCheck className="h-10 w-10 text-orange-400 mb-5"/><p className="text-xs uppercase tracking-widest text-orange-400">BeautyBook / Administration</p><h1 className="mt-3 text-3xl font-bold">{phase==='login'?'Votre console de pilotage':'Vérification de sécurité'}</h1><p className="mt-3 text-sm text-gray-400">Accès réservé aux comptes habilités. La création d’un compte se fait sur invitation.</p></div>
   {error&&<p role="alert" className="my-4 rounded-xl border border-red-800 bg-red-950 p-3 text-sm">{error}</p>}
   {phase==='enroll'?<div><p className="text-sm text-gray-300 mb-4">Protégez votre accès avec une application d’authentification.</p><button disabled={loading} onClick={enroll} className="min-h-12 rounded-xl bg-orange-600 p-3 font-bold">Activer la double authentification</button></div>:
   <form onSubmit={submit} className="space-y-5">
    {phase==='login'?<>
    <label className="block text-sm">Adresse email<input autoComplete="username" type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-700 bg-gray-900 p-3"/></label>
    <label className="block text-sm">Mot de passe<div className="relative mt-2"><input autoComplete="current-password" type={visible?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-xl border border-gray-700 bg-gray-900 p-3 pr-12"/><button type="button" aria-label={visible?'Masquer le mot de passe':'Afficher le mot de passe'} onClick={()=>setVisible(!visible)} className="absolute right-0 top-0 p-3">{visible?<EyeOff size={20}/>:<Eye size={20}/>}</button></div></label>
    </>:<>{qr&&<img src={qr.startsWith('data:')?qr:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qr)} alt="Code QR à scanner dans votre application d’authentification" className="w-48 h-48 bg-white p-3 rounded-xl"/>}<label className="block text-sm">Code de votre application<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-700 bg-gray-900 p-3 text-2xl tracking-widest"/></label></>}
    <button disabled={loading} className="flex w-full min-h-12 items-center justify-between rounded-xl bg-orange-600 p-4 font-bold disabled:opacity-50">{loading?'Vérification…':phase==='login'?'Se connecter':'Valider le code'}<ArrowRight size={18}/></button>
   </form>}
  </section>
 </main>;
}
