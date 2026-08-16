import { useState } from "react";
import { Star, X, Loader, Heart, Coffee, Gift, MessageSquare, PenLine, CreditCard, Lock, CheckCircle2, ChevronLeft } from "lucide-react";
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';

const TIP_PRESETS = [0, 2, 5, 10];

export default function PostServiceReview({ reservation, proEmail, proName, onClose, onSubmitted }) {
  const [step, setStep] = useState("tip"); // "tip" → "payment" → "review" → "done"
  const [tipAmount, setTipAmount] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [note, setNote] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Payment form
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVC, setCardCVC] = useState("");
  const [cardName, setCardName] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  const totalAmount = (Number(reservation.total_price || reservation.service_price || 0)) + (customTip ? Number(customTip) : tipAmount);

  const handleTipConfirm = () => {
    setStep("payment");
  };

  const handleSkipTip = () => {
    setStep("review");
  };

  const formatCardNumber = (val) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 16);
    return cleaned.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (val) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 4);
    if (cleaned.length >= 3) return cleaned.slice(0, 2) + "/" + cleaned.slice(2);
    return cleaned;
  };

  const handlePayment = async () => {
    if (!cardNumber || !cardExpiry || !cardCVC || !cardName) return;
    setPaymentProcessing(true);
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Save tip if any
    const tip = customTip ? Number(customTip) : tipAmount;
    if (tip > 0) {
      try {
        await entities.Reservation.update(reservation.id, { tip_amount: tip });
      } catch (e) { console.error("Tip save error:", e); }
    }
    setPaymentProcessing(false);
    setPaymentDone(true);
    setTimeout(() => setStep("review"), 1500);
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

  const handleSkipReview = () => {
    setDone(true);
    setTimeout(() => { onSubmitted?.(); onClose?.(); }, 1500);
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
            <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-[13px] font-black text-green-700">Le service a été effectué ✓</p>
                <p className="text-[11px] text-green-600 font-medium">Merci pour votre confiance, vous êtes génial(e) !</p>
              </div>
            </div>
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

        {/* ── ÉTAPE PAIEMENT ── */}
        {step === "payment" && (
          <>
            {paymentDone ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-[18px] font-black text-gray-900">Paiement validé !</p>
                <p className="text-[13px] text-gray-400 font-medium mt-1">Transaction en cours de traitement...</p>
              </div>
            ) : (
              <>
                <button onClick={() => setStep("tip")} className="flex items-center gap-1 text-[12px] font-black text-gray-400 mb-4">
                  <ChevronLeft className="w-4 h-4" /> Retour
                </button>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="text-[20px] font-black text-gray-900 leading-tight">
                    Informations de paiement
                  </h3>
                  <p className="text-[13px] text-gray-400 font-medium mt-1">
                    Total à payer : <span className="font-black text-primary">{totalAmount.toFixed(2)}€</span>
                  </p>
                </div>

                <div className="space-y-3 mb-5">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nom sur la carte</p>
                    <input
                      type="text"
                      value={cardName}
                      onChange={e => setCardName(e.target.value)}
                      placeholder="JEAN DUPONT"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary/30 uppercase"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Numéro de carte</p>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary/30 tracking-wider"
                      />
                      <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Expiration</p>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/AA"
                        maxLength={5}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary/30 tracking-wider"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">CVC</p>
                      <div className="relative">
                        <input
                          type="text"
                          value={cardCVC}
                          onChange={e => setCardCVC(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="123"
                          maxLength={4}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary/30 tracking-wider"
                        />
                        <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 flex items-center gap-3 mb-5">
                  <Lock className="w-5 h-5 text-green-600 shrink-0" />
                  <p className="text-[11px] text-green-700 font-medium">Paiement sécurisé et chiffré</p>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={!cardNumber || !cardExpiry || !cardCVC || !cardName || paymentProcessing}
                  className="w-full py-4 rounded-2xl font-black text-[14px] uppercase tracking-widest text-white bg-primary flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
                >
                  {paymentProcessing ? (
                    <><Loader className="w-5 h-5 animate-spin" /> Traitement en cours...</>
                  ) : (
                    <><Lock className="w-5 h-5" /> Payer {totalAmount.toFixed(2)}€</>
                  )}
                </button>
              </>
            )}
          </>
        )}

        {/* ── ÉTAPE AVIS ── */}
        {step === "review" && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <PenLine className="w-7 h-7 text-primary" />
              </div>
              <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-1">Votre avis compte</p>
              <h3 className="text-[22px] font-black text-gray-900 leading-tight">
                Partagez votre<br />expérience ?
              </h3>
              <p className="text-[13px] text-gray-400 font-medium mt-1">{reservation.service_name} chez {proName || reservation.salon_name}</p>
            </div>

            {/* Étoiles */}
            <div className="flex justify-center gap-3 mb-2">
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

            {/* Commentaire — mis en avant */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <p className="text-[12px] font-black text-gray-700 uppercase tracking-widest">Votre commentaire</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/30 transition-all">
                <textarea
                  value={commentaire}
                  onChange={e => setCommentaire(e.target.value)}
                  placeholder="Décrivez votre expérience, ce que vous avez aimé, des conseils pour les futurs clients..."
                  rows={4}
                  className="w-full px-4 py-3.5 text-[14px] font-medium text-gray-700 outline-none resize-none bg-transparent placeholder:text-gray-300"
                />
                <div className="px-4 pb-3 flex items-center justify-between">
                  <p className="text-[10px] text-gray-300 font-medium">{commentaire.length}/500</p>
                  {commentaire.length > 10 && (
                    <span className="text-[10px] font-black text-green-500 flex items-center gap-1">
                      <Heart className="w-3 h-3 fill-green-500" /> Commentaire utile
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-gray-400 font-medium mt-2 text-center">
                Les commentaires aident les autres clients à choisir leur prestataire
              </p>
            </div>

            <button
              onClick={handleSubmitReview}
              disabled={note === 0 || saving}
              className="w-full py-4 rounded-2xl font-black text-[14px] uppercase tracking-widest text-white flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40 bg-primary"
            >
              {saving ? <><Loader className="w-4 h-4 animate-spin" />Envoi...</> : <>Confirmer mon avis ✓</>}
            </button>

            <button onClick={handleSkipReview} className="w-full text-center text-[11px] font-black text-gray-300 mt-3 uppercase tracking-widest">Plus tard</button>
          </>
        )}
      </div>
    </div>
  );
}
