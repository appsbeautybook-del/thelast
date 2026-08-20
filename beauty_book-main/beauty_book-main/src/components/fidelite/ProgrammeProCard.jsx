import { useState, useEffect } from "react";
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import { reconcileProPoints } from '@/lib/fideliteClient';
import {
  Copy, Check, Shield, Crown, Star, Gem, Zap, Users,
  TrendingUp, Eye, Palette, BarChart3, Tag, BadgeCheck,
  Megaphone, GraduationCap, Sparkles, CalendarCheck,
  MessageSquareHeart, CreditCard, Gift, CheckCircle
} from "lucide-react";

const LEVELS_PRO = [
  { name: "Bronze", pts: 0, icon: Shield, color: "from-amber-700 to-amber-500", bg: "bg-amber-50", text: "text-amber-600", perks: ["Visibilité standard", "Support prioritaire"] },
  { name: "Silver", pts: 500, icon: Crown, color: "from-gray-400 to-gray-500", bg: "bg-gray-100", text: "text-gray-600", perks: ["Badge Silver sur le profil", "-5% frais de commission", "Statistiques avancées"] },
  { name: "Gold", pts: 2000, icon: Star, color: "from-yellow-400 to-amber-500", bg: "bg-amber-50", text: "text-amber-600", perks: ["Badge Gold + mise en avant", "-10% frais de commission", "Accès prioritaire nouvelles fonctionnalités", "Support dédié"] },
  { name: "Elite", pts: 5000, icon: Gem, color: "from-purple-500 to-indigo-600", bg: "bg-purple-50", text: "text-purple-600", perks: ["Badge Elite + Top du classement", "0% frais de commission", "Manager dédié BeautyBook", "Accès bêta exclusif"] },
];

const REWARDS_PRO = [
  { id: "p1", icon: Eye, label: "Boost Visibilité 7 jours", desc: "Votre profil en tête des résultats pendant 7 jours", pts: 300, cat: "Visibilité", color: "text-blue-500", bg: "bg-blue-50" },
  { id: "p2", icon: Palette, label: "Bannière Premium", desc: "Personnalisez votre bannière profil avec un template pro", pts: 200, cat: "Profil", color: "text-pink-500", bg: "bg-pink-50" },
  { id: "p3", icon: BarChart3, label: "Rapport Analytics Pro", desc: "Rapport complet sur vos performances du mois", pts: 150, cat: "Analytics", color: "text-emerald-500", bg: "bg-emerald-50" },
  { id: "p4", icon: Tag, label: "Coupon Client –20%", desc: "Offrez un coupon –20% à vos clients fidèles", pts: 400, cat: "Clients", color: "text-orange-500", bg: "bg-orange-50" },
  { id: "p5", icon: BadgeCheck, label: "Badge Vérifié+", desc: "Obtenez le badge de confiance avancé sur votre profil", pts: 500, cat: "Profil", color: "text-green-500", bg: "bg-green-50" },
  { id: "p6", icon: Megaphone, label: "Story Sponsorisée", desc: "Votre story diffusée à 5000 utilisateurs BeautyBook", pts: 600, cat: "Visibilité", color: "text-violet-500", bg: "bg-violet-50" },
  { id: "p7", icon: GraduationCap, label: "Formation Gratuite", desc: "Accès à une formation beauté de notre partenaire", pts: 800, cat: "Formation", color: "text-indigo-500", bg: "bg-indigo-50" },
  { id: "p8", icon: Sparkles, label: "1 Mois Premium Offert", desc: "1 mois d'abonnement Premium offert", pts: 1500, cat: "Abonnement", color: "text-amber-500", bg: "bg-amber-50" },
];

const HOW_TO_EARN = [
  { icon: CalendarCheck, label: "Réservation confirmée", pts: "+30 pts", color: "text-blue-500", bg: "bg-blue-50" },
  { icon: Star, label: "Avis 5 étoiles reçu", pts: "+40 pts", color: "text-amber-500", bg: "bg-amber-50" },
  { icon: Zap, label: "Nouveau service publié", pts: "+20 pts", color: "text-emerald-500", bg: "bg-emerald-50" },
  { icon: Users, label: "Parrainer un pro", pts: "+500 pts", color: "text-violet-500", bg: "bg-violet-50" },
  { icon: CreditCard, label: "Renouvellement abonnement", pts: "+100 pts", color: "text-orange-500", bg: "bg-orange-50" },
];

function getNiveau(pts) {
  return [...LEVELS_PRO].reverse().find(l => l.pts <= pts) || LEVELS_PRO[0];
}
function getNextNiveau(pts) {
  return LEVELS_PRO.find(l => l.pts > pts) || LEVELS_PRO[LEVELS_PRO.length - 1];
}

export default function ProgrammeProCard({ user }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [redeeming, setRedeeming] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeCat, setActiveCat] = useState("Tout");

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    entities.PointsFidelitePro.filter({ pro_email: user.email })
      .then(results => {
        if (results.length > 0) {
          setRecord(results[0]);
        } else {
          const code = (user.full_name || "PRO").split(" ")[0].toUpperCase().replace(/[^A-Z]/g, "") + "PRO" + Math.floor(1000 + Math.random() * 9000);
          const payload = {
            pro_email: user.email,
            points_total: 0,
            points_depenses: 0,
            niveau: "Bronze",
            historique: [],
          };
          entities.PointsFidelitePro.create({ ...payload, code_parrainage: code })
            .then(r => setRecord(r))
            .catch(() => entities.PointsFidelitePro.create(payload).then(r => setRecord(r)));
        }
      })
      .catch(() => setLoading(false))
      .finally(() => {
        setLoading(false);
        reconcileProPoints(user.email).then(() => {
          entities.PointsFidelitePro.filter({ pro_email: user.email }, '-created_at', 1).then(results => {
            if (results.length > 0) setRecord(results[0]);
          });
        }).catch(() => {});
      });
  }, [user?.email]);

  const userPts = (record?.points_total || 0) - (record?.points_depenses || 0);
  const currentLevel = getNiveau(userPts);
  const nextLevel = getNextNiveau(userPts);
  const progress = currentLevel.pts === nextLevel.pts ? 100 : Math.min(((userPts - currentLevel.pts) / (nextLevel.pts - currentLevel.pts)) * 100, 100);
  const ptsToNext = Math.max(nextLevel.pts - userPts, 0);
  const historique = record?.historique || [];
  const refCode = record?.code_parrainage || "---";

  const cats = ["Tout", ...new Set(REWARDS_PRO.map(r => r.cat))];
  const filtered = activeCat === "Tout" ? REWARDS_PRO : REWARDS_PRO.filter(r => r.cat === activeCat);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleCopy = () => {
    navigator.clipboard.writeText(refCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRedeem = async (reward) => {
    if (!record || userPts < reward.pts) { showToast("Points insuffisants"); return; }
    setRedeeming(reward.id);
    const entry = { label: `Échange : ${reward.label}`, pts: -reward.pts, date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }), type: "debit" };
    const newHisto = [entry, ...historique];
    const newTotal = (record.points_depenses || 0) + reward.pts;
    await entities.PointsFidelitePro.update(record.id, { points_depenses: newTotal, historique: newHisto });
    setRecord(r => ({ ...r, points_depenses: newTotal, historique: newHisto }));
    setRedeeming(null);
    showToast(`${reward.label} échangé !`);
  };

  const LevelIcon = currentLevel.icon;

  if (loading) return <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-4 border-gray-200 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] bg-gray-900 text-white text-[13px] font-bold px-5 py-3 rounded-2xl shadow-xl max-w-[320px] text-center flex items-center gap-2">
          <Check className="w-4 h-4 text-green-400 shrink-0" />
          {toast}
        </div>
      )}

      {/* Badge PRO */}
      <div className="bg-gradient-to-r from-primary/10 to-orange-50 border border-primary/20 rounded-2xl px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-[13px] font-black text-primary">Programme Fidélité Professionnel</p>
          <p className="text-[11px] text-gray-500 font-medium">Exclusif aux salons & indépendants BeautyBook</p>
        </div>
      </div>

      {/* Card points */}
      <div className={`bg-gradient-to-br ${currentLevel.color} rounded-3xl p-5 shadow-lg`}>
        <p className="text-white/80 text-[11px] font-black uppercase tracking-widest mb-0.5">MON COMPTE PRO</p>
        <div className="flex items-end justify-between">
          <p className="text-white text-[44px] font-black leading-none">
            {userPts.toLocaleString()} <span className="text-[22px]">pts</span>
          </p>
          <div className="bg-white/20 border border-white/30 rounded-2xl px-4 py-2.5 flex items-center gap-2">
            <LevelIcon className="w-6 h-6 text-white" />
            <p className="text-white text-[12px] font-black">{currentLevel.name}</p>
          </div>
        </div>
        {currentLevel.name !== "Elite" && (
          <>
            <p className="text-white/70 text-[11px] font-medium mt-3">Vers {nextLevel.name}</p>
            <div className="mt-1.5 h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-white/60 text-[11px] font-medium mt-1 text-right">encore {ptsToNext.toLocaleString()} pts</p>
          </>
        )}
        {currentLevel.name === "Elite" && (
          <div className="flex items-center gap-2 mt-3">
            <Sparkles className="w-4 h-4 text-white/80" />
            <p className="text-white/80 text-[13px] font-bold">Niveau Elite — Vous êtes au sommet !</p>
          </div>
        )}
      </div>

      {/* Avantages du niveau */}
      <div className="bg-white rounded-3xl p-5 shadow-sm">
        <p className="text-[12px] font-black text-gray-500 uppercase tracking-widest mb-3">Vos avantages {currentLevel.name}</p>
        <div className="space-y-2">
          {currentLevel.perks.map((perk, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-5 h-5 bg-green-50 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              </div>
              <span className="text-[13px] font-medium text-gray-700">{perk}</span>
            </div>
          ))}
        </div>
        {currentLevel.name !== "Elite" && (
          <div className="mt-4 p-3 bg-gray-50 rounded-2xl">
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Débloquer {nextLevel.name}</p>
            {nextLevel.perks.map((perk, i) => (
              <div key={i} className="flex items-center gap-2 opacity-50">
                <div className="w-3 h-3 rounded-full border-2 border-gray-300 shrink-0" />
                <span className="text-[12px] text-gray-400">{perk}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Niveaux progression */}
      <div className="bg-white rounded-3xl p-5 shadow-sm">
        <p className="text-[12px] font-black text-gray-500 uppercase tracking-widest mb-4">Progression</p>
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 right-0 top-6 h-1 bg-gray-100 mx-6 z-0" />
          {LEVELS_PRO.map((lv) => {
            const LvIcon = lv.icon;
            const active = lv.name === currentLevel.name;
            const done = lv.pts < userPts;
            return (
              <div key={lv.name} className="flex flex-col items-center gap-1.5 z-10 flex-1">
                <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center transition-all ${active ? "border-primary bg-orange-50 scale-110 shadow-md shadow-primary/20" : done ? "border-primary bg-white" : "border-gray-200 bg-white"}`}>
                  <LvIcon className={`w-5 h-5 ${active ? "text-primary" : done ? "text-primary" : "text-gray-300"}`} />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-wider ${active ? "text-primary" : "text-gray-400"}`}>{lv.name}</span>
                <span className="text-[8px] text-gray-300 font-medium">{lv.pts === 0 ? "Gratuit" : `${lv.pts.toLocaleString()}`}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Récompenses */}
      <div>
        <p className="text-[13px] font-black text-gray-900 uppercase tracking-widest mb-3 px-1">Récompenses Pro</p>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-3 -mx-4 px-4">
          {cats.map(cat => (
            <button key={cat} onClick={() => setActiveCat(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-black border transition-all active:scale-95 ${activeCat === cat ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200"}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {filtered.map(r => {
            const canAfford = userPts >= r.pts;
            const RIcon = r.icon;
            const isLoadingItem = redeeming === r.id;
            return (
              <div key={r.id} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className={`w-12 h-12 ${r.bg} rounded-2xl flex items-center justify-center shrink-0`}>
                  <RIcon className={`w-5 h-5 ${r.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-black text-gray-900 truncate">{r.label}</p>
                  <p className="text-[11px] text-gray-400 font-medium leading-tight mt-0.5">{r.desc}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Zap className={`w-3 h-3 ${canAfford ? "text-primary" : "text-gray-300"}`} />
                    <p className={`text-[12px] font-black ${canAfford ? "text-primary" : "text-gray-300"}`}>{r.pts.toLocaleString()} pts</p>
                  </div>
                </div>
                <button onClick={() => handleRedeem(r)} disabled={!canAfford || !!redeeming}
                  className={`text-[11px] font-black px-4 py-2.5 rounded-xl active:scale-95 transition-all shrink-0 flex items-center gap-1.5 ${canAfford ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-gray-100 text-gray-300"}`}>
                  {isLoadingItem ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : canAfford ? (
                    <>
                      <Gift className="w-3.5 h-3.5" />
                      Échanger
                    </>
                  ) : "Bientôt"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historique */}
      {historique.length > 0 && (
        <div>
          <p className="text-[13px] font-black text-gray-900 uppercase tracking-widest mb-3 px-1">Historique</p>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-50">
            {historique.slice(0, 8).map((h, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${h.pts > 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                    {h.pts > 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <Gift className="w-4 h-4 text-red-400" />}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-gray-900">{h.label}</p>
                    <p className="text-[11px] text-gray-400 font-medium">{h.date}</p>
                  </div>
                </div>
                <span className={`text-[14px] font-black ${h.pts > 0 ? "text-emerald-500" : "text-red-400"}`}>
                  {h.pts > 0 ? "+" : ""}{h.pts} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comment gagner */}
      <div className="bg-white rounded-3xl p-5 shadow-sm">
        <p className="text-[12px] font-black text-gray-500 uppercase tracking-widest mb-4">Comment gagner des points ?</p>
        <div className="space-y-3">
          {HOW_TO_EARN.map((g, i) => {
            const GIcon = g.icon;
            return (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 ${g.bg} rounded-xl flex items-center justify-center`}>
                    <GIcon className={`w-4 h-4 ${g.color}`} />
                  </div>
                  <span className="text-[13px] font-medium text-gray-700">{g.label}</span>
                </div>
                <span className="text-[13px] font-black text-emerald-500">{g.pts}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Parrainage Pro */}
      <div className="bg-[#1e2535] rounded-3xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-white text-[15px] font-black">Parrainez un professionnel</p>
            <p className="text-white/60 text-[11px] font-medium">+500 pts pour vous · +200 pts pour lui</p>
          </div>
        </div>
        <div className="bg-white/10 border border-white/20 rounded-2xl flex items-center justify-between px-4 py-3">
          <span className="text-white text-[15px] font-black tracking-widest">{refCode}</span>
          <button onClick={handleCopy} className="flex items-center gap-1.5 text-primary text-[12px] font-black uppercase tracking-widest active:scale-95 transition-all">
            {copied ? <><Check className="w-4 h-4" /> Copié !</> : <><Copy className="w-3.5 h-3.5" /> Copier</>}
          </button>
        </div>
      </div>
    </div>
  );
}
