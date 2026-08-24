import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, MessageSquare, Tag, Star, Bell, ChevronRight } from "lucide-react";
import { useThemeBg } from "@/hooks/useTheme";

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      className="w-11 h-6 rounded-full transition-all duration-300 flex items-center px-0.5 cursor-pointer shrink-0"
      style={{ background: value ? "#E8732A" : "#d1d5db" }}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${value ? "translate-x-5" : "translate-x-0"}`} />
    </div>
  );
}

function NotifRow({ label, desc, push, email, onTogglePush, onToggleEmail }) {
  return (
    <div className="px-4 py-4 border-b border-gray-50 last:border-0">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-[14px] font-black text-gray-900">{label}</p>
          <p className="text-[11px] text-gray-400 font-medium mt-0.5">{desc}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <Toggle value={push} onChange={onTogglePush} />
            <span className="text-[8px] text-gray-400 font-bold">PUSH</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Toggle value={email} onChange={onToggleEmail} />
            <span className="text-[8px] text-gray-400 font-bold">EMAIL</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const DEFAULTS = {
  rdv_push: true, rdv_email: true,
  rappel_push: true, rappel_email: false,
  msg_push: true, msg_email: true,
  promo_push: false, promo_email: false,
  avis_push: true, avis_email: false,
};

export default function Notifications() {
  const navigate = useNavigate();
  const themeBg = useThemeBg();
  const [notifs, setNotifs] = useState(() => {
    const saved = localStorage.getItem("bb_notifs");
    return saved ? JSON.parse(saved) : DEFAULTS;
  });

  const set = (key, val) => {
    const updated = { ...notifs, [key]: val };
    setNotifs(updated);
    localStorage.setItem("bb_notifs", JSON.stringify(updated));
  };

  return (
    <div className="font-display min-h-screen" style={{ background: themeBg }}>
      <div className="bg-white px-5 pt-12 pb-4 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate(-1)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all">
          <ArrowLeft className="w-4 h-4 text-primary" />
        </button>
        <h1 className="text-[20px] font-black text-gray-900">Notifications</h1>
      </div>

      <div className="px-4 pb-20 pt-4">
        <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-1 px-1 mt-2">Préférences</p>
        <h2 className="text-[28px] font-black text-gray-900 leading-tight mb-1 px-1">Centre de<br />Notifications</h2>
        <p className="text-[12px] text-gray-400 font-medium mb-4 px-1 leading-relaxed">Personnalisez la façon dont vous recevez les mises à jour de votre activité.</p>

        {/* Lien vers les notifs reçues */}
        <button
          onClick={() => navigate("/notifications")}
          className="w-full bg-white rounded-2xl px-4 py-4 flex items-center gap-3 mb-4 active:scale-[0.99] transition-all shadow-sm border border-gray-100"
        >
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[14px] font-black text-gray-900">Mes notifications</p>
            <p className="text-[11px] text-gray-400 font-medium">Voir toutes vos alertes reçues</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        {/* Rendez-vous */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Calendar className="w-4 h-4 text-primary" />
            <p className="text-[14px] font-black text-gray-900">Rendez-vous</p>
          </div>
          <div className="bg-white rounded-3xl overflow-hidden">
            <NotifRow label="Nouveaux rendez-vous" desc="Lorsqu'un client réserve un créneau" push={notifs.rdv_push} email={notifs.rdv_email} onTogglePush={v => set("rdv_push", v)} onToggleEmail={v => set("rdv_email", v)} />
            <NotifRow label="Rappels" desc="Alertes avant le début d'une séance" push={notifs.rappel_push} email={notifs.rappel_email} onTogglePush={v => set("rappel_push", v)} onToggleEmail={v => set("rappel_email", v)} />
          </div>
        </div>

        {/* Communications */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <MessageSquare className="w-4 h-4 text-primary" />
            <p className="text-[14px] font-black text-gray-900">Communications</p>
          </div>
          <div className="bg-white rounded-3xl overflow-hidden">
            <NotifRow label="Messages clients" desc="Discussions en direct avec vos clients" push={notifs.msg_push} email={notifs.msg_email} onTogglePush={v => set("msg_push", v)} onToggleEmail={v => set("msg_email", v)} />
            <NotifRow label="Offres promotionnelles" desc="Nouveautés et opportunités exclusives" push={notifs.promo_push} email={notifs.promo_email} onTogglePush={v => set("promo_push", v)} onToggleEmail={v => set("promo_email", v)} />
          </div>
        </div>

        {/* Avis */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Star className="w-4 h-4 text-primary" />
            <p className="text-[14px] font-black text-gray-900">Avis & Évaluations</p>
          </div>
          <div className="bg-white rounded-3xl overflow-hidden">
            <NotifRow label="Nouveaux avis" desc="Quand un client laisse un commentaire" push={notifs.avis_push} email={notifs.avis_email} onTogglePush={v => set("avis_push", v)} onToggleEmail={v => set("avis_email", v)} />
          </div>
        </div>

        {/* Conseil expert */}
        <div className="bg-white rounded-3xl p-5 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-[18px] font-black text-gray-900 leading-tight mb-2">Conseil<br />d'expert</p>
            <p className="text-[12px] text-gray-500 leading-relaxed">Activez les notifications Push pour réduire le temps de réponse. Les professionnels réactifs augmentent leurs réservations de 25%.</p>
          </div>
          <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0">
            <img src="" alt="expert" className="w-full h-full object-cover" />
          </div>
        </div>

      </div>
    </div>
  );
}