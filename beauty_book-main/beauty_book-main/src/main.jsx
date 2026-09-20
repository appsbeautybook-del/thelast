import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Override base44.integrations.Core.InvokeLLM → GLM backend
import '@/lib/base44Shim.js'

// Capacitor initialization (status bar, keyboard, splash screen)
import { initCapacitor } from '@/lib/capacitor-init'
initCapacitor();

// Appliquer le thème sauvegardé dès le démarrage
import { applyTheme } from "@/hooks/useTheme";
applyTheme(localStorage.getItem("bb_theme") || "light");

// Appliquer la langue sauvegardée dès le démarrage
import { setGlobalLang } from "@/hooks/useLocale";
setGlobalLang(localStorage.getItem("bb_lang") || "fr");

// Push registration is production-only. Development must never reuse cached modules.
if ('serviceWorker' in navigator) {
  if(import.meta.env.DEV){
    navigator.serviceWorker.getRegistrations().then(registrations=>Promise.all(registrations.filter(r=>new URL(r.scope).origin===location.origin&&new URL(r.active?.scriptURL||r.waiting?.scriptURL||r.installing?.scriptURL||location.href).pathname==='/sw.js').map(r=>r.unregister()))).catch(()=>{});
    caches.keys().then(names=>Promise.all(names.filter(name=>name.startsWith('beautybook-')).map(name=>caches.delete(name)))).catch(()=>{});
  }else window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).catch(()=>{});});
}
// Notification permission is requested only by the user's notification controls.

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)