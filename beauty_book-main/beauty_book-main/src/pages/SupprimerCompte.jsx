import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from '@/api/supabaseClient';
import { useAuth } from "@/lib/AuthContext";
import { apiClient } from "@/lib/apiClient";
import { deleteAccountData } from "@/lib/deleteAccount";

const RAISONS = [
  { id: "utilise_pas", emoji: "😴", label: "Je n'utilise plus l'application", desc: "Je ne trouve plus l'intérêt de l'utiliser" },
  { id: "autre_app", emoji: "🔄", label: "J'utilise une autre application", desc: "J'ai trouvé une meilleure alternative" },
  { id: "trop_chere", emoji: "💸", label: "L'abonnement est trop cher", desc: "Le rapport qualité/prix ne me convient pas" },
  { id: "confidentialite", emoji: "🔒", label: "Problèmes de confidentialité", desc: "Je ne veux plus que mes données soient stockées" },
  { id: "bugs", emoji: "🐛", label: "Trop de bugs et problèmes", desc: "L'application ne fonctionne pas correctement" },
  { id: "manque_fonc", emoji: "⚙️", label: "Manque de fonctionnalités", desc: "L'app ne répond pas à mes besoins" },
  { id: "compte_double", emoji: "👥", label: "J'ai un compte en double", desc: "Je veux garder uniquement un compte" },
  { id: "autre", emoji: "✏️", label: "Autre raison", desc: "Une raison non listée ci-dessus" },
];

const STEP_RAISON = "raison";
const STEP_FEEDBACK = "feedback";
const STEP_CONFIRM = "confirm";
const STEP_DELAI = "delai";

export default function SupprimerCompte() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(STEP_RAISON);
  const [selectedRaison, setSelectedRaison] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [countdown, setCountdown] = useState(15);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const handleNextFromRaison = () => {
    if (!selectedRaison) return;
    setStep(STEP_FEEDBACK);
  };

  const handleNextFromFeedback = () => {
    setStep(STEP_CONFIRM);
  };

  const handleConfirm = () => {
    setStep(STEP_DELAI);
    let count = 15;
    const timer = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        handleDelete();
      }
    }, 1000);
  };

  const handleDelete = async () => {
    setDeleting(true);
    // Envoyer le feedback avant suppression
    try {
      await apiClient.callFunction("sendFeedbackEmail", {
        to: "support@beautybook.fr",
        subject: `Suppression de compte - ${user?.email}`,
        body: `Utilisateur: ${user?.full_name} (${user?.email})\nRaison: ${RAISONS.find(r => r.id === selectedRaison)?.label}\nFeedback: ${feedback}`,
      });
    } catch (_) {}

    // Supprimer toutes les données utilisateur de Supabase
    try {
      const result = await deleteAccountData(user?.email, user?.id);
      console.log('[SupprimerCompte] Deletion result:', result);
    } catch (e) {
      console.error('[SupprimerCompte] Deletion error:', e);
    }

    // Nettoyage local et déconnexion
    localStorage.removeItem("bb_onboarded");
    localStorage.removeItem("bb_saved_accounts");
    localStorage.removeItem("bb_is_pro");
    setDeleted(true);
    setDeleting(false);
    setTimeout(() => {
      supabase.auth.signOut().then(() => window.location.href = "/");
    }, 2500);
  };

  if (deleted) {
    return (
      <div className="font-display min-h-screen bg-white flex flex-col items-center justify-center px-8 text-center gap-6">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <div>
          <h2 className="text-[22px] font-black text-gray-900 mb-2">Compte supprimé</h2>
          <p className="text-[14px] text-gray-400 font-medium">Merci pour votre feedback. Nous espérons vous revoir bientôt 💔</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-display min-h-screen bg-[#f5f5f5]">

      {/* Header */}
      <div className="bg-white px-5 pt-5 pb-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button onClick={() => step === STEP_RAISON ? navigate(-1) : setStep(STEP_RAISON)}
          className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-[18px] font-black text-gray-900">Supprimer mon compte</h1>
      </div>

      {/* Étape 1 — Raison */}
      {step === STEP_RAISON && (
        <div className="px-4 pb-32 pt-4">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 mb-6">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[13px] text-red-500 font-medium leading-relaxed">
              La suppression est <strong>définitive</strong>. Toutes vos réservations, photos et données seront effacées.
            </p>
          </div>

          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">
            Pourquoi souhaitez-vous partir ?
          </p>

          <div className="space-y-2">
            {RAISONS.map((raison) => (
              <button
                key={raison.id}
                onClick={() => setSelectedRaison(raison.id)}
                className={`w-full flex items-center gap-4 rounded-2xl p-4 border-2 transition-all active:scale-[0.99] text-left ${
                  selectedRaison === raison.id
                    ? "bg-red-50 border-red-300"
                    : "bg-white border-transparent"
                }`}
              >
                <span className="text-[24px] shrink-0">{raison.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] font-black leading-tight ${selectedRaison === raison.id ? "text-red-600" : "text-gray-900"}`}>
                    {raison.label}
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">{raison.desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                  selectedRaison === raison.id ? "border-red-400 bg-red-400" : "border-gray-200"
                }`}>
                  {selectedRaison === raison.id && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            ))}
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-gray-100 shadow-lg">
            <button
              onClick={handleNextFromRaison}
              disabled={!selectedRaison}
              className="w-full bg-red-500 text-white font-black text-[15px] py-4 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100"
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {/* Étape 2 — Feedback */}
      {step === STEP_FEEDBACK && (
        <div className="px-4 pb-32 pt-4">
          <div className="bg-white rounded-2xl p-5 mb-4">
            <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-1">Raison sélectionnée</p>
            <div className="flex items-center gap-3">
              <span className="text-[22px]">{RAISONS.find(r => r.id === selectedRaison)?.emoji}</span>
              <p className="text-[15px] font-black text-gray-900">{RAISONS.find(r => r.id === selectedRaison)?.label}</p>
            </div>
          </div>

          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
            Dites-nous comment améliorer BeautyBook
          </p>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Votre avis nous aide à nous améliorer... (optionnel)"
              rows={5}
              className="w-full bg-transparent text-[14px] text-gray-700 outline-none placeholder:text-gray-300 resize-none leading-relaxed"
            />
          </div>

          <p className="text-[12px] text-gray-400 font-medium text-center">
            🙏 Votre retour est précieux pour nous aider à évoluer
          </p>

          <div className="fixed bottom-0 left-0 right-0 bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-gray-100 shadow-lg flex gap-3">
            <button
              onClick={handleNextFromFeedback}
              className="flex-1 bg-gray-100 text-gray-600 font-black text-[14px] py-4 rounded-2xl active:scale-[0.98] transition-all"
            >
              Passer
            </button>
            <button
              onClick={handleNextFromFeedback}
              className="flex-1 bg-red-500 text-white font-black text-[14px] py-4 rounded-2xl active:scale-[0.98] transition-all"
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {/* Étape 3 — Confirmation */}
      {step === STEP_CONFIRM && (
        <div className="px-4 pb-32 pt-6 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-5">
            <AlertTriangle className="w-12 h-12 text-red-400" />
          </div>

          <h2 className="text-[24px] font-black text-gray-900 mb-2">Êtes-vous sûr(e) ?</h2>
          <p className="text-[14px] text-gray-400 font-medium leading-relaxed max-w-xs mb-8">
            Cette action est <strong className="text-gray-700">irréversible</strong>. Toutes vos données, réservations et photos seront définitivement supprimées.
          </p>

          <div className="w-full bg-white rounded-2xl p-4 border border-gray-100 text-left space-y-3 mb-8">
            {[
              "Toutes vos réservations seront annulées",
              "Votre historique et vos photos seront effacés",
              "Vos points de fidélité seront perdus",
              "Vous ne pourrez plus récupérer ce compte",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-red-500 text-[10px] font-black">✕</span>
                </div>
                <p className="text-[13px] text-gray-600 font-medium">{item}</p>
              </div>
            ))}
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-gray-100 shadow-lg space-y-3">
            <button
              onClick={handleConfirm}
              className="w-full bg-red-500 text-white font-black text-[15px] py-4 rounded-2xl active:scale-[0.98] transition-all"
            >
              Oui, supprimer mon compte
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-full bg-gray-100 text-gray-600 font-black text-[15px] py-4 rounded-2xl active:scale-[0.98] transition-all"
            >
              Non, garder mon compte
            </button>
          </div>
        </div>
      )}

      {/* Étape 4 — Délai 15 secondes */}
      {step === STEP_DELAI && (
        <div className="px-4 pb-32 pt-6 flex flex-col items-center text-center">
          <div className="relative w-28 h-28 mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#fee2e2" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="#ef4444" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (countdown / 15)}`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[32px] font-black text-red-500">{countdown}</span>
            </div>
          </div>

          <h2 className="text-[22px] font-black text-gray-900 mb-2">Suppression en cours…</h2>
          <p className="text-[14px] text-gray-400 font-medium leading-relaxed max-w-xs mb-2">
            Votre compte sera supprimé dans <strong className="text-red-500">{countdown} seconde{countdown > 1 ? "s" : ""}</strong>.
          </p>
          <p className="text-[12px] text-gray-300 font-medium">Fermez simplement cette page pour annuler.</p>

          {deleting && (
            <div className="mt-8 flex items-center gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[13px] font-medium">Suppression en cours…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}