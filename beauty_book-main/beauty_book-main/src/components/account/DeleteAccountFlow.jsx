import { useState } from "react";
import { Trash2, AlertTriangle, ChevronRight } from "lucide-react";
import { supabase } from '@/api/supabaseClient';
import { useAuth } from "@/lib/AuthContext";
import { deleteAccountData } from "@/lib/deleteAccount";

const REASONS = [
  "Je n'utilise plus l'application",
  "Je n'ai pas trouvé ce que je cherchais",
  "L'application a des problèmes techniques",
  "Je préfère une autre application",
  "Je souhaite protéger ma vie privée",
  "Mon compte a été compromis",
  "Autre raison",
];

/**
 * DeleteAccountFlow — bottom sheet en 2 étapes
 * Props:
 *   onClose: () => void
 */
export default function DeleteAccountFlow({ onClose }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1 = raisons, 2 = confirmation
  const [selectedReason, setSelectedReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "SUPPRIMER") return;
    setDeleting(true);
    try {
      const result = await deleteAccountData(user?.email, user?.id);
      console.log('[DeleteAccountFlow] Deletion result:', result);
    } catch (e) {
      console.error('[DeleteAccountFlow] Deletion error:', e);
    }
    localStorage.clear();
    supabase.auth.signOut().then(() => window.location.href = "/");
  };

  return (
    <div
      className="fixed inset-0 z-[400] flex items-end"
      onClick={() => { if (!deleting) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-t-3xl w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-4" />

        {/* ── Étape 1 : Raisons ── */}
        {step === 1 && (
          <div className="px-5 pt-4 pb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-[18px] font-black text-gray-900">Supprimer le compte</h3>
                <p className="text-[12px] text-gray-400 font-medium">Dites-nous pourquoi vous partez</p>
              </div>
            </div>

            <p className="text-[13px] text-gray-500 font-medium mb-4">
              Avant de continuer, sélectionnez la raison principale de votre départ. Votre avis nous aide à améliorer BeautyBook.
            </p>

            <div className="space-y-2 mb-6">
              {REASONS.map(reason => (
                <button
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all active:scale-[0.99] text-left ${
                    selectedReason === reason
                      ? "border-red-400 bg-red-50"
                      : "border-gray-100 bg-gray-50"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedReason === reason ? "border-red-400" : "border-gray-300"
                  }`}>
                    {selectedReason === reason && (
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    )}
                  </div>
                  <span className={`text-[14px] font-medium ${
                    selectedReason === reason ? "text-red-600 font-bold" : "text-gray-700"
                  }`}>{reason}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl border border-gray-200 text-[14px] font-black text-gray-600 active:scale-95 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!selectedReason}
                className="flex-1 py-4 rounded-2xl bg-red-500 text-white text-[14px] font-black active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Étape 2 : Confirmation ── */}
        {step === 2 && (
          <div className="px-5 pt-4 pb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-[18px] font-black text-gray-900">Dernière étape</h3>
                <p className="text-[12px] text-red-500 font-bold">Action irréversible</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4">
              <p className="text-[12px] font-black text-red-600 mb-1">Ce qui sera supprimé :</p>
              <p className="text-[12px] text-red-500 font-medium leading-relaxed">
                Profil client & pro · Services · Réservations · Messages · Commandes · Avis · Publications · Points fidélité
              </p>
            </div>

            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
              Tapez <span className="text-red-500">SUPPRIMER</span> pour confirmer
            </p>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="SUPPRIMER"
              className="w-full bg-gray-100 rounded-2xl px-4 py-3.5 text-[15px] font-bold text-gray-800 outline-none mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setStep(1); setConfirmText(""); }}
                disabled={deleting}
                className="flex-1 py-4 rounded-2xl border border-gray-200 text-[14px] font-black text-gray-600 active:scale-95 transition-all"
              >
                Retour
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== "SUPPRIMER" || deleting}
                className="flex-1 py-4 rounded-2xl bg-red-500 text-white text-[14px] font-black active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {deleting
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><Trash2 className="w-4 h-4" /> Supprimer</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}