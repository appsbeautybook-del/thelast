import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Star, X, Search, SlidersHorizontal, Bell, Navigation, Sparkles, XCircle, ChevronRight, Scissors, Waves, Diamond, PenTool, Droplets, Compass } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { entities } from '@/api/entities';
import { useLocation } from '@/contexts/LocationContext';

const CATEGORIES = [
  { id: "Tous", label: "TOUS", icon: "sun" },
  { id: "Coiffure", label: "COIFFURE", icon: "scissors" },
  { id: "Tresses", label: "TRESSES", icon: "waves" },
  { id: "Ongles", label: "MANUCURE", icon: "diamond" },
  { id: "Pedicure", label: "PÉDICURE", icon: "star" },
  { id: "Maquillage", label: "MAQUILLAGE", icon: "pen" },
  { id: "Soin", label: "SOIN VISAGE", icon: "droplet" },
  { id: "Barbe", label: "BARBE", icon: "scissors" },
  { id: "Massage", label: "MASSAGE", icon: "hand" },
];

function CategoryIcon({ icon, size = 20 }) {
  const s = { width: size, height: size };
  switch (icon) {
    case "sun":
      return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      );
    case "scissors":
      return <Scissors style={s} />;
    case "waves":
      return <Waves style={s} />;
    case "diamond":
      return <Diamond style={s} />;
    case "star":
      return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
    case "pen":
      return <PenTool style={s} />;
    case "droplet":
      return <Droplets style={s} />;
    case "hand":
      return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v6M10 10V6a2 2 0 0 0-4 0v8" />
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </svg>
      );
    default:
      return <Sparkles style={s} />;
  }
}

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
  html: `<div style="position:relative;width:28px;height:36px"><div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:28px;height:28px;border-radius:50%;background:#4285F4;border:3px solid white;box-shadow:0 0 0 3px rgba(66,133,244,0.3),0 2px 8px rgba(0,0,0,0.3)"></div><div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #4285F4"></div></div>`,
}) : null;

function FlyToLocation({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, map.getZoom(), { duration: 0.5 });
  }, [center, map]);
  return null;
}

export default function Explorer() {
  const navigate = useNavigate();
  const { hasLocation, latitude, longitude } = useLocation();
  const [profils, setProfils] = useState([]);
  const [minPricesMap, setMinPricesMap] = useState({});
  const [styles, setStyles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [userLocation, setUserLocation] = useState(null);

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
      <div className="font-display h-full bg-[#faf9f7] flex flex-col items-center justify-center">
        <div className="relative mb-5">
          <div className="w-16 h-16 border-[3px] border-primary/15 rounded-full animate-spin" style={{ borderTopColor: "#E8732A" }} />
          <Sparkles className="w-7 h-7 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-[13px] font-bold text-gray-400">Recherche en cours...</p>
      </div>
    );
  }

  return (
    <div className="font-display h-full bg-white flex flex-col overflow-hidden">

      {/* ── HEADER ── */}
      <div className="bg-white px-5 pt-[env(safe-area-inset-top,12px)] flex-shrink-0">
        <div className="flex items-center justify-between pt-4 pb-1">
          <div>
            <h1 className="text-[28px] font-black text-gray-900 tracking-tight leading-none uppercase">Explorer</h1>
            <p className="text-[12px] font-bold text-primary mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-primary rounded-full inline-block" />
              VIVEZ L'EXPÉRIENCE BEAUTYBOOK
            </p>
          </div>
          <button
            onClick={() => navigate("/notifications")}
            className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all"
          >
            <Bell className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 mt-3 pb-3">
          <div className="flex-1 flex items-center gap-2.5 bg-gray-100 rounded-xl px-4 py-3">
            <Search className="w-[16px] h-[16px] text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Salons, Styles, Services..."
              className="flex-1 bg-transparent text-[14px] text-gray-700 outline-none placeholder:text-gray-400 font-medium"
            />
            {search && (
              <button onClick={() => setSearch("")} className="shrink-0">
                <XCircle className="w-[16px] h-[16px] text-gray-400" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowMap(v => !v)}
            className={`h-11 px-3 rounded-xl flex items-center gap-2 active:scale-95 transition-all shrink-0 font-black text-[12px] uppercase tracking-wide ${
              showMap
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <Compass className="w-4 h-4" />
            Carte
          </button>
          <button
            onClick={() => setShowFilters(true)}
            className="w-11 h-11 bg-gray-900 rounded-xl flex items-center justify-center active:scale-95 transition-all shrink-0"
          >
            <SlidersHorizontal className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Category Pills with Icons */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-3 -mx-5 px-5">
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setSelected(null); setExpanded(false); }}
                className={`shrink-0 flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl transition-all active:scale-95 min-w-[64px] ${
                  isActive
                    ? "bg-primary/10"
                    : ""
                }`}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  <CategoryIcon icon={cat.icon} size={20} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wide whitespace-nowrap ${
                  isActive ? "text-primary" : "text-gray-400"
                }`}>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAP ── */}
      {showMap && (
        <div className="mx-5 mb-4 rounded-2xl overflow-hidden shadow-sm flex-shrink-0 relative" style={{ height: "200px", isolation: "isolate" }}>
          <MapContainer center={mapCenter} zoom={12} style={{ width: "100%", height: "100%" }} zoomControl={false} attributionControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" maxZoom={19} />
            <FlyToLocation center={mapCenter} />
            {userLocation && <Marker position={userLocation} icon={userIcon} />}
            {allMapItems.slice(0, 20).map(p => (
              <Marker
                key={p.id}
                position={[p.mapLat, p.mapLng]}
                icon={L.divIcon({
                  className: "",
                  iconSize: [0, 0],
                  iconAnchor: [12, 12],
                  html: `<div style="width:12px;height:12px;background:#E8732A;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.25);cursor:pointer"></div>`,
                })}
                eventHandlers={{ click: () => handleSelectMarker(p.id) }}
              />
            ))}
          </MapContainer>
        </div>
      )}

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: expanded ? "55vh" : "16px" }}>

        {/* Styles Section */}
        {styles.length > 0 && (
        <div className="px-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-primary rounded-full" />
              <p className="text-[16px] font-black text-gray-900 uppercase tracking-tight">Styles</p>
            </div>
            <button
              onClick={() => navigate("/services-salons?tab=STYLES")}
              className="text-[12px] font-black text-primary uppercase tracking-wide"
            >
              Découvrir
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-5 px-5">
            {styles.map(style => (
              <button
                key={style.id}
                onClick={() => navigate(`/style/${style.id}`, { state: { ...style, cover: style.image_url, images: style.images || (style.image_url ? [style.image_url] : []), category: style.category } })}
                className="shrink-0 w-[140px] text-left active:scale-[0.97] transition-all"
              >
                <div className="w-[140px] h-[160px] rounded-2xl overflow-hidden mb-2 relative">
                  <img src={style.image_url || (style.images?.[0]) || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=400"} alt={style.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <p className="text-[13px] font-bold text-gray-900 truncate">{style.title}</p>
                <p className="text-[11px] text-gray-400 font-medium">{style.category}</p>
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Salon Cards */}
        <div className="px-5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Search className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-[15px] font-bold text-gray-800 mb-1">Aucun salon trouvé</p>
              <p className="text-[12px] text-gray-400 font-medium text-center px-10">Essayez une autre catégorie</p>
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
                    className="w-full bg-white rounded-2xl overflow-hidden shadow-[0_1px_8px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-all text-left flex"
                  >
                    <div className="w-[110px] h-[120px] shrink-0 relative overflow-hidden">
                      <img src={img} alt={pro.salon_name} className="w-full h-full object-cover" loading="lazy" />
                      {isOpen === true && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-[9px] font-bold text-green-700">Ouvert</span>
                        </div>
                      )}
                      {isOpen === false && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5">
                          <span className="text-[9px] font-bold text-red-500">Fermé</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 p-3.5 flex flex-col justify-between">
                      <div>
                        <p className="text-[15px] font-extrabold text-gray-900 truncate leading-tight">{pro.salon_name}</p>
                        {pro.specialites?.length > 0 && (
                          <p className="text-[12px] text-primary font-bold mt-0.5 truncate">
                            {pro.specialites.slice(0, 2).join(" · ")}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
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
                      <div className="flex items-center justify-between mt-1">
                        {price > 0 && (
                          <span className="text-[12px] font-extrabold text-gray-900">dès <span className="text-primary">{price}€</span></span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── FILTER MODAL ── */}
      {showFilters && (
        <div className="fixed inset-0 z-[999] flex items-end" onClick={() => setShowFilters(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white w-full rounded-t-3xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-[15px] font-extrabold text-gray-900">Filtres</h2>
              <button onClick={() => setShowFilters(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-95">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <p className="text-[12px] text-gray-400 font-medium text-center py-8">Filtres avancés disponibles prochainement</p>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setShowFilters(false)}
                className="w-full py-3.5 bg-gray-900 text-white text-[13px] font-extrabold uppercase tracking-wider rounded-xl active:scale-[0.98] transition-all"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
