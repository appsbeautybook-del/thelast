import { fetchShopifyProducts } from "@/api/shopifyClient";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { entities, uploadFile } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import { Search, Camera, ShoppingCart, Shield, Truck, Flame, ChevronRight, Sparkles, X, Heart, Check } from "lucide-react";
import { DEFAULT_BOUTIQUE_CATS, CONFIG_KEY } from "@/components/admin/AdminBoutiqueCategories";
import { adminApi } from "@/lib/adminApiClient";
import usePullToRefresh from "@/hooks/usePullToRefresh";
import { useLikedProducts } from "@/hooks/useLikedProducts";
import { useCartSync } from "@/hooks/useCartSync";


// ── Data ──────────────────────────────────────────────────────────────────────

const CAT_IMAGES = {
  tout:      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=200",
  homme:     "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200",
  femme:     "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200",
  enfant:    "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=200",
  beaute:    "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?q=80&w=200",
  beauté:    "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?q=80&w=200",
  bebe:      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=200",
  bébé:      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=200",
  grossiste: "https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=200",
};



// Produit importé il y a moins de 24h
const isNewProduct = (p) => {
  if (!p.created_date) return false;
  return Date.now() - new Date(p.created_date).getTime() < 24 * 60 * 60 * 1000;
};

// Tri : nouveaux produits (< 24h) en premier
const sortNewFirst = (products) => {
  return [...products].sort((a, b) => {
    const an = isNewProduct(a) ? 1 : 0;
    const bn = isNewProduct(b) ? 1 : 0;
    if (an !== bn) return bn - an;
    return 0;
  });
};

const trustBadges = [
  { icon: Truck, label: "LIVRAISON GRATUITE", color: "text-green-500", border: "border-green-200", bg: "bg-green-50" },
  { icon: Shield, label: "GARANTIE LIVRAISON", color: "text-blue-500", border: "border-blue-200", bg: "bg-blue-50" },
  { icon: Shield, label: "PAIEMENT SÉCURISÉ", color: "text-primary", border: "border-orange-200", bg: "bg-orange-50" },
];

export default function Boutique() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("tout");
  const [boutiqueBanners, setBoutiqueBanners] = useState([]);
  const [activeSub, setActiveSub] = useState("Tout");
  const [mainCategories, setMainCategories] = useState(DEFAULT_BOUTIQUE_CATS.map(c => ({
    ...c, img: CAT_IMAGES[c.id] || CAT_IMAGES["tout"], subs: ["Tout", ...c.subs, "Grossiste", "Livraison Express"],
  })));
  const { liked, toggle: toggleLike, isLiked } = useLikedProducts();
  const { addToCart, adding, cartCount } = useCartSync();
  const [justAdded, setJustAdded] = useState(null);
  const [shopifyProducts, setShopifyProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [imageSearching, setImageSearching] = useState(false);
  const [imageSearchResults, setImageSearchResults] = useState(null);
  const imgInputRef = useRef();
  const [shopifyCategoryMap, setShopifyCategoryMap] = useState({});

  const handleRefresh = useCallback(() => {
    return new Promise(resolve => setTimeout(() => { setRefreshKey(k => k + 1); resolve(); }, 800));
  }, []);
  const { containerRef, pulling, pullDistance } = usePullToRefresh(handleRefresh);

  const currentCategory = mainCategories.find(c => c.id === activeCategory) || mainCategories[0];

  const handleCategoryChange = (id) => {
    setActiveCategory(id);
    setActiveSub("Tout");
  };

  useEffect(() => {
    entities.AppConfig.filter({ key: "boutique_banners" }, "-created_at", 50)
      .then(rows => {
        const bans = rows[0]?.value?.banners?.filter(b => b.active !== false) || [];
        setBoutiqueBanners(bans);
      }).catch(() => {});

    // Charger les catégories dynamiques depuis admin
    entities.AppConfig.filter({ key: CONFIG_KEY }, "-created_at", 50)
      .then(rows => {
        if (rows[0]?.value?.categories?.length > 0) {
          const cats = rows[0].value.categories.map(c => ({
            ...c,
            img: CAT_IMAGES[c.id] || CAT_IMAGES["tout"],
            subs: ["Tout", ...c.subs, "Grossiste", "Livraison Express"],
          }));
          setMainCategories(cats);
        }
      }).catch(() => {});

    // Charger les mappings catégories Shopify
    entities.AppConfig.filter({ key: "shopify_category_mappings" }, "-created_at", 50)
      .then(rows => {
        if (rows[0]?.value) setShopifyCategoryMap(rows[0].value);
      }).catch(() => {});
  }, []);

  const CACHE_KEY = "bb_boutique_products_cache_v3";
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    // Supprimer l'ancien cache (sans version)
    try { localStorage.removeItem("bb_boutique_products_cache"); } catch {}

    setLoadingProducts(true);
    setLoadError(null);

    // Afficher le cache immédiatement si disponible
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached && Date.now() - cached.ts < CACHE_TTL && cached.products?.length > 0) {
        // Appliquer les mappings catégories aux produits en cache
        const withCats = cached.products.map(p => {
          if (p._shopify) {
            const saved = shopifyCategoryMap[p.id];
            if (saved) return { ...p, category: saved.category || p.category, sub_category: saved.sub_category || "" };
          }
          return p;
        });
        setShopifyProducts(withCats);
        setLoadingProducts(false);
      }
    } catch {}

    // Charger en parallèle : Shopify + produits BDD (via backend service_role)
    Promise.allSettled([
      fetchShopifyProducts({}).then(res => {
        const products = res.data?.products || [];
        return products;
      }).catch(() => []),
      entities.Produit.filter({ status: "actif" }, "-created_at", 500)
        .then(items => items.map(p => ({
            id: p.id,
            name: p.name,
            brand: p.brand || "",
            price: p.price,
            oldPrice: p.old_price || null,
            img: p.image_url || (p.images && p.images[0]) || "",
            images: p.images || [],
            badge: p.featured ? "VEDETTE" : null,
            external_url: p.external_url || null,
            category: p.category || "",
            sub_category: p.sub_category || "",
            tags: p.tags || [],
            min_qty: p.min_qty || null,
            created_date: p.created_date,
            source: "db",
          }))).catch(() => [])
    ]).then(([shopifyResult, dbResult]) => {
      const shopify = shopifyResult.status === "fulfilled" ? shopifyResult.value : [];
      const db = dbResult.status === "fulfilled" ? dbResult.value : [];
      // Appliquer les mappings catégories aux produits Shopify
      const shopifyWithCats = shopify.map(p => {
        const saved = shopifyCategoryMap[p.id];
        if (saved) {
          return { ...p, category: saved.category || p.category, sub_category: saved.sub_category || "" };
        }
        return p;
      });
      const merged = [...db, ...shopifyWithCats];
      if (merged.length > 0) {
        setShopifyProducts(merged);
        // Mettre en cache les nouveaux produits
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), products: merged }));
        } catch {}
        setLoadError(null);
      } else {
        // Si l'API échoue, garder le cache affiché
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (!cached?.products?.length) setLoadError("Aucun produit disponible.");
      }
      setLoadingProducts(false);
    });
  }, [refreshKey]);

  // Réappliquer les mappings catégories quand ils changent
  useEffect(() => {
    if (Object.keys(shopifyCategoryMap).length === 0) return;
    setShopifyProducts(prev => prev.map(p => {
      if (p._shopify) {
        const saved = shopifyCategoryMap[p.id];
        if (saved) return { ...p, category: saved.category || p.category, sub_category: saved.sub_category || "" };
      }
      return p;
    }));
  }, [shopifyCategoryMap]);

  const handleImageSearch = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageSearching(true);
    setImageSearchResults(null);
    const { file_url } = await uploadFile({ file });
    const res = await /* TODO: migrate to Supabase Edge Function */ (async () => ({ data: { success: true } }))("shAiImageSearch", { image_url: file_url }).catch(() => null);
    if (res?.data?.products?.length > 0) {
      setImageSearchResults(res.data.products);
    } else {
      setImageSearchResults([]);
    }
    setImageSearching(false);
    e.target.value = "";
  };

  const clearImageSearch = () => setImageSearchResults(null);

  // Filtrage selon catégorie/sous-catégorie
  const filterProducts = (products) => {
    if (activeCategory === "grossiste" || activeSub === "Grossiste") {
      return products.filter(p => p.tags?.includes("grossiste"));
    }
    if (activeSub === "Tout" || !activeSub) return products;
    if (activeSub === "Livraison Express") return products.filter(p => p.tags?.includes("livraison_express"));
    return products.filter(p =>
      p.category?.toLowerCase().includes(activeSub.toLowerCase()) ||
      p.sub_category?.toLowerCase().includes(activeSub.toLowerCase()) ||
      p.brand?.toLowerCase().includes(activeSub.toLowerCase())
    );
  };

  const displayedProducts = imageSearchResults
    ? imageSearchResults.map(p => ({ ...p, badge: "SIMILAIRE" }))
    : search.trim()
    ? sortNewFirst(filterProducts(shopifyProducts).filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.brand?.toLowerCase().includes(search.toLowerCase())
      ))
    : sortNewFirst(filterProducts(shopifyProducts));

  return (
    <div ref={containerRef} className="font-display bg-white min-h-full pb-6">
      {pullDistance > 10 && (
        <div className="flex items-center justify-center overflow-hidden transition-all" style={{ height: pullDistance * 0.5 }}>
          <div className={`w-6 h-6 border-2 border-primary border-t-transparent rounded-full ${pulling ? "animate-spin" : ""}`} style={{ transform: `rotate(${pullDistance * 2}deg)` }} />
        </div>
      )}

      {/* ── Search Bar ── */}
      <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSearch} />
      <div data-tour="boutique-search" className="px-3 pt-4 pb-3 flex items-center gap-2 sticky top-0 bg-white z-30">
        {/* Search input compact */}
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-2 flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setImageSearchResults(null); }}
            placeholder="Rechercher..."
            className="flex-1 min-w-0 bg-transparent text-[12px] text-gray-600 outline-none placeholder:text-gray-400"
          />
          {imageSearching && (
            <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          {imageSearchResults !== null && (
            <button onClick={clearImageSearch} className="shrink-0">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
          <button onClick={() => imgInputRef.current?.click()} className="shrink-0">
            <Camera className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>

        {/* Styliste IA button */}
        <button
          data-tour="boutique-styliste"
          onClick={() => navigate("/sh-ai")}
          className="flex items-center gap-1.5 shrink-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full px-3 py-2 shadow-sm shadow-purple-300/40 active:scale-95 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="text-white text-[11px] font-black whitespace-nowrap">Styliste IA</span>
        </button>

        {/* Cart */}
        <button onClick={() => navigate("/panier")} className="relative w-9 h-9 flex items-center justify-center shrink-0">
          <ShoppingCart className="w-5 h-5 text-gray-700" />
          <span className="absolute top-0 right-0 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-white text-[9px] font-black">
            {cartCount}
          </span>
        </button>
      </div>

      {/* Image search banner */}
      {imageSearchResults !== null && (
        <div className="mx-3 mb-2 bg-purple-50 border border-purple-100 rounded-2xl px-4 py-2.5 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
          <p className="flex-1 text-[12px] font-bold text-purple-700">
            {imageSearchResults.length > 0
              ? `${imageSearchResults.length} articles similaires trouvés`
              : "Aucun article similaire trouvé dans la boutique"}
          </p>
          <button onClick={clearImageSearch} className="text-purple-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Main Category Circles ── */}
      <div className="overflow-x-auto hide-scrollbar">
        <div className="flex items-start gap-4 px-4 pb-3 min-w-max">
          {mainCategories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className="flex flex-col items-center gap-1.5 active:scale-95 transition-all"
              >
                <div className={`w-[68px] h-[68px] rounded-full overflow-hidden border-[2.5px] transition-all ${
                  isActive ? "border-primary shadow-md shadow-primary/20" : "border-gray-200"
                }`}>
                  <img src={cat.img} alt={cat.label} className="w-full h-full object-cover" />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  isActive ? "text-primary" : "text-gray-500"
                }`}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Sub-category Pills ── */}
      <div className="overflow-x-auto hide-scrollbar border-y border-gray-100">
        <div className="flex items-center gap-2 px-4 py-2.5 min-w-max">
          {currentCategory?.subs.map((sub) => {
            const isActive = activeSub === sub;
            return (
              <button
                key={sub}
                onClick={() => setActiveSub(sub)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all active:scale-95 whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 space-y-5 mt-4">

        {/* ── Bannières dynamiques (admin) ou bannière par défaut ── */}
        {boutiqueBanners.length > 0 ? boutiqueBanners.map((banner, i) => (
          <div key={i} className="relative rounded-2xl overflow-hidden" style={{ minHeight: 80, background: "linear-gradient(135deg, #E8732A, #f59540)" }}>
            {banner.image && (
              <img src={banner.image} alt={banner.title} className="absolute inset-0 w-full h-full object-cover" />
            )}
            {/* Overlay opacité configurable */}
            <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${banner.overlay_opacity ?? 0.55})` }} />
            <div className="relative z-10 px-5 py-4 flex items-center justify-between gap-3">
              <div>
                {banner.label && <p className="text-white text-[9px] font-black uppercase tracking-widest mb-0.5 drop-shadow">✦ {banner.label}</p>}
                {banner.title && (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-white text-[26px] font-black leading-none drop-shadow-sm">{banner.title}</span>
                  </div>
                )}
                {banner.subtitle && <p className="text-white text-[10px] font-bold mt-0.5 drop-shadow">{banner.subtitle}</p>}
              </div>
              {banner.cta && (
                <button onClick={() => banner.cta_link && navigate(banner.cta_link)}
                  className="shrink-0 bg-white rounded-full px-4 py-2 text-gray-900 text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md">
                  {banner.cta}
                </button>
              )}
            </div>
          </div>
        )) : (
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-orange-500 to-orange-400 px-5 py-4 flex items-center justify-between">
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.20)" }} />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-10">
              <svg width="70" height="70" viewBox="0 0 80 80" fill="white">
                <path d="M40 0 L45 35 L80 40 L45 45 L40 80 L35 45 L0 40 L35 35 Z" />
              </svg>
            </div>
            <div className="relative z-10">
              <p className="text-white text-[9px] font-black uppercase tracking-widest mb-0.5 drop-shadow">✦ COLLECTION ÉTÉ 2024</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-white text-[28px] font-black leading-none drop-shadow-sm">-40%</span>
                <span className="text-white text-[13px] font-black italic drop-shadow-sm">sur la sélection</span>
              </div>
              <p className="text-white text-[9px] font-bold uppercase tracking-wider mt-0.5 drop-shadow">Membres Gold uniquement</p>
            </div>
            <button className="relative z-10 shrink-0 bg-white rounded-full px-4 py-2 text-gray-900 text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md">
              EN PROFITER
            </button>
          </div>
        )}

        {/* ── Trust Badges ── */}
        <div className="overflow-x-auto hide-scrollbar -mx-4">
          <div className="flex gap-2.5 px-4 min-w-max">
            {trustBadges.map((badge, i) => {
              const Icon = badge.icon;
              return (
                <div key={i} className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border ${badge.border} ${badge.bg} shrink-0`}>
                  <Icon className={`w-4 h-4 ${badge.color}`} strokeWidth={2} />
                  <span className={`text-[11px] font-black uppercase tracking-wider ${badge.color}`}>{badge.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Nouveautés (< 24h) ── */}
        {(() => {
          const newProds = displayedProducts.filter(p => isNewProduct(p));
          if (newProds.length === 0) return null;
          return (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-[17px] font-black text-gray-900 uppercase tracking-tight">NOUVEAUTÉS</h2>
                <Sparkles className="w-5 h-5 text-green-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {newProds.map(p => (
                  <div key={p.id}
                    onClick={() => navigate(`/produit?id=${encodeURIComponent(p.id)}`)}
                    className="bg-white rounded-3xl border border-green-200 shadow-sm overflow-hidden active:scale-[0.98] transition-all cursor-pointer">
                    <div className="relative aspect-square bg-gray-50">
                      <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                      <div className="absolute top-2.5 left-2.5 bg-green-500 rounded-full px-2 py-1 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-white" />
                        <span className="text-white text-[9px] font-black">NOUVEAU</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-0.5">{p.brand}</p>
                      <p className="text-[12px] font-bold text-gray-900 leading-tight line-clamp-2 mb-1">{p.name}</p>
                      <span className="text-[16px] font-black text-gray-900">{p.price}€</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Meilleurs Choix ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-black text-gray-900 uppercase tracking-tight">MEILLEURS CHOIX</h2>
              <Flame className="w-5 h-5 text-primary fill-primary" />
            </div>
            <button className="flex items-center gap-1 text-primary text-[12px] font-black uppercase tracking-wider active:scale-95 transition-all">
              TOUT VOIR
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 gap-3">
            {loadingProducts
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-gray-100 rounded-3xl overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-200" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-gray-200 rounded-full w-1/2" />
                      <div className="h-4 bg-gray-200 rounded-full" />
                      <div className="h-4 bg-gray-200 rounded-full w-2/3" />
                    </div>
                  </div>
                ))
              : loadError
              ? (
                <div className="col-span-2 flex flex-col items-center justify-center py-12 gap-3">
                  <span className="text-3xl">🔌</span>
                  <p className="text-[13px] font-bold text-gray-500 text-center">Impossible de charger les produits Shopify.<br/>Vérifiez votre token Storefront.</p>
                </div>
              )
              : displayedProducts.length === 0
              ? (
                <div className="col-span-2 flex flex-col items-center justify-center py-12 gap-3">
                  <span className="text-3xl">📦</span>
                  <p className="text-[13px] font-bold text-gray-500 text-center">Aucun produit trouvé.</p>
                </div>
              )
              : displayedProducts.map((p) => {
                const isGrossiste = p.tags?.includes("grossiste");
                return (
                <div
                  key={p.id}
                  onClick={() => {
                    navigate(`/produit?id=${encodeURIComponent(p.id)}`);
                  }}
                  className={`bg-white rounded-3xl border shadow-sm overflow-hidden active:scale-[0.98] transition-all cursor-pointer ${isGrossiste ? "border-blue-200" : "border-gray-100"}`}
                >
                  <div className="relative aspect-square bg-gray-50">
                    <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                    {isNewProduct(p) ? (
                      <div className="absolute top-2.5 left-2.5 bg-green-500 rounded-full px-2 py-1 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-white" />
                        <span className="text-white text-[9px] font-black">NOUVEAU</span>
                      </div>
                    ) : isGrossiste ? (
                      <div className="absolute top-2.5 left-2.5 bg-blue-600 rounded-full px-2 py-1">
                        <span className="text-white text-[9px] font-black">GROSSISTE</span>
                      </div>
                    ) : p.badge ? (
                      <div className="absolute top-2.5 left-2.5 bg-primary rounded-full px-2 py-1">
                        <span className="text-white text-[10px] font-black">{p.badge}</span>
                      </div>
                    ) : null}
                    {/* Like button */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleLike({ id: p.id, name: p.name, brand: p.brand, price: p.price, img: p.img, category: p.category }); }}
                      className="absolute top-2.5 right-2.5 w-8 h-8 bg-white/90 rounded-full shadow flex items-center justify-center active:scale-95 transition-all"
                    >
                      <Heart className={`w-3.5 h-3.5 transition-all ${isLiked(p.id) ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                    </button>
                    {/* Add to cart */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        addToCart({ id: p.id, name: p.name, price: p.price, img: p.img });
                        setJustAdded(p.id);
                        setTimeout(() => setJustAdded(null), 1500);
                      }}
                      className="absolute bottom-2.5 right-2.5 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center active:scale-95 transition-all"
                    >
                      {justAdded === p.id
                        ? <Check className="w-3.5 h-3.5 text-green-500" />
                        : adding === p.id
                        ? <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        : <ShoppingCart className="w-3.5 h-3.5 text-primary" />
                      }
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-0.5">{p.brand}</p>
                    <p className="text-[12px] font-bold text-gray-900 leading-tight line-clamp-2 mb-1">{p.name}</p>
                    {isGrossiste && p.min_qty && (
                      <p className="text-[10px] text-blue-600 font-black mb-1">Min. {p.min_qty} unités</p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] font-black text-gray-900">{p.price}€</span>
                      {p.oldPrice && (
                        <span className="text-[11px] text-gray-400 line-through font-medium">{p.oldPrice}€</span>
                      )}
                      {isGrossiste && <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">/ unité</span>}
                    </div>
                  </div>
                </div>
              );})}
          </div>
        </div>

      </div>
    </div>
  );
}