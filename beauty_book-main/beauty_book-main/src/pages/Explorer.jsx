import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Star, X, Search, SlidersHorizontal, RotateCcw, DollarSign, ArrowUpDown, Home, Store, Calendar, Navigation, Sparkles, XCircle, Bell, Sliders, ChevronRight, Clock } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { entities } from '@/api/entities';
import { useLocation } from '@/contexts/LocationContext';

const CATEGORIES = [
  { id: "Tous", label: "Tous", emoji: "🔥" },
  { id: "Coiffure", label: "Coiffure", emoji: "✂️" },
  { id: "Tresses", label: "Tresses", emoji: "〰️" },
  { id: "Ongles", label: "Manucure", emoji: "💎" },
  { id: "Pedicure", label: "Pédicure", emoji: "🦶" },
  { id: "Maquillage", label: "Maquillage", emoji: "💄" },
  { id: "Soin", label: "Soin", emoji: "💧" },
  { id: "Barbe", label: "Barbe", emoji: "🪒" },
  { id: "Massage", label: "Massage", emoji: "💆" },
];

const STYLES_DATA = [
  { id: 1, name: "Havana Twists", category: "Coiffure", image: "https://images.unsplash.com/photo-1595959183082-7b570b7e1e2b?q=80&w=300" },
  { id: 2, name: "Spring Twists", category: "Coiffure", image: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=300" },
  { id: 3, name: "Passion Twists", category: "Coiffure", image: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=300" },
  { id: 4, name: "Box Braids", category: "Coiffure", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=300" },
  { id: 5, name: "Cornrows", category: "Coiffure", image: "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?q=80&w=300" },
];

const PRICE_RANGES = [
  { id: "tous", label: "Tous", min: 0, max: Infinity },
  { id: "0-30", label: "< 30€", min: 0, max: 30 },
  { id: "30-60", label: "30-60€", min: 30, max: 60 },
  { id: "60-100", label: "60-100€", min: 60, max: 100 },
  { id: "100+", label: "100€+", min: 100, max: Infinity },
];

const DISTANCE_OPTIONS = [
  { id: "5", label: "5 km", value: 5 },
  { id: "10", label: "10 km", value: 10 },
  { id: "25", label: "25 km", value: 25 },
  { id: "50", label: "50 km", value: 50 },
];

const RATING_OPTIONS = [
  { id: "tous", label: "Tous", value: 0 },
  { id: "4", label: "4+ ★", value: 4 },
  { id: "4.5", label: "4.5+ ★", value: 4.5 },
];

const SORT_OPTIONS = [
  { id: "recent", label: "Récent" },
  { id: "price-asc", label: "Prix ↑" },
  { id: "price-desc", label: "Prix ↓" },
  { id: "rating", label: "Note" },
  { id: "distance", label: "Proche" },
];

const GENDER_OPTIONS = ["Tous", "Femme", "Homme", "Mixte"];
const SERVICE_TYPE_OPTIONS = ["Tous", "Salon", "À domicile"];
const OPEN_NOW_OPTIONS = [
  { id: "tous", label: "Tous", value: false },
  { id: "ouvert", label: "Ouvert", value: true },
];

function priceIcon(price, isSelected) {
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    iconAnchor: [14, 16],
    html: `<div style="
      background: ${isSelected ? "#1a1a1a" : "white"};
      color: ${isSelected ? "white" : "#E8732A"};
      border-radius: 20px;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 800;
      font-family: 'Plus Jakarta Sans', sans-serif;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      transform: ${isSelected ? "scale(1.15) translateY(-3px)" : "scale(1)"};
      transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid ${isSelected ? "#1a1a1a" : "#E8732A"};
    ">${price > 0 ? price + "€" : "Pro"}</div>`,
  });
}

const userIcon = L.divIcon({
  className: "",
  iconSize: [28, 36],
  iconAnchor: [14, 32],
  html: `<div style="position: relative; width: 28px; height: 36px;">
    <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 28px; height: 28px; border-radius: 50%; background: #4285F4; border: 3px solid white; box-shadow: 0 0 0 3px rgba(66,133,244,0.3), 0 2px 8px rgba(0,0,0,0.3);"></div>
    <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #4285F4;"></div>
  </div>`,
});

function FlyToLocation({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, map.getZoom(), { duration: 0.5 });
  }, [center, map]);
  return null;
}

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Explorer() {
  const navigate = useNavigate();
  const { filterByRadius, hasLocation, latitude, longitude } = useLocation();
  const [profils, setProfils] = useState([]);
  const [minPricesMap, setMinPricesMap] = useState({});
  const [servicesMap, setServicesMap] = useState({});
  const [selected, setSelected] = useState(null);
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showMapSheet, setShowMapSheet] = useState(false);
  const scrollRef = useRef(null);

  const [filterPrice, setFilterPrice] = useState("tous");
  const [filterDistance, setFilterDistance] = useState("25");
  const [filterRating, setFilterRating] = useState("tous");
  const [filterGender, setFilterGender] = useState("Tous");
  const [filterServiceType, setFilterServiceType] = useState("Tous");
  const [filterOpenNow, setFilterOpenNow] = useState("tous");
  const [sortBy, setSortBy] = useState("recent");

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
    entities.ProfilPro.filter({ status: "actif" }, "-created_at", 500)
      .then(async (all) => {
        setProfils(all);
        const emails = all.map(p => p.user_email).filter(Boolean);
        const servicesArr = await Promise.all(
          emails.map(e => entities.Service.filter({ pro_email: e, status: "actif" }, "price", 5).catch(() => []))
        );
        const pMap = {};
        const sMap = {};
        emails.forEach((e, i) => {
          sMap[e] = servicesArr[i] || [];
          const prices = servicesArr[i].map(s => s.price).filter(p => p > 0);
          if (prices.length > 0) pMap[e] = Math.min(...prices);
        });
        setMinPricesMap(pMap);
        setServicesMap(sMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filterPrice !== "tous") c++;
    if (filterDistance !== "25") c++;
    if (filterRating !== "tous") c++;
    if (filterGender !== "Tous") c++;
    if (filterServiceType !== "Tous") c++;
    if (filterOpenNow !== "tous") c++;
    return c;
  }, [filterPrice, filterDistance, filterRating, filterGender, filterServiceType, filterOpenNow]);

  const resetFilters = () => {
    setFilterPrice("tous");
    setFilterDistance("25");
    setFilterRating("tous");
    setFilterGender("Tous");
    setFilterServiceType("Tous");
    setFilterOpenNow("tous");
  };

  let filtered = useMemo(() => {
    let result = profils.filter(p => {
      const matchCat = activeCategory === "Tous" || p.specialites?.some(s => s.toLowerCase().includes(activeCategory.toLowerCase()));
      const matchSearch = !search || p.salon_name?.toLowerCase().includes(search.toLowerCase()) || p.city?.toLowerCase().includes(search.toLowerCase());
      const priceRange = PRICE_RANGES.find(r => r.id === filterPrice);
      const minPrice = minPricesMap[p.user_email] || 0;
      const matchPrice = !priceRange || filterPrice === "tous" || (minPrice >= priceRange.min && minPrice < priceRange.max);
      const matchRating = filterRating === "tous" || (p.rating || 0) >= parseFloat(filterRating);
      const matchGender = filterGender === "Tous" || p.specialites?.some(s => s.toLowerCase().includes(filterGender.toLowerCase())) || p.gender?.toLowerCase().includes(filterGender.toLowerCase());
      const matchServiceType = filterServiceType === "Tous" ||
        (filterServiceType === "Salon" && !p.home_service) ||
        (filterServiceType === "À domicile" && p.home_service);
      const matchOpenNow = filterOpenNow === "tous" || (filterOpenNow === "ouvert" && p.is_open);
      return matchCat && matchSearch && matchPrice && matchRating && matchGender && matchServiceType && matchOpenNow;
    });

    if (hasLocation) {
      const dist = parseFloat(filterDistance) || 100;
      result = result.filter(p => {
        const lat = p.latitude || p.lat;
        const lng = p.longitude || p.lng;
        if (!lat || !lng) return true;
        return getDistance(userLocation?.lat || 48.866, userLocation?.lng || 2.333, lat, lng) <= dist;
      });
    }

    switch (sortBy) {
      case "price-asc": result.sort((a, b) => (minPricesMap[a.user_email] || 0) - (minPricesMap[b.user_email] || 0)); break;
      case "price-desc": result.sort((a, b) => (minPricesMap[b.user_email] || 0) - (minPricesMap[a.user_email] || 0)); break;
      case "rating": result.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      case "distance":
        if (userLocation) {
          result.sort((a, b) => {
            const dA = getDistance(userLocation.lat, userLocation.lng, a.latitude || 48.866, a.longitude || 2.333);
            const dB = getDistance(userLocation.lat, userLocation.lng, b.latitude || 48.866, b.longitude || 2.333);
            return dA - dB;
          });
        }
        break;
      default: break;
    }
    return result;
  }, [profils, activeCategory, search, filterPrice, filterDistance, filterRating, filterGender, filterServiceType, filterOpenNow, sortBy, minPricesMap, hasLocation, userLocation]);

  const allMapItems = useMemo(() => filtered.map((p) => ({
    ...p,
    mapLat: p.latitude || p.lat || 48.866 + (Math.random() - 0.5) * 0.08,
    mapLng: p.longitude || p.lng || 2.333 + (Math.random() - 0.5) * 0.12,
  })), [filtered]);

  const selectedPro = allMapItems.find(p => p.id === selected);
  const mapCenter = useMemo(() => {
    if (userLocation) return userLocation;
    if (selectedPro) return { lat: selectedPro.mapLat, lng: selectedPro.mapLng };
    return { lat: 48.866, lng: 2.333 };
  }, [userLocation, selectedPro]);

  const handleSelectCard = (pro) => {
    setSelected(pro.id);
    setExpanded(true);
  };

  const handleSelectMarker = (proId) => {
    if (selected === proId) {
      const pro = allMapItems.find(p => p.id === proId);
      if (pro) navigate("/pro/vue-client", { state: { proEmail: pro.user_email } });
      return;
    }
    setSelected(proId);
    setExpanded(true);
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
    <div className="font-display h-full bg-[#f8f8f8] flex flex-col overflow-hidden">

      {/* ── TOP HEADER ── */}
      <div className="bg-white px-5 pt-[env(safe-area-inset-top,12px)] pb-0 flex-shrink-0">
        <div className="flex items-center justify-between pt-3 pb-3">
          <div>
            <h1 className="text-[22px] font-extrabold text-gray-900 tracking-tight leading-none">Explorer</h1>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">{filtered.length} salons autour de vous</p>
          </div>
          <button
            onClick={() => navigate("/notifications")}
            className="relative w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center active:scale-95 transition-all"
          >
            <Bell className="w-[18px] h-[18px] text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2.5 pb-3">
          <div className="flex-1 flex items-center gap-2.5 bg-gray-100 rounded-xl px-3.5 py-2.5">
            <Search className="w-[15px] h-[15px] text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un salon..."
              className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400 font-medium"
            />
            {search && (
              <button onClick={() => setSearch("")} className="shrink-0">
                <XCircle className="w-[15px] h-[15px] text-gray-400" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className="relative w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center active:scale-95 transition-all shrink-0"
          >
            <SlidersHorizontal className="w-[15px] h-[15px] text-gray-600" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-primary text-white text-[8px] font-black rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-3 -mx-5 px-5">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setSelected(null); setExpanded(false); }}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                activeCategory === cat.id
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <span className="text-[13px] leading-none">{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── INLINE MAP (collapsible) ── */}
      {!showMapSheet && (
        <div className="bg-white px-4 pb-3 flex-shrink-0">
          <button
            onClick={() => setShowMapSheet(true)}
            className="w-full flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-[12px] font-bold text-gray-800">Voir la carte</p>
                <p className="text-[10px] text-gray-400 font-medium">{filtered.length} salons à proximité</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef} style={{ paddingBottom: expanded ? "55vh" : "0" }}>

        {/* Styles Tendance */}
        <div className="bg-white mt-1 py-3">
          <div className="flex items-center justify-between px-5 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-primary rounded-full" />
              <p className="text-[13px] font-extrabold text-gray-900">Tendances</p>
            </div>
            <button className="text-[11px] font-bold text-primary" onClick={() => navigate("/services-salons?tab=STYLES")}>Tout voir</button>
          </div>
          <div className="flex gap-2.5 overflow-x-auto hide-scrollbar px-5">
            {STYLES_DATA.map(style => (
              <button
                key={style.id}
                onClick={() => navigate(`/style/${style.id}`, { state: { ...style, cover: style.image, images: [style.image], category: style.category } })}
                className="shrink-0 w-[120px] text-left active:scale-[0.97] transition-all"
              >
                <div className="w-[120px] h-[140px] rounded-xl overflow-hidden mb-1.5 relative">
                  <img src={style.image} alt={style.name} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  <span className="absolute bottom-1.5 left-2 text-white text-[10px] font-bold drop-shadow">{style.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Salon Cards */}
        <div className="px-4 pt-3 pb-8">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Search className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-[15px] font-bold text-gray-800 mb-1">Aucun salon trouvé</p>
              <p className="text-[12px] text-gray-400 font-medium text-center px-10">Modifiez vos filtres pour voir plus de résultats</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="mt-4 px-5 py-2 bg-gray-900 text-white text-[11px] font-bold rounded-lg active:scale-95 transition-all"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((pro) => {
                const img = pro.avatar_url || pro.cover_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=400";
                const price = minPricesMap[pro.user_email];
                const isOpen = pro.is_open;
                return (
                  <button
                    key={pro.id}
                    onClick={() => handleSelectCard(pro)}
                    className="w-full bg-white rounded-2xl overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.04)] active:scale-[0.98] transition-all text-left flex"
                  >
                    <div className="w-[100px] h-[100px] shrink-0 relative overflow-hidden">
                      <img src={img} alt={pro.salon_name} className="w-full h-full object-cover" loading="lazy" />
                      {isOpen && (
                        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-[8px] font-bold text-green-700">Ouvert</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[14px] font-extrabold text-gray-900 truncate leading-tight">{pro.salon_name}</p>
                          {price > 0 && (
                            <span className="text-[11px] font-extrabold text-primary shrink-0">dès {price}€</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {pro.city && (
                            <span className="flex items-center gap-0.5 text-[10px] text-gray-400 font-medium">
                              <MapPin className="w-2.5 h-2.5" />{pro.city}
                            </span>
                          )}
                          {pro.rating > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500">
                              <Star className="w-2.5 h-2.5 fill-amber-400" />{pro.rating}
                            </span>
                          )}
                        </div>
                      </div>
                      {pro.specialites?.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {pro.specialites.slice(0, 3).map(s => (
                            <span key={s} className="text-[9px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM PANEL (Selected Pro) ── */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] z-[600] overflow-hidden transition-all duration-300 ease-out rounded-t-3xl"
        style={{ maxHeight: expanded ? "55vh" : "0px" }}
      >
        <div className="flex justify-center pt-3 pb-1 cursor-pointer" onClick={() => setExpanded(false)}>
          <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
        </div>
        {expanded && selectedPro && (
          <div className="px-5 pb-5">
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100 cursor-pointer active:scale-95 transition-all"
                onClick={() => navigate("/pro/vue-client", { state: { proEmail: selectedPro.user_email } })}
              >
                <img src={selectedPro.avatar_url || selectedPro.cover_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=300"} alt={selectedPro.salon_name} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-extrabold text-gray-900 truncate">{selectedPro.salon_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {selectedPro.city && <span className="text-[11px] text-gray-400 font-medium">{selectedPro.city}</span>}
                      {selectedPro.rating > 0 && <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-500"><Star className="w-3 h-3 fill-amber-400" />{selectedPro.rating}</span>}
                    </div>
                  </div>
                  <button onClick={() => { setSelected(null); setExpanded(false); }} className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center shrink-0 active:scale-95">
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2.5">
                  {minPricesMap[selectedPro.user_email] > 0
                    ? <span className="text-[13px] font-extrabold text-primary">dès {minPricesMap[selectedPro.user_email]}€</span>
                    : <span className="text-[11px] text-gray-400 font-medium">Prix sur demande</span>
                  }
                  <button
                    onClick={() => navigate("/pro/vue-client", { state: { proEmail: selectedPro.user_email } })}
                    className="ml-auto bg-gray-900 text-white text-[11px] font-bold px-4 py-2 rounded-lg active:scale-95 transition-all"
                  >
                    Voir le profil
                  </button>
                </div>
              </div>
            </div>

            {servicesMap[selectedPro.user_email]?.length > 0 && (
              <div>
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Services</p>
                <div className="space-y-1.5">
                  {servicesMap[selectedPro.user_email].slice(0, 3).map(s => (
                    <div key={s.id} className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5">
                      <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-gray-200">
                        {s.image_url ? (
                          <img src={s.image_url} alt={s.title || s.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Sparkles className="w-3 h-3 text-gray-300" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-gray-900 truncate">{s.title || s.name}</p>
                        {s.duration && <span className="text-[9px] text-gray-400 font-medium">{s.duration} min</span>}
                      </div>
                      <span className="text-[12px] font-extrabold text-primary shrink-0">{s.price}€</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MAP BOTTOM SHEET ── */}
      {showMapSheet && (
        <div className="fixed inset-0 z-[700] flex items-end" onClick={() => setShowMapSheet(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white w-full h-[85vh] rounded-t-3xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-[15px] font-extrabold text-gray-900">Carte</h2>
                <p className="text-[10px] text-gray-400 font-medium">{filtered.length} salons</p>
              </div>
              <button onClick={() => setShowMapSheet(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-95">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 relative">
              <MapContainer center={mapCenter} zoom={13} style={{ width: "100%", height: "100%" }} zoomControl={true} attributionControl={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" maxZoom={19} />
                <FlyToLocation center={mapCenter} />
                {userLocation && <Marker position={userLocation} icon={userIcon} />}
                {allMapItems.slice(0, 30).map((p) => (
                  <Marker key={p.id} position={[p.mapLat, p.mapLng]} icon={priceIcon(minPricesMap[p.user_email] || 0, selected === p.id)} eventHandlers={{ click: () => handleSelectMarker(p.id) }} />
                ))}
              </MapContainer>
              {userLocation && (
                <button className="absolute bottom-4 right-4 z-[500] w-11 h-11 bg-white rounded-xl shadow-lg flex items-center justify-center active:scale-95">
                  <Navigation className="w-5 h-5 text-primary" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FILTER MODAL ── */}
      {showFilters && (
        <div className="fixed inset-0 z-[700] flex items-end" onClick={() => setShowFilters(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white w-full rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-extrabold text-gray-900">Filtres</h2>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center">{activeFilterCount}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button onClick={resetFilters} className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
                <button onClick={() => setShowFilters(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-95">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {[
                { label: "Budget", options: PRICE_RANGES, value: filterPrice, setter: setFilterPrice, icon: DollarSign },
                { label: "Distance", options: DISTANCE_OPTIONS, value: filterDistance, setter: setFilterDistance, icon: MapPin },
                { label: "Note", options: RATING_OPTIONS, value: filterRating, setter: setFilterRating, icon: Star },
              ].map(({ label, options, value, setter, icon: Icon }) => (
                <div key={label}>
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {options.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setter(opt.id)}
                        className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                          value === opt.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Clientèle</p>
                <div className="flex flex-wrap gap-1.5">
                  {GENDER_OPTIONS.map(g => (
                    <button key={g} onClick={() => setFilterGender(g)} className={`shrink-0 px-3 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${filterGender === g ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {SERVICE_TYPE_OPTIONS.map(t => (
                    <button key={t} onClick={() => setFilterServiceType(t)} className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${filterServiceType === t ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
                      {t === "À domicile" ? <Home className="w-3 h-3" /> : t === "Salon" ? <Store className="w-3 h-3" /> : null}
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Disponibilité</p>
                <div className="flex flex-wrap gap-1.5">
                  {OPEN_NOW_OPTIONS.map(o => (
                    <button key={o.id} onClick={() => setFilterOpenNow(o.id)} className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${filterOpenNow === o.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
                      <Calendar className="w-3 h-3" />
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Trier par</p>
                <div className="flex flex-wrap gap-1.5">
                  {SORT_OPTIONS.map(s => (
                    <button key={s.id} onClick={() => setSortBy(s.id)} className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${sortBy === s.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
                      <ArrowUpDown className="w-3 h-3" />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setShowFilters(false)}
                className="w-full py-3.5 bg-gray-900 text-white text-[13px] font-extrabold uppercase tracking-wider rounded-xl active:scale-[0.98] transition-all"
              >
                Voir {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
