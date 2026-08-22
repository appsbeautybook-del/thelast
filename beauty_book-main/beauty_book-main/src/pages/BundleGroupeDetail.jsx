import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Star, Heart, Shield, Gift, ChevronRight, Users, TrendingDown, Calendar, User } from "lucide-react";
import { entities } from "@/api/entities";

export default function BundleGroupeDetail() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { id } = useParams();
  const [bundle, setBundle] = useState(state?.bundle || null);
  const [services, setServices] = useState([]);
  const [proProfile, setProProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSvc, setExpandedSvc] = useState(null);
  const [nbPers, setNbPers] = useState(2);

  useEffect(() => {
    if (bundle) {
      loadDetails(bundle);
    } else if (id) {
      entities.ServiceBundle.filter({ id }, "-created_at", 1).then(rows => {
        if (rows[0]) { setBundle(rows[0]); loadDetails(rows[0]); }
        else setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [id]);

  const loadDetails = async (b) => {
    setLoading(true);
    try {
      const [svcs, profils] = await Promise.all([
        b.service_ids?.length ? entities.Service.filter({}, "-created_at", 500).catch(() => []) : Promise.resolve([]),
        entities.ProfilPro.filter({ user_email: b.pro_email }, "-created_at", 1).catch(() => []),
      ]);
      setServices((svcs || []).filter(s => b.service_ids?.includes(s.id)));
      setProProfile(profils[0] || null);
    } catch {}
    setLoading(false);
  };

  if (loading || !bundle) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-[#E8732A] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const basePers = bundle.min_persons || 2;
  const maxPers = bundle.max_persons || 6;
  const basePrice = bundle.bundle_price || 0;
  const persMultiplier = Math.max(1, nbPers / basePers);
  const displayPrice = Math.round(basePrice * persMultiplier);
  const regularTotal = services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0) * nbPers;
  const savings = regularTotal - displayPrice;
  const savingsPercent = regularTotal > 0 ? Math.round((savings / regularTotal) * 100) : 0;

  const totalDuration = services.reduce((sum, s) => sum + (parseInt(s.duration_min) || 60), 0);
  const durH = Math.floor(totalDuration / 60);
  const durM = totalDuration % 60;
  const durStr = durH > 0 ? `${durH}h${durM > 0 ? String(durM).padStart(2, '0') : ''}` : `${durM}min`;

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-display">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-[17px] font-black text-gray-900">Bundle <span className="text-[#E8732A]">Groupe</span></h1>
          <p className="text-[11px] text-gray-400 font-medium">Plusieurs personnes, plus d'éclat ✨</p>
        </div>
        <button className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95">
          <Heart className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="pb-40">
        {/* Hero section */}
        <div className="relative h-[320px] overflow-hidden">
          {bundle.image_url ? (
            <img src={bundle.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Badge */}
          <div className="absolute top-4 left-4 z-10">
            <span className="bg-white/95 backdrop-blur text-[10px] font-black text-[#E8732A] px-3 py-1.5 rounded-full uppercase tracking-wider">
              🎉 PARFAIT POUR SORTIE & ÉVÉNEMENTS
            </span>
          </div>

          {/* Name & description */}
          <div className="absolute bottom-6 left-5 right-5 z-10">
            <h2 className="text-[28px] font-black text-white leading-tight">{bundle.name} ✨</h2>
            {bundle.description && <p className="text-[13px] text-white/85 mt-1 leading-relaxed">{bundle.description}</p>}
          </div>
        </div>

        {/* Stats row */}
        <div className="mx-4 -mt-5 bg-white rounded-2xl shadow-md border border-gray-100 p-3 flex items-center justify-around relative z-10">
          <div className="text-center">
            <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-1">
              <Users className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-[9px] text-gray-400 font-medium">{basePers} à {maxPers}</p>
            <p className="text-[10px] font-bold text-gray-700">personnes</p>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div className="text-center">
            <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-1">
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-[9px] text-gray-400 font-medium">Économisez</p>
            <p className="text-[10px] font-bold text-[#E8732A]">jusqu'à {savingsPercent}%</p>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-1">
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-[9px] text-gray-400 font-medium">Durée totale</p>
            <p className="text-[10px] font-bold text-gray-700">{durStr}</p>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div className="text-center">
            <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            <p className="text-[9px] text-gray-400 font-medium">Note</p>
            <p className="text-[10px] font-bold text-gray-700">{proProfile?.rating || 4.9}/5</p>
          </div>
        </div>

        {/* Price card floating */}
        <div className="mx-4 mt-3 bg-gradient-to-r from-[#E8732A] to-[#E84466] rounded-2xl p-4 text-white flex items-center justify-between">
          <div>
            <p className="text-[12px] font-bold opacity-90">À partir de</p>
            <p className="text-[32px] font-black leading-tight">{displayPrice}€</p>
            <p className="text-[12px] opacity-80">pour {nbPers} pers.</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] opacity-70">au lieu de</p>
            <p className="text-[16px] font-bold line-through opacity-60">{regularTotal}€</p>
          </div>
        </div>

        {/* Person selector */}
        <div className="px-4 mt-5">
          <p className="text-[15px] font-black text-gray-900 mb-3">Pour qui réservez-vous ce bundle ?</p>
          <div className="flex items-center gap-2">
            {Array.from({ length: maxPers - basePers + 1 }).map((_, i) => {
              const pers = basePers + i;
              const isSelected = nbPers === pers;
              return (
                <button key={pers} onClick={() => setNbPers(pers)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all active:scale-95 ${isSelected ? "border-[#E8732A] bg-orange-50" : "border-gray-100 bg-white"}`}>
                  <div className="flex">
                    {Array.from({ length: Math.min(pers, 3) }).map((_, j) => (
                      <User key={j} className={`w-4 h-4 ${isSelected ? "text-[#E8732A]" : "text-gray-400"}`} />
                    ))}
                  </div>
                  <span className={`text-[14px] font-black ${isSelected ? "text-[#E8732A]" : "text-gray-900"}`}>{pers}</span>
                  <span className="text-[9px] text-gray-400 font-medium">personnes</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Savings banner */}
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-3 flex items-center gap-2">
          <span className="text-lg">🎉</span>
          <p className="text-[12px] font-black text-amber-700">Plus vous êtes, plus vous économisez !</p>
        </div>

        {/* Services included (per person) */}
        <div className="px-4 mt-5">
          <h3 className="text-[16px] font-black text-gray-900 mb-3">Ce que comprend le bundle <span className="text-[13px] font-medium text-gray-400">(par personne)</span></h3>
          <div className="space-y-0">
            {services.map((s, i) => {
              const isExpanded = expandedSvc === s.id;
              const durMin = parseInt(s.duration_min) || 60;
              const durH2 = Math.floor(durMin / 60);
              const durM2 = durMin % 60;
              const durDisplay = durH2 > 0 ? `${durH2}h${durM2 > 0 ? String(durM2).padStart(2, '0') : ''}` : `${durM2} min`;
              return (
                <div key={s.id} className="border-b border-gray-50 last:border-0">
                  <button onClick={() => setExpandedSvc(isExpanded ? null : s.id)} className="w-full flex items-center gap-3 py-3 text-left">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      {s.image_url ? (
                        <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl bg-gradient-to-br from-pink-50 to-orange-50">💆</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-black text-gray-900">{s.title || s.name}</p>
                      {s.description && <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{s.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-gray-400 flex items-center gap-0.5"><Clock className="w-3 h-3" /> {durDisplay}</span>
                      <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  </button>
                  {isExpanded && s.description && (
                    <div className="pb-3 pl-15">
                      <p className="text-[12px] text-gray-500 leading-relaxed">{s.description}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bonus groupe */}
        {bundle.bonus && (
          <div className="mx-4 mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[13px] font-black text-amber-700">Bonus groupe</p>
              <p className="text-[12px] text-amber-600 mt-0.5">{bundle.bonus} 🎁</p>
            </div>
          </div>
        )}

        {/* Bottom pricing summary */}
        <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[11px] text-gray-400 font-medium">Prix total pour {nbPers} personnes</p>
              <p className="text-[18px] font-black text-gray-900">{regularTotal}€ <span className="text-[12px] font-medium text-gray-400 line-through">au lieu de {regularTotal}€</span></p>
              <p className="text-[11px] text-gray-400">Soit {Math.round(displayPrice / nbPers)}€ par personne</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Économie</p>
              <p className="text-[18px] font-black text-[#E8732A]">{savings}€</p>
              <p className="text-[11px] text-[#E8732A] font-bold">({savingsPercent}%)</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-2 border-t border-gray-50">
            <Clock className="w-3 h-3 text-gray-400" />
            <p className="text-[11px] text-gray-400">Durée totale estimée <span className="font-bold text-gray-600">{durStr}</span></p>
            <span className="text-[10px] text-gray-400 ml-auto">Pour tout le groupe</span>
          </div>
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-3 z-[120]" style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        <button onClick={() => navigate(`/reservation?pro=${bundle.pro_email}&bundle=${bundle.id}`, { state: { services: services.map(s => ({ ...s, persons: nbPers })), bundle, nbPers } })}
          className="w-full py-4 rounded-2xl font-black text-[15px] uppercase tracking-widest text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #E8732A, #E84466)", boxShadow: "0 8px 30px rgba(232,115,42,0.35)" }}>
          Choisir la date & réserver le bundle <ChevronRight className="w-5 h-5" />
        </button>
        <p className="text-center text-[10px] text-gray-400 mt-1.5 flex items-center justify-center gap-1">
          <Shield className="w-3 h-3" /> Paiement 100% sécurisé
        </p>
      </div>
    </div>
  );
}
