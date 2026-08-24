import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Image, Instagram, Facebook, Globe } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from '@/api/supabaseClient';
import { useProfileMedia } from "@/hooks/useProfileMedia";

const DEFAULT_AVATAR = "";
const DEFAULT_BANNER = "";
const bioMax = 160;

async function uploadToSupabase(file) {
  const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `profiles/${Date.now()}_${safeName}`;
  console.log('[uploadToSupabase] Uploading to:', filePath);
  const { error } = await supabase.storage.from('uploads').upload(filePath, file, { contentType: file.type, upsert: true });
  if (error) {
    console.error('[uploadToSupabase] Upload error:', error);
    throw new Error(error.message);
  }
  const { data } = supabase.storage.from('uploads').getPublicUrl(filePath);
  console.log('[uploadToSupabase] Public URL:', data.publicUrl);
  return data.publicUrl;
}

export default function ModifierProfilClient() {
  const navigate = useNavigate();
  const { user, profile, refreshUser } = useAuth();
  const { avatarUrl, coverUrl, uploadingAvatar, uploadingCover, selectAvatar, selectCover } = useProfileMedia(user);
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [emailChanged, setEmailChanged] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const pendingAvatarRef = useRef(null);
  const pendingCoverRef = useRef(null);

  const [form, setForm] = useState({
    fullName: "",
    username: "",
    bio: "",
    email: "",
    phone: "",
    instagram: "",
    facebook: "",
    website: "",
  });

  useEffect(() => {
    const loadForm = async () => {
      if (!user?.id) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (data) {
        setForm({
          fullName: data.full_name || "",
          username: data.username || "",
          bio: data.bio || "",
          email: data.email || user?.email || "",
          phone: data.phone || "",
          instagram: data.instagram || "",
          facebook: data.facebook || "",
          website: data.website || "",
        });
      }
    };
    loadForm();
  }, [user?.id]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      pendingAvatarRef.current = file;
      selectAvatar(file);
    }
  };

  const handleBannerChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      pendingCoverRef.current = file;
      selectCover(file);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setEmailChanged(false);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setError("Vous devez être connecté");
        setSaving(false);
        return;
      }

      // Si l'email a changé, mettre à jour via Supabase Auth
      if (form.email && form.email !== authUser.email) {
        setEmailLoading(true);
        const { error: emailErr } = await supabase.auth.updateUser({ email: form.email });
        if (emailErr) {
          setError("Erreur email: " + (emailErr.message || "Impossible de modifier l'email. Vérifiez que l'adresse est valide."));
          setSaving(false);
          setEmailLoading(false);
          return;
        }
        setEmailChanged(true);
        setEmailLoading(false);
      }

      const profileData = { id: authUser.id, updated_at: new Date().toISOString() };
      if (form.fullName !== undefined) profileData.full_name = form.fullName;
      if (form.username !== undefined) profileData.username = form.username;
      if (form.email !== undefined) profileData.email = form.email;
      if (form.phone !== undefined) profileData.phone = form.phone;
      if (form.instagram !== undefined) profileData.instagram = form.instagram;
      if (form.facebook !== undefined) profileData.facebook = form.facebook;
      if (form.website !== undefined) profileData.website = form.website;

      // Upload avatar via Supabase Storage
      if (pendingAvatarRef.current) {
        try {
          const url = await uploadToSupabase(pendingAvatarRef.current);
          if (url) {
            profileData.avatar_url = url;
            console.log('[ModifierProfil] Avatar uploaded:', url);
          }
        } catch (e) {
          console.error('[ModifierProfil] Avatar upload error:', e);
          setError("Erreur upload avatar: " + e.message);
          setSaving(false);
          return;
        }
        pendingAvatarRef.current = null;
      }

      // Upload cover via Supabase Storage
      if (pendingCoverRef.current) {
        try {
          const url = await uploadToSupabase(pendingCoverRef.current);
          if (url) {
            profileData.cover_url = url;
            console.log('[ModifierProfil] Cover uploaded:', url);
          }
        } catch (e) {
          console.error('[ModifierProfil] Cover upload error:', e);
          setError("Erreur upload bannière: " + e.message);
          setSaving(false);
          return;
        }
        pendingCoverRef.current = null;
      }

      console.log('[ModifierProfil] Saving profile:', profileData);

      // Upsert direct dans Supabase
      const { data: upsertData, error: upsertError } = await supabase.from('profiles').upsert(profileData, { onConflict: 'id' }).select();
      if (upsertError) {
        console.error('[ModifierProfil] Profile upsert error:', upsertError);
        setError("Erreur sauvegarde: " + upsertError.message);
        setSaving(false);
        return;
      }

      console.log('[ModifierProfil] Profile saved:', upsertData);

      // Mettre à jour aussi user_metadata
      await supabase.auth.updateUser({
        data: { full_name: profileData.full_name, username: profileData.username }
      });

      setSaving(false);
      setSaved(true);
      if (refreshUser) await refreshUser();
      setTimeout(() => {
        if (emailChanged) {
          window.location.replace('/profil?' + Date.now());
        } else {
          window.location.replace('/profil?' + Date.now());
        }
      }, 300);
    } catch (error) {
      console.error("[ModifierProfil] Error saving:", error);
      setError("Erreur: " + error.message);
      setSaving(false);
    }
  };

  return (
    <div className="font-display min-h-full bg-[#f5f5f5]">
      <div className="bg-white px-5 pt-5 pb-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all">
          <ArrowLeft className="w-4 h-4 text-primary" />
        </button>
        <h1 className="text-[20px] font-black text-gray-900">Modifier le profil</h1>
      </div>

      <div className="pb-32">
        <div className="bg-white mb-3">
          <div className="flex flex-col items-center pt-6 pb-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-[3px] border-primary shadow-lg">
                <img src={avatarUrl || DEFAULT_AVATAR} alt="avatar" className="w-full h-full object-cover" />
              </div>
              <button onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 bg-gray-900 rounded-full border-2 border-white flex items-center justify-center shadow active:scale-95">
                {uploadingAvatar ? <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
              </button>
            </div>
            <button onClick={() => avatarInputRef.current?.click()} className="mt-2 text-[12px] font-black text-primary uppercase tracking-widest">
              Changer la photo
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div onClick={() => bannerInputRef.current?.click()}
            className="relative mx-4 mb-4 h-28 rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 cursor-pointer active:scale-[0.99] transition-all">
            <img src={coverUrl || DEFAULT_BANNER} alt="bannière" className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              {uploadingCover
                ? <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                : <><Image className="w-5 h-5 text-gray-500" /><span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Modifier la bannière</span></>}
            </div>
          </div>
          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
        </div>

        {error && (
          <div className="mx-4 mb-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-[13px] text-red-600 font-medium">{error}</p>
          </div>
        )}
        {emailChanged && (
          <div className="mx-4 mb-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
            <p className="text-[13px] text-blue-600 font-medium">Un email de confirmation a été envoyé à <strong>{form.email}</strong>. Veuillez confirmer pour finaliser le changement.</p>
          </div>
        )}

        <div className="bg-white px-5 py-5 space-y-5 mb-3">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nom complet</p>
            <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              placeholder="Utilisateur BeautyBook" className="w-full bg-gray-100 rounded-2xl px-4 py-3.5 text-[15px] font-medium text-gray-800 outline-none" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nom d'utilisateur</p>
            <div className="flex items-center bg-gray-100 rounded-2xl px-4 py-3.5 cursor-text" onClick={() => document.getElementById('username-input')?.focus()}>
              <span className="text-[15px] text-gray-400 font-medium mr-1 select-none">@</span>
              <input id="username-input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="elena_beauté" className="flex-1 bg-transparent text-[15px] font-medium text-gray-800 outline-none" />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Adresse e-mail</p>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="votre@email.com" className="w-full bg-gray-100 rounded-2xl px-4 py-3.5 text-[15px] font-medium text-gray-800 outline-none" />
            <p className="text-[10px] text-gray-400 mt-1">Un email de confirmation sera envoyé à la nouvelle adresse</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Numéro de téléphone</p>
            <div className="flex items-center bg-gray-100 rounded-2xl px-4 py-3.5">
              <span className="text-[15px] text-gray-400 font-medium mr-1 select-none">📱</span>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+33 6 12 34 56 78" className="flex-1 bg-transparent text-[15px] font-medium text-gray-800 outline-none" />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Biographie</p>
            <textarea value={form.bio} onChange={e => e.target.value.length <= bioMax && setForm(f => ({ ...f, bio: e.target.value }))}
              rows={4} placeholder="Parlez de vous..." className="w-full bg-gray-100 rounded-2xl px-4 py-3.5 text-[15px] font-medium text-gray-800 outline-none resize-none" />
            <p className="text-right text-[11px] text-gray-400 font-medium mt-1">{form.bio.length} / {bioMax}</p>
          </div>

          {/* Réseaux sociaux */}
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Réseaux Sociaux</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3">
                <Instagram className="w-5 h-5 text-pink-500 flex-shrink-0" />
                <input value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
                  placeholder="Nom Instagram" className="flex-1 bg-transparent text-[15px] font-medium text-gray-800 outline-none placeholder:text-gray-400" />
              </div>
              <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3">
                <Facebook className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <input value={form.facebook} onChange={e => setForm(f => ({ ...f, facebook: e.target.value }))}
                  placeholder="Nom Facebook" className="flex-1 bg-transparent text-[15px] font-medium text-gray-800 outline-none placeholder:text-gray-400" />
              </div>
              <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3">
                <Globe className="w-5 h-5 text-violet-500 flex-shrink-0" />
                <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="Site web (optionnel)" className="flex-1 bg-transparent text-[15px] font-medium text-gray-800 outline-none placeholder:text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 z-[99]" style={{ paddingTop: "12px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        <button onClick={save} disabled={saving}
          className="w-full bg-primary text-white font-black text-[15px] uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-all">
          {saved ? "✓ Enregistré !" : saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
