import { Outlet, useLocation, Link } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import MainHeader from "./MainHeader";
import BottomNav from "./BottomNav";
import { CallManager } from "@/components/call/CallManager";
import { useNativeNotifications } from "@/hooks/useNativeNotifications";
import { useAuth } from "@/lib/AuthContext";

const THEME_BG = {
  light: "#f8f9fa",
  dark:  "#1a1a2e",
  night: "#000000",
};

function getThemeBg() {
  return THEME_BG[localStorage.getItem("bb_theme") || "light"] || THEME_BG.light;
}

const SELF_SCROLL_PAGES = ["/services-salons", "/maria", "/reels", "/live", "/reseau-social", "/explorer"];

const FOOTER_HIDDEN_PATHS = [
  "/pro/", "/devenir-pro", "/reservation", "/modifier-profil",
  "/modifier-profil-client",
  "/programme-fidelite", "/messages", "/notifications",
  "/produit", "/service/", "/style/", "/immobilier/",
  "/live-detail/", "/panier", "/checkout", "/order-tracking",
  "/abonnements", "/scan-capillaire", "/sh-ai", "/supprimer-compte",
  "/connexion", "/onboarding", "/vendeur", "/admin",
  "/parametres/",
];

// Persist scroll position per path
const scrollPositions = {};

export default function AppShell() {
  const location = useLocation();
  const scrollRef = useRef(null);
  const showHeader = location.pathname === "/";
  const selfScroll = SELF_SCROLL_PAGES.includes(location.pathname);
  const [bgColor, setBgColor] = useState(getThemeBg);
  const { user } = useAuth();
  
  // Activer les notifications natives
  useNativeNotifications(user?.email);

  useEffect(() => {
    const handler = () => setBgColor(getThemeBg());
    window.addEventListener("bb-theme-change", handler);
    return () => window.removeEventListener("bb-theme-change", handler);
  }, []);

  // Save scroll position before leaving, restore when returning
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || selfScroll) return;

    const saved = scrollPositions[location.pathname] ?? 0;
    el.scrollTop = saved;

    return () => {
      scrollPositions[location.pathname] = el.scrollTop;
    };
  }, [location.pathname, selfScroll]);

  return (
    <CallManager>
    <div
      id="app-shell"
      className="w-full flex flex-col"
      style={{ height: "100dvh", maxHeight: "100dvh", overflow: "hidden", background: bgColor }}
    >
      {showHeader && <MainHeader />}

      <div
        ref={scrollRef}
        id="app-content"
        className={`flex-1 hide-scrollbar relative min-h-0 ${selfScroll ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden"}`}
        style={selfScroll ? { background: bgColor } : {
          background: bgColor,
          paddingBottom: "calc(84px + env(safe-area-inset-bottom, 0px))",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "contain",
        }}
      >
        <div className="w-full" style={selfScroll ? { height: "100%" } : { minHeight: "100%", background: bgColor }}>
          <Outlet />
        </div>


      </div>

      <BottomNav />
    </div>
    </CallManager>
  );
}