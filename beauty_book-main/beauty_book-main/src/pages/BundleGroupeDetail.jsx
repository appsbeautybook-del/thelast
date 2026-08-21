import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Star, Heart, Shield, Gift, ChevronDown, ChevronRight, Users, Minus, Plus, TrendingDown } from "lucide-react";
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

  const basePers = bundle.persons_min || 2;
  const maxPers = bundle.persons_max || 6;
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
    <div className="min-h-screen bg-white font-display">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-[17px] font-black text-gray-900">Bundle <span className="text-[#E8732A]">Groupe</span></h1>
          <p className="text-[11px] text-gray-400 font-medium">Plusieurs personnes, plus d'éclat</p>
        </div>
        <button className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95">
          <Heart className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="pb-36">
        {/* Hero */}
        <div className="relative h-[340px] bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 overflow-hidden">
          {bundle.image_url && (
            <img src={bundle.image_url} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Badge */}
          <div className="absolute top-4 left-4">
            <span className="bg-[#E8732A] text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">✨ PARFAIT POUR SORTIE & ÉVÉNEMENTS</span>
          </div>

          {/* Price badge floating */}
          <div className="absolute top-1/2 right-4 -translate-y-1/2 bg-white/95 backdrop-blur rounded-2xl px-4 py-3 text-center shadow-lg">
            <p className="text-[10px] font-bold text-gray-500">À partir de</p>
            <p className="text-[28px] font-black text-[#E8732A] leading-tight">{displayPrice}€</p>
            <p className="text-[11px] text-gray-500 font-medium">pour {nbPers} pers.</p>
            {regularTotal > 0 && <p className="text-[11px] text-gray-400 line-through">{regularTotal}€</p>}
          </div>

          {/* Name & description */}
          <div className="absolute bottom-6 left-5 right-24">
            <h2 className="text-[28px] font-black text-white leading-tight">{bundle.name}</h2>
            {bundle.description && <p className="text-[13px] text-white/80 mt-1 leading-relaxed">{bundle.description}</p>}
          </div>
        </div>

        {/* Stats row */}
        <div className="mx-4 -mt-5 bg-white rounded-2xl shadow-md border border-gray-100 p-4 flex items-center justify-around relative z-10">
          <div className="text-center">
            <div className="w-8 h-8 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-1">
              <Users className="w-4 h-4 text-[#E8732A]" />
            </div>
            <p className="text-[10px] text-gray-400 font-medium">Personnes</p>
            <p className="text-[16px] font-black text-gray-900">{basePers} à {maxPers}</p>
          </div>
          <div className="w-px h-10 bg-gray-100" />
          <div className="text-center">
            <div className="w-8 h-8 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-1">
              <TrendingDown className="w-4 h-4 text-[#E8732A]" />
            </div>
            <p className="text-[10px] text-gray-400 font-medium">Économisez</p>
            <p className="text-[16px] font-black text-[#E8732A]">jusqu'à {savingsPercent}%</p>
          </div>
          <div className="w-px h-10 bg-gray-100" />
          <div className="text-center">
            <div className="w-8 h-8 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-1">
              <Clock className="w-4 h-4 text-[#E8732A]" />
            </div>
            <p className="text-[10px] text-gray-400 font-medium">Durée totale</p>
            <p className="text-[16px] font-black text-gray-900">4h à 6h</p>
          </div>
          <div className="w-px h-10 bg-gray-100" />
          <div className="text-center">
            <div className="w-8 h-8 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-1">
              <Star className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-[10px] text-gray-400 font-medium">Note</p>
            <p className="text-[16px] font-black text-gray-900">{proProfile?.rating || 4.9}/5</p>
          </div>
        </div>

        {/* Person selector */}
        <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[15px] font-black text-gray-900">Nombre de personnes</p>
              <p className="text-[11px] text-gray-400 mt-0.5">De {basePers} à {maxPers} personnes</p>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-2 py-1">
              <button onClick={() => setNbPers(Math.max(basePers, nbPers - 1))} disabled={nbPers <= basePers}
                className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center active:scale-95 disabled:opacity-30 disabled:active:scale-100">
                <Minus className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-[22px] font-black text-gray-900 w-8 text-center">{nbPers}</span>
              <button onClick={() => setNbPers(Math.min(maxPers, nbPers + 1))} disabled={nbPers >= maxPers}
                className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center active:scale-95 disabled:opacity-30 disabled:active:scale-100">
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Icons row */}
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: nbPers }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-orange-100 rounded-full flex items-center justify-center text-2xl">
                  {["💇", "💆", "💅", "🧖", "🪮", "✨"][i % 6]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Savings banner */}
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-[13px] font-black text-amber-700">Plus vous êtes, plus vous économisez !</p>
            <p className="text-[12px] text-amber-600 mt-0.5">Le prix par personne diminue avec le nombre de participants</p>
          </div>
        </div>

        {/* Services list */}
        <div className="px-4 mt-6">
          <h3 className="text-[18px] font-black text-gray-900 mb-4">Services inclus</h3>
          <div className="space-y-3">
            {services.map((s, i) => {
              const isExpanded = expandedSvc === s.id;
              const durMin = parseInt(s.duration_min) || 60;
              const durH2 = Math.floor(durMin / 60);
              const durM2 = durMin % 60;
              const durDisplay = durH2 > 0 ? `${durH2}h${durM2 > 0 ? String(durM2).padStart(2, '0') : ''}` : `${durM2} min`;
              return (
                <div key={s.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                      {s.image_url ? (
                        <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-pink-50 to-orange-50">💆</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-black text-gray-900">{s.title || s.name}</p>
                      {s.description && <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5 leading-relaxed">{s.description}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[12px] text-gray-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {durDisplay}
                        </span>
                        <span className="text-[12px] font-black text-[#E8732A]">{s.price}€ / pers.</span>
                      </div>
                    </div>
                    <button onClick={() => setExpandedSvc(isExpanded ? null : s.id)}
                      className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                      {s.description && <p className="text-[12px] text-gray-500 leading-relaxed">{s.description}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bonus */}
        {bundle.bonus && (
          <div className="mx-4 mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[13px] font-black text-amber-700">Bonus inclus dans ce bundle</p>
              <p className="text-[12px] text-amber-600 mt-0.5">{bundle.bonus}</p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-3 z-[120]" style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        {/* Price summary bar */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[11px] text-gray-400 font-medium">Prix pour {nbPers} pers.</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] text-gray-400 line-through">{regularTotal}€</span>
                <span className="text-[22px] font-black text-[#E8732A]">{displayPrice}€</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-400 font-medium">Vous économisez</p>
            <p className="text-[16px] font-black text-green-500">{savingsPercent}%</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-400 font-medium">Durée</p>
            <p className="text-[14px] font-black text-gray-900">{durStr}</p>
          </div>
        </div>
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
