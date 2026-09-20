import BeautyImage from '@/components/ui/BeautyImage';
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MoreVertical, Loader2, Camera } from "lucide-react";
import BottomSheetPicker from "@/components/ui/BottomSheetPicker";
import { entities, uploadFile } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from "@/lib/AuthContext";

const roles = ["Styliste", "Coloriste", "Barbier", "Esthéticienne", "Masseur", "Assistant"];
const specialties = ["Coupe", "Couleur", "Barbe", "Soin", "Extension", "Maquillage"];
const days = [
  { key: "lun", label: "L" },
  { key: "mar", label: "M" },
  { key: "mer", label: "M" },
  { key: "jeu", label: "J" },
  { key: "ven", label: "V" },
  { key: "sam", label: "S" },
  { key: "dim", label: "D" },
];

export default function NouveauMembre() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const [data, setData] = useState({
    name: "",
    role: "Styliste",
    specialties: ["Coupe"],
    experience: 5,
    days: ["lun", "mar", "mer", "jeu", "ven"],
  });

  const toggleSpecialty = (s) => {
    setData(d => ({
      ...d,
      specialties: d.specialties.includes(s) ? d.specialties.filter(x => x !== s) : [...d.specialties, s],
    }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await uploadFile({ file });
    setAvatarUrl(file_url);
    setUploadingPhoto(false);
    e.target.value = "";
  };

  const toggleDay = (key) => {
    setData(d => ({
      ...d,
      days: d.days.includes(key) ? d.days.filter(x => x !== key) : [...d.days, key],
    }));
  };

  return (
    <div className="font-display min-h-full bg-white flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between shrink-0">
        <button
          onClick={() => navigate("/pro/equipe")}
          className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>
        <h1 className="text-[17px] font-black text-gray-900">Nouveau membre</h1>
        <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
          <MoreVertical className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-32 space-y-6">
        {/* Photo */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          <div className="relative" onClick={() => fileInputRef.current?.click()}>
            <div className="w-28 h-28 rounded-full bg-gray-100 border-2 border-dashed border-primary/40 flex items-center justify-center cursor-pointer overflow-hidden">
              {avatarUrl ? (
                <BeautyImage src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : uploadingPhoto ? (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <Camera className="w-8 h-8 text-primary/50" />
              )}
            </div>
            <div className="absolute bottom-1 right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow border-2 border-white pointer-events-none">
              <span className="text-white text-[18px] font-black leading-none">+</span>
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2.5 rounded-full border border-primary text-primary text-[12px] font-black uppercase tracking-widest active:scale-95 transition-all"
          >
            {uploadingPhoto ? "Chargement…" : avatarUrl ? "Changer la photo" : "Importer une photo"}
          </button>
        </div>

        {/* Nom */}
        <div>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Nom Complet</p>
          <input
            placeholder="ex: Jean Dupont"
            value={data.name}
            onChange={e => setData(d => ({ ...d, name: e.target.value }))}
            className="w-full bg-gray-100 rounded-2xl px-5 py-4 text-[15px] text-gray-700 placeholder:text-gray-400 outline-none"
          />
        </div>

        {/* Rôle */}
        <div>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Rôle / Poste</p>
          <BottomSheetPicker
            label="Rôle / Poste"
            value={data.role}
            onChange={val => setData(d => ({ ...d, role: val }))}
            options={roles}
            open={rolePickerOpen}
            onOpen={() => setRolePickerOpen(true)}
            onClose={() => setRolePickerOpen(false)}
          />
        </div>

        {/* Spécialités */}
        <div>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Spécialités</p>
          <div className="flex flex-wrap gap-2">
            {specialties.map(s => (
              <button
                key={s}
                onClick={() => toggleSpecialty(s)}
                className={`px-5 py-3 rounded-2xl text-[14px] font-black transition-all ${
                  data.specialties.includes(s) ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Expérience slider */}
        <div>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Expérience (années)</p>
          <div className="bg-gray-100 rounded-3xl p-4 flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-[28px] font-black text-gray-900">{data.experience}</span>
            </div>
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="30"
                value={data.experience}
                onChange={e => setData(d => ({ ...d, experience: parseInt(e.target.value) }))}
                className="w-full accent-primary"
              />
              <p className="text-[12px] text-gray-500 font-medium mt-1">ans d'expérience dans le domaine</p>
            </div>
          </div>
        </div>

        {/* Disponibilité */}
        <div>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Disponibilité Hebdomadaire</p>
          <div className="flex gap-2">
            {days.map(d => (
              <button
                key={d.key}
                onClick={() => toggleDay(d.key)}
                className={`flex-1 aspect-square rounded-2xl flex items-center justify-center text-[13px] font-black transition-all ${
                  data.days.includes(d.key) ? "bg-primary text-white shadow-md shadow-primary/30" : "bg-gray-100 text-gray-400"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-white border-t border-gray-100 z-50">
        <button
          onClick={async () => {
            if (!data.name.trim() || !user?.email) return;
            setSaving(true);
            await entities.MembreEquipe.create({
              pro_email: user.email,
              name: data.name,
              role: data.role,
              specialites: data.specialties,
              specialties: data.specialties,
              experience: String(data.experience),
              days: data.days,
              status: "available",
              membre_avatar: avatarUrl || "",
              avatar_url: avatarUrl || "",
            });
            setSaving(false);
            navigate("/pro/equipe");
          }}
          disabled={!data.name.trim() || saving}
          className="w-full bg-primary text-white font-black text-[15px] uppercase tracking-widest py-5 rounded-3xl shadow-xl shadow-primary/40 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ajouter le Membre"}
        </button>
      </div>
    </div>
  );
}