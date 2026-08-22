import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Tag, Zap } from "lucide-react";
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
    return <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[40px]">✂️</div>;
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

const filterTabs = ["Tous", "Actifs", "Brouillons", "BUNDLES"];

function BundlesTab({ userEmail }) {
  const navigate = useNavigate();
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    if (!userEmail) return;
    entities.ServiceBundle.filter({ pro_email: userEmail }, "-created_at", 200)
      .then(data => setBundles(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userEmail]);

  const totalServices = bundles.reduce((sum, b) => sum + (b.service_ids?.length || 0), 0);

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("ServiceBundle").delete().eq("id", deleteId);
    setBundles(b => b.filter(x => x.id !== deleteId));
    setDeleteId(null);
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-3xl overflow-hidden shadow-lg" style={{ background: "linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ff8c42 100%)" }}>
        <div className="px-5 py-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-black tracking-widest opacity-80">BEAUTYBOOK BUNDLES</span>
            </div>
            <h2 className="text-[22px] font-black leading-tight mb-1.5">Créez des bundles irrésistibles</h2>
            <p className="text-[12px] opacity-80 leading-relaxed">Regroupez vos services, proposez des offres exclusives et fidélisez vos clients.</p>
            <div className="flex items-center gap-3 mt-4">
              <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">{bundles.length} bundle{bundles.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
                <Check className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">{totalServices} service{totalServices !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {bundles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mb-4">
            <Zap className="w-9 h-9 text-pink-400" strokeWidth={2.5} />
          </div>
          <p className="text-[18px] font-black text-gray-800 mb-1">Aucun bundle</p>
          <p className="text-[13px] text-gray-400 mb-6">Créez votre premier bundle de services.</p>
          <button onClick={() => navigate("/pro/creer-bundle", { state: { openForm: true } })}
            className="bg-gradient-to-r from-[#ec4899] to-[#f472b6] text-white text-[13px] font-black px-8 py-3.5 rounded-2xl shadow-lg shadow-pink-500/30 active:scale-95 transition-all flex items-center gap-2">
            <Plus className="w-5 h-5" /> CRÉER UN BUNDLE
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {bundles.map(b => {
            const savPct = b.discount_percent || 0;
            return (
              <div key={b.id} className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-stretch">
                  <div className="w-28 shrink-0 bg-gradient-to-br from-pink-50 to-orange-50 flex items-center justify-center relative">
                    {b.image_url ? (
                      <img src={b.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Zap className="w-8 h-8 text-pink-300" />
                    )}
                    {savPct > 0 && (
                      <div className="absolute top-2 left-2 bg-[#E8732A] text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                        -{savPct}%
                      </div>
                    )}
                    {b.is_group && (
                      <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <Users className="w-2.5 h-2.5" /> Groupe
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[15px] font-black text-gray-900 leading-tight">{b.name}</p>
                        <p className="text-[17px] font-black text-[#E8732A] shrink-0">{b.bundle_price}€</p>
                      </div>
                      {b.description && (
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{b.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" /> {b.service_ids?.length || 0} services
                        </span>
                        {b.category && b.category !== "Tous" && (
                          <span className="bg-purple-50 text-purple-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{b.category}</span>
                        )}
                        {b.bonus && (
                          <span className="bg-amber-50 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <Gift className="w-2.5 h-2.5" /> Bonus
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => navigate("/pro/creer-bundle", { state: { editBundle: b } })}
                        className="flex-1 bg-gray-100 text-gray-600 text-[11px] font-bold py-2 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1">
                        <Pencil className="w-3 h-3" /> Modifier
                      </button>
                      <button onClick={() => navigate(b.is_group ? "/bundle-groupe/" + b.id : "/bundle/" + b.id, { state: { bundle: b } })}
                        className="flex-1 bg-[#E8732A]/10 text-[#E8732A] text-[11px] font-bold py-2 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1">
                        Voir
                      </button>
                      <button onClick={() => setDeleteId(b.id)}
                        className="w-8 h-8 bg-red-50 text-red-400 rounded-xl flex items-center justify-center active:scale-95 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <button onClick={() => navigate("/pro/creer-bundle", { state: { openForm: true } })}
            className="w-full bg-gradient-to-r from-[#ec4899] to-[#f472b6] text-white text-[12px] font-black py-3.5 rounded-2xl shadow-lg shadow-pink-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> CRÉER UN BUNDLE
          </button>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[600] flex items-end justify-center" onClick={() => setDeleteId(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-t-3xl w-full max-w-lg p-6 pb-8 space-y-4" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-[16px] font-black text-gray-900">Supprimer le bundle</p>
              <button onClick={() => setDeleteId(null)} className="p-2"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-[13px] text-gray-500">Voulez-vous vraiment supprimer ce bundle ? Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-[13px] font-black text-gray-600 active:scale-95 transition-all">
                Annuler
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-[13px] font-black active:scale-95 transition-all">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}export default function CatalogueServices() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const themeBg = useThemeBg();
  const [activeFilter, setActiveFilter] = useState("Tous");
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    entities.Service.filter({ pro_email: user.email }, "-created_at", 100)
      .then(res => setServices(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const toggleActive = async (id) => {
    const svc = services.find(s => s.id === id);
    const newStatus = svc.status === "actif" ? "inactif" : "actif";
    setServices(s => s.map(sv => sv.id === id ? { ...sv, status: newStatus } : sv));
    try {
      const { error } = await supabase.from("Service").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    } catch (err) {
      console.error("Toggle status error:", err);
      setServices(s => s.map(sv => sv.id === id ? { ...sv, status: svc.status } : sv));
    }
  };

  const deleteService = async (id) => {
    if (!confirm("Supprimer ce service ?")) return;
    setServices(s => s.filter(sv => sv.id !== id));
    try {
      const { error } = await supabase.from("Service").delete().eq("id", id);
      if (error) throw error;
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
        {activeFilter === "BUNDLES" ? (
          <BundlesTab userEmail={user?.email} />
        ) : loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <span className="text-[48px]">✂️</span>
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
                          {service.status === "inactif" ? "Désactivé — Appuyer pour modifier" : "Brouillon — Appuyer pour continuer"}
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
                        <p className={`text-[18px] font-black leading-none ${isActive ? "text-gray-900" : "text-gray-400"}`}>{service.duration_min}</p>
                        <p className="text-[11px] font-bold text-gray-400">min</p>
                      </div>
                      <div className="ml-auto bg-gray-50 rounded-2xl px-5 py-3 text-right">
                        <p className={`text-[26px] font-black leading-none ${isActive ? "text-gray-900" : "text-gray-400"}`}>{Number(service.price).toFixed(2)}</p>
                        <p className={`text-[18px] font-black leading-none ${isActive ? "text-gray-900" : "text-gray-400"}`}>€</p>
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
        {activeFilter === "BUNDLES" ? (
          <button
            onClick={() => navigate("/pro/creer-bundle")}
            className="w-full bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white font-black text-[14px] uppercase tracking-widest py-4 rounded-3xl shadow-xl shadow-orange-500/40 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            Ajouter un Bundle
          </button>
        ) : (
          <button
            onClick={() => navigate("/pro/ajouter-service")}
            className="w-full bg-primary text-white font-black text-[14px] uppercase tracking-widest py-4 rounded-3xl shadow-xl shadow-primary/40 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            Ajouter un Service
          </button>
        )}
      </div>
    </div>
  );
}