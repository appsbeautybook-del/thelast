import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, SlidersHorizontal, Star, Heart, MapPin, User } from "lucide-react";
import MapWithPricePins from "@/components/map/MapWithPricePins";
import AdvancedFilterSheet from "@/components/filters/AdvancedFilterSheet";
import { GLOBAL_CATEGORIES } from "@/lib/categories";
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import usePullToRefresh from "@/hooks/usePullToRefresh";
import { useLocation } from '@/contexts/LocationContext';

const isVideoUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  return /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url);
};

function VideoThumb({ src, className, alt }) {
  const videoRef = useRef(null);
  const [thumb, setThumb] = useState(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onCanPlay = () => {
      try {
        v.currentTime = 1;
      } catch {}
    };
    const onSeeked = () => {
      try {
        const c = document.createElement("canvas");
        c.width = v.videoWidth || 200;
        c.height = v.videoHeight || 200;
        c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
        setThumb(c.toDataURL("image/jpeg", 0.6));
      } catch {}
    };
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("seeked", onSeeked);
    v.load();
    return () => { v.removeEventListener("canplay", onCanPlay); v.removeEventListener("seeked", onSeeked); };
  }, [src]);

  if (thumb) return <img src={thumb} alt={alt} className={className} />;

  return (
    <>
      <video ref={videoRef} src={src} muted playsInline preload="metadata" className="hidden" />
      <div className={className + " bg-gray-200 flex items-center justify-center"}>
        <span className="text-[10px] text-gray-400 font-bold">VIDEO</span>
      </div>
    </>
  );
}

export default function Services() {
  const navigate = useNavigate();
  const { filterByRadius, hasLocation } = useLocation();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [styles, setStyles] = useState([]);
  const [services, setServices] = useState([]);
  const [pros, setPros] = useState([]);
  const [loadingStyles, setLoadingStyles] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    return new Promise(resolve => setTimeout(() => { setRefreshKey(k => k + 1); resolve(); }, 800));
  }, []);
  const { containerRef, pulling, pullDistance } = usePullToRefresh(handleRefresh);

  useEffect(() => {
    setLoadingStyles(true);
    const filterObj = { status: "publie" };
    if (activeCategory) filterObj.category = activeCategory.dbValue;
    entities.Style.filter(filterObj, "-created_at", 20)
      .then(setStyles).catch(() => setStyles([])).finally(() => setLoadingStyles(false));
  }, [activeCategory, refreshKey]);

  useEffect(() => {
    setLoadingServices(true);
    const filterObj = { status: "actif" };
    if (activeCategory) filterObj.category = activeCategory.dbValue;
    entities.Service.filter(filterObj, "-created_at", 20)
      .then(setServices).catch(() => setServices([])).finally(() => setLoadingServices(false));
  }, [activeCategory, refreshKey]);

  useEffect(() => {
    entities.ProfilPro.filter({ status: "actif" }, "-created_at", 500)
      .then(items => setPros(items || []))
      .catch(() => setPros([]));
  }, [refreshKey]);

  let mapItems = useMemo(() => pros
    .filter(p => p.latitude && p.longitude)
    .slice(0, 30)
    .map(p => {
      const proServices = services.filter(s => s.pro_email === p.user_email);
      const minPrice = proServices.length > 0
        ? Math.min(...proServices.map(s => s.price || 0))
        : 0;
      return {
        id: p.id,
        price: minPrice,
        title: p.salon_name,
        lat: parseFloat(p.latitude),
        lng: parseFloat(p.longitude),
        address: p.address || "",
        city: p.city || "",
      };
    }), [pros, services]);
  if (hasLocation) {
    mapItems = filterByRadius(mapItems, 100);
  }

  const filteredSalons = useMemo(() => {
    let result = pros.filter(p => p.type_activite !== "Particulier");
    if (activeCategory) {
      result = result.filter(p => p.specialites?.some(s => s.toLowerCase().includes(activeCategory.label.toLowerCase())));
    }
    return result.slice(0, 12);
  }, [pros, activeCategory]);

  const filteredParticuliers = useMemo(() => {
    let result = pros.filter(p => p.type_activite === "Particulier");
    if (activeCategory) {
      result = result.filter(p => p.specialites?.some(s => s.toLowerCase().includes(activeCategory.label.toLowerCase())));
    }
    return result.slice(0, 12);
  }, [pros, activeCategory]);

  const goToServicesSalons = (tab = "STYLES") => {
    const cat = activeCategory ? `&cat=${activeCategory.id}` : "";
    navigate(`/services-salons?tab=${tab}${cat}`);
  };

  return (
    <div ref={containerRef} className="font-display bg-white min-h-full pb-6">
      {pullDistance > 10 && (
        <div className="flex items-center justify-center overflow-hidden transition-all" style={{ height: pullDistance * 0.5 }}>
          <div className={`w-6 h-6 border-2 border-primary border-t-transparent rounded-full ${pulling ? "animate-spin" : ""}`} style={{ transform: `rotate(${pullDistance * 2}deg)` }} />
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="text-[32px] font-black text-gray-900 leading-none tracking-tight">EXPLORER</h1>
            <p className="text-[11px] font-black text-primary uppercase tracking-widest mt-0.5">• Vivez l'expérience BeautyBook</p>
          </div>
          <button onClick={() => navigate("/notifications")} className="w-10 h-10 border border-gray-200 rounded-xl flex items-center justify-center text-gray-700 mt-1 active:scale-95 transition-all">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search + Filtres */}
      <div className="px-5 mb-4 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Salons, Styles, Services..."
            className="flex-1 bg-transparent text-[14px] text-gray-600 outline-none placeholder:text-gray-400 font-medium" />
        </div>
        <button onClick={() => setShowFilters(true)}
          className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center shrink-0 active:scale-95 transition-all">
          <SlidersHorizontal className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Catégories — agissent comme filtre */}
      <div className="px-5 mb-4">
        <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-1">
          {/* Bouton "Tous" */}
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 flex flex-col items-center gap-1.5 active:scale-95 transition-all`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border text-[20px] transition-all ${!activeCategory ? "bg-primary/10 border-primary" : "bg-gray-50 border-gray-100"}`}>
              🌟
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest ${!activeCategory ? "text-primary" : "text-gray-500"}`}>Tous</span>
          </button>

          {GLOBAL_CATEGORIES.map((cat) => {
            const Icon = cat.Icon;
            const isActive = activeCategory?.id === cat.id;
            return (
              <button key={cat.id}
                onClick={() => setActiveCategory(isActive ? null : cat)}
                className="shrink-0 flex flex-col items-center gap-1.5 active:scale-95 transition-all">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${isActive ? `${cat.bg} border-2` : "bg-gray-50 border-gray-100"}`}
                  style={isActive ? { borderColor: "hsl(var(--primary))" } : {}}>
                  <Icon className={`w-6 h-6 ${isActive ? cat.color : "text-gray-500"}`} strokeWidth={1.5} />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? "text-primary" : "text-gray-500"}`}>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Carte avec prix des pros de la catégorie */}
      <div className="px-5 mb-5">
        <MapWithPricePins
          items={mapItems}
          onSelectItem={() => goToServicesSalons("SALONS")}
          height="h-44"
        />
      </div>

      <AdvancedFilterSheet open={showFilters} onClose={() => setShowFilters(false)} onApply={setFilters} initialFilters={filters} />

      <div className="space-y-8 pb-4">

        {/* ── Styles ── */}
        <section>
          <div className="px-5 flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 bg-pink-400 rounded-full" />
              <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">
                Styles{activeCategory ? ` · ${activeCategory.label}` : ""}
              </h2>
            </div>
            <button onClick={() => goToServicesSalons("STYLES")}
              className="text-[11px] font-black text-primary uppercase tracking-widest">Découvrir</button>
          </div>
          {loadingStyles ? (
            <div className="flex gap-3 overflow-x-auto px-5">
              {[1, 2, 3].map(i => <div key={i} className="shrink-0 w-44 h-64 bg-gray-100 rounded-3xl animate-pulse" />)}
            </div>
          ) : styles.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-[12px] font-black text-gray-300 uppercase tracking-widest">Aucun style dans cette catégorie</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto hide-scrollbar px-5 pb-1">
              {styles.map((style) => (
                <div key={style.id}
                  onClick={() => navigate(`/style/${style.id}`, { state: { id: style.id, title: style.title, cover: style.image_url, category: style.category } })}
                  className="shrink-0 w-44 rounded-3xl overflow-hidden bg-gray-50 shadow-sm cursor-pointer active:scale-[0.98] transition-all">
                  <div className="relative h-48">
                    <img src={style.image_url || ""} alt={style.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3">
                    <p className="text-[13px] font-black text-gray-900">{style.title}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{style.category}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Services ── */}
        <section className="px-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 bg-primary rounded-full" />
              <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">
                Services{activeCategory ? ` · ${activeCategory.label}` : ""}
              </h2>
            </div>
            <button onClick={() => goToServicesSalons("SERVICES")}
              className="text-[11px] font-black text-primary uppercase tracking-widest">Voir tout</button>
          </div>
          {loadingServices ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : services.length === 0 ? (
            <p className="text-[12px] font-black text-gray-300 uppercase tracking-widest text-center py-4">Aucun service dans cette catégorie</p>
          ) : (
            <div className="space-y-3">
              {services.slice(0, 3).map(s => {
                let serviceImg = s.image_url || null;
                let isVideo = false;
                if (!serviceImg && s.images) {
                  const imgs = typeof s.images === "string" ? JSON.parse(s.images) : s.images;
                  if (Array.isArray(imgs) && imgs.length > 0) {
                    serviceImg = imgs[0];
                    isVideo = isVideoUrl(imgs[0]);
                  }
                }
                if (!isVideo && serviceImg) isVideo = isVideoUrl(serviceImg);
                const pro = pros.find(p => p.user_email === s.pro_email);
                const proName = pro?.salon_name || s.pro_email?.split("@")[0] || "";
                return (
                <button key={s.id}
                  onClick={() => navigate(`/service/${s.id}`, { state: { title: s.title, price: s.price, cover: serviceImg } })}
                  className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 p-3 active:scale-[0.99] transition-all text-left">
                  {serviceImg ? (
                    isVideo ? (
                      <VideoThumb src={serviceImg} alt={s.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                    ) : (
                      <img src={serviceImg} alt={s.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                    )
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 shrink-0 flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-black text-gray-900 truncate">{s.title}</p>
                    {proName && <p className="text-[10px] text-gray-400 font-medium truncate">{proName}</p>}
                    <p className="text-[11px] text-gray-400 font-medium">{s.duration || s.duration_min || ""}{(s.duration || s.duration_min) ? " min" : ""}</p>
                  </div>
                  <span className="text-[18px] font-black text-primary shrink-0">{s.price}€</span>
                </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Salons ── */}
        <section className="px-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 bg-amber-400 rounded-full" />
              <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">
                Salons{activeCategory ? ` · ${activeCategory.label}` : ""}
              </h2>
            </div>
            <button onClick={() => goToServicesSalons("SALONS")}
              className="text-[11px] font-black text-primary uppercase tracking-widest">Voir tout</button>
          </div>
          {filteredSalons.length === 0 ? (
            <p className="text-[12px] font-black text-gray-300 uppercase tracking-widest text-center py-4">Aucun salon dans cette catégorie</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-1">
              {filteredSalons.map(salon => {
                const proServices = services.filter(s => s.pro_email === salon.user_email);
                const minPrice = proServices.length > 0 ? Math.min(...proServices.map(s => s.price || 0)) : 0;
                return (
                  <div key={salon.id}
                    onClick={() => navigate("/pro/vue-client", { state: { proEmail: salon.user_email } })}
                    className="shrink-0 w-48 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer active:scale-[0.98] transition-all">
                    <div className="relative h-36">
                      <img src={salon.avatar_url || salon.cover_url || ""} alt={salon.salon_name} className="w-full h-full object-cover" />
                      <div className="absolute bottom-2 right-2 bg-white/90 rounded-lg px-2 py-1 flex items-center gap-1">
                        <Star className="w-3 h-3 text-primary fill-primary" />
                        <span className="text-[11px] font-black text-gray-900">{salon.rating || "—"}</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-[13px] font-black text-gray-900 truncate">{salon.salon_name}</p>
                      <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{salon.city || "Paris"}</p>
                      {minPrice > 0 && <p className="text-[16px] font-black text-primary mt-1">{minPrice}€</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Particuliers ── */}
        <section className="px-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 bg-violet-400 rounded-full" />
              <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">
                Particuliers{activeCategory ? ` · ${activeCategory.label}` : ""}
              </h2>
            </div>
            <button onClick={() => goToServicesSalons("PARTICULIERS")}
              className="text-[11px] font-black text-primary uppercase tracking-widest">Voir tout</button>
          </div>
          {filteredParticuliers.length === 0 ? (
            <p className="text-[12px] font-black text-gray-300 uppercase tracking-widest text-center py-4">Aucun particulier dans cette catégorie</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-1">
              {filteredParticuliers.map(p => {
                const proServices = services.filter(s => s.pro_email === p.user_email);
                const minPrice = proServices.length > 0 ? Math.min(...proServices.map(s => s.price || 0)) : 0;
                return (
                  <div key={p.id}
                    onClick={() => navigate("/pro/vue-client", { state: { proEmail: p.user_email } })}
                    className="shrink-0 w-40 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer active:scale-[0.98] transition-all">
                    <div className="relative h-40">
                      <img src={p.avatar_url || ""} alt={p.salon_name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3">
                      <p className="text-[13px] font-black text-gray-900 truncate">{p.salon_name}</p>
                      <p className="text-[10px] font-black text-primary uppercase">{(p.specialites || [])[0] || "PRO"}</p>
                      <div className="flex items-center justify-between mt-1">
                        {minPrice > 0 && <p className="text-[14px] font-black text-gray-800">{minPrice}€</p>}
                        {p.rating > 0 && (
                          <div className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 text-primary fill-primary" />
                            <span className="text-[10px] font-black text-gray-600">{p.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}