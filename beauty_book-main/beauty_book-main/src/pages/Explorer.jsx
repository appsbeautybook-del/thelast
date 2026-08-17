import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Star, X, Search, SlidersHorizontal, RotateCcw, DollarSign, ArrowUpDown, Home, Store, Calendar, Camera, Loader2, Navigation, Sparkles, ChevronRight, Clock, Filter, Map as MapIcon, XCircle, TrendingUp, Bell, Sliders } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { entities } from '@/api/entities';
import { useLocation } from '@/contexts/LocationContext';

const CATEGORIES = [
  { id: "Tous", label: "TOUS", emoji: "☀️" },
  { id: "Coiffure", label: "COIFFURE", emoji: "✂️" },
  { id: "Tresses", label: "TRESSES", emoji: "〰️" },
  { id: "Ongles", label: "MANUCURE", emoji: "💎" },
  { id: "Pedicure", label: "PÉDICURE", emoji: "⭐" },
  { id: "Maquillage", label: "MAQUILLAGE", emoji: "💄" },
  { id: "Soin", label: "SOIN VISAGE", emoji: "💧" },
  { id: "Barbe", label: "BARBE", emoji: "🪒" },
  { id: "Massage", label: "MASSAGE", emoji: "💆" },
];

const STYLES = [
  { id: 1, name: "Havana Twists", category: "Coiffure", image: "https://images.unsplash.com/photo-1595959183082-7b570b7e1e2b?q=80&w=200" },
  { id: 2, name: "Spring Twists", category: "Coiffure", image: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=200" },
  { id: 3, name: "Passion Twists", category: "Coiffure", image: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=200" },
  { id: 4, name: "Box Braids", category: "Coiffure", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=200" },
  { id: 5, name: "Cornrows", category: "Coiffure", image: "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?q=80&w=200" },
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
    <div style="
      position: absolute; top: 0; left: 50%; transform: translateX(-50%);
      width: 28px; height: 28px; border-radius: 50%;
      background: #4285F4; border: 3px solid white;
      box-shadow: 0 0 0 3px rgba(66,133,244,0.3), 0 2px 8px rgba(0,0,0,0.3);
    "></div>
    <div style="
      position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
      width: 0; height: 0;
      border-left: 6px solid transparent; border-right: 6px solid transparent;
      border-top: 8px solid #4285F4;
    "></div>
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

function SalonCard({ pro, minPrice, services, onSelect, index }) {
  const mainImg = pro.avatar_url || pro.cover_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=400";
  const isOpen = pro.is_open;
  return (
    <button
      onClick={() => onSelect(pro)}
      className="bg-white rounded-[20px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.05)] active:scale-[0.97] transition-all duration-300 text-left group w-full"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative h-44 overflow-hidden bg-gray-100">
        <img
          src={mainImg}
          alt={pro.salon_name}
          className="w-full h-full object-cover group-active:scale-110 transition-transform duration-700 ease-out"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          {isOpen ? (
            <div className="flex items-center gap-1.5 bg-green-500/90 backdrop-blur-md text-white text-[9px] font-bold px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              Ouvert
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-gray-800/80 backdrop-blur-md text-white/80 text-[9px] font-bold px-2 py-1 rounded-full">
              Fermé
            </div>
          )}
          {minPrice > 0 && (
            <div className="bg-white/95 backdrop-blur-md text-gray-900 text-[11px] font-black px-2.5 py-1 rounded-full">
              dès {minPrice}€
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-[15px] font-black text-white drop-shadow-lg truncate leading-tight">{pro.salon_name}</p>
          <div className="flex items-center gap-2 mt-1">
            {pro.city && (
              <span className="flex items-center gap-1 text-[10px] text-white/80 font-medium">
                <MapPin className="w-2.5 h-2.5" />{pro.city}
              </span>
            )}
            {pro.rating > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-white">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />{pro.rating}
              </span>
            )}
          </div>
        </div>
      </div>
      {pro.specialites?.length > 0 && (
        <div className="px-3 py-2.5 flex flex-wrap gap-1">
          {pro.specialites.slice(0, 3).map(s => (
            <span key={s} className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{s}</span>
          ))}
          {pro.specialites.length > 3 && (
            <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">+{pro.specialites.length - 3}</span>
          )}
        </div>
      )}
    </button>
  );
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
  const [viewMode, setViewMode] = useState("list");
  const [searchImagePreview, setSearchImagePreview] = useState(null);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const [showMapSheet, setShowMapSheet] = useState(false);
  const imageInputRef = useRef(null);
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

  const handleImageSearch = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageSearchLoading(true);
    const previewUrl = URL.createObjectURL(file);
    setSearchImagePreview(previewUrl);
    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const OR_KEY = (typeof __OPENROUTER_KEY__ !== 'undefined' ? __OPENROUTER_KEY__ : '') || import.meta.env.VITE_OPENROUTER_KEY || '';
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OR_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'BeautyBook Image Search',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this beauty/hairdressing image. Return ONLY JSON: {"keywords": ["k1","k2"], "category": "one of: Coiffure, Maquillage, Ongles, Soin, Barbe, Massage, Tresses"}' },
              { type: 'image_url', image_url: { url: `data:image/${file.type.split('/')[1]};base64,${base64}` } },
            ],
          }],
          temperature: 0.3,
          max_tokens: 150,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.keywords?.length) setSearch(parsed.keywords.join(' '));
          if (parsed.category && parsed.category !== 'Tous') setActiveCategory(parsed.category);
        }
      }
    } catch (err) {
      console.error('[Explorer] Image search error:', err);
    } finally {
      setImageSearchLoading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

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

  return (
    <div className="font-display h-full bg-[#faf9f7] flex flex-col overflow-hidden">

      {/* ── HEADER ── */}
      <div className="bg-white px-5 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-[28px] font-black text-gray-900 leading-none tracking-tight">EXPLORER</h1>
          <button
            onClick={() => navigate("/notifications")}
            className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
          >
            <Bell className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-4">● VIVEZ L'EXPÉRIENCE BEAUTYBOOK</p>

        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2.5 bg-gray-100 rounded-2xl px-4 py-3">
            <Search className="w-4.5 h-4.5 text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Salons, Styles, Services..."
              className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400 font-medium"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400">
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className="relative w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
          >
            <Sliders className="w-5 h-5 text-white" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── CATEGORIES ── */}
      <div className="bg-white border-b border-gray-100 flex-shrink-0">
        <div ref={scrollRef} className="flex gap-2 overflow-x-auto hide-scrollbar px-5 py-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setSelected(null); setExpanded(false); }}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                activeCategory === cat.id
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <span className="text-[14px]">{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── LOADING ── */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 border-4 border-primary/20 rounded-full animate-spin" style={{ borderTopColor: "#E8732A" }} />
              <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-[13px] font-bold text-gray-400">Découvertes en cours...</p>
          </div>
        </div>
      )}

      {/* ── MAP SECTION ── */}
      {!loading && (
        <div className="px-5 pt-4 pb-2 flex-shrink-0">
          <div className="rounded-[20px] overflow-hidden h-48 shadow-sm border border-gray-100">
            <MapContainer center={mapCenter} zoom={12} style={{ width: "100%", height: "100%" }} zoomControl={false} attributionControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" maxZoom={19} />
              <FlyToLocation center={mapCenter} />
              {userLocation && <Marker position={userLocation} icon={userIcon} />}
              {allMapItems.slice(0, 10).map((p) => (
                <Marker key={p.id} position={[p.mapLat, p.mapLng]} icon={priceIcon(minPricesMap[p.user_email] || 0, selected === p.id)} eventHandlers={{ click: () => handleSelectMarker(p.id) }} />
              ))}
            </MapContainer>
          </div>
        </div>
      )}

      {/* ── CONTENT ── */}
      {!loading && (
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          {/* Styles Section */}
          <div className="px-5 pt-3 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-primary rounded-full" />
                <p className="text-[14px] font-black text-gray-900">STYLES</p>
              </div>
              <button className="text-[11px] font-bold text-primary">DÉCOUVRIR</button>
            </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {STYLES.map(style => (
                <button
                  key={style.id}
                  className="shrink-0 w-36 text-left active:scale-[0.97] transition-all"
                >
                  <div className="h-36 rounded-2xl overflow-hidden mb-2">
                    <img src={style.image} alt={style.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <p className="text-[13px] font-black text-gray-900">{style.name}</p>
                  <p className="text-[11px] text-gray-400 font-medium">{style.category}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Salons List */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-amber-50 rounded-3xl flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-primary/40" />
              </div>
              <p className="text-[16px] font-black text-gray-900 mb-2">Aucun salon trouvé</p>
              <p className="text-[12px] text-gray-400 font-medium text-center">
                Essayez de modifier vos filtres ou votre recherche
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="mt-4 px-5 py-2.5 bg-primary text-white text-[12px] font-bold rounded-full active:scale-95 transition-all"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <div className="px-5 pb-28">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  {filtered.length} salon{filtered.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={() => setShowMapSheet(true)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-primary active:scale-95"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  Voir la carte
                </button>
              </div>
              <div className="space-y-3">
                {filtered.map((p, i) => (
                  <SalonCard
                    key={p.id}
                    pro={p}
                    minPrice={minPricesMap[p.user_email]}
                    services={servicesMap[p.user_email]}
                    onSelect={handleSelectCard}
                    index={i}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BOTTOM PANEL (Selected Pro) ── */}
      <div
        className="bg-white border-t border-gray-100 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] flex-shrink-0 z-[600] overflow-hidden transition-all duration-300 ease-out rounded-t-3xl"
        style={{ maxHeight: expanded ? "55vh" : "0px" }}
      >
        <div className="flex justify-center pt-3 pb-1 cursor-pointer" onClick={() => setExpanded(false)}>
          <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
        </div>
        {expanded && selectedPro && (
          <div className="px-5 pb-4">
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-[70px] h-[70px] rounded-2xl overflow-hidden shrink-0 bg-gray-100 shadow-md cursor-pointer active:scale-95 transition-all"
                onClick={() => navigate("/pro/vue-client", { state: { proEmail: selectedPro.user_email } })}
              >
                <img src={selectedPro.avatar_url || selectedPro.cover_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=300"} alt={selectedPro.salon_name} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-black text-gray-900 truncate leading-tight">{selectedPro.salon_name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {selectedPro.city && <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium"><MapPin className="w-2.5 h-2.5" />{selectedPro.city}</span>}
                      {selectedPro.rating > 0 && <span className="flex items-center gap-1 text-[11px] font-bold text-gray-700"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />{selectedPro.rating}</span>}
                    </div>
                  </div>
                  <button onClick={() => { setSelected(null); setExpanded(false); }} className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center shrink-0 active:scale-95">
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  {minPricesMap[selectedPro.user_email] > 0
                    ? <span className="text-[15px] font-black text-primary">dès {minPricesMap[selectedPro.user_email]}€</span>
                    : <span className="text-[11px] text-gray-400 font-medium">Prix sur demande</span>
                  }
                  <button
                    onClick={() => navigate("/pro/vue-client", { state: { proEmail: selectedPro.user_email } })}
                    className="bg-primary text-white text-[11px] font-black uppercase tracking-wider px-5 py-2.5 rounded-2xl active:scale-95 transition-all shadow-md shadow-primary/20"
                  >
                    Voir le profil →
                  </button>
                </div>
              </div>
            </div>

            {servicesMap[selectedPro.user_email]?.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Services populaires</p>
                <div className="space-y-2">
                  {servicesMap[selectedPro.user_email].slice(0, 3).map(s => (
                    <div key={s.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-gray-200">
                        {s.image_url ? (
                          <img src={s.image_url} alt={s.title || s.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-gray-300" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-gray-900 truncate">{s.title || s.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {s.duration && <span className="text-[9px] text-gray-400 font-medium flex items-center gap-1"><Clock className="w-2 h-2" />{s.duration} min</span>}
                        </div>
                      </div>
                      <span className="text-[13px] font-black text-primary shrink-0">{s.price}€</span>
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white w-full h-[85vh] rounded-t-3xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-[16px] font-black text-gray-900">Carte</h2>
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
                <button className="absolute bottom-4 right-4 z-[500] w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center active:scale-95">
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white w-full rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-[16px] font-black text-gray-900">Filtres</h2>
              </div>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button onClick={resetFilters} className="flex items-center gap-1 text-[11px] font-bold text-gray-500">
                    <RotateCcw className="w-3 h-3" /> Tout
                  </button>
                )}
                <button onClick={() => setShowFilters(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-95">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {[
                { label: "Budget", options: PRICE_RANGES, value: filterPrice, setter: setFilterPrice, icon: DollarSign },
                { label: "Distance", options: DISTANCE_OPTIONS, value: filterDistance, setter: setFilterDistance, icon: MapPin },
                { label: "Note minimum", options: RATING_OPTIONS, value: filterRating, setter: setFilterRating, icon: Star },
              ].map(({ label, options, value, setter, icon: Icon }) => (
                <div key={label}>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">{label}</p>
                  <div className="flex flex-wrap gap-2">
                    {options.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setter(opt.id)}
                        className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                          value === opt.id ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-gray-100 text-gray-600"
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
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Clientèle</p>
                <div className="flex flex-wrap gap-2">
                  {GENDER_OPTIONS.map(g => (
                    <button key={g} onClick={() => setFilterGender(g)} className={`shrink-0 px-3 py-2 rounded-full text-[11px] font-bold transition-all active:scale-95 ${filterGender === g ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-gray-100 text-gray-600"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Type</p>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_TYPE_OPTIONS.map(t => (
                    <button key={t} onClick={() => setFilterServiceType(t)} className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold transition-all active:scale-95 ${filterServiceType === t ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-gray-100 text-gray-600"}`}>
                      {t === "À domicile" ? <Home className="w-3 h-3" /> : t === "Salon" ? <Store className="w-3 h-3" /> : null}
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Disponibilité</p>
                <div className="flex flex-wrap gap-2">
                  {OPEN_NOW_OPTIONS.map(o => (
                    <button key={o.id} onClick={() => setFilterOpenNow(o.id)} className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold transition-all active:scale-95 ${filterOpenNow === o.id ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-gray-100 text-gray-600"}`}>
                      <Calendar className="w-3 h-3" />
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Trier par</p>
                <div className="flex flex-wrap gap-2">
                  {SORT_OPTIONS.map(s => (
                    <button key={s.id} onClick={() => setSortBy(s.id)} className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold transition-all active:scale-95 ${sortBy === s.id ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-gray-100 text-gray-600"}`}>
                      <ArrowUpDown className="w-3 h-3" />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setShowFilters(false)}
                className="w-full py-3.5 bg-primary text-white text-[13px] font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-lg shadow-primary/25"
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
