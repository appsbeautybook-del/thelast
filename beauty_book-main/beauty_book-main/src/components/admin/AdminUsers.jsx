import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Search, Shield, User, Trash2, Ban, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { deleteAccountCompletely, banUserPermanently, unbanUser } from "@/lib/adminUserManagement";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalAction, setModalAction] = useState(null); // { type: 'delete' | 'ban' | 'unban', user: Object }
  const [banReason, setBanReason] = useState("Bannissement administrateur à vie");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setUsers(data || []);
    } catch (e) {
      console.warn("Load users error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = users.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleRole = async (user) => {
    const newRole = user.role === "admin" ? "client" : "admin";
    try {
      await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    } catch (e) {
      console.warn("Toggle role error:", e);
    }
  };

  const handleConfirmAction = async () => {
    if (!modalAction || processing) return;
    setProcessing(true);
    const { type, user } = modalAction;

    try {
      if (type === 'delete') {
        await deleteAccountCompletely({ userId: user.id, email: user.email });
        setUsers(prev => prev.filter(u => u.id !== user.id));
        setMessage(`Compte ${user.email} et ses données supprimés définitivement.`);
      } else if (type === 'ban') {
        await banUserPermanently({ userId: user.id, email: user.email, reason: banReason });
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: 'banned', is_banned: true } : u));
        setMessage(`Compte ${user.email} et son appareil ont été bannis à vie.`);
      } else if (type === 'unban') {
        await unbanUser({ email: user.email });
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: 'client', is_banned: false } : u));
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

  return (
    <div className="space-y-4 font-display">

      {/* Message Toast */}
      {message && (
        <div className="bg-gray-900 text-white px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg text-[13px] font-bold animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Header Search */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou e-mail..."
            className="flex-1 bg-transparent text-gray-800 text-[13px] outline-none placeholder:text-gray-400 font-medium"
          />
        </div>
        <button
          onClick={loadUsers}
          className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
          title="Rafraîchir"
        >
          <RefreshCw className="w-4.5 h-4.5" />
        </button>
      </div>

      <div className="flex items-center justify-between px-1">
        <p className="text-gray-500 text-[12px] font-bold">{filtered.length} utilisateur(s) trouvé(s)</p>
      </div>

      {/* Liste des utilisateurs */}
      <div className="space-y-3">
        {filtered.map(u => {
          const isBanned = u.is_banned || u.role === "banned";
          const isAdmin = u.role === "admin";
          return (
            <div
              key={u.id}
              className={`bg-white rounded-2xl p-4 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
                isBanned ? "border-red-200 bg-red-50/20" : "border-gray-100 hover:border-gray-200"
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
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 text-[14px] font-black truncate">{u.full_name || "Utilisateur Sans Nom"}</p>
                    {isBanned && (
                      <span className="bg-red-100 text-red-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Banni à vie
                      </span>
                    )}
                    {isAdmin && (
                      <span className="bg-purple-100 text-purple-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-[12px] truncate mt-0.5">{u.email}</p>
                  {u.created_at && (
                    <p className="text-gray-400 text-[10px] mt-0.5">
                      Inscrit le {new Date(u.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions Admin */}
              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">

                {/* Role Toggle */}
                <button
                  onClick={() => toggleRole(u)}
                  className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all active:scale-95 flex items-center gap-1.5 ${
                    isAdmin ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-purple-50 text-purple-600 hover:bg-purple-100"
                  }`}
                  title={isAdmin ? "Rétrograder en client" : "Promouvoir en admin"}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{isAdmin ? "Rétrograder" : "Promouvoir"}</span>
                </button>

                {/* Ban Button */}
                {isBanned ? (
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
                    title="Bannir ce compte et cet appareil à vie"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Bannir à vie</span>
                  </button>
                )}

                {/* Delete Button */}
                <button
                  onClick={() => setModalAction({ type: "delete", user: u })}
                  className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-[11px] font-black transition-all active:scale-95 flex items-center gap-1.5"
                  title="Supprimer définitivement l'utilisateur et ses données"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Supprimer</span>
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-800 text-[14px] font-bold mb-1">Aucun utilisateur trouvé</p>
            <p className="text-gray-400 text-[12px]">Essayez avec une autre recherche.</p>
          </div>
        )}
      </div>

      {/* ── MODAL CONFIRMATION ── */}
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
                  {modalAction.type === 'ban' && "Bannir à vie cet utilisateur & appareil"}
                  {modalAction.type === 'unban' && "Débannir cet utilisateur"}
                </h3>
                <p className="text-gray-400 text-[12px]">{modalAction.user.email}</p>
              </div>
            </div>

            {modalAction.type === 'delete' && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-[12px] text-red-700 leading-relaxed space-y-1">
                <p className="font-black flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Action irréversible !</p>
                <p>Toutes les données associées (profils, réservations, messages, publications) seront **effacées définitivement** de Supabase et de l'application.</p>
              </div>
            )}

            {modalAction.type === 'ban' && (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-[12px] text-amber-800 leading-relaxed">
                  <p className="font-black flex items-center gap-1 mb-1"><Ban className="w-4 h-4" /> Blocage définitif</p>
                  <p>L'adresse e-mail **{modalAction.user.email}** et l'empreinte de l'appareil seront ajoutées à la liste noire. L'utilisateur ne pourra plus jamais s'inscrire ni se connecter.</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Raison du bannissement</label>
                  <input
                    value={banReason}
                    onChange={e => setBanReason(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-gray-800 outline-none focus:border-amber-500"
                    placeholder="Ex: Non respect des CGU, spams..."
                  />
                </div>
              </div>
            )}

            {modalAction.type === 'unban' && (
              <p className="text-gray-600 text-[13px]">
                Souhaitez-vous retirer l'adresse email et l'appareil de la liste noire ? L'utilisateur pourra à nouveau accéder au service.
              </p>
            )}

            {/* Boutons d'action */}
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
