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

// Enregistrer le Service Worker pour les notifications push
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[SW] Registered:', registration.scope);
    } catch (error) {
      console.error('[SW] Registration failed:', error);
    }
  });
}

// Demander la permission pour les notifications au démarrage
if ('Notification' in window && Notification.permission === 'default') {
  // On attend 2 secondes avant de demander pour ne pas être intrusif
  setTimeout(() => {
    Notification.requestPermission();
  }, 2000);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)