import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
export default function AdminGuard({children}) {
 const [state,setState]=useState('loading');
 const [error,setError]=useState('');
 const navigate=useNavigate();
 useEffect(()=>{
   let active=true;
   apiClient.get('/api/admin/session').then(()=>{if(active)setState('ready');}).catch(err=>{
     if(!active)return;
     if(err.status===401 || err.code==='MFA_REQUIRED')navigate('/admin/login',{replace:true});
     else{setError(err.message);setState('error');}
   });
   return()=>{active=false;};
 },[navigate]);
 if(state==='loading')return <div role="status" className="p-8 text-center">Vérification des autorisations…</div>;
 if(state==='error')return <main className="p-8"><p role="alert">{error}</p><button onClick={()=>navigate('/admin/login')} className="p-3 underline">Revenir à la connexion</button></main>;
 return children;
}
