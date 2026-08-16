import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Star, X, Search, ChevronRight, SlidersHorizontal, RotateCcw, DollarSign, ArrowUpDown, Users, Clock, Scissors, Home, Store, CreditCard, Calendar, Camera, Loader2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { entities } from '@/api/entities';
import { useLocation } from '@/contexts/LocationContext';

const CATEGORIES = [
  "Tous", "Coiffure", "Maquillage", "Ongles", "Soin", "Barbe", "Massage",
  "Tresses", "Défrisage", "Colour", "Extensions", "Permanente", "Épilation",
];

const PRICE_RANGES = [
  { id: "tous", label: "Tous les prix", min: 0, max: Infinity },
  { id: "0-30", label: "< 30 €", min: 0, max: 30 },
  { id: "30-60", label: "30 – 60 €", min: 30, max: 60 },
  { id: "60-100", label: "60 – 100 €", min: 60, max: 100 },
  { id: "100+", label: "100 €+", min: 100, max: Infinity },
];

const DISTANCE_OPTIONS = [
  { id: "5", label: "5 km", value: 5 },
  { id: "10", label: "10 km", value: 10 },
  { id: "25", label: "25 km", value: 25 },
  { id: "50", label: "50 km", value: 50 },
  { id: "100", label: "100 km", value: 100 },
];

const RATING_OPTIONS = [
  { id: "tous", label: "Tous", value: 0 },
  { id: "4", label: "4+ ★", value: 4 },
  { id: "4.5", label: "4.5+ ★", value: 4.5 },
];

const SORT_OPTIONS = [
  { id: "recent", label: "Plus récent" },
  { id: "price-asc", label: "Prix croissant" },
  { id: "price-desc", label: "Prix décroissant" },
  { id: "rating", label: "Mieux notés" },
  { id: "distance", label: "Plus proche" },
];

const GENDER_OPTIONS = ["Tous", "Femme", "Homme", "Mixte", "Enfant"];

const SERVICE_TYPE_OPTIONS = ["Tous", "Salon", "À domicile", "Mobile"];

const PAYMENT_OPTIONS = ["Tous", "Espèces", "Carte bancaire", "Chèques", "Mobile"];

const OPEN_NOW_OPTIONS = [
  { id: "tous", label: "Tous", value: false },
  { id: "ouvert", label: "Ouvert maintenant", value: true },
];

function FilterChip({ active, onClick, children, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black transition-all active:scale-95 border ${
        active
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-white text-gray-600 border-gray-200"
      }`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </button>
  );
}

function priceIcon(price, isSelected) {
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<div style="
      background: ${isSelected ? "#222222" : "white"};
      color: ${isSelected ? "white" : "#222222"};
      border-radius: 24px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1);
      transform: ${isSelected ? "scale(1.1) translateY(-2px)" : "scale(1)"};
      transition: all 0.2s ease;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid ${isSelected ? "#222222" : "#e0e0e0"};
      letter-spacing: -0.2px;
    ">${price > 0 ? price + "€" : "Pro"}</div>`,
  });
}

const userIcon = L.divIcon({
  className: "",
  iconSize: [28, 36],
  iconAnchor: [14, 32],
  html: `<div style="position: relative; width: 28px; height: 36px;">
    <div style="
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #4285F4;
      border: 3px solid white;
      box-shadow: 0 0 0 3px rgba(66,133,244,0.3), 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 20L12 16L20 20L12 2Z" fill="white" stroke="white" stroke-width="1" stroke-linejoin="round"/>
      </svg>
    </div>
    <div style="
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 8px solid #4285F4;
    "></div>
  </div>`,
});

function FlyToLocation({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, map.getZoom(), { duration: 0.5 });
    }
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
  const [showMap, setShowMap] = useState(true);
  const [searchImage, setSearchImage] = useState(null);
  const [searchImagePreview, setSearchImagePreview] = useState(null);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const imageInputRef = useRef(null);
  const listRef = useRef(null);

  const [filterPrice, setFilterPrice] = useState("tous");
  const [filterDistance, setFilterDistance] = useState("25");
  const [filterRating, setFilterRating] = useState("tous");
  const [filterGender, setFilterGender] = useState("Tous");
  const [filterServiceType, setFilterServiceType] = useState("Tous");
  const [filterPayment, setFilterPayment] = useState("Tous");
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
    entities.ProfilPro.filter({ status: "actif" }, "-created_at", 100)
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
    if (filterPayment !== "Tous") c++;
    if (filterOpenNow !== "tous") c++;
    return c;
  }, [filterPrice, filterDistance, filterRating, filterGender, filterServiceType, filterPayment, filterOpenNow]);

  const resetFilters = () => {
    setFilterPrice("tous");
    setFilterDistance("25");
    setFilterRating("tous");
    setFilterGender("Tous");
    setFilterServiceType("Tous");
    setFilterPayment("Tous");
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
        (filterServiceType === "À domicile" && p.home_service) ||
        (filterServiceType === "Mobile" && p.mobile_service);

      const matchOpenNow = filterOpenNow === "tous" || 
        (filterOpenNow === "ouvert" && p.is_open);

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

  const allMapItems = filtered.map((p) => ({
    ...p,
    mapLat: p.latitude || p.lat || 48.866 + (Math.random() - 0.5) * 0.08,
    mapLng: p.longitude || p.lng || 2.333 + (Math.random() - 0.5) * 0.12,
  }));

  const selectedPro = allMapItems.find(p => p.id === selected);
  const mapCenter = useMemo(() => {
    if (userLocation) return userLocation;
    if (selectedPro) return { lat: selectedPro.mapLat, lng: selectedPro.mapLng };
    return { lat: 48.866, lng: 2.333 };
  }, [userLocation, selectedPro]);

  const handleToggleFilters = () => {
    if (!showFilters) setShowMap(false);
    setShowFilters(f => !f);
  };

  const handleToggleMap = () => {
    if (!showMap) setShowFilters(false);
    setShowMap(m => !m);
  };

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
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze this image related to beauty/hairdressing services. Return ONLY a JSON object with: {"keywords": ["keyword1", "keyword2", "keyword3"], "category": "one of: Coiffure, Maquillage, Ongles, Soin, Barbe, Massage, Tresses, Défrisage, Colour, Extensions, Épilation", "description": "brief description in French"}. No markdown, no code blocks, just the JSON.' },
                { type: 'image_url', image_url: { url: `data:image/${file.type.split('/')[1]};base64,${base64}` } },
              ],
            },
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.keywords?.length) {
            setSearch(parsed.keywords.join(' '));
          }
          if (parsed.category && parsed.category !== 'Tous') {
            setActiveCategory(parsed.category);
          }
        }
      }
    } catch (err) {
      console.error('[Explorer] Image search error:', err);
    } finally {
      setImageSearchLoading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const clearImageSearch = () => {
    setSearchImagePreview(null);
    setSearch('');
    setActiveCategory('Tous');
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

  const handleSelectCard = (pro) => {
    setSelected(pro.id);
    setExpanded(true);
  };

  return (
    <div className="font-display flex flex-col" style={{ height: "100dvh" }}>

      {/* Header - Search + Categories only */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100 z-40 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 shrink-0">
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>
          <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-2xl px-3 py-2.5">
            {searchImagePreview ? (
              <div className="relative shrink-0">
                <img src={searchImagePreview} alt="" className="w-7 h-7 rounded-lg object-cover" />
                <button onClick={clearImageSearch} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ) : (
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
            )}
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchImagePreview ? "Résultats de la recherche par image..." : "Rechercher un salon, une ville..."}
              className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none"
            />
            {search && <button onClick={() => setSearch("")} className="text-gray-400 text-[14px]">✕</button>}
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSearch} className="hidden" />
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={imageSearchLoading}
              className="shrink-0 w-7 h-7 bg-gray-200 rounded-lg flex items-center justify-center active:scale-95 transition-all"
            >
              {imageSearchLoading ? (
                <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5 text-gray-500" />
              )}
            </button>
          </div>
          <button
            onClick={handleToggleMap}
            className={`flex items-center gap-1.5 px-3 h-9 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all active:scale-95 shrink-0 ${showMap ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            <MapPin className="w-4 h-4" />
          </button>
          <button
            onClick={handleToggleFilters}
            className={`relative flex items-center gap-1.5 px-3 h-9 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all active:scale-95 shrink-0 ${showFilters ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => { setActiveCategory(cat); setSelected(null); setExpanded(false); }}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-black border transition-all active:scale-95 ${activeCategory === cat ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters - separate section, scrollable */}
      {showFilters && (
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex-shrink-0 max-h-[45vh] overflow-y-auto relative z-[550]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-black text-gray-900 uppercase tracking-wider">Filtres détaillés</p>
            {activeFilterCount > 0 && (
              <button onClick={resetFilters} className="flex items-center gap-1 text-[11px] font-black text-gray-900">
                <RotateCcw className="w-3 h-3" /> Tout effacer
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Budget (par service)</p>
              <div className="flex flex-wrap gap-2">
                {PRICE_RANGES.map(r => (
                  <FilterChip key={r.id} active={filterPrice === r.id} onClick={() => setFilterPrice(r.id)} icon={DollarSign}>
                    {r.label}
                  </FilterChip>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Distance</p>
              <div className="flex flex-wrap gap-2">
                {DISTANCE_OPTIONS.map(d => (
                  <FilterChip key={d.id} active={filterDistance === d.id} onClick={() => setFilterDistance(d.id)} icon={MapPin}>
                    {d.label}
                  </FilterChip>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Note minimum</p>
              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map(r => (
                  <FilterChip key={r.id} active={filterRating === r.id} onClick={() => setFilterRating(r.id)} icon={Star}>
                    {r.label}
                  </FilterChip>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Clientèle</p>
              <div className="flex flex-wrap gap-2">
                {GENDER_OPTIONS.map(g => (
                  <FilterChip key={g} active={filterGender === g} onClick={() => setFilterGender(g)} icon={Users}>
                    {g}
                  </FilterChip>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Type de service</p>
              <div className="flex flex-wrap gap-2">
                {SERVICE_TYPE_OPTIONS.map(t => (
                  <FilterChip key={t} active={filterServiceType === t} onClick={() => setFilterServiceType(t)} icon={t === "À domicile" ? Home : Store}>
                    {t}
                  </FilterChip>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Disponibilité</p>
              <div className="flex flex-wrap gap-2">
                {OPEN_NOW_OPTIONS.map(o => (
                  <FilterChip key={o.id} active={filterOpenNow === o.id} onClick={() => setFilterOpenNow(o.id)} icon={Calendar}>
                    {o.label}
                  </FilterChip>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Moyen de paiement</p>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_OPTIONS.map(p => (
                  <FilterChip key={p} active={filterPayment === p} onClick={() => setFilterPayment(p)} icon={CreditCard}>
                    {p}
                  </FilterChip>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Trier par</p>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map(s => (
                  <FilterChip key={s.id} active={sortBy === s.id} onClick={() => setSortBy(s.id)} icon={ArrowUpDown}>
                    {s.label}
                  </FilterChip>
                ))}
              </div>
            </div>
          </div>
      </div>
      )}

      {/* List view when map is hidden */}
      {!showMap && !loading && (
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">
              {filtered.length} prestataire{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="px-4 pb-4 space-y-3">
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelectCard(p)}
                className="w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-[0.98] transition-all text-left"
              >
                <div className="flex items-center gap-3 p-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                    <img src={p.avatar_url || p.cover_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=300"} alt={p.salon_name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-black text-gray-900 truncate">{p.salon_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {p.city && <span className="text-[11px] text-gray-400 font-medium flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{p.city}</span>}
                      {p.rating > 0 && <span className="text-[11px] font-black text-gray-600 flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />{p.rating}</span>}
                    </div>
                    {p.specialites?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.specialites.slice(0, 3).map(s => (
                          <span key={s} className="text-[9px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    {minPricesMap[p.user_email] > 0 && <span className="text-[15px] font-black text-primary">dès {minPricesMap[p.user_email]}€</span>}
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[14px] font-bold text-gray-400">Aucun prestataire trouvé</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map */}
      {showMap && (
      <div className="flex-1 relative min-h-0 z-[400]">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ width: "100%", height: "100%" }}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>' maxZoom={19} />
            <FlyToLocation center={mapCenter} />
            {userLocation && (
              <Marker position={userLocation} icon={userIcon} />
            )}
            {allMapItems.map((p) => (
              <Marker
                key={p.id}
                position={[p.mapLat, p.mapLng]}
                icon={priceIcon(minPricesMap[p.user_email] || 0, selected === p.id)}
                eventHandlers={{
                  click: () => handleSelectMarker(p.id),
                }}
              />
            ))}
          </MapContainer>
        )}

        {/* Counter */}
        <div className="absolute top-3 left-3 z-[500] bg-white rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-[11px] font-black text-gray-800">{filtered.length} prestataire{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {selectedPro && !expanded && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] bg-black/80 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-white text-[11px] font-medium">Tapotez le marqueur pour ouvrir le profil</span>
          </div>
        )}
      </div>
      )}

      {/* Bottom panel */}
      <div
        className="bg-white border-t border-gray-100 shadow-2xl flex-shrink-0 z-[600] overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: expanded ? "58vh" : "0px" }}
      >
        <div
          className="flex justify-center pt-2 pb-1 cursor-pointer"
          onClick={() => setExpanded(false)}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {expanded && selectedPro && (
          <div className="px-4 py-2">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-[72px] h-[72px] rounded-2xl overflow-hidden shrink-0 bg-gray-100 shadow-sm cursor-pointer active:scale-95 transition-all"
                onClick={() => navigate("/pro/vue-client", { state: { proEmail: selectedPro.user_email } })}
              >
                <img src={selectedPro.avatar_url || selectedPro.cover_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=300"} alt={selectedPro.salon_name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[17px] font-black text-gray-900 truncate">{selectedPro.salon_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {selectedPro.city && (
                        <span className="flex items-center gap-0.5 text-[11px] text-gray-400 font-medium">
                          <MapPin className="w-3 h-3" />{selectedPro.city}
                        </span>
                      )}
                      {selectedPro.rating > 0 && (
                        <span className="flex items-center gap-0.5 text-[12px] font-black text-gray-700">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />{selectedPro.rating}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => { setSelected(null); setExpanded(false); }} className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  {minPricesMap[selectedPro.user_email] > 0
                    ? <span className="text-[16px] font-black text-primary">dès {minPricesMap[selectedPro.user_email]}€</span>
                    : <span className="text-[12px] text-gray-400 font-medium">Prix sur demande</span>
                  }
                  <button
                    onClick={() => navigate("/pro/vue-client", { state: { proEmail: selectedPro.user_email } })}
                    className="bg-gray-900 text-white text-[12px] font-black uppercase tracking-wider px-5 py-2.5 rounded-2xl active:scale-95 transition-all shadow-lg shadow-gray-900/20"
                  >
                    Voir le profil →
                  </button>
                </div>
              </div>
            </div>

            <div ref={listRef} className="overflow-y-auto hide-scrollbar" style={{ maxHeight: "calc(58vh - 150px)" }}>
              {/* Services du pro sélectionné */}
              {servicesMap[selectedPro.user_email]?.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Services</p>
                  <div className="space-y-2">
                    {servicesMap[selectedPro.user_email].slice(0, 5).map(s => {
                      let serviceImg = s.image_url || null;
                      if (!serviceImg && s.images) {
                        const imgs = typeof s.images === "string" ? JSON.parse(s.images) : s.images;
                        if (Array.isArray(imgs) && imgs.length > 0) {
                          const isVideo = (url) => /\.(mp4|webm|mov|avi)(\?|$)/i.test(url);
                          serviceImg = imgs.find(u => u && !isVideo(u)) || imgs[0] || null;
                        }
                      }
                      return (
                      <div key={s.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-200">
                          {serviceImg ? (
                            <img src={serviceImg} alt={s.title || s.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Scissors className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-black text-gray-900 truncate">{s.title || s.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {s.duration && (
                              <span className="text-[10px] text-gray-400 font-medium flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />{s.duration} min
                              </span>
                            )}
                            {s.category && (
                              <span className="text-[10px] text-gray-400 font-medium">{s.category}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[14px] font-black text-primary shrink-0">{s.price}€</span>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Autres pros à proximité */}
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                {filtered.length - 1} autre{filtered.length - 1 !== 1 ? "s" : ""} à proximité
              </p>
              <div className="space-y-1 pb-2">
                {allMapItems.filter(p => p.id !== selectedPro.id).slice(0, 20).map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectCard(p)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                  >
                    <div className="w-[48px] h-[48px] rounded-xl overflow-hidden shrink-0 bg-gray-100">
                      <img src={p.avatar_url || p.cover_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=300"} alt={p.salon_name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-black text-gray-900 truncate">{p.salon_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {p.city && <span className="text-[10px] text-gray-400 font-medium flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{p.city}</span>}
                        {p.rating > 0 && <span className="text-[11px] font-black text-gray-600 flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />{p.rating}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-1">
                      {minPricesMap[p.user_email] > 0 && <span className="text-[13px] font-black text-primary">{minPricesMap[p.user_email]}€</span>}
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
