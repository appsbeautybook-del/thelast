import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Tag, Scissors } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from "@/lib/AuthContext";
import { useThemeBg } from "@/hooks/useTheme";

function ImageSlider({ images, onClick }) {
  const [current, setCurrent] = useState(0);
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

  if (!images || images.length === 0) {
    return <div className="w-full h-full bg-gray-100 flex items-center justify-center"><Scissors className="w-10 h-10 text-gray-300" /></div>;
  }

  return (
    <div className="relative w-full h-full overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={onClick}>
      {images.map((url, i) => (
        <img key={i} src={url} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(${(i - current) * 100}%)` }} />
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {images.map((_, i) => (
            <div key={i} className={`rounded-full transition-all ${i === current ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/60"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

const filterTabs = ["Tous", "Actifs", "Brouillons"];

export default function CatalogueServices() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const themeBg = useThemeBg();
  const [activeFilter, setActiveFilter] = useState("Tous");
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Charger une seule fois au montage
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
    return () => { cancelled = true; };
  }, []);

  const toggleActive = async (id) => {
    const svc = services.find(s => s.id === id);
    if (!svc) return;
    const isActive = svc.status === "actif";
    const newStatus = isActive ? "brouillon" : "actif";
    setServices(s => s.map(sv => sv.id === id ? { ...sv, status: newStatus } : sv));
    try {
      const { data, error } = await supabase
        .from("Service")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select();
      if (error) {
        console.error("[toggleActive] Erreur Supabase:", error);
        setServices(s => s.map(sv => sv.id === id ? { ...sv, status: svc.status } : sv));
      } else if (data?.[0]) {
        setServices(s => s.map(sv => sv.id === id ? { ...sv, status: data[0].status } : sv));
      }
    } catch (e) {
      console.error("[toggleActive] Exception:", e);
      setServices(s => s.map(sv => sv.id === id ? { ...sv, status: svc.status } : sv));
    }
  };

  const deleteService = async (id) => {
    if (!confirm("Supprimer ce service ?")) return;
    setServices(s => s.filter(sv => sv.id !== id));
    try {
      await entities.Service.delete(id);
    } catch (err) {
      console.error("Delete error:", err);
      entities.Service.filter({ pro_email: user?.email }, "-created_at", 100).then(setServices).catch(() => {});
    }
  };

  const filtered = services.filter(s => {
    if (activeFilter === "Actifs") return s.status === "actif";
    if (activeFilter === "Brouillons") return s.status !== "actif";
    return true;
  });

  const draftsCount = services.filter(s => s.status !== "actif").length;

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
        {/* Filter Tabs */}
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
            </button>
          ))}
        </div>

        {/* Services List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center">
                <Scissors className="w-10 h-10 text-primary" />
              </div>
              <p className="text-[16px] font-black text-gray-700">Aucun service</p>
              <p className="text-[13px] text-gray-400">Ajoutez votre premier service ci-dessous.</p>
            </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(service => {
              const isActive = service.status === "actif";
              const isDraft = !isActive;
              return (
                <div
                  key={service.id}
                  className={`bg-white rounded-3xl overflow-hidden shadow-sm transition-all ${isDraft ? "opacity-60 grayscale" : ""}`}
                >
                  {/* Image Slider */}
                  <div className="relative h-44 cursor-pointer">
                    {(() => {
                      const imgs = [];
                      if (service.image_url) imgs.push(service.image_url);
                      if (service.images?.length > 0) service.images.forEach(u => { if (u && u !== service.image_url) imgs.push(u); });
                      const handleImgClick = () => navigate("/pro/ajouter-service", { state: { editService: service } });
                      return <ImageSlider images={imgs} onClick={handleImgClick} />;
                    })()}
                    {isDraft && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-orange-500 text-white text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-full">
                          Brouillon — Appuyer pour modifier
                        </span>
                      </div>
                    )}
                    {isActive && (
                      <span className="absolute top-3 left-3 bg-teal-400 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-full tracking-widest">
                        Disponible
                      </span>
                    )}
                    <span className="absolute top-3 right-3 bg-black/60 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-widest">
                      {service.category}
                    </span>
                  </div>
                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3
                        onClick={() => navigate("/pro/ajouter-service", { state: { editService: service } })}
                        className={`text-[22px] font-black leading-tight flex-1 cursor-pointer active:opacity-70 ${isActive ? "text-gray-900" : "text-gray-400"}`}
                      >{service.title}</h3>
                      <div className="flex items-center gap-2 mt-1 shrink-0">
                        <button
                          onClick={() => toggleActive(service.id)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${isActive ? "bg-primary" : "bg-gray-300"}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full shadow transition-transform bg-white ${isActive ? "translate-x-7" : "translate-x-1"}`} />
                        </button>
                        <button
                          onClick={() => deleteService(service.id)}
                          className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    {service.description && (
                      <p className={`text-[12px] font-medium leading-snug mb-4 ${isActive ? "text-gray-400" : "text-gray-300"}`}>
                        {service.description}
                      </p>
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
                        {service.tva_rate > 0 && (
                          <p className="text-[10px] text-primary font-bold mt-1">HT : {((service.price || 0) / 1.2).toFixed(2)}€</p>
                        )}
                      </div>
                    </div>

                    {/* Brouillon → continuer la saisie | Actif → Modifier + Lancer une Publicité */}
                    {isDraft ? (
                      <button
                        onClick={() => navigate("/pro/ajouter-service", { state: { editService: service } })}
                        className="w-full flex items-center justify-center gap-2 bg-orange-50 border border-orange-200 rounded-2xl py-3 active:scale-[0.98] transition-all"
                      >
                        <span className="text-[12px] font-black text-orange-500 uppercase tracking-widest">✏️ Continuer la saisie</span>
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate("/pro/ajouter-service", { state: { editService: service } })}
                          className="flex-1 flex items-center justify-center gap-2 bg-gray-100 border border-gray-200 rounded-2xl py-3 active:scale-[0.98] transition-all"
                        >
                          <span className="text-[12px] font-black text-gray-600 uppercase tracking-widest">✏️ Modifier</span>
                        </button>
                        <button
                          onClick={() => navigate(`/pro/promo-service/${service.id}`, { state: { service } })}
                          className="flex-1 flex items-center justify-center gap-2 bg-orange-50 border border-primary/20 rounded-2xl py-3 active:scale-[0.98] transition-all"
                        >
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
        )}
      </div>

      {/* CTA fixe en bas */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5" style={{ paddingTop: "12px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        <button
          onClick={() => navigate("/pro/ajouter-service")}
          className="w-full bg-primary text-white font-black text-[14px] uppercase tracking-widest py-4 rounded-3xl shadow-xl shadow-primary/40 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          Ajouter un Service
        </button>
      </div>
    </div>
  );
}