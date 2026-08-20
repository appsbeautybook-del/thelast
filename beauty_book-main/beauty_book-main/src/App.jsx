import { Toaster } from "@/components/ui/toaster"
import React, { useEffect, useState, Component } from 'react';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from "framer-motion";

import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { entities } from '@/api/entities';
import { VoiceAgentProvider } from '@/lib/VoiceAgentContext';
import FloatingVoiceAgent from '@/components/voice/FloatingVoiceAgent';
import { LocaleProvider } from '@/lib/LocaleContext.jsx';
import { LocationProvider } from '@/contexts/LocationContext';
import { CallManager } from '@/components/call/CallManager';

// Appliquer la config apparence depuis la BDD au démarrage
entities.AppConfig.filter({ key: "appearance_config" }, "-created_at", 50).then(rows => {
  if (!rows[0]?.value) return;
  const { fontId, sizeId } = rows[0].value;
  const FONTS = {
    "plus-jakarta": { import: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap", css: "'Plus Jakarta Sans', sans-serif" },
    "inter": { import: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap", css: "'Inter', sans-serif" },
    "poppins": { import: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap", css: "'Poppins', sans-serif" },
    "nunito": { import: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap", css: "'Nunito', sans-serif" },
    "dm-sans": { import: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap", css: "'DM Sans', sans-serif" },
    "outfit": { import: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap", css: "'Outfit', sans-serif" },
  };
  const SIZES = { sm: 0.9, md: 1, lg: 1.1, xl: 1.2 };
  const font = FONTS[fontId];
  if (font) {
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = font.import;
    document.head.appendChild(link);
    document.documentElement.style.setProperty("--font-display", font.css);
  }
  if (sizeId && SIZES[sizeId]) {
    document.documentElement.style.fontSize = `${SIZES[sizeId] * 16}px`;
  }
}).catch(() => {});
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppShell from '@/components/layout/AppShell';
import Home from '@/pages/Home';
import Services from '@/pages/Services';
import ServicesSalons from '@/pages/ServicesSalons';
import Boutique from '@/pages/Boutique';
import RendezVous from '@/pages/RendezVous';
import Profil from '@/pages/Profil';
import Maria from '@/pages/Maria';
import ProfilPro from '@/pages/ProfilPro';
import DevenirPro from '@/pages/DevenirPro';
import BeautyPay from '@/pages/pro/BeautyPay';
import PaiementFacturation from '@/pages/pro/PaiementFacturation';
import CatalogueServices from '@/pages/pro/CatalogueServices';
import AjouterService from '@/pages/pro/AjouterService';
import AvisClients from '@/pages/pro/AvisClients.jsx';
import Equipe from '@/pages/pro/Equipe';
import NouveauMembre from '@/pages/pro/NouveauMembre';
import PlanningMembre from '@/pages/pro/PlanningMembre';
import Analytics from '@/pages/pro/Analytics';
import Publication from '@/pages/pro/Publication';
import VeoGenerator from '@/pages/pro/VeoGenerator';
import Visite3D from '@/pages/pro/Visite3D';
import Franchise from '@/pages/pro/Franchise';
import LancerDirect from '@/pages/pro/LancerDirect';
import ModifierProfilPro from '@/pages/pro/ModifierProfilPro';
import SocialMedia from '@/pages/SocialMedia';
import VueClient from '@/pages/pro/VueClient';
import Abonnements from '@/pages/pro/Abonnements';
import AbonnementsClient from '@/pages/AbonnementsClient';
import GestionAgenda from '@/pages/pro/GestionAgenda';
import HorairesConges from '@/pages/pro/HorairesConges';
import LiveFeed from '@/pages/LiveFeed';
import LiveDetail from '@/pages/LiveDetail';
import Reels from '@/pages/Reels';
import Immobilier from '@/pages/Immobilier';
import ImmobilierDetail from '@/pages/ImmobilierDetail';
import ServiceDetail from '@/pages/ServiceDetail';
import StyleDetail from '@/pages/StyleDetail';
import ModifierProfilClient from '@/pages/ModifierProfilClient';
import Parametres from '@/pages/Parametres';
import MesCommandes from '@/pages/MesCommandes';
import CommandeDetail from '@/pages/CommandeDetail';
import MonSolde from '@/pages/MonSolde';
import ProgrammeFidelite from '@/pages/ProgrammeFidelite';
import Onboarding from '@/pages/Onboarding';
import Connexion from '@/pages/Connexion';
import Reservation from '@/pages/Reservation';
import Securite from '@/pages/parametres/Securite';
import MoyensPaiement from '@/pages/parametres/MoyensPaiement';
import Notifications from '@/pages/parametres/Notifications';
import LangueMonnaie from '@/pages/parametres/LangueMonnaie';
import CentreAide from '@/pages/parametres/CentreAide';
import Confidentialite from '@/pages/parametres/Confidentialite';
import Conditions from '@/pages/parametres/Conditions';
import Contactez from '@/pages/parametres/Contactez';
import APropos from '@/pages/parametres/APropos';
import ProduitDetail from '@/pages/ProduitDetail';
import Messages from '@/pages/Messages';
import NotificationsPage from '@/pages/Notifications';
import Panier from '@/pages/Panier';
import GestionStyles from '@/pages/pro/GestionStyles';
import ParametresPro from '@/pages/pro/ParametresPro';
import PromoService from '@/pages/pro/PromoService';
import ScanCapillaire from '@/pages/ScanCapillaire';
import ReceptionnistIA from '@/pages/ReceptionnistIA';
import AIScalingBusiness from '@/pages/AIScalingBusiness';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminSignup from '@/pages/admin/AdminSignup';
import AdminDashboard from '@/pages/admin/AdminDashboard.jsx';
import VendeurDashboard from '@/pages/VendeurDashboard';
import VendeurLogin from '@/pages/VendeurLogin';
import VendeurSignup from '@/pages/VendeurSignup';
import OrderTracking from '@/pages/OrderTracking';
import Checkout from '@/pages/Checkout';
import SupprimerCompte from '@/pages/SupprimerCompte';
import MentionsLegales from '@/pages/parametres/MentionsLegales';
import PolitiqueConfidentialite from '@/pages/parametres/PolitiqueConfidentialite';
import MesDonnees from '@/pages/parametres/MesDonnees';
import CookieConsent from '@/components/CookieConsent';
import ShAI from '@/pages/ShAI';
import Explorer from '@/pages/Explorer';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import AuthCallback from '@/pages/AuthCallback';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, isAuthenticated, profile } = useAuth();
  const [onboarded, setOnboarded] = useState(() => !!localStorage.getItem("bb_onboarded"));

  const isSpecialRoute = window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/vendeur');

  // Sync avec localStorage — AuthCallback peut setter bb_onboarded après le montage
  useEffect(() => {
    const check = () => {
      if (localStorage.getItem("bb_onboarded") && !onboarded) {
        setOnboarded(true);
      }
    };
    // Vérifier immédiatement
    check();
    // Écouter les changements de route (navigate déclenche popstate)
    window.addEventListener('popstate', check);
    // Poll léger au cas où
    const interval = setInterval(check, 500);
    return () => {
      window.removeEventListener('popstate', check);
      clearInterval(interval);
    };
  }, [onboarded]);

  // Redirections automatiques selon le port local
  useEffect(() => {
    const port = window.location.port;
    const path = window.location.pathname;
    if (port === '5174' && path === '/') {
      window.location.href = '/admin';
    } else if (port === '5175' && path === '/') {
      window.location.href = '/vendeur';
    }
  }, []);

  // Si l'utilisateur est authentifié mais pas onboardé, vérifier le profil automatiquement
  useEffect(() => {
    if (!isAuthenticated || isSpecialRoute || onboarded) return;

    const checkProfile = async () => {
      try {
        const { supabase } = await import('@/api/supabaseClient');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Chercher le profil par ID ou email
        let profile = null;
        const { data: byId } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
        if (byId) { profile = byId; }
        else {
          const { data: byEmail } = await supabase.from('profiles').select('id').eq('email', user.email).maybeSingle();
          if (byEmail) { profile = byEmail; }
        }

        if (profile) {
          // Profil existant → marquer onboardé
          localStorage.setItem('bb_onboarded', '1');
          setOnboarded(true);
        }
        // Si pas de profil, laisse l'onboarding se faire
      } catch (e) {
        console.error('[App] Profile check error:', e);
      }
    };

    checkProfile();
  }, [isAuthenticated, profile, onboarded, isSpecialRoute]);

  // Afficher le loading UNIQUEMENT pour les routes normales (pas admin/vendeur)
  if (!isSpecialRoute && (isLoadingPublicSettings || isLoadingAuth)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  const hasOnboarded = onboarded || localStorage.getItem("bb_onboarded");

  // Redirect to onboarding if first time and not on a special route
  if (!hasOnboarded && !isSpecialRoute) {
    return (
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/connexion" element={<Connexion />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/services-salons" element={<ServicesSalons />} />
        <Route path="/boutique" element={<Boutique />} />
        <Route path="/rendez-vous" element={<RendezVous />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/maria" element={<Maria />} />
        <Route path="/profil-pro" element={<ProfilPro />} />
        <Route path="/devenir-pro" element={<DevenirPro />} />
        <Route path="/pro/beauty-pay" element={<BeautyPay />} />
        <Route path="/pro/paiement-facturation" element={<PaiementFacturation />} />
        <Route path="/pro/catalogue-services" element={<CatalogueServices />} />
        <Route path="/pro/ajouter-service" element={<AjouterService />} />
        <Route path="/pro/avis-clients" element={<AvisClients />} />
        <Route path="/pro/equipe" element={<Equipe />} />
        <Route path="/pro/planning-membre" element={<PlanningMembre />} />
        <Route path="/pro/nouveau-membre" element={<NouveauMembre />} />
        <Route path="/pro/analytics" element={<Analytics />} />
        <Route path="/pro/publication" element={<Publication />} />
        <Route path="/pro/veo-generator" element={<VeoGenerator />} />
        <Route path="/pro/visite-3d" element={<Visite3D />} />
        <Route path="/pro/franchise" element={<Franchise />} />
        <Route path="/pro/lancer-direct" element={<LancerDirect />} />
        <Route path="/pro/modifier-profil" element={<ModifierProfilPro />} />
        <Route path="/pro/vue-client" element={<VueClient />} />
        <Route path="/pro/abonnements" element={<Abonnements />} />
        <Route path="/abonnements" element={<AbonnementsClient />} />
        <Route path="/pro/gestion-agenda" element={<GestionAgenda />} />
        <Route path="/pro/horaires-conges" element={<HorairesConges />} />
        <Route path="/live" element={<LiveFeed />} />
        <Route path="/live-detail/:id" element={<LiveDetail />} />
        <Route path="/reels" element={<Reels />} />
        <Route path="/social-media" element={<SocialMedia />} />
        <Route path="/reseau-social" element={<Reels />} />
        <Route path="/immobilier" element={<Immobilier />} />
        <Route path="/immobilier/:id" element={<ImmobilierDetail />} />
        <Route path="/service/:id" element={<ServiceDetail />} />
        <Route path="/style/:id" element={<StyleDetail />} />
        <Route path="/modifier-profil-client" element={<ModifierProfilClient />} />
        <Route path="/parametres" element={<Parametres />} />
        <Route path="/mes-commandes" element={<MesCommandes />} />
        <Route path="/commande/:id" element={<CommandeDetail />} />
        <Route path="/mon-solde" element={<MonSolde />} />
        <Route path="/programme-fidelite" element={<ProgrammeFidelite />} />
        <Route path="/reservation" element={<Reservation />} />
        <Route path="/parametres/securite" element={<Securite />} />
        <Route path="/parametres/paiement" element={<MoyensPaiement />} />
        <Route path="/parametres/notifications" element={<Notifications />} />
        <Route path="/parametres/langue" element={<LangueMonnaie />} />
        <Route path="/parametres/aide" element={<CentreAide />} />
        <Route path="/parametres/confidentialite" element={<Confidentialite />} />
        <Route path="/parametres/conditions" element={<Conditions />} />
        <Route path="/parametres/contact" element={<Contactez />} />
        <Route path="/parametres/a-propos" element={<APropos />} />
        <Route path="/parametres/mentions-legales" element={<MentionsLegales />} />
        <Route path="/parametres/politique-confidentialite" element={<PolitiqueConfidentialite />} />
        <Route path="/parametres/mes-donnees" element={<MesDonnees />} />
        <Route path="/produit" element={<ProduitDetail />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/panier" element={<Panier />} />
        <Route path="/pro/gestion-styles" element={<GestionStyles />} />
        <Route path="/pro/parametres" element={<ParametresPro />} />
        <Route path="/pro/promo-service/:id" element={<PromoService />} />
        <Route path="/scan-capillaire" element={<ScanCapillaire />} />
        <Route path="/order-tracking" element={<OrderTracking />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/supprimer-compte" element={<SupprimerCompte />} />
        <Route path="/sh-ai" element={<ShAI />} />
        <Route path="/receptionniste-ia" element={<ReceptionnistIA />} />
        <Route path="/ai-scaling-business" element={<AIScalingBusiness />} />
        <Route path="/explorer" element={<Explorer />} />
        <Route path="/recherche-approfondie" element={<Services />} />
        <Route path="/a-propos" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Route>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/signup" element={<AdminSignup />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/vendeur" element={<Navigate to="/vendeur/dashboard" replace />} />
      <Route path="/vendeur/dashboard" element={<VendeurDashboard />} />
      <Route path="/vendeur/login" element={<VendeurLogin />} />
      <Route path="/vendeur/signup" element={<VendeurSignup />} />
      <Route path="*" element={<ModifierProfilPro />} />
    </Routes>
  );
};


function App() {
  return (
    <AppErrorBoundary>
    <AuthProvider>
      <LocationProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <LocaleProvider>
            <VoiceAgentProvider>
              <CallManager>
                <AuthenticatedApp />
                <CookieConsent />
              </CallManager>
              <FloatingVoiceAgent />
            </VoiceAgentProvider>
          </LocaleProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
      </LocationProvider>
    </AuthProvider>
    </AppErrorBoundary>
  )
}

class AppErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, textAlign: 'center', fontFamily: 'system-ui' }}>
          <p style={{ fontSize: 40, marginBottom: 16 }}>😅</p>
          <p style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Une erreur est survenue</p>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>{this.state.error.message || 'Erreur inconnue'}</p>
          <button onClick={() => window.location.reload()} style={{ background: '#E8732A', color: '#fff', fontSize: 14, fontWeight: 800, padding: '12px 32px', borderRadius: 16, border: 'none', cursor: 'pointer' }}>
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default App