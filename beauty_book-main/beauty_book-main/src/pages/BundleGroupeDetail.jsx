import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Star, Heart, Users, Gift, Shield, ChevronDown, Plus, MessageSquare } from "lucide-react";
import { entities } from "@/api/entities";

export default function BundleGroupeDetail() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { id } = useParams();
  const [bundle, setBundle] = useState(state?.bundle || null);
  const [services, setServices] = useState([]);
  const [proProfile, setProProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [persons, setPersons] = useState(2);
  const [reviews, setReviews] = useState([]);
  const [similarBundles, setSimilarBundles] = useState([]);

  useEffect(() => {
    if (bundle) { loadDetails(bundle); setPersons(bundle.min_persons || 2); }
    else if (id) {
      entities.ServiceBundle.filter({ id }, "-created_at", 1).then(rows => {
        if (rows[0]) { setBundle(rows[0]); loadDetails(rows[0]); setPersons(rows[0].min_persons || 2); }
        else setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [id]);

  const loadDetails = async (b) => {
    setLoading(true);
    try {
      const [svcs, profils, avisData, allBundles] = await Promise.all([
        b.service_ids?.length ? entities.Service.filter({}, "-created_at", 500).catch(() => []) : Promise.resolve([]),
        entities.ProfilPro.filter({ user_email: b.pro_email }, "-created_at", 1).catch(() => []),
        entities.Avis.filter({ pro_email: b.pro_email }, "-created_at", 20).catch(() => []),
        entities.ServiceBundle.filter({ is_active: true, pro_email: b.pro_email }, "-created_at", 10).catch(() => []),
      ]);
      setServices((svcs || []).filter(s => b.service_ids?.includes(s.id)));
      setProProfile(profils[0] || null);
      setReviews((avisData || []).slice(0, 5));
      setSimilarBundles((allBundles || []).filter(x => x.id !== b.id).slice(0, 4));
    } catch {}
    setLoading(false);
  };

  const goToService = (svc) => {
    navigate(`/service/${svc.id}`, { state: { id: svc.id } });
  };

  if (loading || !bundle) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const maxP = bundle.max_persons || 6;
  const minP = bundle.min_persons || 2;
  const personOptions = Array.from({ length: maxP - minP + 1 }, (_, i) => minP + i);

  const totalDuration = services.reduce((sum, s) => sum + (parseInt(s.duration_min) || 60), 0);
  const durH = Math.floor(totalDuration / 60);
  const durM = totalDuration % 60;
  const durStr = durH > 0 ? `${durH}h${durM > 0 ? String(durM).padStart(2, '0') : ''}` : `${durM}min`;
  const regularTotal = services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
  const pricePerPerson = bundle.bundle_price_per_person || bundle.bundle_price || 0;
  const totalPrice = pricePerPerson * persons;
  const totalRegular = regularTotal * persons;
  const savings = totalRegular - totalPrice;
  const savingsPercent = totalRegular > 0 ? Math.round((savings / totalRegular) * 100) : 0;

  return (
    <div className="min-h-screen bg-white font-display">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-gray-100 px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <h1 className="text-[16px] font-black text-gray-900 truncate">Bundle <span className="text-primary">Groupe</span></h1>
          <p className="text-[11px] text-gray-400">Plusieurs personnes, plus d'eclat ✨</p>
        </div>
        <button className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95">
          <Heart className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="pb-32">
        {/* Hero section — image right, text left */}
        <div className="relative bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 overflow-hidden" style={{ minHeight: '340px' }}>
          {bundle.image_url && (
            <img src={bundle.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-transparent" />
          <div className="relative p-5 pb-6">
            <span className="inline-block bg-rose-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-3">🎉 Parfait pour sortie & événements</span>
            <h2 className="text-[28px] font-black text-gray-900 leading-tight mb-1">{bundle.name}</h2>
            {bundle.description && <p className="text-[14px] text-gray-600 mb-4 max-w-[240px]">{bundle.description}</p>}
            {/* Stats row */}
            <div className="flex items-center gap-4 mt-4">
              <div className="text-center">
                <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-[9px] text-gray-400 font-medium">À partir de</p>
                <p className="text-[13px] font-black text-gray-900">{minP} à {maxP}</p>
                <p className="text-[9px] text-gray-400">personnes</p>
              </div>
              <div className="text-center">
                <Gift className="w-5 h-5 text-rose-400 mx-auto mb-1" />
                <p className="text-[9px] text-gray-400 font-medium">Économisez</p>
                <p className="text-[13px] font-black text-rose-500">jusqu'à {savingsPercent}%</p>
              </div>
              <div className="text-center">
                <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-[9px] text-gray-400 font-medium">Durée totale</p>
                <p className="text-[13px] font-black text-gray-900">{durStr}</p>
              </div>
              <div className="text-center">
                <Star className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <p className="text-[9px] text-gray-400 font-medium">Note des clients</p>
                <p className="text-[13px] font-black text-gray-900">{proProfile?.rating || 4.9}/5</p>
              </div>
            </div>
          </div>
          {/* Price badge floating */}
          <div className="absolute top-5 right-5 bg-white/95 backdrop-blur rounded-2xl px-4 py-3 text-center shadow-lg border border-gray-100">
            <p className="text-[10px] font-black text-gray-500 uppercase">À partir de</p>
            <p className="text-[24px] font-black text-primary">{bundle.bundle_price}€</p>
            <p className="text-[10px] text-gray-400">pour {minP} pers.</p>
            {regularTotal > 0 && <p className="text-[9px] text-gray-400 line-through">au lieu de {regularTotal}€</p>}
          </div>
        </div>

        {/* Person selector */}
        <div className="px-4 mt-5">
          <h3 className="text-[16px] font-black text-gray-900 mb-3">Pour qui réservez-vous ce bundle ?</h3>
          <div className="flex gap-2">
            {personOptions.map(n => (
              <button key={n} onClick={() => setPersons(n)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all active:scale-95 ${persons === n ? "border-primary bg-primary/5 shadow-md shadow-primary/10" : "border-gray-200 bg-white"}`}>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: Math.min(n, 3) }).map((_, i) => (
                    <div key={i} className={`w-4 h-4 rounded-full ${persons === n ? "bg-primary" : "bg-gray-300"}`} />
                  ))}
                  {n > 3 && <span className={`text-[10px] font-black ${persons === n ? "text-primary" : "text-gray-400"}`}>+{n - 3}</span>}
                </div>
                <span className={`text-[12px] font-black ${persons === n ? "text-primary" : "text-gray-500"}`}>{n}</span>
                <span className={`text-[9px] ${persons === n ? "text-primary/70" : "text-gray-400"}`}>personnes</span>
              </button>
            ))}
          </div>
          <p className="text-center text-[12px] text-primary font-medium mt-3">🎁 Plus vous êtes, plus vous économisez !</p>
        </div>

        {/* Services inclus (par personne) */}
        <div className="px-4 mt-5">
          <h3 className="text-[16px] font-black text-gray-900 mb-3">Ce que comprend le bundle <span className="text-gray-400 font-medium text-[13px]">(par personne)</span></h3>
          <div className="space-y-0">
            {services.map((s, i) => (
              <div key={s.id}>
                <button onClick={() => goToService(s)}
                  className="w-full flex items-start gap-3 py-4 text-left active:bg-gray-50 transition-colors">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                    {s.image_url ? <img src={s.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl bg-gradient-to-br from-pink-50 to-orange-50">💆</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-black text-gray-900">{s.title || s.name}</p>
                    {s.description && <p className="text-[12px] text-gray-400 line-clamp-2 mt-0.5">{s.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-gray-400 flex items-center gap-0.5"><Clock className="w-3 h-3" /> {s.duration_min || 60} min</span>
                    <ChevronDown className="w-4 h-4 text-gray-300" />
                  </div>
                </button>
                {i < services.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Plus className="w-3.5 h-3.5 text-primary" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bonus groupe */}
        {bundle.bonus && (
          <div className="mx-4 mt-3 bg-amber-50 border border-amber-100 rounded-2xl p-3 flex items-center gap-3">
            <Gift className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-[12px] font-black text-amber-700">🎁 Bonus groupe</p>
              <p className="text-[11px] text-amber-600">{bundle.bonus}</p>
            </div>
          </div>
        )}

        {/* Pricing summary */}
        <div className="mx-4 mt-4 bg-gray-50 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-400">Prix total pour {persons} personnes</p>
              <p className="text-[14px] text-gray-400 line-through">{totalRegular}€</p>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 text-center">
              <p className="text-[9px] font-black text-rose-500">ÉCONOMIE</p>
              <p className="text-[14px] font-black text-rose-500">{savings}€ ({savingsPercent}%)</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-primary font-black uppercase">Durée totale estimée</p>
              <p className="text-[13px] font-black text-gray-900">{durStr}</p>
              <p className="text-[9px] text-gray-400">Pour tout le groupe</p>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-400">Soit</p>
              <p className="text-[16px] font-black text-primary">{Math.round(totalPrice / persons)}€ par personne</p>
            </div>
            <p className="text-[28px] font-black text-primary">{totalPrice}€</p>
          </div>
        </div>

        {/* Avis clients */}
        <div className="mx-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[17px] font-black text-gray-900">Avis clients</h3>
            {reviews.length > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-[14px] font-black text-gray-900">{(reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)}</span>
                <span className="text-[12px] text-gray-400">({reviews.length})</span>
              </div>
            )}
          </div>
          {reviews.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-6 text-center">
              <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-[13px] text-gray-400 font-medium">Aucun avis pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden shrink-0">
                      {r.user_avatar ? <img src={r.user_avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs">👤</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-black text-gray-900">{r.user_name || "Client"}</p>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < (r.rating || 0) ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                        ))}
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-300 shrink-0">{r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ""}</span>
                  </div>
                  {r.comment && <p className="text-[13px] text-gray-500 leading-relaxed">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bundles similaires */}
        {similarBundles.length > 0 && (
          <div className="mx-4 mt-6">
            <h3 className="text-[17px] font-black text-gray-900 mb-3">Bundles similaires</h3>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {similarBundles.map((sb) => (
                <button key={sb.id} onClick={() => navigate(`/bundle-groupe/${sb.id}`, { state: { bundle: sb } })}
                  className="shrink-0 w-44 bg-gray-50 rounded-2xl overflow-hidden active:scale-[0.97] transition-all text-left">
                  <div className="h-24 bg-gradient-to-br from-pink-50 to-orange-50 relative overflow-hidden">
                    {sb.image_url ? <img src={sb.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>}
                    {sb.discount_percent > 0 && <span className="absolute top-2 right-2 bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">-{sb.discount_percent}%</span>}
                  </div>
                  <div className="p-3">
                    <p className="text-[13px] font-black text-gray-900 truncate">{sb.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-gray-400">À partir de</span>
                      <span className="text-[16px] font-black text-primary">{sb.bundle_price}€</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-3 z-20" style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        <button onClick={() => navigate(`/reservation?pro=${bundle.pro_email}&bundle=${bundle.id}`, { state: { services: services.map(s => ({ ...s, persons })), bundle, persons } })}
          className="w-full py-4 rounded-2xl font-black text-[15px] uppercase tracking-widest text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #E8732A, #E84466)", boxShadow: "0 8px 30px rgba(232,115,42,0.35)" }}>
          Choisir la date & réserver le bundle →
        </button>
        <p className="text-center text-[11px] text-gray-400 mt-1.5 flex items-center justify-center gap-1">
          <Shield className="w-3 h-3" /> Paiement 100% sécurisé
        </p>
      </div>
    </div>
  );
}