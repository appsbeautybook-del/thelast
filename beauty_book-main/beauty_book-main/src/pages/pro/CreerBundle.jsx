import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Camera, Plus, Trash2, Zap, Check, Users, Gift, Tag, FileText, Search, X, Pencil, Sparkles, Save } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/api/supabaseClient";
import { uploadFile } from "@/api/entities";
import { useThemeBg } from "@/hooks/useTheme";

const BUNDLE_CATEGORIES = ["Tous", "Coiffure", "Soin", "Ongles", "Maquillage"];
const DRAFT_KEY = "bb_bundle_draft";

function getDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch { return null; }
}
function saveDraft(d) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch {}
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

export default function CreerBundle() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const themeBg = useThemeBg();
  const imgRef = useRef(null);

  const [bundles, setBundles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBundle, setEditingBundle] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [bundleServiceSearch, setBundleServiceSearch] = useState("");
  const [deleteModal, setDeleteModal] = useState(null);
  const [draftSaved, setDraftSaved] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bundlePrice, setBundlePrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [category, setCategory] = useState("Tous");
  const [isGroup, setIsGroup] = useState(false);
  const [minPersons, setMinPersons] = useState(2);
  const [maxPersons, setMaxPersons] = useState(6);
  const [bonus, setBonus] = useState("");

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    Promise.all([
      supabase.from("ServiceBundle").select("*").eq("pro_email", user.email).order("created_at", { ascending: false }),
      supabase.from("Service").select("id,title,price,images,image_url,category,duration_min").eq("pro_email", user.email).order("created_at", { ascending: false }),
    ]).then(([bundleRes, svcRes]) => {
      if (!cancelled) {
        setBundles(bundleRes.data || []);
        setServices(svcRes.data || []);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [user?.email]);

  // Auto-open form if navigated with state or draft exists
  useEffect(() => {
    const edit = location.state?.editBundle;
    if (edit) {
      setEditingBundle(edit);
      setName(edit.name || "");
      setDescription(edit.description || "");
      setBundlePrice(edit.bundle_price?.toString() || "");
      setImageUrl(edit.image_url || "");
      setSelectedIds(edit.service_ids || []);
      setCategory(edit.category || "Tous");
      setIsGroup(edit.is_group || false);
      setMinPersons(edit.min_persons || 2);
      setMaxPersons(edit.max_persons || 6);
      setBonus(edit.bonus || "");
      setShowForm(true);
    } else if (location.state?.openForm) {
      // Load draft if available
      const draft = getDraft();
      if (draft) {
        setName(draft.name || "");
        setDescription(draft.description || "");
        setBundlePrice(draft.bundlePrice || "");
        setImageUrl(draft.imageUrl || "");
        setSelectedIds(draft.selectedIds || []);
        setCategory(draft.category || "Tous");
        setIsGroup(draft.isGroup || false);
        setMinPersons(draft.minPersons || 2);
        setMaxPersons(draft.maxPersons || 6);
        setBonus(draft.bonus || "");
      }
      setShowForm(true);
    } else {
      // Check for draft on mount
      const draft = getDraft();
      if (draft) {
        setShowForm(true);
        setName(draft.name || "");
        setDescription(draft.description || "");
        setBundlePrice(draft.bundlePrice || "");
        setImageUrl(draft.imageUrl || "");
        setSelectedIds(draft.selectedIds || []);
        setCategory(draft.category || "Tous");
        setIsGroup(draft.isGroup || false);
        setMinPersons(draft.minPersons || 2);
        setMaxPersons(draft.maxPersons || 6);
        setBonus(draft.bonus || "");
      }
    }
  }, [location.state]);

  // Auto-save draft on field changes
  useEffect(() => {
    if (!showForm || editingBundle) return;
    if (!name && !description && !bundlePrice && selectedIds.length === 0) return;
    const timer = setTimeout(() => {
      saveDraft({ name, description, bundlePrice, imageUrl, selectedIds, category, isGroup, minPersons, maxPersons, bonus });
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    }, 1500);
    return () => clearTimeout(timer);
  }, [name, description, bundlePrice, imageUrl, selectedIds, category, isGroup, minPersons, maxPersons, bonus, showForm, editingBundle]);

  const resetForm = () => {
    setName(""); setDescription(""); setBundlePrice(""); setImageUrl("");
    setSelectedIds([]); setCategory("Tous"); setIsGroup(false);
    setMinPersons(2); setMaxPersons(6); setBonus("");
    setEditingBundle(null); setBundleServiceSearch("");
    clearDraft();
  };

  const toggleService = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleImgUpload = async (file) => {
    if (!file) return;
    setUploadingImg(true);
    try { const url = await uploadFile(file, "uploads"); setImageUrl(url); } catch (e) { console.error(e); }
    setUploadingImg(false);
  };

  const filteredServices = category === "Tous" ? services : services.filter(s => s.category === category);
  const searchedServices = bundleServiceSearch
    ? filteredServices.filter(s => (s.title || s.name || "").toLowerCase().includes(bundleServiceSearch.toLowerCase()))
    : filteredServices;
  const selectedServices = services.filter(s => selectedIds.includes(s.id));
  const regularTotal = selectedServices.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
  const discount = regularTotal > 0 && bundlePrice ? Math.round(((regularTotal - parseFloat(bundlePrice)) / regularTotal) * 100) : 0;
  const totalDuration = selectedServices.reduce((sum, s) => sum + (parseInt(s.duration_min) || 60), 0);

  const handleSave = async () => {
    if (!name.trim() || !bundlePrice || selectedIds.length === 0) return;
    setSaving(true);
    const payload = {
      pro_email: user.email,
      name: name.trim(),
      description: description.trim(),
      service_ids: selectedIds,
      bundle_price: parseFloat(bundlePrice),
      discount_percent: discount > 0 ? discount : 0,
      image_url: imageUrl || "",
      category: category !== "Tous" ? category : "",
      is_group: isGroup,
      min_persons: isGroup ? minPersons : 1,
      max_persons: isGroup ? maxPersons : 1,
      bundle_price_per_person: parseFloat(bundlePrice),
      bonus: bonus.trim(),
      is_active: true,
    };
    if (editingBundle) {
      payload.updated_at = new Date().toISOString();
      await supabase.from("ServiceBundle").update(payload).eq("id", editingBundle.id);
    } else {
      await supabase.from("ServiceBundle").insert(payload);
    }
    const { data } = await supabase.from("ServiceBundle").select("*").eq("pro_email", user.email).order("created_at", { ascending: false });
    setBundles(data || []);
    setSaving(false);
    resetForm();
    setShowForm(false);
  };

  const handleSaveDraft = () => {
    saveDraft({ name, description, bundlePrice, imageUrl, selectedIds, category, isGroup, minPersons, maxPersons, bonus });
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const handleDelete = async (id) => {
    await supabase.from("ServiceBundle").delete().eq("id", id);
    setBundles(b => b.filter(x => x.id !== id));
    setDeleteModal(null);
  };

  const startEdit = (b) => {
    setEditingBundle(b);
    setName(b.name || "");
    setDescription(b.description || "");
    setBundlePrice(b.bundle_price?.toString() || "");
    setImageUrl(b.image_url || "");
    setSelectedIds(b.service_ids || []);
    setCategory(b.category || "Tous");
    setIsGroup(b.is_group || false);
    setMinPersons(b.min_persons || 2);
    setMaxPersons(b.max_persons || 6);
    setBonus(b.bonus || "");
    setShowForm(true);
  };

  const startCreate = () => {
    resetForm();
    setShowForm(true);
  };

  return (
    <div className="font-display min-h-full" style={{ background: themeBg }}>
      <PageHeader
        title={showForm ? (editingBundle ? "Modifier le Bundle" : "Créer un Bundle") : "Mes Bundles"}
        subtitle="Gestion Professionnelle"
        dark={false}
      />

      <div className="px-5 pt-5 pb-32 space-y-5">
        {!showForm && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E8732A] via-[#F59E0B] to-[#FB923C] p-6 shadow-xl shadow-orange-500/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-6 -translate-x-6" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">BeautyBook Bundles</span>
              </div>
              <h2 className="text-[20px] font-black text-white mb-1.5 leading-tight">
                Créez des bundles irrésistibles
              </h2>
              <p className="text-[13px] text-white/80 font-medium leading-relaxed mb-4">
                Regroupez vos services, proposez des offres exclusives et fidélisez vos clients.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-[11px] font-bold text-white/90">{bundles.length} bundle{bundles.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-[11px] font-bold text-white/90">{services.length} service{services.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {showForm ? (
          <>
            <button onClick={() => { resetForm(); setShowForm(false); }}
              className="flex items-center gap-2 text-[13px] font-bold text-gray-500 active:scale-95 transition-transform">
              <ArrowLeft className="w-4 h-4" /> Retour à la liste
            </button>

            <div className="flex items-start gap-3">
              <input type="file" ref={imgRef} accept="image/*" className="hidden" onChange={e => handleImgUpload(e.target.files?.[0])} />
              <button onClick={() => imgRef.current?.click()} disabled={uploadingImg}
                className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0 bg-white">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                ) : uploadingImg ? (
                  <div className="w-5 h-5 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-gray-300" />
                )}
              </button>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du bundle (ex: Bundle Roots)"
                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#E8732A]" />
            </div>

            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optionnel)"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#E8732A]" />

            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Tag className="w-3 h-3" /> Catégorie</p>
              <div className="flex flex-wrap gap-2">
                {BUNDLE_CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={`px-3 py-2 rounded-full text-[12px] font-black border-2 transition-all active:scale-95 ${category === c ? "border-[#E8732A] bg-[#E8732A] text-white" : "border-gray-200 text-gray-600 bg-white"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-500" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-black text-gray-900">Bundle Groupe</p>
                  <p className="text-[11px] text-gray-400">Plusieurs personnes, plus d'éclat ✨</p>
                </div>
                <div onClick={() => setIsGroup(!isGroup)} className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${isGroup ? "bg-primary" : "bg-gray-200"}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isGroup ? "translate-x-7" : "translate-x-1"}`} />
                </div>
              </div>
              {isGroup && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Min personnes</p>
                      <input type="number" min={2} max={10} value={minPersons} onChange={e => setMinPersons(Math.max(2, parseInt(e.target.value) || 2))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] font-black text-center outline-none focus:border-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Max personnes</p>
                      <input type="number" min={minPersons} max={20} value={maxPersons} onChange={e => setMaxPersons(Math.max(minPersons, parseInt(e.target.value) || minPersons))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] font-black text-center outline-none focus:border-primary" />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 text-center">De {minPersons} à {maxPersons} personnes</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Gift className="w-3 h-3" /> Bonus inclus (optionnel)</p>
              <input value={bonus} onChange={e => setBonus(e.target.value)} placeholder="Ex: Huile capillaire offerte 🎁"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#E8732A]" />
            </div>

            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Services inclus</p>
              <div className="flex gap-1.5 mb-3 overflow-x-auto hide-scrollbar">
                {BUNDLE_CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${category === c ? "bg-primary/10 border-primary text-primary" : "bg-white border-gray-200 text-gray-500"}`}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={bundleServiceSearch} onChange={e => setBundleServiceSearch(e.target.value)}
                  placeholder="Rechercher un service..."
                  className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-[12px] outline-none focus:border-[#E8732A]" />
                {bundleServiceSearch && (
                  <button onClick={() => setBundleServiceSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
              {loading ? (
                <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
              ) : searchedServices.length === 0 ? (
                <p className="text-[13px] text-gray-400 text-center py-6">Aucun service dans cette catégorie</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchedServices.map(s => {
                    const selected = selectedIds.includes(s.id);
                    return (
                      <div key={s.id} onClick={() => toggleService(s.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selected ? "bg-pink-50 border border-pink-200" : "bg-white border border-gray-200"}`}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? "bg-[#E8732A] border-[#E8732A]" : "border-gray-300"}`}>
                          {selected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-black text-gray-900">{s.title || s.name}</p>
                          <p className="text-[11px] text-gray-400">{s.category} · {s.duration_min || 60} min</p>
                        </div>
                        <span className="text-[14px] font-black text-primary shrink-0">{s.price}€</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                {isGroup ? "Prix du bundle (par personne)" : "Prix du bundle"}
              </p>
              <input type="number" value={bundlePrice} onChange={e => setBundlePrice(e.target.value)} placeholder="Prix €"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#E8732A]" />
              {discount > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[12px] text-gray-400 line-through">{regularTotal}€</span>
                  <span className="text-[14px] font-black text-[#E8732A]">{bundlePrice}€</span>
                  <span className="bg-green-100 text-green-700 text-[11px] font-black px-2 py-0.5 rounded-full">-{discount}%</span>
                </div>
              )}
              {totalDuration > 0 && (
                <p className="text-[11px] text-gray-400 mt-1">Durée totale estimée : {Math.floor(totalDuration / 60)}h{totalDuration % 60 > 0 ? String(totalDuration % 60).padStart(2, '0') : ''}</p>
              )}
            </div>
          </>
        ) : (
          <>
            {loading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : bundles.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mb-2">
                  <Zap className="w-9 h-9 text-pink-400" strokeWidth={2.5} />
                </div>
                <p className="text-[18px] font-black text-gray-800">Aucun bundle</p>
                <p className="text-[13px] text-gray-400 text-center max-w-[260px]">Créez des packs de services pour fidéliser vos clients et augmenter vos revenus.</p>
                <button onClick={startCreate}
                  className="mt-3 bg-gradient-to-r from-[#E8732A] to-[#F59E0B] text-white rounded-2xl px-8 py-3.5 flex items-center gap-2 text-[13px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/25 active:scale-95 transition-all">
                  <Plus className="w-5 h-5" /> Ajouter un bundle
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#E8732A] to-[#F59E0B] p-4 text-white">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-black leading-tight">Augmentez vos revenus avec les bundles</p>
                      <p className="text-[11px] opacity-80 mt-0.5">Les bundles génèrent en moyenne +30% de chiffre d'affaires</p>
                    </div>
                  </div>
                </div>
                <button onClick={startCreate}
                  className="w-full bg-[#E8732A] text-white text-[12px] font-black py-3 rounded-2xl shadow-lg shadow-[#E8732A]/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> AJOUTER UN BUNDLE
                </button>
                {bundles.map(b => {
                  const includedSvcs = services.filter(s => b.service_ids?.includes(s.id));
                  const regTotal = includedSvcs.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
                  return (
                    <div key={b.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                      <div className="flex items-start gap-3">
                        {b.image_url ? (
                          <img src={b.image_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-pink-50 flex items-center justify-center shrink-0">
                            <Zap className="w-6 h-6 text-pink-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-black text-gray-900 truncate">{b.name}</p>
                          {b.description && <p className="text-[12px] text-gray-400 truncate mt-0.5">{b.description}</p>}
                          <div className="flex items-center gap-2 mt-1.5">
                            {regTotal > 0 && <span className="text-[12px] text-gray-400 line-through">{regTotal}€</span>}
                            <span className="text-[16px] font-black text-[#E8732A]">{b.bundle_price}€</span>
                            {b.discount_percent > 0 && (
                              <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full">-{b.discount_percent}%</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {includedSvcs.slice(0, 3).map(s => (
                              <span key={s.id} className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{s.title || s.name}</span>
                            ))}
                            {includedSvcs.length > 3 && (
                              <span className="text-[10px] text-gray-400 font-medium">+{includedSvcs.length - 3}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button onClick={() => startEdit(b)} className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center active:scale-95">
                            <Pencil className="w-4 h-4 text-blue-500" />
                          </button>
                          <button onClick={() => setDeleteModal(b)} className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center active:scale-95">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {!showForm && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5" style={{ paddingTop: "12px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
          <button onClick={startCreate}
            className="w-full bg-[#E8732A] text-white font-black text-[14px] uppercase tracking-widest py-4 rounded-3xl shadow-xl shadow-[#E8732A]/40 flex items-center justify-center gap-2 active:scale-95 transition-all">
            <Plus className="w-5 h-5" /> CRÉER UN BUNDLE
          </button>
        </div>
      )}

      {showForm && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5" style={{ paddingTop: "12px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
          {draftSaved && (
            <p className="text-center text-[11px] text-green-500 font-bold mb-1 flex items-center justify-center gap-1"><Save className="w-3 h-3" /> Brouillon sauvegardé</p>
          )}
          <div className="flex gap-2">
            {!editingBundle && (name || bundlePrice || selectedIds.length > 0) && (
              <button onClick={handleSaveDraft}
                className="bg-gray-100 text-gray-600 font-bold text-[12px] px-4 py-4 rounded-2xl flex items-center gap-1.5 active:scale-95 transition-all">
                <Save className="w-4 h-4" /> Brouillon
              </button>
            )}
            <button onClick={handleSave} disabled={!name.trim() || !bundlePrice || selectedIds.length === 0 || saving}
              className="flex-1 bg-[#E8732A] text-white font-black text-[14px] uppercase tracking-widest py-4 rounded-3xl shadow-xl shadow-[#E8732A]/40 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40">
              {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : editingBundle ? "ENREGISTRER" : "CRÉER LE BUNDLE"}
            </button>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="fixed inset-0 z-[600] flex items-end justify-center" onClick={() => setDeleteModal(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-t-3xl w-full max-w-lg p-6 pb-8 space-y-4" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-[16px] font-black text-gray-900">Supprimer le bundle</p>
              <button onClick={() => setDeleteModal(null)} className="p-2"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-[13px] text-gray-500">Voulez-vous vraiment supprimer « {deleteModal.name} » ? Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-[13px] font-black text-gray-600 active:scale-95 transition-all">
                Annuler
              </button>
              <button onClick={() => handleDelete(deleteModal.id)}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-[13px] font-black active:scale-95 transition-all">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
