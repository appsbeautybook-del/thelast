import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Plus, Trash2, Zap, Check } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/api/supabaseClient";
import { uploadFile } from "@/api/entities";
import { useThemeBg } from "@/hooks/useTheme";

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

  useEffect(() => {
    if (!user?.email) return;
    supabase.from("Service").select("id,title,price,images,image_url").eq("pro_email", user.email).eq("status", "actif").order("created_at", { ascending: false })
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

  const regularTotal = services.filter(s => selectedIds.includes(s.id)).reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
  const discount = regularTotal > 0 && bundlePrice ? Math.round(((regularTotal - parseFloat(bundlePrice)) / regularTotal) * 100) : 0;

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

        {/* Services inclus */}
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Services inclus</p>
          {loading ? (
            <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : services.length === 0 ? (
            <p className="text-[13px] text-gray-400 text-center py-6">Aucun service disponible</p>
          ) : (
            <div className="space-y-2">
              {services.map(s => {
                const selected = selectedIds.includes(s.id);
                return (
                  <div key={s.id} onClick={() => toggleService(s.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selected ? "bg-pink-50 border border-pink-200" : "bg-white border border-gray-200"}`}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? "bg-[#E8732A] border-[#E8732A]" : "border-gray-300"}`}>
                      {selected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-black text-gray-900">{s.title || s.name}</p>
                      <p className="text-[12px] text-gray-400">{s.price}€</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Prix du bundle */}
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Prix du bundle</p>
          <input type="number" value={bundlePrice} onChange={e => setBundlePrice(e.target.value)} placeholder="Prix €"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#E8732A]" />
          {discount > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[12px] text-gray-400 line-through">{regularTotal}€</span>
              <span className="text-[14px] font-black text-[#E8732A]">{bundlePrice}€</span>
              <span className="bg-green-100 text-green-700 text-[11px] font-black px-2 py-0.5 rounded-full">-{discount}%</span>
            </div>
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
