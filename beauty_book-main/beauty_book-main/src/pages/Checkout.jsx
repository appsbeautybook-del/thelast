import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from "@/lib/AuthContext";
import { apiClient } from '@/lib/apiClient';
import { useAuthGate } from "@/hooks/useAuthGate";
import AuthModal from "@/components/ui/AuthModal";
import {
  ArrowLeft, Shield, Truck, Lock, Check, Loader2, CreditCard,
  MapPin, User, ChevronRight, Package, Phone, Mail, Globe,
  Home, Building2, Hash, Wallet, X
} from "lucide-react";

const COUNTRIES = [
  { code: "FR", label: "France" },
  { code: "BE", label: "Belgique" },
  { code: "CH", label: "Suisse" },
  { code: "LU", label: "Luxembourg" },
  { code: "CA", label: "Canada" },
  { code: "MA", label: "Maroc" },
  { code: "SN", label: "Sénégal" },
  { code: "CI", label: "Côte d'Ivoire" },
  { code: "CM", label: "Cameroun" },
];

function InputField({ label, icon: Icon, type = "text", value, onChange, placeholder, required }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
        {Icon && <Icon className="w-3 h-3" />}
        {label}{required && <span className="text-primary">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 outline-none focus:border-primary focus:bg-white transition-all placeholder:text-gray-300"
      />
    </div>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showAuthModal, authMessage, requireAuth, closeAuthModal } = useAuthGate();
  const urlParams = new URLSearchParams(window.location.search);
  const variantId = decodeURIComponent(urlParams.get("variantId") || "");
  const productTitle = decodeURIComponent(urlParams.get("title") || "Produit");
  const productImg = decodeURIComponent(urlParams.get("img") || "");
  const productPrice = urlParams.get("price") || "0";
  const productBrand = decodeURIComponent(urlParams.get("brand") || "");
  const variantTitle = decodeURIComponent(urlParams.get("variant") || "");

  const isInIframe = window.self !== window.top;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    email: "", phone: "",
    firstName: "", lastName: "",
    address1: "", address2: "",
    city: "", zip: "",
    country: "FR",
    saveInfo: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [orderSummary, setOrderSummary] = useState(null);

  // Wallet state
  const [walletSolde, setWalletSolde] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [payingWithWallet, setPayingWithWallet] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("shopify");
  const [orderSuccess, setOrderSuccess] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const totalPrice = parseFloat(productPrice).toFixed(2);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        requireAuth("Connectez-vous pour finaliser votre achat.");
      }
    }).catch(() => requireAuth("Connectez-vous pour finaliser votre achat."));
  }, []);

  // Load wallet balance
  useEffect(() => {
    if (!user?.email) return;
    loadWallet();
  }, [user]);

  const loadWallet = async () => {
    setWalletLoading(true);
    try {
      const records = await entities.SoldeBeautyPay.filter({ user_email: user.email }, "-created_at", 1).catch(() => []);
      if (records.length > 0) {
        setWalletSolde(records[0]);
      } else {
        const newRecord = await entities.SoldeBeautyPay.create({
          user_email: user.email,
          solde: 0,
          transactions: [],
        }).catch(() => null);
        setWalletSolde(newRecord || { solde: 0, transactions: [] });
      }
    } catch (e) {
      console.error("[Checkout] load wallet error", e);
    }
    setWalletLoading(false);
  };

  const handleContinueToPayment = async () => {
    if (!form.email || !form.firstName || !form.lastName || !form.address1 || !form.city || !form.zip) {
      setError("Veuillez remplir tous les champs obligatoires (*).");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError("Adresse email invalide.");
      return;
    }
    setError(null);
    setLoading(true);

    if (isInIframe) {
      const numericId = variantId.split("/").pop();
      const shopDomain = import.meta.env.VITE_SHOPIFY_DOMAIN || 'hwqnwb-hi.myshopify.com';
      const shopifyUrl = `https://${shopDomain}/cart/${numericId}:1?checkout[email]=${encodeURIComponent(form.email)}&checkout[shipping_address][first_name]=${encodeURIComponent(form.firstName)}&checkout[shipping_address][last_name]=${encodeURIComponent(form.lastName)}&checkout[shipping_address][address1]=${encodeURIComponent(form.address1)}&checkout[shipping_address][city]=${encodeURIComponent(form.city)}&checkout[shipping_address][zip]=${encodeURIComponent(form.zip)}&checkout[shipping_address][country]=${encodeURIComponent(form.country)}`;
      setCheckoutUrl(shopifyUrl);
      setOrderSummary({ total: productPrice, subtotal: productPrice, currency: "EUR" });
      setStep(2);
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.callFunction("createShopifyCheckout", {
        variantId,
        quantity: 1,
        email: form.email,
        phone: form.phone || "",
        firstName: form.firstName,
        lastName: form.lastName,
        address1: form.address1,
        address2: form.address2 || "",
        city: form.city,
        zip: form.zip,
        country: form.country,
      });

      const data = res.data;
      if (data?.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl);
        setOrderSummary({
          total: data.total || productPrice,
          subtotal: data.subtotal || productPrice,
          currency: data.currency || "EUR",
        });
        setStep(2);
      } else if (data?.error) {
        setError("Erreur Shopify : " + data.error);
      } else {
        setError("Impossible de créer le checkout. Réessayez.");
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || "Erreur réseau.";
      setError("Erreur : " + msg);
    }
    setLoading(false);
  };

  const handlePayShopify = () => {
    if (checkoutUrl) {
      window.open(checkoutUrl, "_blank");
    }
  };

  const handlePayWithWallet = async () => {
    const solde = walletSolde?.solde || 0;
    const amount = parseFloat(totalPrice);

    if (solde < amount) {
      setError(`Solde insuffisant. Vous avez ${solde.toFixed(2)}€ mais le coût est de ${amount.toFixed(2)}€.`);
      return;
    }

    setPayingWithWallet(true);
    setError(null);

    try {
      const newTx = {
        id: Date.now().toString(),
        label: `Achat: ${productTitle}`,
        date: new Date().toISOString(),
        amount: -amount,
        type: "debit",
        category: "paiement",
        product_name: productTitle,
        variant_id: variantId,
      };

      const updated = {
        solde: solde - amount,
        transactions: [newTx, ...(walletSolde.transactions || [])],
      };

      await entities.SoldeBeautyPay.update(walletSolde.id, updated);

      // Create order record
      await entities.Commande.create({
        user_email: user.email,
        client_email: form.email,
        client_name: `${form.firstName} ${form.lastName}`,
        items: [{ title: productTitle, price: amount, img: productImg, brand: productBrand }],
        total_price: amount,
        total: amount,
        subtotal: amount,
        shipping: 0,
        status: "confirmee",
        payment_status: "paye",
        payment_method: "beauty_wallet",
        shipping_address: {
          firstName: form.firstName,
          lastName: form.lastName,
          address1: form.address1,
          address2: form.address2,
          city: form.city,
          zip: form.zip,
          country: form.country,
        },
      }).catch(() => {});

      setWalletSolde(prev => ({ ...prev, ...updated }));
      setOrderSuccess(true);
    } catch (e) {
      console.error("[Checkout] wallet payment error", e);
      setError("Erreur lors du paiement. Réessayez.");
    }
    setPayingWithWallet(false);
  };

  // Order success screen
  if (orderSuccess) {
    return (
      <div className="font-display bg-[#f5f5f5] min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
          <Check className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-[22px] font-black text-gray-900 mb-2">Commande confirmée!</h1>
        <p className="text-[14px] text-gray-500 font-medium text-center mb-1">
          {productTitle} a été commandé avec succès.
        </p>
        <p className="text-[13px] text-green-600 font-bold mb-6">
          {parseFloat(totalPrice).toFixed(2)}€ débités de votre Beauty Wallet
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/mes-commandes")}
            className="px-6 py-3 bg-primary text-white rounded-2xl text-[13px] font-black uppercase tracking-wider active:scale-95"
          >
            Voir mes commandes
          </button>
          <button
            onClick={() => navigate("/boutique")}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl text-[13px] font-black uppercase tracking-wider active:scale-95"
          >
            Continuer les achats
          </button>
        </div>
      </div>
    );
  }

  if (!variantId) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-6">
        <Package className="w-12 h-12 text-gray-200" />
        <p className="text-gray-400 font-medium text-center">Aucun produit sélectionné</p>
        <button onClick={() => navigate(-1)} className="text-primary font-black text-[14px]">← Retour</button>
      </div>
    );
  }

  const walletSoldeAmount = walletSolde?.solde || 0;
  const canPayWithWallet = walletSoldeAmount >= parseFloat(totalPrice);

  return (
    <div className="font-display bg-[#f5f5f5] min-h-screen pb-48">
      <AuthModal open={showAuthModal} onClose={closeAuthModal} message={authMessage} />

      {/* ── Header ── */}
      <div className="bg-white px-4 py-4 flex items-center gap-3 sticky top-0 z-30 border-b border-gray-100 shadow-sm">
        <button
          onClick={() => step === 2 ? setStep(1) : navigate(-1)}
          className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-[16px] font-black text-gray-900">
            {step === 1 ? "Informations de livraison" : "Récapitulatif & Paiement"}
          </h1>
          <div className="flex items-center gap-1 mt-0.5">
            <Lock className="w-2.5 h-2.5 text-green-500" />
            <span className="text-[10px] text-green-600 font-bold">Paiement sécurisé</span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
          <Shield className="w-3 h-3 text-green-600" />
          <span className="text-[10px] font-black text-green-700">SSL</span>
        </div>
      </div>

      {/* ── Progress ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="flex items-center gap-2 max-w-sm mx-auto">
          <div className="flex items-center gap-1.5">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${step >= 1 ? "bg-primary text-white" : "bg-gray-100 text-gray-400"}`}>
              {step > 1 ? <Check className="w-3 h-3" /> : "1"}
            </div>
            <span className={`text-[11px] font-bold ${step >= 1 ? "text-gray-900" : "text-gray-400"}`}>Livraison</span>
          </div>
          <div className={`flex-1 h-px transition-all ${step >= 2 ? "bg-primary" : "bg-gray-200"}`} />
          <div className="flex items-center gap-1.5">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${step >= 2 ? "bg-primary text-white" : "bg-gray-100 text-gray-400"}`}>
              2
            </div>
            <span className={`text-[11px] font-bold ${step >= 2 ? "text-gray-900" : "text-gray-400"}`}>Paiement</span>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto">

        {/* ── Product card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
            {productImg
              ? <img src={productImg} alt={productTitle} className="w-full h-full object-cover" />
              : <Package className="w-8 h-8 text-gray-200 m-auto mt-4" />}
          </div>
          <div className="flex-1 min-w-0">
            {productBrand && <p className="text-[10px] font-black text-primary uppercase tracking-widest">{productBrand}</p>}
            <p className="text-[13px] font-bold text-gray-900 leading-tight line-clamp-2">{productTitle}</p>
            {variantTitle && variantTitle !== "Default Title" && (
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">{variantTitle}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[18px] font-black text-gray-900">{totalPrice} €</p>
            <p className="text-[10px] text-gray-400">x1</p>
          </div>
        </div>

        {/* ── STEP 1: FORM ── */}
        {step === 1 && (
          <>
            {/* Contact */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 pb-1">
                <div className="w-7 h-7 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                </div>
                <h2 className="text-[14px] font-black text-gray-900">Contact</h2>
              </div>
              <InputField label="E-mail ou numéro de portable" icon={Mail} type="email" value={form.email} onChange={v => set("email", v)} placeholder="nom@exemple.fr" required />
              <InputField label="Téléphone" icon={Phone} type="tel" value={form.phone} onChange={v => set("phone", v)} placeholder="+33 6 00 00 00 00" />
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => set("saveInfo", !form.saveInfo)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${form.saveInfo ? "bg-primary border-primary" : "border-gray-300"}`}
                >
                  {form.saveInfo && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </div>
                <span className="text-[12px] text-gray-500 font-medium">Sauvegarder mes coordonnées pour la prochaine fois</span>
              </label>
            </div>

            {/* Livraison */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 pb-1">
                <div className="w-7 h-7 bg-blue-50 rounded-xl flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <h2 className="text-[14px] font-black text-gray-900">Livraison</h2>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <Globe className="w-3 h-3" /> Pays/Région
                </label>
                <select
                  value={form.country}
                  onChange={e => set("country", e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 outline-none focus:border-primary focus:bg-white transition-all"
                >
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InputField label="Prénom" icon={User} value={form.firstName} onChange={v => set("firstName", v)} placeholder="Marie" required />
                <InputField label="Nom" value={form.lastName} onChange={v => set("lastName", v)} placeholder="Dupont" required />
              </div>

              <InputField label="Adresse" icon={Home} value={form.address1} onChange={v => set("address1", v)} placeholder="12 rue de la Paix" required />
              <InputField label="Appartement, suite, etc. (optionnel)" icon={Building2} value={form.address2} onChange={v => set("address2", v)} placeholder="Apt 3B" />

              <div className="grid grid-cols-2 gap-3">
                <InputField label="Code postal" icon={Hash} value={form.zip} onChange={v => set("zip", v)} placeholder="75001" required />
                <InputField label="Ville" value={form.city} onChange={v => set("city", v)} placeholder="Paris" required />
              </div>
            </div>

            {/* Mode expédition */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-green-50 rounded-xl flex items-center justify-center">
                  <Truck className="w-3.5 h-3.5 text-green-600" />
                </div>
                <h2 className="text-[14px] font-black text-gray-900">Mode d'expédition</h2>
              </div>
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                <div>
                  <p className="text-[13px] font-black text-green-800">Livraison standard</p>
                  <p className="text-[11px] text-green-600 font-medium">5 à 10 jours ouvrés</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-black text-green-700">Gratuite</span>
                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <p className="text-[12px] text-red-600 font-medium">{error}</p>
              </div>
            )}
          </>
        )}

        {/* ── STEP 2: RECAP + PAY ── */}
        {step === 2 && orderSummary && (
          <>
            {/* Adresse recap */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-black text-gray-700">Adresse de livraison</p>
                <button onClick={() => setStep(1)} className="text-[11px] font-black text-primary">Modifier</button>
              </div>
              <div className="space-y-0.5">
                <p className="text-[13px] font-bold text-gray-900">{form.firstName} {form.lastName}</p>
                <p className="text-[12px] text-gray-500">{form.address1}{form.address2 ? `, ${form.address2}` : ""}</p>
                <p className="text-[12px] text-gray-500">{form.zip} {form.city}, {COUNTRIES.find(c => c.code === form.country)?.label}</p>
                <p className="text-[12px] text-gray-500">{form.email}</p>
                {form.phone && <p className="text-[12px] text-gray-500">{form.phone}</p>}
              </div>
            </div>

            {/* Order total */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <p className="text-[13px] font-black text-gray-700">Récapitulatif de commande</p>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500 font-medium">Sous-total</span>
                <span className="font-bold text-gray-900">{parseFloat(orderSummary.subtotal).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500 font-medium">Expédition</span>
                <span className="font-black text-green-600">Gratuite</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                <span className="text-[15px] font-black text-gray-900">Total</span>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400">EUR </span>
                  <span className="text-[22px] font-black text-primary">{parseFloat(orderSummary.total).toFixed(2)} €</span>
                </div>
              </div>
            </div>

            {/* Wallet balance */}
            {!walletLoading && (
              <div className={`rounded-2xl border shadow-sm p-4 ${canPayWithWallet ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${canPayWithWallet ? "bg-green-100" : "bg-gray-200"}`}>
                      <Wallet className={`w-5 h-5 ${canPayWithWallet ? "text-green-600" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-gray-900">Beauty Wallet</p>
                      <p className={`text-[12px] font-bold ${canPayWithWallet ? "text-green-600" : "text-gray-400"}`}>
                        Solde: {walletSoldeAmount.toFixed(2)}€
                      </p>
                    </div>
                  </div>
                  {!canPayWithWallet && (
                    <button
                      onClick={() => navigate("/mon-solde")}
                      className="px-4 py-2 bg-primary text-white rounded-xl text-[11px] font-black uppercase tracking-wider active:scale-95"
                    >
                      Recharger
                    </button>
                  )}
                </div>
                {!canPayWithWallet && (
                  <p className="text-[11px] text-gray-400 mt-2">
                    Il vous manque {(parseFloat(totalPrice) - walletSoldeAmount).toFixed(2)}€ pour payer avec votre portefeuille
                  </p>
                )}
              </div>
            )}

            {/* Payment methods */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gray-700" />
                <p className="text-[13px] font-black text-gray-700">Choisir le mode de paiement</p>
              </div>

              {/* Wallet option */}
              {!walletLoading && (
                <button
                  onClick={() => setPaymentMethod("wallet")}
                  disabled={!canPayWithWallet}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                    paymentMethod === "wallet" && canPayWithWallet
                      ? "border-green-500 bg-green-50"
                      : canPayWithWallet
                        ? "border-gray-200 bg-white hover:border-green-300"
                        : "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === "wallet" && canPayWithWallet ? "bg-green-500" : "bg-green-100"}`}>
                    <Wallet className={`w-5 h-5 ${paymentMethod === "wallet" && canPayWithWallet ? "text-white" : "text-green-600"}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[13px] font-black text-gray-900">Payer avec Beauty Wallet</p>
                    <p className="text-[11px] text-gray-400">Débit instantané · {walletSoldeAmount.toFixed(2)}€ disponible</p>
                  </div>
                  {paymentMethod === "wallet" && canPayWithWallet && (
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              )}

              {/* Shopify option */}
              <button
                onClick={() => setPaymentMethod("shopify")}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                  paymentMethod === "shopify"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 bg-white hover:border-primary/30"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === "shopify" ? "bg-primary" : "bg-primary/10"}`}>
                  <CreditCard className={`w-5 h-5 ${paymentMethod === "shopify" ? "text-white" : "text-primary"}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[13px] font-black text-gray-900">Carte bancaire / Apple Pay / PayPal</p>
                  <p className="text-[11px] text-gray-400">Via Shopify · Paiement sécurisé</p>
                </div>
                {paymentMethod === "shopify" && (
                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <p className="text-[12px] text-red-600 font-medium">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400">
              <Shield className="w-3.5 h-3.5 text-green-500" />
              Paiement 100% sécurisé · Cryptage SSL 256-bit
            </div>
          </>
        )}
      </div>

      {/* ── Bottom CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-3 pb-20 z-30">
        {step === 1 ? (
          <button
            onClick={handleContinueToPayment}
            disabled={loading}
            className="w-full py-4 bg-primary text-white rounded-2xl text-[15px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-primary/30 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Préparation du paiement...</>
              : <>Continuer vers le paiement <ChevronRight className="w-5 h-5" /></>}
          </button>
        ) : (
          <>
            {paymentMethod === "wallet" ? (
              <button
                onClick={handlePayWithWallet}
                disabled={payingWithWallet || !canPayWithWallet}
                className="w-full py-4 bg-green-500 text-white rounded-2xl text-[15px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-green-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {payingWithWallet ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Paiement en cours...</>
                ) : (
                  <>
                    <Wallet className="w-5 h-5" />
                    Payer {parseFloat(orderSummary?.total || productPrice).toFixed(2)} € avec Beauty Wallet
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handlePayShopify}
                className="w-full py-4 bg-primary text-white rounded-2xl text-[15px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
              >
                <Lock className="w-5 h-5" />
                Payer {parseFloat(orderSummary?.total || productPrice).toFixed(2)} € sur Shopify
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
