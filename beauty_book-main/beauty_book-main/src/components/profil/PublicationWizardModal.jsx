import { useState, useRef } from "react";
import {
  X, SlidersHorizontal, Wand2, RotateCcw,
  AlignJustify, Clock, Upload, ArrowRight,
  Sun, Contrast, Droplets, Globe, Lock,
  Video, Play, Lightbulb
} from "lucide-react";
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';

const SAMPLE_IMAGES = [
  "",
  "",
  "",
  "",
];

const HASHTAGS = ["#BEAUTÉ", "#COIFFURE", "#STYLE", "#PROFESSIONNEL", "#SALON", "#MODE", "#CHEVEUX", "#SOIN"];
const PUB_TYPES = [
  { id: "tuto", label: "TUTO", icon: Video },
  { id: "reel", label: "RÉEL", icon: Play },
  { id: "conseil", label: "CONSEIL", icon: Lightbulb },
];
const FILTERS = [
  { id: null, label: "Normal", style: {} },
  { id: "grayscale", label: "N&B", style: { filter: "grayscale(100%)" } },
  { id: "sepia", label: "Sépia", style: { filter: "sepia(80%)" } },
  { id: "warm", label: "Chaud", style: { filter: "saturate(150%) hue-rotate(-20deg)" } },
  { id: "cool", label: "Froid", style: { filter: "saturate(120%) hue-rotate(30deg)" } },
  { id: "vivid", label: "Vivid", style: { filter: "saturate(200%) contrast(110%)" } },
];

export default function PublicationWizardModal({ onClose, onPublish }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    image_url: SAMPLE_IMAGES[0],
    caption: "",
    hashtags: [],
    pubType: "reel",
    visibility: "public",
    category: "Coiffure",
    duration: 15,
    filter: null,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    rotation: 0,
    script: "",
    sound: null,
  });
  const [activePanel, setActivePanel] = useState(null);
  const fileInputRef = useRef(null);

  const toggleHashtag = (tag) =>
    setForm(f => ({
      ...f,
      hashtags: f.hashtags.includes(tag) ? f.hashtags.filter(h => h !== tag) : [...f.hashtags, tag],
    }));

  const getImageStyle = () => ({
    filter: [
      form.filter ? FILTERS.find(f => f.id === form.filter)?.style?.filter || "" : "",
      `brightness(${form.brightness}%)`,
      `contrast(${form.contrast}%)`,
      `saturate(${form.saturation}%)`,
    ].filter(Boolean).join(" "),
    transform: `rotate(${form.rotation}deg)`,
  });

  const publish = async () => {
    const newPub = await entities.Publication.create({
      title: form.caption || "Sans titre",
      description: form.caption,
      image_url: form.image_url,
      category: form.category,
      tags: form.hashtags,
      status: "publie",
    });
    onPublish({ ...newPub, image_url: form.image_url });
  };

  // ── STEP 1: Studio ────────────────────────────────────────────────────────
  if (step === 1) return (
    <div className="fixed inset-0 bg-[#0d1117] z-[9999] flex flex-col font-display">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = ev => setForm(f => ({ ...f, image_url: ev.target.result }));
            reader.readAsDataURL(file);
          }
        }}
      />
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
          <X className="w-5 h-5 text-white" />
        </button>
        <p className="text-[13px] font-black text-white uppercase tracking-widest">Studio</p>
        <div className="w-10" />
      </div>

      <div className="flex-1 relative mx-4 rounded-2xl overflow-hidden bg-black/40">
        <img src={form.image_url} alt="preview" className="w-full h-full object-cover" style={getImageStyle()} />
        <div className="absolute right-3 top-4 flex flex-col gap-2.5">
          {[
            { icon: SlidersHorizontal, panel: "ajuster" },
            { icon: Wand2, panel: "filtres" },
            { icon: Clock, panel: "temps" },
            { icon: RotateCcw, panel: "pivoter" },
            { icon: AlignJustify, panel: "script" },
          ].map(({ icon: Icon, panel }) => (
            <button key={panel} onClick={() => setActivePanel(activePanel === panel ? null : panel)}>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${activePanel === panel ? "bg-primary" : "bg-black/50"}`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </button>
          ))}
        </div>
        {form.script && (
          <div className="absolute bottom-4 left-4 right-16 bg-black/70 rounded-2xl px-3 py-2">
            <p className="text-white text-[13px]">{form.script}</p>
          </div>
        )}
      </div>

      {activePanel === "ajuster" && (
        <div className="mx-4 mt-2 bg-[#1a2035] rounded-2xl p-4 space-y-3">
          {[
            { label: "Luminosité", icon: Sun, key: "brightness", min: 50, max: 200 },
            { label: "Contraste", icon: Contrast, key: "contrast", min: 50, max: 200 },
            { label: "Saturation", icon: Droplets, key: "saturation", min: 0, max: 300 },
          ].map(({ label, icon: Icon, key, min, max }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-gray-300">{label}</span>
                <span className="text-[11px] font-black text-primary">{form[key]}%</span>
              </div>
              <input type="range" min={min} max={max} value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                className="w-full accent-primary h-1 rounded-full" />
            </div>
          ))}
        </div>
      )}
      {activePanel === "filtres" && (
        <div className="mx-4 mt-2 bg-[#1a2035] rounded-2xl p-4">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {FILTERS.map(f => (
              <button key={String(f.id)} onClick={() => { setForm(fm => ({ ...fm, filter: f.id })); setActivePanel(null); }} className="flex flex-col items-center gap-1 shrink-0">
                <div className={`w-14 h-14 rounded-xl overflow-hidden border-2 ${form.filter === f.id ? "border-primary" : "border-transparent"}`}>
                  <img src={form.image_url} alt="" className="w-full h-full object-cover" style={f.style} />
                </div>
                <span className="text-[9px] font-black text-gray-300">{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {activePanel === "temps" && (
        <div className="mx-4 mt-2 bg-[#1a2035] rounded-2xl p-4">
          <div className="flex gap-2">
            {[15, 30, 60, 90].map(d => (
              <button key={d} onClick={() => { setForm(f => ({ ...f, duration: d })); setActivePanel(null); }}
                className={`flex-1 py-3 rounded-2xl font-black text-[14px] ${form.duration === d ? "bg-primary text-white" : "bg-white/10 text-gray-300"}`}>
                {d}s
              </button>
            ))}
          </div>
        </div>
      )}
      {activePanel === "pivoter" && (
        <div className="mx-4 mt-2 bg-[#1a2035] rounded-2xl p-4">
          <div className="flex gap-2">
            {[0, 90, 180, 270].map(deg => (
              <button key={deg} onClick={() => { setForm(f => ({ ...f, rotation: deg })); setActivePanel(null); }}
                className={`flex-1 py-3 rounded-2xl font-black text-[13px] ${form.rotation === deg ? "bg-primary text-white" : "bg-white/10 text-gray-300"}`}>
                {deg}°
              </button>
            ))}
          </div>
        </div>
      )}
      {activePanel === "script" && (
        <div className="mx-4 mt-2 bg-[#1a2035] rounded-2xl p-4">
          <textarea value={form.script} onChange={e => setForm(f => ({ ...f, script: e.target.value }))}
            placeholder="Texte affiché sur votre vidéo..." rows={2}
            className="w-full bg-white/10 text-white text-[13px] rounded-xl px-3 py-2 outline-none resize-none placeholder:text-gray-500" />
          <button onClick={() => setActivePanel(null)} className="mt-2 w-full bg-primary text-white font-black text-[12px] uppercase py-2.5 rounded-xl">Valider</button>
        </div>
      )}

      <div className="px-5 pb-5 pt-3 flex items-center gap-4">
        <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
          <Upload className="w-5 h-5 text-white" />
        </button>
        <button onClick={() => { setActivePanel(null); setStep(2); }}
          className="flex-1 bg-primary text-white font-black text-[14px] uppercase tracking-widest py-4 rounded-full shadow-lg shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2">
          Continuer <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // ── STEP 2: Détails ───────────────────────────────────────────────────────
  if (step === 2) return (
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col font-display">
      <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => setStep(1)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center"><X className="w-4 h-4 text-gray-700" /></button>
        <p className="text-[15px] font-black text-gray-900">Détails de la publication</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4 space-y-5 hide-scrollbar">
        <div className="bg-gray-50 rounded-2xl p-3 flex gap-3">
          <img src={form.image_url} className="w-14 h-14 rounded-xl object-cover shrink-0" alt="" />
          <textarea value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
            placeholder="Décrivez votre création..." rows={3}
            className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none resize-none placeholder:text-gray-400 font-medium" />
        </div>
        <div>
          <p className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-3">Hashtags</p>
          <div className="flex flex-wrap gap-2">
            {HASHTAGS.map(tag => (
              <button key={tag} onClick={() => toggleHashtag(tag)}
                className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all ${form.hashtags.includes(tag) ? "bg-primary text-white border-primary" : "bg-gray-100 text-gray-600 border-transparent"}`}>
                {tag}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-3">Visibilité</p>
          <div className="flex gap-3">
            {[
              { val: "public", icon: Globe, label: "Public" },
              { val: "masque", icon: Lock, label: "Masqué" },
            ].map(({ val, icon: Icon, label }) => (
              <button key={val} onClick={() => setForm(f => ({ ...f, visibility: val }))}
                className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all ${form.visibility === val ? "border-primary bg-orange-50" : "border-gray-200 bg-gray-50"}`}>
                <Icon className={`w-5 h-5 ${form.visibility === val ? "text-primary" : "text-gray-400"}`} />
                <span className={`text-[11px] font-black uppercase ${form.visibility === val ? "text-primary" : "text-gray-500"}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white px-5 py-4 border-t border-gray-100 flex gap-3">
        <button onClick={() => setStep(1)} className="px-5 py-3.5 bg-gray-100 rounded-2xl text-[12px] font-black text-gray-600 uppercase tracking-widest">Retour</button>
        <button onClick={publish} className="flex-1 bg-primary text-white font-black text-[14px] uppercase tracking-widest py-3.5 rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-all">
          Publier ✨
        </button>
      </div>
    </div>
  );

  return null;
}