import { createClient } from '@supabase/supabase-js';
import {Capacitor} from '@capacitor/core';

const url = import.meta.env.VITE_SUPABASE_URL || 'https://vimusrczrjvefsbljtmf.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbXVzcmN6cmp2ZWZzYmxqdG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5ODg1MDksImV4cCI6MjA5NzU2NDUwOX0.2fSiqWfYKs3fadwRkS9Nvdq9b9JqnsmtMTHg-wN5m6k';

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn('[Supabase] Using hardcoded fallback credentials for seller. Set VITE_SUPABASE_URL in your .env.local for production.');
}

export const configured = Boolean(url && key);
export const supabase = configured ? createClient(url, key, {
  auth: {
    storageKey: 'beautybook-seller-auth',
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
}) : null;

export async function api(path,{method='GET',body,requestKey}={}){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)throw new Error('Votre session a expiré. Reconnectez-vous.');
  const base=(import.meta.env.VITE_BACKEND_URL||'').replace(/\/+$/,'').replace(/\/api$/,'');
  if(Capacitor.isNativePlatform()&&!/^https:\/\//.test(base))throw new Error('Cette version mobile doit être configurée avec l’adresse HTTPS du serveur BeautyBook.');
  let response;
  try{response=await fetch(`${base}/api/seller${path}`,{
    method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,...(requestKey?{'Idempotency-Key':requestKey}:{})},
    body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000),
  });}catch{throw new Error('Connexion au serveur impossible. Réessayez lorsque votre connexion sera rétablie.');}
  const result=await response.json().catch(()=>({error:'Réponse serveur invalide.'}));
  if(!response.ok||result.error){const error=new Error(result.error||'L’opération a échoué.');error.code=result.code;error.status=response.status;throw error;}
  return result;
}

export async function uploadProductImage(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error('Choisissez une image JPG, PNG ou WebP de moins de 10 Mo.');
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)throw new Error('Connectez-vous pour ajouter une photo.');
  const extension={ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp' }[file.type];
  const path=`${user.id}/products/${crypto.randomUUID()}.${extension}`;
  const {error}=await supabase.storage.from('uploads').upload(path,file,{contentType:file.type,upsert:false});
  if(error)throw new Error('La photo n’a pas pu être enregistrée. Réessayez.');
  return supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl;
}
