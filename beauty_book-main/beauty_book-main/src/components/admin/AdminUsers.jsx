import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/api/supabaseClient";
import {
  Search, Shield, User, Trash2, Ban, AlertTriangle, CheckCircle, RefreshCw,
  Store, Scissors, Crown, Star, Lock, Unlock, ChevronDown, ChevronRight,
  Filter, Users, Building2, Heart
} from "lucide-react";
import { deleteAccountCompletely, banUserPermanently, unbanUser } from "@/lib/adminUserManagement";

const SUBSCRIPTIONS = [
  { key: "gratuit", label: "Gratuit", color: "bg-gray-100 text-gray-600" },
  { key: "premium", label: "Premium", color: "bg-blue-100 text-blue-600" },
  { key: "luxe", label: "Luxe", color: "bg-purple-100 text-purple-600" },
  { key: "prestige", label: "Prestige", color: "bg-amber-100 text-amber-600" },
];

const SALON_CATEGORIES = [
  { key: "coiffure", label: "Coiffure", icon: Scissors },
  { key: "esthetique", label: "Esthétique", icon: Star },
  { key: "institut", label: "Institut", icon: Building2 },
  { key: "spa", label: "Spa & Bien-être", icon: Heart },
  { key: "onglerie", label: "Onglerie", icon: Scissors },
  { key: "maquillage", label: "Maquillage", icon: Star },
  { key: "medecine", label: "Médecine esthétique", icon: Building2 },
];

export default function AdminUsers() {
  const [profiles, setProfiles] = useState([]);
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("tous");
  const [salonSubTab, setSalonSubTab] = useState("all");
  const [particulierSubTab, setParticulierSubTab] = useState("all");
  const [modalAction, setModalAction] = useState(null);
  const [banReason, setBanReason] = useState("Bannissement administrateur à vie");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profRes, salonRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('ProfilPro').select('*'),
      ]);
      setProfiles(profRes.data || []);
      setSalons(salonRes.data || []);
    } catch (e) {
      console.warn("Load data error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const salonEmails = useMemo(() => new Set(salons.map(s => s.user_email?.toLowerCase())), [salons]);

  const buildUser = (p) => {
    const salon = salons.find(s => s.user_email?.toLowerCase() === p.email?.toLowerCase());
    return {
      ...p,
      isSalon: !!salon,
      salonData: salon || null,
      isBanned: p.is_banned || p.role === "banned",
      isAdmin: p.role === "admin",
    };
  };

  const allUsers = useMemo(() => profiles.map(buildUser), [profiles, salons]);

  const filteredAll = useMemo(() => {
    if (!search) return allUsers;
    const q = search.toLowerCase();
    return allUsers.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.salonData?.salon_name?.toLowerCase().includes(q)
    );
  }, [allUsers, search]);

  const salonsList = useMemo(() => filteredAll.filter(u => u.isSalon), [filteredAll]);
  const particuliersList = useMemo(() => filteredAll.filter(u => !u.isSalon), [filteredAll]);

  const salonsByCategory = useMemo(() => {
    const map = {};
    for (const cat of SALON_CATEGORIES) map[cat.key] = [];
    map["sans_categorie"] = [];
    for (const u of salonsList) {
      const cat = u.salonData?.categorie?.toLowerCase();
      if (cat && map[cat]) map[cat].push(u);
      else map["sans_categorie"].push(u);
    }
    return map;
  }, [salonsList]);

  const salonsBySubscription = useMemo(() => {
    const map = {};
    for (const sub of SUBSCRIPTIONS) map[sub.key] = [];
    for (const u of salonsList) {
      const subKey = u.salonData?.abonnement?.toLowerCase() || "gratuit";
      if (map[subKey]) map[subKey].push(u);
      else map["gratuit"].push(u);
    }
    return map;
  }, [salonsList]);

  const toggleRole = async (user) => {
    const newRole = user.isAdmin ? "user" : "admin";
    try {
      await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
      setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, role: newRole } : p));
    } catch (e) {
      console.warn("Toggle role error:", e);
    }
  };

  const toggleRestrict = async (user) => {
    if (!user.salonData) return;
    const currentSub = user.salonData.abonnement || "gratuit";
    const isRestricted = currentSub === "restreint";
    const newSub = isRestricted ? "gratuit" : "restreint";
    try {
      await supabase.from('ProfilPro').update({
        abonnement: newSub,
        abonnement_expires_at: isRestricted ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq('user_email', user.email);
      setSalons(prev => prev.map(s =>
        s.user_email?.toLowerCase() === user.email?.toLowerCase()
          ? { ...s, abonnement: newSub, abonnement_expires_at: isRestricted ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() }
          : s
      ));
      setMessage(isRestricted
        ? `Accès de ${user.salonData.salon_name || user.email} restauré.`
        : `Compte ${user.salonData.salon_name || user.email} restreint (accès limité).`
      );
    } catch (e) {
      setMessage(`Erreur : ${e.message}`);
    }
    setTimeout(() => setMessage(""), 4000);
  };

  const handleConfirmAction = async () => {
    if (!modalAction || processing) return;
    setProcessing(true);
    const { type, user } = modalAction;
    try {
      if (type === 'delete') {
        await deleteAccountCompletely({ userId: user.id, email: user.email });
        setProfiles(prev => prev.filter(p => p.id !== user.id));
        setSalons(prev => prev.filter(s => s.user_email?.toLowerCase() !== user.email?.toLowerCase()));
        setMessage(`Compte ${user.email} et ses données supprimés définitivement.`);
      } else if (type === 'ban') {
        await banUserPermanently({ userId: user.id, email: user.email, reason: banReason });
        setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, role: 'banned', is_banned: true } : p));
        setMessage(`Compte ${user.email} banni à vie. Email ajouté à la liste noire.`);
      } else if (type === 'unban') {
        await unbanUser({ email: user.email });
        setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, role: 'user', is_banned: false } : p));
        setMessage(`Compte ${user.email} débanni.`);
      }
    } catch (e) {
      setMessage(`Erreur : ${e.message}`);
    } finally {
      setProcessing(false);
      setModalAction(null);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const tabs = [
    { key: "tous", label: "Tous", icon: Users, count: filteredAll.length },
    { key: "salons", label: "Salons", icon: Building2, count: salonsList.length },
    { key: "particuliers", label: "Particuliers", icon: User, count: particuliersList.length },
  ];

  const renderUserCard = (u, showRestrict = true) => {
    const isRestricted = u.salonData?.abonnement === "restreint";
    return (
      <div
        key={u.id}
        className={`bg-white rounded-2xl p-4 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
          u.isBanned ? "border-red-200 bg-red-50/20" : "border-gray-100 hover:border-gray-200"
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden border border-gray-200">
            {u.avatar_url ? (
              <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
            ) : u.full_name ? (
              <span className="text-gray-800 font-black text-[15px]">{u.full_name[0]?.toUpperCase()}</span>
            ) : (
              <User className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-gray-900 text-[14px] font-black truncate">{u.full_name || "Sans Nom"}</p>
              {u.isBanned && (
                <span className="bg-red-100 text-red-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Banni à vie</span>
              )}
              {u.isAdmin && (
                <span className="bg-purple-100 text-purple-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Admin</span>
              )}
              {u.isSalon && (
                <span className="bg-orange-100 text-orange-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Store className="w-2.5 h-2.5" /> Salon
                </span>
              )}
              {u.salonData && (
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  SUBSCRIPTIONS.find(s => s.key === (u.salonData.abonnement || "gratuit"))?.color || "bg-gray-100 text-gray-600"
                }`}>
                  {u.salonData.abonnement || "gratuit"}
                </span>
              )}
            </div>
            <p className="text-gray-500 text-[12px] truncate mt-0.5">{u.email}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {u.salonData?.salon_name && (
                <p className="text-orange-500 text-[10px] font-bold truncate">{u.salonData.salon_name}</p>
              )}
              {u.salonData?.categorie && (
                <span className="text-gray-400 text-[10px]">• {u.salonData.categorie}</span>
              )}
            </div>
            {u.created_at && (
              <p className="text-gray-400 text-[10px] mt-0.5">
                Inscrit le {new Date(u.created_at).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 flex-wrap">
          {/* Role Toggle */}
          <button
            onClick={() => toggleRole(u)}
            className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all active:scale-95 flex items-center gap-1.5 ${
              u.isAdmin ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-purple-50 text-purple-600 hover:bg-purple-100"
            }`}
            title={u.isAdmin ? "Rétrograder en client" : "Promouvoir en admin"}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{u.isAdmin ? "Rétrograder" : "Promouvoir"}</span>
          </button>

          {/* Restrict (salons only) */}
          {showRestrict && u.isSalon && (
            <button
              onClick={() => toggleRestrict(u)}
              className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all active:scale-95 flex items-center gap-1.5 ${
                isRestricted
                  ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                  : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
              }`}
              title={isRestricted ? "Restaurer l'accès complet" : "Restreindre l'accès (abonnement limité)"}
            >
              {isRestricted ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{isRestricted ? "Restaurer" : "Restreindre"}</span>
            </button>
          )}

          {/* Ban / Unban */}
          {u.isBanned ? (
            <button
              onClick={() => setModalAction({ type: "unban", user: u })}
              className="px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl text-[11px] font-black transition-all active:scale-95 flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Débannir
            </button>
          ) : (
            <button
              onClick={() => setModalAction({ type: "ban", user: u })}
              className="px-3 py-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl text-[11px] font-black transition-all active:scale-95 flex items-center gap-1.5"
              title="Bannir à vie — email ajouté à la liste noire"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Bannir à vie</span>
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => setModalAction({ type: "delete", user: u })}
            className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-[11px] font-black transition-all active:scale-95 flex items-center gap-1.5"
            title="Supprimer définitivement"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Supprimer</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 font-display">

      {/* Toast */}
      {message && (
        <div className="bg-gray-900 text-white px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg text-[13px] font-bold animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, e-mail ou salon..."
            className="flex-1 bg-transparent text-gray-800 text-[13px] outline-none placeholder:text-gray-400 font-medium"
          />
        </div>
        <button
          onClick={loadAll}
          className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
          title="Rafraîchir"
        >
          <RefreshCw className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-2xl border border-gray-100 p-1 shadow-sm">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setSalonSubTab("all"); setParticulierSubTab("all"); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-[12px] font-black transition-all ${
              activeTab === t.key
                ? "bg-orange-500 text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === t.key ? "bg-white/20" : "bg-gray-100"
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── TAB: TOUS ── */}
      {activeTab === "tous" && (
        <>
          <p className="text-gray-500 text-[12px] font-bold px-1">{filteredAll.length} utilisateur(s)</p>
          <div className="space-y-3">
            {filteredAll.map(u => renderUserCard(u, false))}
            {filteredAll.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-800 text-[14px] font-bold mb-1">Aucun utilisateur trouvé</p>
                <p className="text-gray-400 text-[12px]">Essayez avec une autre recherche.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB: SALONS ── */}
      {activeTab === "salons" && (
        <>
          {/* Sub-tabs: Subscription filters */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSalonSubTab("all")}
              className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all shrink-0 ${
                salonSubTab === "all" ? "bg-orange-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Tous ({salonsList.length})
            </button>
            {SUBSCRIPTIONS.map(s => (
              <button
                key={s.key}
                onClick={() => setSalonSubTab(s.key)}
                className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all shrink-0 ${
                  salonSubTab === s.key ? "bg-orange-500 text-white" : `bg-white border border-gray-200 ${s.color} hover:bg-gray-50`
                }`}
              >
                {s.label} ({salonsBySubscription[s.key]?.length || 0})
              </button>
            ))}
          </div>

          {/* Sub-tabs: Category filters */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSalonSubTab("all")}
              className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all shrink-0 flex items-center gap-1 ${
                salonSubTab === "all" ? "bg-orange-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Filter className="w-3 h-3" /> Toutes catégories
            </button>
            {SALON_CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setSalonSubTab(c.key)}
                className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all shrink-0 flex items-center gap-1 ${
                  salonSubTab === c.key ? "bg-orange-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <c.icon className="w-3 h-3" />
                {c.label} ({salonsByCategory[c.key]?.length || 0})
              </button>
            ))}
          </div>

          {/* Salon List */}
          <div className="space-y-3">
            {(() => {
              let list = salonsList;
              if (salonSubTab !== "all") {
                const isSubKey = SUBSCRIPTIONS.some(s => s.key === salonSubTab);
                list = isSubKey
                  ? salonsBySubscription[salonSubTab] || []
                  : salonsByCategory[salonSubTab] || [];
              }
              return list.map(u => renderUserCard(u, true));
            })()}
            {salonsList.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                <Store className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-800 text-[14px] font-bold mb-1">Aucun salon trouvé</p>
                <p className="text-gray-400 text-[12px]">Aucun profil professionnel enregistré.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB: PARTICULIERS ── */}
      {activeTab === "particuliers" && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setParticulierSubTab("all")}
              className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all shrink-0 ${
                particulierSubTab === "all" ? "bg-orange-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Tous ({particuliersList.length})
            </button>
            <button
              onClick={() => setParticulierSubTab("actifs")}
              className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all shrink-0 ${
                particulierSubTab === "actifs" ? "bg-orange-500 text-white" : "bg-white border border-gray-200 text-emerald-600 hover:bg-gray-50"
              }`}
            >
              Actifs
            </button>
            <button
              onClick={() => setParticulierSubTab("bannis")}
              className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all shrink-0 ${
                particulierSubTab === "bannis" ? "bg-orange-500 text-white" : "bg-white border border-gray-200 text-red-600 hover:bg-gray-50"
              }`}
            >
              Bannis
            </button>
          </div>

          <div className="space-y-3">
            {(() => {
              let list = particuliersList;
              if (particulierSubTab === "actifs") list = list.filter(u => !u.isBanned);
              if (particulierSubTab === "bannis") list = list.filter(u => u.isBanned);
              return list.map(u => renderUserCard(u, false));
            })()}
            {particuliersList.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-800 text-[14px] font-bold mb-1">Aucun particulier trouvé</p>
                <p className="text-gray-400 text-[12px]">Aucun compte client sans profil salon.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── MODAL ── */}
      {modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" onClick={() => setModalAction(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                modalAction.type === 'delete' ? 'bg-red-100 text-red-600' : modalAction.type === 'ban' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {modalAction.type === 'delete' ? <Trash2 className="w-6 h-6" /> : modalAction.type === 'ban' ? <Ban className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-gray-900 text-[16px] font-black leading-tight">
                  {modalAction.type === 'delete' && "Supprimer définitivement le compte"}
                  {modalAction.type === 'ban' && "Bannir à vie cet utilisateur"}
                  {modalAction.type === 'unban' && "Débannir cet utilisateur"}
                </h3>
                <p className="text-gray-400 text-[12px]">{modalAction.user.email}</p>
              </div>
            </div>

            {modalAction.type === 'delete' && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-[12px] text-red-700 leading-relaxed space-y-1">
                <p className="font-black flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Action irréversible !</p>
                <p>L'utilisateur sera déconnecté immédiatement. Toutes ses données (profils, services, réservations, messages, publications) seront effacées définitivement.</p>
              </div>
            )}

            {modalAction.type === 'ban' && (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-[12px] text-amber-800 leading-relaxed">
                  <p className="font-black flex items-center gap-1 mb-1"><Ban className="w-4 h-4" /> Blocage définitif</p>
                  <p>L'adresse email <strong>{modalAction.user.email}</strong> sera ajoutée à la liste noire. L'utilisateur sera déconnecté et ne pourra plus jamais s'inscrire ni se connecter avec cet email.</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Raison</label>
                  <input
                    value={banReason}
                    onChange={e => setBanReason(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-gray-800 outline-none focus:border-amber-500"
                    placeholder="Ex: Non-respect des CGU, spams..."
                  />
                </div>
              </div>
            )}

            {modalAction.type === 'unban' && (
              <p className="text-gray-600 text-[13px]">
                L'email et l'appareil seront retirés de la liste noire. L'utilisateur pourra à nouveau accéder au service.
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModalAction(null)}
                disabled={processing}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-[13px] hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={processing}
                className={`flex-1 py-3 text-white font-black rounded-xl text-[13px] transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  modalAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : modalAction.type === 'ban' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {processing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {modalAction.type === 'delete' && "Supprimer tout"}
                {modalAction.type === 'ban' && "Bannir à vie"}
                {modalAction.type === 'unban' && "Confirmer le débannissement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
