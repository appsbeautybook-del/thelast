import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Plus, Trash2, Zap, Check, Users, Gift, Tag } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/api/supabaseClient";
import { uploadFile } from "@/api/entities";
import { useThemeBg } from "@/hooks/useTheme";

const BUNDLE_CATEGORIES = ["Tous", "Coiffure", "Soin", "Ongles", "Maquillage"];

export default function CreerBundle() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const themeBg = useThemeBg();
  const imgRef = useRef(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bundlePrice, setBundlePrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [category, setCategory] = useState("Tous");
  const [isGroup, setIsGroup] = useState(false);
  const [minPersons, setMinPersons] = useState(2);
  const [maxPersons, setMaxPersons] = useState(6);
  const [bonus, setBonus] = useState("");

  useEffect(() => {
    if (!user?.email) return;
    supabase.from("Service").select("id,title,price,images,image_url,category,duration_min").eq("pro_email", user.email).order("created_at", { ascending: false })
      .then(({ data }) => { setServices(data || []); setLoading(false); });
  }, [user?.email]);

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
      bundle_price_per_person: isGroup ? parseFloat(bundlePrice) : parseFloat(bundlePrice),
      bonus: bonus.trim(),
      is_active: true,
    };
    const { error } = await supabase.from("ServiceBundle").insert(payload);
    setSaving(false);
    if (!error) navigate(-1);
  };

  return (
    <div className="font-display min-h-full" style={{ background: themeBg }}>
      <PageHeader title="Créer un Bundle" subtitle="Gestion Professionnelle" dark={false} />

      <div className="px-5 pt-5 pb-32 space-y-4">
        {/* Image + Nom */}
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

        {/* Description */}
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optionnel)"
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#E8732A]" />

        {/* Catégorie */}
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

        {/* Type de bundle */}
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

        {/* Bonus */}
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Gift className="w-3 h-3" /> Bonus inclus (optionnel)</p>
          <input value={bonus} onChange={e => setBonus(e.target.value)} placeholder="Ex: Huile capillaire offerte 🎁"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#E8732A]" />
        </div>

        {/* Services inclus */}
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Services inclus</p>
          {/* Category filter */}
          <div className="flex gap-1.5 mb-3 overflow-x-auto hide-scrollbar">
            {BUNDLE_CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${category === c ? "bg-primary/10 border-primary text-primary" : "bg-white border-gray-200 text-gray-500"}`}>
                {c}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : filteredServices.length === 0 ? (
            <p className="text-[13px] text-gray-400 text-center py-6">Aucun service dans cette catégorie</p>
          ) : (
            <div className="space-y-2">
              {filteredServices.map(s => {
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

        {/* Prix du bundle */}
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
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5" style={{ paddingTop: "12px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        <button onClick={handleSave} disabled={!name.trim() || !bundlePrice || selectedIds.length === 0 || saving}
          className="w-full bg-[#E8732A] text-white font-black text-[14px] uppercase tracking-widest py-4 rounded-3xl shadow-xl shadow-[#E8732A]/40 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40">
          {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "CRÉER LE BUNDLE"}
        </button>
      </div>
    </div>
  );
}
