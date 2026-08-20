import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Tag, Scissors, Zap } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from "@/lib/AuthContext";
import { useThemeBg } from "@/hooks/useTheme";

function ImageSlider({ images, onClick }) {
  const [current, setCurrent] = useState(0);
  const [failed, setFailed] = useState({});
  const touchStartX = useRef(null);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 30) {
      if (diff > 0) setCurrent(c => Math.min(c + 1, images.length - 1));
      else setCurrent(c => Math.max(c - 1, 0));
    }
    touchStartX.current = null;
  };

  const validImages = (images || []).filter(u => u && !failed[u]);

  if (validImages.length === 0) {
    return <div className="w-full h-full bg-gray-100 flex items-center justify-center"><Scissors className="w-10 h-10 text-gray-300" /></div>;
  }

  return (
    <div className="relative w-full h-full overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={onClick}>
      {images.map((url, i) => (
        url && (
          <img key={i} src={url} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(${(i - current) * 100}%)` }}
            onError={() => setFailed(p => ({ ...p, [url]: true }))} />
        )
      ))}
      {validImages.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {validImages.map((_, i) => (
            <div key={i} className={`rounded-full transition-all ${i === current ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/60"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

const filterTabs = ["Tous", "Actifs", "Brouillons", "Bundles"];

export default function CatalogueServices() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const themeBg = useThemeBg();
  const [activeFilter, setActiveFilter] = useState("Tous");
  const [services, setServices] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    supabase.from("Service").select("*").eq("pro_email", user.email).order("created_at", { ascending: false }).limit(100)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Load services error:", error);
        setServices(data || []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    supabase.from("ServiceBundle").select("*").eq("pro_email", user.email).order("created_at", { ascending: false })
      .then(({ data }) => { if (!cancelled) setBundles(data || []); });
    return () => { cancelled = true; };
  }, []);

  const toggleActive = async (id) => {
    const svc = services.find(s => s.id === id);
    if (!svc) return;
    const isActive = svc.status === "actif";
    const newStatus = isActive ? "brouillon" : "actif";
    setServices(s => s.map(sv => sv.id === id ? { ...sv, status: newStatus } : sv));
    try {
      const { data, error } = await supabase.from("Service").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id).select();
      if (error) {
        setServices(s => s.map(sv => sv.id === id ? { ...sv, status: svc.status } : sv));
      } else if (data?.[0]) {
        setServices(s => s.map(sv => sv.id === id ? { ...sv, status: data[0].status } : sv));
      }
    } catch (e) {
      setServices(s => s.map(sv => sv.id === id ? { ...sv, status: svc.status } : sv));
    }
  };

  const deleteService = async (id) => {
    if (!confirm("Supprimer ce service ?")) return;
    setServices(s => s.filter(sv => sv.id !== id));
    try { await entities.Service.delete(id); } catch {
      entities.Service.filter({ pro_email: user?.email }, "-created_at", 100).then(setServices).catch(() => {});
    }
  };

  const deleteBundle = async (id) => {
    if (!confirm("Supprimer ce bundle ?")) return;
    setBundles(b => b.filter(x => x.id !== id));
    await supabase.from("ServiceBundle").delete().eq("id", id);
  };

  const filtered = services.filter(s => {
    if (activeFilter === "Actifs") return s.status === "actif";
    if (activeFilter === "Brouillons") return s.status !== "actif";
    return true;
  });

  const draftsCount = services.filter(s => s.status !== "actif").length;
  const isPackTab = activeFilter === "Bundles";

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (isPackTab) {
      if (bundles.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-20 h-20 rounded-full bg-pink-50 flex items-center justify-center">
              <Zap className="w-10 h-10 text-pink-400" />
            </div>
            <p className="text-[16px] font-black text-gray-700">Aucun bundle</p>
            <p className="text-[13px] text-gray-400">Créez votre premier bundle de services.</p>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          {bundles.map(b => {
            const includedSvcs = services.filter(s => b.service_ids?.includes(s.id));
            const regularTotal = includedSvcs.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
            return (
              <div key={b.id} className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-3xl overflow-hidden border border-pink-100">
                {b.image_url && <img src={b.image_url} alt="" className="w-full h-40 object-cover" onError={e => e.target.style.display = 'none'} />}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-pink-500" />
                        <p className="text-[16px] font-black text-gray-900 truncate">{b.name}</p>
                      </div>
                      {b.description && <p className="text-[12px] text-gray-500 mb-2">{b.description}</p>}
                      <div className="flex items-center gap-2 mb-2">
                        {regularTotal > 0 && <span className="text-[13px] text-gray-400 line-through">{regularTotal}€</span>}
                        <span className="text-[20px] font-black text-[#E8732A]">{b.bundle_price}€</span>
                        {b.discount_percent > 0 && (
                          <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full">-{b.discount_percent}%</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {includedSvcs.map(s => (
                          <span key={s.id} className="bg-white border border-pink-200 rounded-full px-2.5 py-1 text-[10px] font-bold text-pink-600 truncate max-w-[120px]">
                            {s.title || s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => deleteBundle(b.id)} className="p-2.5 bg-white rounded-xl border border-pink-200 shrink-0">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center">
            <Scissors className="w-10 h-10 text-primary" />
          </div>
          <p className="text-[16px] font-black text-gray-700">Aucun service</p>
          <p className="text-[13px] text-gray-400">Ajoutez votre premier service ci-dessous.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filtered.map(service => {
          const isActive = service.status === "actif";
          const isDraft = !isActive;
          return (
            <div key={service.id} className={`bg-white rounded-3xl overflow-hidden shadow-sm transition-all ${isDraft ? "opacity-60 grayscale" : ""}`}>
              <div className="relative h-44 cursor-pointer">
                {(() => {
                  const imgs = [];
                  if (service.image_url) imgs.push(service.image_url);
                  if (service.images?.length > 0) service.images.forEach(u => { if (u && u !== service.image_url) imgs.push(u); });
                  return <ImageSlider images={imgs} onClick={() => navigate("/pro/ajouter-service", { state: { editService: service } })} />;
                })()}
                {isDraft && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-orange-500 text-white text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-full">Brouillon</span>
                  </div>
                )}
                {isActive && (
                  <span className="absolute top-3 left-3 bg-teal-400 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-full tracking-widest z-10">Disponible</span>
                )}
                <span className="absolute top-3 right-3 bg-black/60 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-widest z-10">{service.category}</span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 onClick={() => navigate("/pro/ajouter-service", { state: { editService: service } })}
                    className={`text-[22px] font-black leading-tight flex-1 cursor-pointer active:opacity-70 ${isActive ? "text-gray-900" : "text-gray-400"}`}>{service.title}</h3>
                  <div className="flex items-center gap-2 mt-1 shrink-0">
                    <button onClick={() => toggleActive(service.id)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${isActive ? "bg-primary" : "bg-gray-300"}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full shadow transition-transform bg-white ${isActive ? "translate-x-7" : "translate-x-1"}`} />
                    </button>
                    <button onClick={() => deleteService(service.id)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                {service.description && (
                  <p className={`text-[12px] font-medium leading-snug mb-4 ${isActive ? "text-gray-400" : "text-gray-300"}`}>{service.description}</p>
                )}
                <div className="flex items-end gap-6 mb-3">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Durée</p>
                    <p className={`text-[18px] font-black leading-none ${isActive ? "text-gray-900" : "text-gray-400"}`}>{service.duration || service.duration_min || 60}</p>
                    <p className="text-[11px] font-bold text-gray-400">min</p>
                  </div>
                  <div className="ml-auto bg-gray-50 rounded-2xl px-5 py-3 text-right">
                    <p className={`text-[26px] font-black leading-none ${isActive ? "text-gray-900" : "text-gray-400"}`}>{Number(service.price).toFixed(2)}</p>
                    <p className={`text-[18px] font-black leading-none ${isActive ? "text-gray-900" : "text-gray-400"}`}>€</p>
                  </div>
                </div>
                {isDraft ? (
                  <button onClick={() => navigate("/pro/ajouter-service", { state: { editService: service } })}
                    className="w-full flex items-center justify-center gap-2 bg-orange-50 border border-orange-200 rounded-2xl py-3 active:scale-[0.98] transition-all">
                    <span className="text-[12px] font-black text-orange-500 uppercase tracking-widest">✏️ Continuer la saisie</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => navigate("/pro/ajouter-service", { state: { editService: service } })}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-100 border border-gray-200 rounded-2xl py-3 active:scale-[0.98] transition-all">
                      <span className="text-[12px] font-black text-gray-600 uppercase tracking-widest">✏️ Modifier</span>
                    </button>
                    <button onClick={() => navigate(`/pro/promo-service/${service.id}`, { state: { service } })}
                      className="flex-1 flex items-center justify-center gap-2 bg-orange-50 border border-primary/20 rounded-2xl py-3 active:scale-[0.98] transition-all">
                      <Tag className="w-4 h-4 text-primary" />
                      <span className="text-[12px] font-black text-primary uppercase tracking-widest">Pub</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="font-display min-h-full" style={{ background: themeBg }}>
      <PageHeader
        title="Catalogue Services"
        subtitle="Gestion Professionnelle"
        backTo="/profil-pro"
        dark={false}
        right={
          <button onClick={() => navigate("/pro/ajouter-service")} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all">
            <Plus className="w-5 h-5 text-gray-700" />
          </button>
        }
      />

      <div className="px-5 pt-5 space-y-5 pb-32">
        <div className="flex items-center gap-2 bg-white rounded-2xl p-1.5 border border-gray-100">
          {filterTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`flex-1 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                activeFilter === tab ? "bg-gray-900 text-white" : "text-gray-400"
              }`}
            >
              {tab}
              {tab === "Brouillons" && draftsCount > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeFilter === tab ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                  {draftsCount}
                </span>
              )}
              {tab === "Bundles" && bundles.length > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeFilter === tab ? "bg-white/20 text-white" : "bg-pink-100 text-pink-600"}`}>
                  {bundles.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {renderContent()}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5" style={{ paddingTop: "12px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        {isPackTab ? (
          <button onClick={() => navigate("/pro/creer-bundle")}
            className="w-full bg-pink-500 text-white font-black text-[14px] uppercase tracking-widest py-4 rounded-3xl shadow-xl shadow-pink-500/40 flex items-center justify-center gap-2 active:scale-95 transition-all">
            <Plus className="w-5 h-5" />
            Créer un Bundle
          </button>
        ) : (
          <button onClick={() => navigate("/pro/ajouter-service")}
            className="w-full bg-primary text-white font-black text-[14px] uppercase tracking-widest py-4 rounded-3xl shadow-xl shadow-primary/40 flex items-center justify-center gap-2 active:scale-95 transition-all">
            <Plus className="w-5 h-5" />
            Ajouter un Service
          </button>
        )}
      </div>
    </div>
  );
}
