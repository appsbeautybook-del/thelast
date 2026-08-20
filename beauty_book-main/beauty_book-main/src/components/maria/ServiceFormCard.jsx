import { useState, useRef } from "react";
import { Upload, Loader2, Trash2, Zap, X, Plus, CheckCircle, Clock, Tag, Users, FileText, Star } from "lucide-react";
import { entities, uploadFile } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';

const CATEGORIES = ["Coiffure", "Maquillage", "Ongles", "Soin", "Massage", "Barbe", "Épilation"];

export default function ServiceFormCard({ prefill = {}, onSuccess, onCancel }) {
  const [data, setData] = useState({
    title: prefill.title || "",
    description: prefill.description || "",
    category: prefill.category || "",
    price: prefill.price ?? "",
    duration_min: prefill.duration_min ?? 60,
    addons: prefill.addons || [],
    images: prefill.images || [],
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [newAddon, setNewAddon] = useState({ name: "", price: "" });
  const imgRef = useRef(null);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await uploadFile({ file });
      urls.push(file_url);
    }
    setData(d => ({ ...d, images: [...(d.images || []), ...urls].slice(0, 5) }));
    setUploading(false);
    e.target.value = "";
  };

  const handlePublish = async () => {
    setSaving(true);
    const user = await supabase.auth.getUser().then(({ data }) => data?.user).catch(() => null);
    const service = await entities.Service.create({
      pro_email: user?.email || "",
      title: data.title,
      description: data.description || "",
      category: data.category,
      price: parseFloat(data.price) || 0,
      duration: parseInt(data.duration_min) || 60,
      image_url: (data.images || [])[0] || "",
      images: data.images || [],
      addons: (data.addons || []).filter(a => a.name),
      status: "actif",
    });
    setSaving(false);
    onSuccess?.(service);
  };

  const canPublish = data.title?.trim() && data.category && data.price;

  return (
    <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-lg mt-2">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-orange-400 px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-white text-[11px] font-black uppercase tracking-widest">🛍️ Récapitulatif du service</p>
          <p className="text-white/80 text-[11px] font-medium mt-0.5">Vérifiez et publiez quand vous êtes prêt</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEdit(!showEdit)}
            className="text-white/80 text-[10px] font-black uppercase tracking-widest bg-white/20 rounded-full px-3 py-1.5 active:scale-95"
          >
            {showEdit ? "Fermer" : "Modifier"}
          </button>
          {onCancel && (
            <button onClick={onCancel} className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center active:scale-95">
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Photo principale */}
      {(data.images || []).length > 0 && (
        <div className="relative h-36 overflow-hidden">
          <img src={data.images[0]} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}

      {/* Récapitulatif visuel */}
      {!showEdit && (
        <div className="px-4 py-4 space-y-3">
          {/* Titre */}
          <div>
            <p className="text-[20px] font-black text-gray-900 leading-tight">{data.title || "—"}</p>
            {data.category && (
              <span className="inline-block bg-orange-100 text-primary text-[11px] font-black rounded-full px-3 py-1 mt-1">{data.category}</span>
            )}
          </div>

          {/* Infos clés */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-orange-50 rounded-2xl px-3 py-3 text-center">
              <p className="text-[20px] font-black text-primary">{data.price || "—"}€</p>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Prix</p>
            </div>
            <div className="bg-gray-50 rounded-2xl px-3 py-3 text-center">
              <p className="text-[20px] font-black text-gray-800">{data.duration_min || "—"}</p>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Minutes</p>
            </div>
          </div>

          {/* Description */}
          {data.description && (
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">📝 Description</p>
              <p className="text-[13px] text-gray-700 font-medium leading-relaxed">{data.description}</p>
            </div>
          )}

          {/* Suppléments */}
          {(data.addons || []).filter(a => a.name).length > 0 && (
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">✨ Suppléments</p>
              <div className="space-y-1.5">
                {data.addons.filter(a => a.name).map((a, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-gray-700">{a.name}</span>
                    <span className="text-[13px] font-black text-primary">+{a.price}€</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photos supplémentaires */}
          {(data.images || []).length > 1 && (
            <div className="flex gap-2">
              {data.images.slice(1).map((url, i) => (
                <img key={i} src={url} alt="" className="w-14 h-14 rounded-xl object-cover" />
              ))}
              <button onClick={() => imgRef.current?.click()} disabled={uploading}
                className="w-14 h-14 bg-orange-50 border-2 border-dashed border-primary/40 rounded-xl flex items-center justify-center active:scale-95 shrink-0">
                {uploading ? <Loader2 className="w-4 h-4 text-primary animate-spin" /> : <Plus className="w-4 h-4 text-primary" />}
              </button>
            </div>
          )}
          {(data.images || []).length === 0 && (
            <button onClick={() => imgRef.current?.click()} disabled={uploading}
              className="w-full h-12 bg-orange-50 border-2 border-dashed border-primary/40 rounded-2xl flex items-center justify-center gap-2 active:scale-95">
              {uploading ? <Loader2 className="w-4 h-4 text-primary animate-spin" /> : <>
                <Upload className="w-4 h-4 text-primary" />
                <span className="text-[11px] font-black text-primary">Ajouter une photo (optionnel)</span>
              </>}
            </button>
          )}
          <input ref={imgRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
        </div>
      )}

      {/* Mode édition */}
      {showEdit && (
        <div className="px-4 py-4 space-y-3">
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Nom *</p>
            <input value={data.title} onChange={e => setData(d => ({ ...d, title: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-[14px] font-black text-gray-900 outline-none focus:border-primary" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Catégorie *</p>
              <select value={data.category} onChange={e => setData(d => ({ ...d, category: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] font-bold text-gray-700 outline-none focus:border-primary">
                <option value="">Choisir...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Prix (€) *</p>
              <input type="number" value={data.price} onChange={e => setData(d => ({ ...d, price: e.target.value }))}
                placeholder="0"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] font-black text-primary outline-none focus:border-primary" />
            </div>
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Durée (min)</p>
              <input type="number" value={data.duration_min} onChange={e => setData(d => ({ ...d, duration_min: e.target.value }))}
                placeholder="60"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] font-black text-gray-700 outline-none focus:border-primary" />
            </div>
          </div>

          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Description</p>
            <textarea value={data.description} onChange={e => setData(d => ({ ...d, description: e.target.value }))}
              rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-[13px] text-gray-700 outline-none resize-none focus:border-primary" />
          </div>

          {/* Suppléments */}
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Suppléments</p>
            {(data.addons || []).map((a, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 text-[12px] mb-1">
                <span className="flex-1 font-medium text-gray-700">{a.name}</span>
                <span className="font-black text-primary">+{a.price}€</span>
                <button onClick={() => setData(d => ({ ...d, addons: d.addons.filter((_, j) => j !== i) }))}
                  className="w-5 h-5 bg-red-50 rounded-full flex items-center justify-center">
                  <X className="w-3 h-3 text-red-400" />
                </button>
              </div>
            ))}
            <div className="flex gap-2 items-center mt-1">
              <input value={newAddon.name} onChange={e => setNewAddon(a => ({ ...a, name: e.target.value }))}
                placeholder="Nom du supplément"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-primary" />
              <input type="number" value={newAddon.price} onChange={e => setNewAddon(a => ({ ...a, price: e.target.value }))}
                placeholder="€" className="w-16 bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-[12px] font-black text-primary outline-none focus:border-primary" />
              <button onClick={() => {
                if (!newAddon.name) return;
                setData(d => ({ ...d, addons: [...(d.addons || []), { name: newAddon.name, price: parseFloat(newAddon.price) || 0 }] }));
                setNewAddon({ name: "", price: "" });
              }} className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center active:scale-95 shrink-0">
                <Plus className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Photos */}
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Photos</p>
            <div className="flex gap-2 flex-wrap">
              {(data.images || []).map((url, i) => (
                <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setData(d => ({ ...d, images: d.images.filter((_, j) => j !== i) }))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {(data.images || []).length < 5 && (
                <button onClick={() => imgRef.current?.click()} disabled={uploading}
                  className="w-14 h-14 bg-orange-50 border-2 border-dashed border-primary/40 rounded-xl flex flex-col items-center justify-center active:scale-95 shrink-0">
                  {uploading ? <Loader2 className="w-4 h-4 text-primary animate-spin" /> : <Upload className="w-4 h-4 text-primary" />}
                </button>
              )}
            </div>
            <input ref={imgRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
          </div>
        </div>
      )}

      {/* Bouton publier */}
      <div className="px-4 pb-5 pt-1">
        <button
          disabled={!canPublish || saving}
          onClick={handlePublish}
          className="w-full bg-gray-900 text-white font-black text-[14px] uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
        >
          {saving
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><Zap className="w-4 h-4" /><span>Enregistrer & Publier</span></>
          }
        </button>
      </div>
    </div>
  );
}