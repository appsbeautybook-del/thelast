import { useState, useCallback } from "react";
import { supabase } from "@/api/supabaseClient";

export function useAuthGate() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  const requireAuth = useCallback((message) => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        setAuthMessage(message || "Vous devez avoir un compte pour accéder à cette fonctionnalité.");
        setShowAuthModal(true);
        return false;
      }
      return true;
    }).catch(() => {
      setAuthMessage(message || "Vous devez avoir un compte pour accéder à cette fonctionnalité.");
      setShowAuthModal(true);
      return false;
    });
  }, []);

  const closeAuthModal = useCallback(() => setShowAuthModal(false), []);

  return { showAuthModal, authMessage, requireAuth, closeAuthModal };
}
