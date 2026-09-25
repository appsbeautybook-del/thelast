import { useState, useEffect, useRef } from "react";
import { X, SlidersHorizontal, Star, Check, MapPin, Navigation, Search } from "lucide-react";
import { loadAppleMaps } from "@/lib/appleMaps";

const CATEGORIES = ["Tout", "Coiffure", "Esthétique", "Beauté", "Nails", "Massage", "Spa", "Maquillage", "Barbe", "Sourcils"];
const SORT_OPTIONS = [
  { key: "proximity", label: "Proximité", icon: "📍" },
  { key: "rating", label: "Mieux noté", icon: "⭐" },
  { key: "price_asc", label: "Prix croissant", icon: "💰" },
  { key: "price_desc", label: "Prix décroissant", icon: "💸" },
  { key: "recent", label: "Récemment ajouté", icon: "🆕" },
];
const SEARCH_TYPES = [
  { key: "services", label: "Services", icon: "💆" },
  { key: "salons", label: "Salons", icon: "🏢" },
  { key: "particuliers", label: "Particuliers", icon: "👤" },
  { key: "styles", label: "Styles", icon: "🎨" },
  { key: "bundles", label: "Bundles", icon: "💬" },
];
const AVAILABILITY_OPTIONS = [
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Cette semaine" },
  { key: "weekend", label: "Ce weekend" },
];
const GENDER_OPTIONS = [
  { key: "women", label: "Femmes" },
  { key: "men", label: "Hommes" },
  { key: "children", label: "Enfants" },
  { key: "mixed", label: "Mixte" },
];
const RATING_OPTIONS = [
  { value: 0, label: "Tout" },
  { value: 4, label: "4+ ★" },
  { value: 4.5, label: "4.5+ ★" },
  { value: 5, label: "5 ★" },
];

// ── Apple Maps Embed ──────────────────────────────────────────────────────────
function AppleMapsPanel({ pros = [], userLat, userLng }) {
  const mapRef = useRef(null);
  const mapkitRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadAppleMaps().then((mapkit) => {
      if (cancelled || !mapRef.current || mapkitRef.current) return;

      const centerLat = userLat || 48.8566;
      const centerLng = userLng || 2.3522;

      const map = new mapkit.Map(mapRef.current, {
        center: new mapkit.Coordinate(centerLat, centerLng),
        cameraDistance: 8000,
        mapType: mapkit.Map.MapTypes.Standard,
        showsCompass: mapkit.FeatureVisibility.Hidden,
        showsUserLocationControl: true,
        showsZoomControl: false,
      });
      mapkitRef.current = map;

      // Add pro markers
      const annotations = pros.slice(0, 20).map((pro) => {
        if (!pro.lat || !pro.lng) return null;
        const ann = new mapkit.MarkerAnnotation(
          new mapkit.Coordinate(pro.lat, pro.lng),
          {
            title: pro.salon_name || "",
            subtitle: pro.price ? `${pro.price}€` : "",
            color: "#FF6B00",
            glyphText: pro.price ? `${pro.price}€` : "Pro",
          }
        );
        return ann;
      }).filter(Boolean);

      if (annotations.length > 0) map.addAnnotations(annotations);
      setMapReady(true);
      setMapError(false);
    }).catch((error) => {
      if (cancelled) return;
      console.error("[AppleMapsPanel] Apple Maps unavailable:", error);
      setMapReady(false);
      setMapError(true);
    });

    return () => { cancelled = true; };
  }, [pros, userLat, userLng]);

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-orange-100" style={{ height: 200 }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      {!mapReady && (
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-100 flex flex-col items-center justify-center gap-2">
          <MapPin className="w-8 h-8 text-primary animate-bounce" />
          <p className="text-[12px] font-bold text-primary">
            {mapError ? "Apple Maps est momentanément indisponible" : "Chargement de la carte..."}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Filter Sheet ─────────────────────────────────────────────────────────
export default function AdvancedFilterSheet({ open, onClose, onApply, initialFilters = {}, pros = [] }) {
  const [priceMin, setPriceMin] = useState(initialFilters.priceMin ?? 0);
  const [priceMax, setPriceMax] = useState(initialFilters.priceMax ?? 500);
  const [minRating, setMinRating] = useState(initialFilters.minRating ?? 0);
  const [category, setCategory] = useState(initialFilters.category ?? "Tout");
  const [sortBy, setSortBy] = useState(initialFilters.sortBy ?? "proximity");
  const [searchTypes, setSearchTypes] = useState(initialFilters.searchTypes ?? ["services", "salons"]);
  const [availability, setAvailability] = useState(initialFilters.availability ?? null);
  const [genders, setGenders] = useState(initialFilters.genders ?? []);
  const [radius, setRadius] = useState(initialFilters.radius ?? 5);
  const [showMap, setShowMap] = useState(false);

  // Count active filters
  const activeCount = [
    priceMin > 0 || priceMax < 500,
    minRating > 0,
    category !== "Tout",
    sortBy !== "proximity",
    searchTypes.length !== 2 || !searchTypes.includes("services") || !searchTypes.includes("salons"),
    availability !== null,
    genders.length > 0,
    radius !== 5,
  ].filter(Boolean).length;

  if (!open) return null;

  const toggleSearchType = (key) => {
    setSearchTypes(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleGender = (key) => {
    setGenders(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleApply = () => {
    onApply({ priceMin, priceMax, minRating, category, sortBy, searchTypes, availability, genders, radius });
    onClose();
  };

  const handleReset = () => {
    setPriceMin(0); setPriceMax(500); setMinRating(0);
    setCategory("Tout"); setSortBy("proximity");
    setSearchTypes(["services", "salons"]);
    setAvailability(null); setGenders([]); setRadius(5);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end font-display">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-[32px] z-10 max-h-[92vh] flex flex-col shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            <h2 className="text-[18px] font-black text-gray-900">Filtres avancés</h2>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white" style={{ background: "#FF6B00" }}>
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleReset} className="text-[12px] font-black text-primary">
              Réinitialiser
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 active:scale-95">
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-7 hide-scrollbar">

          {/* Map Toggle + Apple Maps */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Localisation & Carte</p>
              <button
                onClick={() => setShowMap(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black transition-all ${
                  showMap ? "text-white" : "text-primary border border-primary/30 bg-orange-50"
                }`}
                style={showMap ? { background: "#FF6B00" } : {}}
              >
                <MapPin className="w-3 h-3" />
                {showMap ? "Masquer la carte" : "Voir sur la carte"}
              </button>
            </div>

            {showMap && <AppleMapsPanel pros={pros} />}

            {/* Radius Slider */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-bold text-gray-700">Rayon de recherche</span>
                <span className="px-3 py-1 rounded-full text-[12px] font-black text-white" style={{ background: "#FF6B00" }}>
                  {radius} km
                </span>
              </div>
              <div className="relative">
                <input
                  type="range" min={1} max={50} step={1}
                  value={radius}
                  onChange={e => setRadius(+e.target.value)}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary"
                  style={{ accentColor: "#FF6B00" }}
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>1 km</span>
                  <span>50 km</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search Types */}
          <div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Type de recherche</p>
            <div className="grid grid-cols-3 gap-2">
              {SEARCH_TYPES.map(type => {
                const active = searchTypes.includes(type.key);
                return (
                  <button
                    key={type.key}
                    onClick={() => toggleSearchType(type.key)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-[16px] border transition-all active:scale-95 ${
                      active
                        ? "border-primary bg-orange-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <span className="text-[20px]">{type.icon}</span>
                    <span className={`text-[11px] font-black ${active ? "text-primary" : "text-gray-600"}`}>
                      {type.label}
                    </span>
                    {active && (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#FF6B00" }}>
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Catégorie */}
          <div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Catégorie</p>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-1 px-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`shrink-0 px-4 py-2 rounded-full text-[12px] font-black border transition-all active:scale-95 ${
                    category === cat
                      ? "text-white border-transparent shadow-md"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                  style={category === cat ? { background: "#FF6B00", boxShadow: "0 4px 12px rgba(255,107,0,0.3)" } : {}}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Fourchette de prix */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Fourchette de prix</p>
              <span className="text-[13px] font-black" style={{ color: "#FF6B00" }}>{priceMin}€ – {priceMax}€</span>
            </div>
            {/* Visual price bar */}
            <div className="relative h-2 bg-gray-100 rounded-full mb-4">
              <div
                className="absolute h-full rounded-full"
                style={{
                  left: `${(priceMin / 500) * 100}%`,
                  right: `${100 - (priceMax / 500) * 100}%`,
                  background: "#FF6B00"
                }}
              />
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1">
                  <span>MIN</span><span>{priceMin}€</span>
                </div>
                <input
                  type="range" min={0} max={500} step={5}
                  value={priceMin}
                  onChange={e => { const v = +e.target.value; if (v <= priceMax - 10) setPriceMin(v); }}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: "#FF6B00" }}
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1">
                  <span>MAX</span><span>{priceMax}€</span>
                </div>
                <input
                  type="range" min={0} max={500} step={5}
                  value={priceMax}
                  onChange={e => { const v = +e.target.value; if (v >= priceMin + 10) setPriceMax(v); }}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: "#FF6B00" }}
                />
              </div>
            </div>
          </div>

          {/* Note minimale */}
          <div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Note minimale</p>
            <div className="flex gap-2">
              {RATING_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setMinRating(opt.value)}
                  className={`flex-1 py-2.5 rounded-2xl text-[12px] font-black border transition-all active:scale-95 flex items-center justify-center gap-1 ${
                    minRating === opt.value
                      ? "text-white border-transparent shadow-md"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                  style={minRating === opt.value ? { background: "#FF6B00", boxShadow: "0 4px 12px rgba(255,107,0,0.25)" } : {}}
                >
                  {opt.value === 0 ? "Tout" : <><Star className="w-3 h-3" strokeWidth={2} />{opt.value}</>}
                </button>
              ))}
            </div>
          </div>

          {/* Disponibilité */}
          <div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Disponibilité</p>
            <div className="flex gap-2">
              {AVAILABILITY_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setAvailability(prev => prev === opt.key ? null : opt.key)}
                  className={`flex-1 py-2.5 rounded-2xl text-[11px] font-black border transition-all active:scale-95 ${
                    availability === opt.key
                      ? "text-white border-transparent"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                  style={availability === opt.key ? { background: "#FF6B00" } : {}}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Spécialité genre */}
          <div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Spécialité genre</p>
            <div className="flex gap-2 flex-wrap">
              {GENDER_OPTIONS.map(opt => {
                const active = genders.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    onClick={() => toggleGender(opt.key)}
                    className={`px-4 py-2 rounded-full text-[12px] font-black border transition-all active:scale-95 ${
                      active
                        ? "text-white border-transparent"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                    style={active ? { background: "#FF6B00" } : {}}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trier par */}
          <div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Trier par</p>
            <div className="flex flex-col gap-2">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-[16px] border transition-all active:scale-[0.99] ${
                    sortBy === opt.key
                      ? "border-primary bg-orange-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[18px]">{opt.icon}</span>
                    <span className={`text-[13px] font-bold ${sortBy === opt.key ? "text-primary" : "text-gray-700"}`}>
                      {opt.label}
                    </span>
                  </div>
                  {sortBy === opt.key && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#FF6B00" }}>
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer CTA */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}>
          <button
            onClick={handleApply}
            className="w-full py-4 rounded-2xl text-white text-[14px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #FF6B00, #F48C25)", boxShadow: "0 8px 24px rgba(255,107,0,0.35)" }}
          >
            <Search className="w-4 h-4" />
            Voir les résultats
            {activeCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/25 rounded-full text-[11px]">{activeCount} filtre{activeCount > 1 ? "s" : ""}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
