import { useState } from "react";
import { Star, X, Loader, Heart, Coffee, Gift } from "lucide-react";
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';

const TIP_PRESETS = [0, 2, 5, 10];

export default function PostServiceReview({ reservation, proEmail, proName, onClose, onSubmitted }) {
  const [step, setStep] = useState("tip"); // "tip" → "review" → "done"
  const [tipAmount, setTipAmount] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [note, setNote] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleTipConfirm = async () => {
    const amount = customTip ? Number(customTip) : tipAmount;
    if (amount > 0) {
      try {
        await entities.Reservation.update(reservation.id, { tip_amount: amount });
      } catch (e) { console.error("Tip save error:", e); }
    }
    setStep("review");
  };

  const handleSkipTip = () => {
    setStep("review");
  };

  const handleSubmitReview = async () => {
    if (note === 0) return;
    setSaving(true);
    const targetEmail = proEmail || reservation.pro_email;
    await entities.Avis.create({
      reservation_id: reservation.id,
      type: "client_to_pro",
      auteur_email: reservation.client_email,
      auteur_nom: reservation.client_email,
      cible_email: targetEmail,
      cible_nom: proName || reservation.pro_name,
      note,
      commentaire,
      service_nom: reservation.service_name,
    });
    try {
      const { data: avis } = await supabase.from("Avis").select("note").eq("cible_email", targetEmail);
      if (avis && avis.length > 0) {
        const avg = avis.reduce((s, a) => s + (a.note || 0), 0) / avis.length;
        await supabase.from("ProfilPro").update({ rating: Math.round(avg * 10) / 10, reviews_count: avis.length }).eq("user_email", targetEmail);
      }
    } catch (e) { console.error("Sync rating:", e); }
    setSaving(false);
    setDone(true);
    setTimeout(() => { onSubmitted?.(); onClose?.(); }, 2000);
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="bg-white rounded-3xl w-[90%] max-w-[360px] px-6 py-10 shadow-2xl text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-white fill-white" />
          </div>
          <p className="text-[18px] font-black text-gray-900">Merci !</p>
          <p className="text-[13px] text-gray-400 font-medium mt-1">Votre retour aide les autres clients.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full px-6 pt-5 pb-10 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-300">
          <X className="w-5 h-5" />
        </button>

        {/* ── ÉTAPE POURBOIRE ── */}
        {step === "tip" && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Coffee className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-[22px] font-black text-gray-900 leading-tight">
                Voulez-vous laisser<br />un pourboire ?
              </h3>
              <p className="text-[13px] text-gray-400 font-medium mt-1">
                {reservation.service_name} — {proName || reservation.salon_name}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4">
              {TIP_PRESETS.map(amount => (
                <button
                  key={amount}
                  onClick={() => { setTipAmount(amount); setCustomTip(""); }}
                  className={`py-4 rounded-2xl text-[16px] font-black transition-all active:scale-95 ${
                    tipAmount === amount && !customTip
                      ? "bg-primary text-white shadow-lg shadow-primary/30"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {amount === 0 ? "—" : `${amount}€`}
                </button>
              ))}
            </div>

            <div className="mb-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Montant libre</p>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.50"
                  value={customTip}
                  onChange={e => { setCustomTip(e.target.value); setTipAmount(0); }}
                  placeholder="Autre montant..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[16px] font-black text-gray-900 outline-none focus:ring-2 focus:ring-primary/30"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[16px] font-black text-gray-300">€</span>
              </div>
            </div>

            <button
              onClick={handleTipConfirm}
              className="w-full py-4 rounded-2xl font-black text-[14px] uppercase tracking-widest text-white bg-primary flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              Continuer
            </button>
            <button onClick={handleSkipTip} className="w-full text-center text-[11px] font-black text-gray-300 mt-3 uppercase tracking-widest">
              Non merci
            </button>
          </>
        )}

        {/* ── ÉTAPE AVIS ── */}
        {step === "review" && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Star className="w-7 h-7 text-primary" />
              </div>
              <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-1">Votre avis compte</p>
              <h3 className="text-[22px] font-black text-gray-900 leading-tight">
                Comment s'est passée<br />votre prestation ?
              </h3>
              <p className="text-[13px] text-gray-400 font-medium mt-1">{reservation.service_name} chez {proName || reservation.salon_name}</p>
            </div>

            {/* Étoiles */}
            <div className="flex justify-center gap-3 mb-6">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setNote(star)}
                  className="active:scale-110 transition-all"
                >
                  <Star
                    className="w-10 h-10 transition-all"
                    fill={(hovered || note) >= star ? "#E8732A" : "none"}
                    stroke={(hovered || note) >= star ? "#E8732A" : "#d1d5db"}
                  />
                </button>
              ))}
            </div>

            {note > 0 && (
              <p className="text-center text-[13px] font-black text-primary mb-4">
                {["", "Pas satisfait", "Peut mieux faire", "Correct", "Bien", "Excellent !"][note]}
              </p>
            )}

            {/* Commentaire */}
            <div className="mb-5">
              <textarea
                value={commentaire}
                onChange={e => setCommentaire(e.target.value)}
                placeholder="Décrivez votre expérience (optionnel)..."
                rows={3}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-medium text-gray-700 outline-none resize-none"
              />
            </div>

            <button
              onClick={handleSubmitReview}
              disabled={note === 0 || saving}
              className="w-full py-4 rounded-2xl font-black text-[14px] uppercase tracking-widest text-white flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40 bg-primary"
            >
              {saving ? <><Loader className="w-4 h-4 animate-spin" />Envoi...</> : <>Publier mon avis →</>}
            </button>

            <button onClick={onClose} className="w-full text-center text-[11px] font-black text-gray-300 mt-3 uppercase tracking-widest">Plus tard</button>
          </>
        )}
      </div>
    </div>
  );
}
