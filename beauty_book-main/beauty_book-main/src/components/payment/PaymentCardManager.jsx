import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { CreditCard, Loader2, CheckCircle, Trash2, Star, Plus, X } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "");

const CARD_STYLE = {
  style: {
    base: {
      fontSize: "16px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#1f2937",
      "::placeholder": { color: "#9ca3af" },
      padding: "12px",
    },
    invalid: { color: "#ef4444" },
  },
};

// ── Stripe Card Element Form ─────────────────────────────────────────────────
function CardForm({ onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError("");

    try {
      // 1. Get SetupIntent from backend
      const { clientSecret } = await apiClient.callFunction("createSetupIntent");

      // 2. Confirm card setup
      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (stripeError) {
        setError(stripeError.message);
        setLoading(false);
        return;
      }

      // 3. Save card reference
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        onSuccess?.(setupIntent.payment_method);
        setSuccess(false);
      }, 1500);
    } catch (err) {
      console.error("[CardForm] Error:", err);
      setError(err.message || "Erreur lors de l'enregistrement");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center py-8 gap-3">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <p className="text-[15px] font-black text-gray-900">Carte enregistrée !</p>
        <p className="text-[12px] text-gray-400 font-medium">Vous pouvez l'utiliser pour vos prochains paiements</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-1 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/30 transition-all">
        <CardElement options={CARD_STYLE} />
      </div>

      {error && (
        <p className="text-[12px] text-red-500 font-medium text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-3.5 rounded-2xl bg-primary text-white text-[13px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        Enregistrer la carte
      </button>
    </form>
  );
}

// ── Saved Card Item ──────────────────────────────────────────────────────────
function SavedCardItem({ card, isDefault, onDelete, onSetDefault }) {
  const brandColors = {
    visa: "text-blue-600",
    mastercard: "text-orange-500",
    amex: "text-indigo-600",
    discover: "text-amber-600",
  };

  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all ${isDefault ? "border-primary bg-orange-50" : "border-gray-100 bg-white"}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDefault ? "bg-primary/10" : "bg-gray-100"}`}>
        <CreditCard className={`w-5 h-5 ${isDefault ? "text-primary" : brandColors[card.brand] || "text-gray-500"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-black text-gray-900 capitalize">{card.brand}</span>
          {isDefault && (
            <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Par défaut</span>
          )}
        </div>
        <p className="text-[12px] text-gray-400 font-medium">•••• •••• •••• {card.last4} · Exp {String(card.exp_month).padStart(2, "0")}/{String(card.exp_year).slice(-2)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!isDefault && (
          <button onClick={() => onSetDefault(card.id)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-primary transition-colors" title="Définir par défaut">
            <Star className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => onDelete(card.id)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors" title="Supprimer">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main PaymentCardManager Component ────────────────────────────────────────
export default function PaymentCardManager({ onCardSelected, selectedCardId }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const loadCards = async () => {
    try {
      const { cards: savedCards } = await apiClient.callFunction("getPaymentMethods");
      setCards(savedCards || []);
    } catch (err) {
      console.error("[PaymentCardManager] Load error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCards();
  }, []);

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await apiClient.callFunction("deletePaymentMethod", { id });
      setCards(prev => prev.filter(c => c.id !== id));
      if (selectedCardId === id) onCardSelected?.(null);
    } catch (err) {
      console.error("[PaymentCardManager] Delete error:", err);
    }
    setDeleting(null);
  };

  const handleSetDefault = async (id) => {
    try {
      await apiClient.callFunction("setDefaultPaymentMethod", { id });
      setCards(prev => prev.map(c => ({ ...c, is_default: c.id === id })));
    } catch (err) {
      console.error("[PaymentCardManager] SetDefault error:", err);
    }
  };

  const handleCardAdded = (paymentMethodId) => {
    setShowAddCard(false);
    loadCards();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Saved Cards */}
      {cards.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cartes enregistrées</p>
          <div className="space-y-2">
            {cards.map(card => (
              <div key={card.id} onClick={() => onCardSelected?.(card.id)} className="cursor-pointer">
                <SavedCardItem
                  card={card}
                  isDefault={card.is_default || selectedCardId === card.id}
                  onDelete={handleDelete}
                  onSetDefault={handleSetDefault}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Card */}
      {showAddCard ? (
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-black text-gray-700 uppercase tracking-widest">Nouvelle carte</p>
            <button onClick={() => setShowAddCard(false)} className="w-7 h-7 flex items-center justify-center text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          <Elements stripe={stripePromise}>
            <CardForm onSuccess={handleCardAdded} />
          </Elements>
        </div>
      ) : (
        <button
          onClick={() => setShowAddCard(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-gray-200 text-[12px] font-black text-gray-400 uppercase tracking-widest active:scale-95 transition-all hover:border-primary/30 hover:text-primary"
        >
          <Plus className="w-4 h-4" />
          Ajouter une carte
        </button>
      )}

      {cards.length === 0 && !showAddCard && (
        <p className="text-[11px] text-gray-400 font-medium text-center py-2">
          Aucune carte enregistrée. Ajoutez une carte pour payer plus vite.
        </p>
      )}
    </div>
  );
}
