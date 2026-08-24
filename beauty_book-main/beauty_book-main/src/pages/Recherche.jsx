import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Star, X, Search, SlidersHorizontal, Bell, Sparkles, XCircle,
  Scissors, Waves, Diamond, PenTool, Droplets, Filter, ChevronRight, Flame, Zap,
  Bot, Send, RefreshCw, Check, ArrowRight
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { entities } from '@/api/entities';
import { useLocation } from '@/contexts/LocationContext';

const CATEGORIES = [
  { id: "Tous", label: "Tout", icon: "all", emoji: "✨" },
  { id: "Coiffure", label: "Coiffure", icon: "scissors", emoji: "✂️" },
  { id: "Tresses", label: "Tresses", icon: "waves", emoji: "🌊" },
  { id: "Ongles", label: "Manucure", icon: "diamond", emoji: "💎" },
  { id: "Pedicure", label: "Pédicure", icon: "star", emoji: "⭐" },
  { id: "Maquillage", label: "Maquillage", icon: "pen", emoji: "💄" },
  { id: "Soin", label: "Soin", icon: "droplet", emoji: "💧" },
  { id: "Massage", label: "Massage", icon: "hand", emoji: "🤲" },
];

const FALLBACK_STYLES = [
  { id: "f1", title: "Havana Twists", category: "Coiffure", image_url: "https://images.unsplash.com/photo-1595959183082-7b570b7e1e2b?q=80&w=400" },
  { id: "f2", title: "Spring Twists", category: "Coiffure", image_url: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=400" },
  { id: "f3", title: "Passion Twists", category: "Coiffure", image_url: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=400" },
  { id: "f4", title: "Box Braids", category: "Coiffure", image_url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400" },
  { id: "f5", title: "Cornrows", category: "Coiffure", image_url: "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?q=80&w=400" },
  { id: "f6", title: "Locs", category: "Coiffure", image_url: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=400" },
];

const userIcon = typeof L !== "undefined" ? L.divIcon({
  className: "",
  iconSize: [28, 36],
  iconAnchor: [14, 32],
  html: `<div style="position:relative;width:28px;height:36px"><div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:28px;height:28px;border-radius:50%;background:#E8732A;border:3px solid white;box-shadow:0 0 0 3px rgba(232,115,42,0.4),0 2px 8px rgba(0,0,0,0.3)"></div><div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #E8732A"></div></div>`,
}) : null;

function FlyToLocation({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, map.getZoom(), { duration: 0.5 });
  }, [center, map]);
  return null;
}

export default function Recherche() {
  const navigate = useNavigate();
  const { hasLocation, latitude, longitude } = useLocation();
  const [profils, setProfils] = useState([]);
  const [minPricesMap, setMinPricesMap] = useState({});
  const [styles, setStyles] = useState([]);
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [userLocation, setUserLocation] = useState(null);

  // ── Mode Recherche Avancée IA ──
  const [showAISearchModal, setShowAISearchModal] = useState(false);
  const [aiStep, setAiStep] = useState(1);
  const [aiAnswers, setAiAnswers] = useState({
    prestation: "",
    ville: "",
    budgetMax: null,
    style: "",
  });
  const [chatMessages, setChatMessages] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (hasLocation && latitude && longitude) {
      setUserLocation({ lat: latitude, lng: longitude });
    } else if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [hasLocation, latitude, longitude]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [allProfils, allStyles] = await Promise.all([
          entities.ProfilPro.filter({ status: "actif" }, "-created_at", 500).catch(() => []),
          entities.Style.filter({ status: "actif" }, "-created_at", 50).catch(() => []),
        ]);
        if (cancelled) return;
        setProfils(allProfils);
        setStyles(allStyles.length > 0 ? allStyles : FALLBACK_STYLES);
        const emails = allProfils.map(p => p.user_email).filter(Boolean);
        const servicesArr = await Promise.all(
          emails.map(e => entities.Service.filter({ pro_email: e, status: "actif" }, "price", 5).catch(() => []))
        );
        const pMap = {};
        emails.forEach((e, i) => {
          const prices = servicesArr[i].map(s => s.price).filter(p => p > 0);
          if (prices.length > 0) pMap[e] = Math.min(...prices);
        });
        if (!cancelled) setMinPricesMap(pMap);
      } catch {
        if (!cancelled) setStyles(FALLBACK_STYLES);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Déclencher le dialogue IA quand la recherche avancée s'ouvre
  const handleOpenAISearch = () => {
    setShowAISearchModal(true);
    setAiStep(1);
    setAiAnswers({ prestation: "", ville: "", budgetMax: null, style: "" });
    setChatMessages([
      {
        id: 1,
        sender: "ai",
        text: "Bonjour ! Je suis Maria, votre assistante beauté IA. ✨ Pour trouver votre prestation idéale, quelle catégorie ou soin vous intéresse aujourd'hui ?",
        options: ["Coiffure", "Tresses", "Manucure", "Pédicure", "Maquillage", "Soin du visage", "Massage", "Autre"],
      }
    ]);
  };

  const handleAiSelectOption = (option) => {
    const newMsgs = [...chatMessages, { id: Date.now(), sender: "user", text: option }];

    if (aiStep === 1) {
      setAiAnswers(prev => ({ ...prev, prestation: option }));
      setAiStep(2);
      newMsgs.push({
        id: Date.now() + 1,
        sender: "ai",
        text: `Parfait pour la catégorie "${option}" ! 📍 Dans quelle ville ou secteur souhaitez-vous trouver votre salon ?`,
        options: ["Ma position actuelle", "Paris", "Cergy", "Lyon", "Marseille", "Toulouse", "Peu importe"],
      });
    } else if (aiStep === 2) {
      setAiAnswers(prev => ({ ...prev, ville: option }));
      setAiStep(3);
      newMsgs.push({
        id: Date.now() + 2,
        sender: "ai",
        text: `Super ! 💶 Quel est votre budget maximum par prestation ?`,
        options: ["Moins de 30€", "30€ à 60€", "60€ à 100€", "Plus de 100€", "Peu importe"],
      });
    } else if (aiStep === 3) {
      let budgetVal = null;
      if (option.includes("30€") && !option.includes("60€")) budgetVal = 30;
      else if (option.includes("60€")) budgetVal = 60;
      else if (option.includes("100€")) budgetVal = 100;
      setAiAnswers(prev => ({ ...prev, budgetMax: budgetVal }));
      setAiStep(4);
      newMsgs.push({
        id: Date.now() + 3,
        sender: "ai",
        text: `Compris ! 🎨 Avez-vous une préférence de style ou de spécialité en particulier ?`,
        options: ["Box Braids", "French Manucure", "Balayage", "Massage Suédois", "Non, montrez-moi les meilleurs"],
      });
    } else if (aiStep === 4) {
      setAiAnswers(prev => ({ ...prev, style: option }));
      setAiStep(5);

      // Filtrer la liste correspondante
      const matched = profils.filter(p => {
        const matchCat = !aiAnswers.prestation || aiAnswers.prestation === "Autre" || p.specialites?.some(s => s.toLowerCase().includes(aiAnswers.prestation.toLowerCase()));
        const matchCity = !option || option.includes("Peu importe") || !aiAnswers.ville || aiAnswers.ville.includes("position") || p.city?.toLowerCase().includes(aiAnswers.ville.toLowerCase());
        return matchCat && matchCity;
      });

      newMsgs.push({
        id: Date.now() + 4,
        sender: "ai",
        text: `✨ Génial ! J'ai trouvé ${matched.length > 0 ? matched.length : "plusieurs"} salons et prestations recommandés pour vous selon vos critères :`,
        results: matched.slice(0, 5),
      });
    }

    setChatMessages(newMsgs);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleSendCustomMessage = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    handleAiSelectOption(inputVal.trim());
    setInputVal("");
  };

  const filtered = useMemo(() => {
    return profils.filter(p => {
      const matchCat = activeCategory === "Tous" || p.specialites?.some(s => s.toLowerCase().includes(activeCategory.toLowerCase()));
      const matchSearch = !search || p.salon_name?.toLowerCase().includes(search.toLowerCase()) || p.city?.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [profils, activeCategory, search]);

  const allMapItems = useMemo(() => filtered.map((p) => ({
    ...p,
    mapLat: p.latitude || p.lat || 48.866 + (Math.random() - 0.5) * 0.08,
    mapLng: p.longitude || p.lng || 2.333 + (Math.random() - 0.5) * 0.12,
  })), [filtered]);

  const mapCenter = useMemo(() => {
    if (userLocation) return userLocation;
    return { lat: 48.866, lng: 2.333 };
  }, [userLocation]);

  const handleSelectMarker = (proId) => {
    const pro = allMapItems.find(p => p.id === proId);
    if (pro) navigate("/pro/vue-client", { state: { proEmail: pro.user_email } });
  };

  if (loading) {
    return (
      <div className="font-display h-full flex flex-col items-center justify-center" style={{ background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)" }}>
        <div className="relative mb-5">
          <div className="w-16 h-16 border-[3px] border-[#E8732A]/20 rounded-full animate-spin" style={{ borderTopColor: "#E8732A" }} />
          <Sparkles className="w-7 h-7 text-[#E8732A] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-[13px] font-bold text-white/40">Chargement de la recherche...</p>
      </div>
    );
  }

  return (
    <div className="font-display h-full bg-[#f8f7f5] flex flex-col overflow-hidden">

      {/* ── HERO HEADER ── */}
      <div
        className="flex-shrink-0 px-5 pt-[env(safe-area-inset-top,16px)]"
        style={{ background: "linear-gradient(160deg, #111111 0%, #1e1e1e 60%, #2a1a0e 100%)" }}
      >
        {/* Top row with Title + AI Advanced Search Button */}
        <div className="flex items-center justify-between pt-5 pb-3">
          <div>
            <h1 className="text-[30px] font-black leading-none tracking-tight text-white uppercase">Recherche</h1>
            <p className="text-[11px] font-bold mt-1 flex items-center gap-1.5" style={{ color: "#E8732A" }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#E8732A" }} />
              TROUVEZ VOTRE SALON & STYLE IDÉAL
            </p>
          </div>

          {/* Bouton Recherche Avancée IA */}
          <button
            onClick={handleOpenAISearch}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl active:scale-95 transition-all shadow-lg"
            style={{
              background: "linear-gradient(135deg, #E8732A 0%, #a855f7 100%)",
              border: "1px solid rgba(255,255,255,0.2)"
            }}
          >
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
            <div className="text-left leading-tight">
              <p className="text-[11px] font-black text-white uppercase tracking-wider">Recherche IA</p>
              <p className="text-[9px] text-white/80 font-semibold">Assistant interactif</p>
            </div>
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="flex-1 flex items-center gap-2.5 px-4 py-3.5 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <Search className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Salons, Styles, Services..."
              className="flex-1 bg-transparent text-[14px] font-medium outline-none"
              style={{ color: "white" }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="shrink-0">
                <XCircle className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className="w-12 h-12 rounded-2xl flex items-center justify-center active:scale-95 transition-all shrink-0"
            style={{ background: "#E8732A" }}
          >
            <SlidersHorizontal className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-4 -mx-5 px-5">
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full transition-all active:scale-95"
                style={{
                  background: isActive ? "#E8732A" : "rgba(255,255,255,0.08)",
                  border: isActive ? "none" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span className="text-[15px]">{cat.emoji}</span>
                <span
                  className="text-[12px] font-bold whitespace-nowrap"
                  style={{ color: isActive ? "white" : "rgba(255,255,255,0.6)" }}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Map Toggle + Map */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => setShowMap(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all active:scale-[0.99]"
            style={{
              background: showMap ? "linear-gradient(135deg, #111 0%, #1e1e1e 100%)" : "#f0eeeb",
              border: showMap ? "none" : "1px solid #e8e4df",
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: showMap ? "#E8732A" : "#e8e4df" }}
              >
                <MapPin className="w-4 h-4" style={{ color: showMap ? "white" : "#999" }} />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-bold" style={{ color: showMap ? "white" : "#222" }}>
                  Carte interactive
                </p>
                <p className="text-[11px]" style={{ color: showMap ? "rgba(255,255,255,0.5)" : "#aaa" }}>
                  {allMapItems.length} salon{allMapItems.length !== 1 ? "s" : ""} près de vous
                </p>
              </div>
            </div>
            <span
              className="text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full"
              style={{
                background: showMap ? "rgba(232,115,42,0.2)" : "#e8e4df",
                color: showMap ? "#E8732A" : "#888",
              }}
            >
              {showMap ? "Masquer" : "Afficher"}
            </span>
          </button>
        </div>

        {showMap && (
          <div className="mx-4 mb-4 rounded-3xl overflow-hidden shadow-lg relative" style={{ height: "200px", isolation: "isolate" }}>
            <MapContainer center={mapCenter} zoom={12} style={{ width: "100%", height: "100%" }} zoomControl={false} attributionControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" maxZoom={19} />
              <FlyToLocation center={mapCenter} />
              {userLocation && <Marker position={userLocation} icon={userIcon} />}
              {allMapItems.slice(0, 20).map(p => (
                <Marker
                  key={p.id}
                  position={[p.mapLat, p.mapLng]}
                  icon={L.divIcon({
                    className: "",
                    iconSize: [0, 0],
                    iconAnchor: [14, 14],
                    html: `<div style="width:14px;height:14px;background:#E8732A;border-radius:50%;border:2.5px solid white;box-shadow:0 0 0 3px rgba(232,115,42,0.35),0 2px 8px rgba(0,0,0,0.4);cursor:pointer"></div>`,
                  })}
                  eventHandlers={{ click: () => handleSelectMarker(p.id) }}
                />
              ))}
            </MapContainer>
            <div
              className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)" }}
            />
          </div>
        )}

        {/* ── STYLES SECTION ── */}
        {styles.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between px-4 mb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4" style={{ color: "#E8732A" }} />
                <p className="text-[16px] font-black text-gray-900">Styles Tendance</p>
              </div>
              <button
                onClick={() => navigate("/services-salons?tab=STYLES")}
                className="flex items-center gap-1 text-[12px] font-black uppercase tracking-wide"
                style={{ color: "#E8732A" }}
              >
                Tout voir
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-0 px-4">
              {styles.map((style, idx) => (
                <button
                  key={style.id}
                  onClick={() => navigate(`/style/${style.id}`, { state: { ...style, cover: style.image_url, images: style.images || (style.image_url ? [style.image_url] : []), category: style.category } })}
                  className="shrink-0 w-[130px] text-left active:scale-[0.97] transition-all"
                >
                  <div className="w-[130px] h-[170px] rounded-2xl overflow-hidden mb-2 relative">
                    <img
                      src={style.image_url || (style.images?.[0]) || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=400"}
                      alt={style.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.6) 100%)" }}
                    />
                    {idx < 3 && (
                      <div
                        className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black text-white"
                        style={{ background: "#E8732A" }}
                      >
                        🔥 HOT
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-[12px] font-black text-white truncate leading-tight">{style.title}</p>
                    </div>
                  </div>
                  <p className="text-[11px] font-medium text-gray-400 mt-0.5">{style.category}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── SALONS SECTION ── */}
        <div className="px-4 pb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: "#E8732A" }} />
              <p className="text-[16px] font-black text-gray-900">
                Salons{activeCategory !== "Tous" ? ` · ${activeCategory}` : ""}
              </p>
            </div>
            {filtered.length > 0 && (
              <span className="text-[11px] font-bold text-gray-400">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
                style={{ background: "#f0eeeb" }}
              >
                <Search className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-[16px] font-black text-gray-800 mb-1">Aucun salon trouvé</p>
              <p className="text-[13px] text-gray-400 font-medium text-center px-10">
                Essayez la <span onClick={handleOpenAISearch} className="text-primary underline cursor-pointer">Recherche Avancée IA</span> pour des recommandations personnalisées.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((pro) => {
                const img = pro.avatar_url || pro.cover_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=400";
                const price = minPricesMap[pro.user_email];
                const city = [pro.city, pro.postal_code ? String(pro.postal_code).slice(0, 2) : null].filter(Boolean).join(", ");
                const isOpen = pro.is_open;
                return (
                  <button
                    key={pro.id}
                    onClick={() => navigate("/pro/vue-client", { state: { proEmail: pro.user_email } })}
                    className="w-full rounded-2xl overflow-hidden active:scale-[0.98] transition-all text-left flex bg-white"
                    style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
                  >
                    <div className="w-[100px] h-[110px] shrink-0 relative overflow-hidden">
                      <img src={img} alt={pro.salon_name} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.1) 0%, transparent 50%)" }} />
                      {isOpen === true && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-[8px] font-black text-green-700 uppercase">Ouvert</span>
                        </div>
                      )}
                      {isOpen === false && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                          <span className="text-[8px] font-black text-red-500 uppercase">Fermé</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 px-3.5 py-3 flex flex-col justify-between">
                      <div>
                        <p className="text-[15px] font-extrabold text-gray-900 truncate leading-tight">{pro.salon_name}</p>
                        {pro.specialites?.length > 0 && (
                          <p className="text-[11px] font-bold mt-0.5 truncate" style={{ color: "#E8732A" }}>
                            {pro.specialites.slice(0, 2).join(" · ")}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {city && (
                            <span className="flex items-center gap-0.5 text-[11px] text-gray-400 font-medium">
                              <MapPin className="w-3 h-3" />{city}
                            </span>
                          )}
                          {pro.rating > 0 && (
                            <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-500">
                              <Star className="w-3 h-3 fill-amber-400" />{pro.rating}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        {price > 0 && (
                          <span className="text-[12px] font-extrabold text-gray-800">
                            dès <span style={{ color: "#E8732A" }}>{price}€</span>
                          </span>
                        )}
                        <div
                          className="ml-auto w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(232,115,42,0.1)" }}
                        >
                          <ChevronRight className="w-3.5 h-3.5" style={{ color: "#E8732A" }} />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL RECHERCHE AVANCÉE IA ── */}
      {showAISearchModal && (
        <div className="fixed inset-0 z-[1000] flex flex-col bg-slate-950 text-white animate-fadeIn">
          {/* Top Bar Modal */}
          <div className="px-5 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-[16px] font-black text-white leading-tight">Recherche Avancée IA</h2>
                <p className="text-[11px] text-purple-400 font-medium">Maria · Assistante Sur-Mesure</p>
              </div>
            </div>
            <button
              onClick={() => setShowAISearchModal(false)}
              className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Conversation Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-3xl p-4 text-[13.5px] leading-relaxed shadow-sm ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-tr-xs"
                      : "bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-xs"
                  }`}
                >
                  <p>{msg.text}</p>
                </div>

                {/* Interactive Option Chips */}
                {msg.options && (
                  <div className="flex flex-wrap gap-2 mt-3 max-w-[90%]">
                    {msg.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleAiSelectOption(opt)}
                        className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-orange-500 border border-slate-700 hover:border-orange-400 text-slate-200 hover:text-white text-[12px] font-bold transition-all active:scale-95"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Result cards returned by AI */}
                {msg.results && msg.results.length > 0 && (
                  <div className="w-full space-y-2.5 mt-3">
                    {msg.results.map(pro => (
                      <div
                        key={pro.id}
                        onClick={() => {
                          setShowAISearchModal(false);
                          navigate("/pro/vue-client", { state: { proEmail: pro.user_email } });
                        }}
                        className="w-full bg-slate-900 border border-slate-800 hover:border-orange-500/50 rounded-2xl p-3 flex items-center gap-3 active:scale-[0.99] transition-all cursor-pointer"
                      >
                        <img
                          src={pro.avatar_url || pro.cover_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=400"}
                          className="w-12 h-12 rounded-xl object-cover"
                          alt=""
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-black text-white truncate">{pro.salon_name}</p>
                          <p className="text-[11px] text-orange-400 font-bold truncate">
                            {(pro.specialites || []).slice(0, 2).join(" · ")}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{pro.city || "Paris"}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                          <ArrowRight className="w-4 h-4 text-orange-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Bottom Custom Input */}
          <form onSubmit={handleSendCustomMessage} className="p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
            <input
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Précisez votre recherche..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-[13px] text-white outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="w-11 h-11 bg-orange-500 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* ── FILTER MODAL ── */}
      {showFilters && (
        <div className="fixed inset-0 z-[999] flex items-end" onClick={() => setShowFilters(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-white w-full rounded-t-[32px] max-h-[80vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 pb-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" style={{ color: "#E8732A" }} />
                <h2 className="text-[16px] font-black text-gray-900">Filtres</h2>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6">
              <p className="text-[13px] text-gray-400 font-medium text-center py-8">
                Utilisez la <span onClick={() => { setShowFilters(false); handleOpenAISearch(); }} className="text-primary font-bold underline cursor-pointer">Recherche Avancée IA</span> pour des filtres intelligents ✨
              </p>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setShowFilters(false)}
                className="w-full py-4 text-white text-[13px] font-black uppercase tracking-wider rounded-2xl active:scale-[0.98] transition-all"
                style={{ background: "linear-gradient(135deg, #E8732A 0%, #d4601a 100%)" }}
              >
                Appliquer les filtres
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
