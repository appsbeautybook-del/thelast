import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { Capacitor } from '@capacitor/core';

if(Capacitor.isNativePlatform()){
  import('@capacitor/status-bar').then(({StatusBar,Style})=>StatusBar.setStyle({style:Style.Dark})).catch(()=>{});
  import('@capacitor/app').then(({App:NativeApp})=>NativeApp.addListener('appUrlOpen',async({url})=>{
    const parsed=new URL(url);
    if(parsed.protocol!=='com.appsbeautybook.seller:'||parsed.host!=='auth')return;
    const code=parsed.searchParams.get('code');
    if(code){const {supabase}=await import('./api');const {error}=await supabase.auth.exchangeCodeForSession(code);if(error)window.dispatchEvent(new CustomEvent('auth-error',{detail:'Le lien de connexion a expiré.'}));}
  })).catch(()=>{});
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
