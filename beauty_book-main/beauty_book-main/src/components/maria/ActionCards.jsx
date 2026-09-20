import BeautyImage from '@/components/ui/BeautyImage';
import { useNavigate } from "react-router-dom";
import { ExternalLink, ArrowRight, ShoppingBag, X } from "lucide-react";
import { useState, useEffect } from "react";
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';

// ─── Carte de navigation ──────────────────────────────────────────────────────
export function NavigateCard({ action, onNavigate }) {
  const navigate = useNavigate();
  const handleClick = () => {
    onNavigate?.();
    const dest = action.path || action.route;
    if (dest) navigate(dest);
  };
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mt-2">
      <div className="flex items-center gap-2 mb-2">
        <ExternalLink className="w-4 h-4 text-primary" />
        <span className="text-[11px] font-black text-primary uppercase tracking-widest">Ouvrir la page</span>
      </div>
      <p className="text-[14px] font-black text-gray-900 mb-3">{action.label}</p>
      <button
        onClick={handleClick}
        className="w-full bg-primary text-white text-[12px] font-black uppercase tracking-widest py-2.5 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        Aller sur {action.label} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Miniature produit ────────────────────────────────────────────────────────
function ProductMini({ product, onClick }) {
  return (
    <button
      onClick={() => onClick(product)}
      className="shrink-0 w-36 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-95 transition-all"
    >
      <div className="h-24 overflow-hidden bg-gray-100">
        {product.image_url
          ? <BeautyImage src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-gray-300" /></div>
        }
      </div>
      <div className="p-2">
        <p className="text-[11px] font-black text-gray-900 truncate">{product.name}</p>
        <p className="text-[12px] font-black text-primary">{product.price}€</p>
      </div>
    </button>
  );
}

// ─── Modal détail produit ─────────────────────────────────────────────────────
function ProductDetailModal({ product, onClose }) {
  const navigate = useNavigate();
  if (!product) return null;
  return (
    <div className="fixed inset-0 z-[600] flex items-end bg-black/50" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-3xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative">
          {product.image_url && (
            <BeautyImage src={product.image_url} alt={product.name} className="w-full h-52 object-cover" />
          )}
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{product.category}</p>
          <h3 className="text-[20px] font-black text-gray-900 mb-1">{product.name}</h3>
          {product.brand && <p className="text-[12px] text-gray-400 font-medium mb-3">{product.brand}</p>}
          <p className="text-[24px] font-black text-primary mb-3">{product.price}€</p>
          {product.description && <p className="text-[13px] text-gray-600 font-medium leading-relaxed mb-4">{product.description}</p>}
          <button
            onClick={() => { onClose(); navigate("/boutique"); }}
            className="w-full bg-primary text-white font-black text-[14px] py-4 rounded-2xl active:scale-95 transition-all"
          >
            Voir dans la boutique →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Carte recherche produits ─────────────────────────────────────────────────
export function SearchProductsCard({ query }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await entities.Produit.filter({ status: "actif" }, "-created_at", 200);
        const q = query.toLowerCase();
        const filtered = all.filter(p =>
          p.name?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.tags?.some(t => t.toLowerCase().includes(q))
        );
        setProducts(filtered.length > 0 ? filtered : all.slice(0, 6));
      } catch {}
      setLoading(false);
    };
    load();
  }, [query]);

  if (loading) return (
    <div className="flex gap-2 mt-2 overflow-x-auto hide-scrollbar py-1">
      {[0,1,2].map(i => <div key={i} className="shrink-0 w-36 h-36 bg-gray-100 rounded-2xl animate-pulse" />)}
    </div>
  );

  if (products.length === 0) return null;

  return (
    <>
      {selected && <ProductDetailModal product={selected} onClose={() => setSelected(null)} />}
      <div className="mt-2">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Résultats pour « {query} »</p>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
          {products.map(p => <ProductMini key={p.id} product={p} onClick={setSelected} />)}
        </div>
      </div>
    </>
  );
}

// ─── Carte ouverture du formulaire pro (pré-rempli) ─────────────────────────
export function OpenProFormCard({ proData }) {
  const navigate = useNavigate();
  const DRAFT_KEY = "bb_devenir_pro_draft";

  // Mapper les données Maria → format DevenirPro
  const mapToDevenirPro = (data) => {
    if (!data) return {};
    return {
      salon_name: data.salon_name || data.nom_salon || "",
      bio: data.bio || data.description || "",
      type: data.type || data.type_activite || "",
      services: data.services || [],
      categories: data.categories || [],
      years: data.years || data.years_experience || data.experience || 0,
      phone: data.phone || data.telephone || "",
      email_pro: data.email_pro || "",
      siret: data.siret || "",
      address: data.address || data.adresse || "",
      city: data.city || data.ville || "",
      cheveux: data.cheveux || data.specialites_cheveux || [],
      days: data.days || [],
      time_slots: data.time_slots || [],
    };
  };

  const handleOpen = () => {
    try {
      const existing = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
      const mapped = mapToDevenirPro(proData);
      const merged = { ...existing, ...mapped };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(merged));
      console.log("Draft pré-rempli:", merged);
    } catch (e) {
      console.error("Error saving draft:", e);
    }
    navigate("/devenir-pro");
  };

  // Afficher un récapitulatif des infos collectées
  const items = [
    proData?.salon_name && { label: "Nom", value: proData.salon_name },
    proData?.type && { label: "Type", value: proData.type },
    (proData?.services?.length > 0 || proData?.categories?.length > 0) && {
      label: "Services",
      value: [...(proData.services || []), ...(proData.categories || [])].join(", ")
    },
    proData?.city && { label: "Ville", value: proData.city },
    proData?.years && { label: "Expérience", value: `${proData.years} ans` },
  ].filter(Boolean);

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4 mt-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[20px]">🎉</span>
        <div>
          <span className="text-[12px] font-black text-primary uppercase tracking-widest block">Profil prêt !</span>
          <span className="text-[11px] text-gray-500 font-medium">Formulaire pré-rempli avec vos réponses</span>
        </div>
      </div>

      {items.length > 0 && (
        <div className="bg-white/70 rounded-xl p-3 mb-3 space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[10px] font-black text-primary uppercase tracking-wider w-20 shrink-0 mt-0.5">{item.label}</span>
              <span className="text-[12px] text-gray-700 font-medium leading-snug">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleOpen}
        className="w-full bg-primary text-white text-[13px] font-black uppercase tracking-widest py-3.5 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/30"
      >
        ✅ Ouvrir et valider mon profil pro
      </button>
      <p className="text-center text-[10px] text-gray-400 font-medium mt-2">
        Vous pourrez relire et modifier avant de publier
      </p>
    </div>
  );
}