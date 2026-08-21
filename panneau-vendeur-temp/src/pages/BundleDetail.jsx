import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Star, Heart, Share2, Check, Shield, Gift, Scissors, ChevronDown, ChevronUp } from "lucide-react";
import { entities } from "@/api/entities";
import { supabase } from "@/api/supabaseClient";

export default function BundleDetail() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { id } = useParams();
  const [bundle, setBundle] = useState(state?.bundle || null);
  const [services, setServices] = useState([]);
  const [proProfile, setProProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSvc, setExpandedSvc] = useState(null);

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
      const included = (svcs || []).filter(s => b.service_ids?.includes(s.id));
      setServices(included);
      setProProfile(profils[0] || null);
    } catch {}
    setLoading(false);
  };

  if (loading || !bundle) return (
    <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const totalDuration = services.reduce((sum, s) => sum + (parseInt(s.duration_min) || 60), 0);
  const durH = Math.floor(totalDuration / 60);
  const durM = totalDuration % 60;
  const durStr = `${durH}h${durM > 0 ? String(durM).padStart(2, '0') : ''}`;
  const regularTotal = services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
  const savings = regularTotal - (bundle.bundle_price || 0);
  const savingsPercent = bundle.discount_percent || (regularTotal > 0 ? Math.round((savings / regularTotal) * 100) : 0);

  return (
    <div className="font-display min-h-screen bg-[#f7f7f7]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-gray-100 px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
        <h1 className="text-[16px] font-black text-gray-900 flex-1 truncate">{bundle.name}</h1>
        <button className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95">
          <Heart className="w-4 h-4 text-gray-500" />
        </button>
        <button className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95">
          <Share2 className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="pb-32">
        {/* Hero banner */}
        <div className="relative h-56 bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 overflow-hidden">
          {bundle.image_url && <img src={bundle.image_url} alt="" className="w-full h-full object-cover opacity-60" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider">🔥 Le plus réservé</span>
            <h2 className="text-[26px] font-black text-white mt-2 leading-tight">{bundle.name}</h2>
            {bundle.description && <p className="text-[13px] text-white/80 mt-1">{bundle.description}</p>}
          </div>
        </div>

        {/* Stats row */}
        <div className="bg-white mx-4 -mt-4 rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-around relative z-10">
          <div className="text-center">
            <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-[10px] text-gray-400 font-medium">Durée totale</p>
            <p className="text-[15px] font-black text-gray-900">{durStr}</p>
          </div>
          <div className="w-px h-10 bg-gray-100" />
          <div className="text-center">
            <Gift className="w-5 h-5 text-rose-500 mx-auto mb-1" />
            <p className="text-[10px] text-gray-400 font-medium">Économisez</p>
            <p className="text-[15px] font-black text-rose-500">{savingsPercent}%</p>
          </div>
          <div className="w-px h-10 bg-gray-100" />
          <div className="text-center">
            <Star className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-[10px] text-gray-400 font-medium">Note clients</p>
            <p className="text-[15px] font-black text-gray-900">4.9/5</p>
          </div>
        </div>

        {/* Pro info */}
        {proProfile && (
          <div className="mx-4 mt-3 bg-white rounded-2xl border border-gray-100 p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 shrink-0">
              {proProfile.avatar_url ? <img src={proProfile.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">👤</div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black text-gray-900 truncate">{proProfile.salon_name || bundle.pro_email}</p>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-[11px] text-gray-500">{proProfile.rating || 4.9}</span>
                {proProfile.city && <span className="text-[10px] text-gray-400">· {proProfile.city}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Services inclus */}
        <div className="mx-4 mt-4">
          <h3 className="text-[15px] font-black text-gray-900 mb-3">Ce que comprend ce bundle</h3>
          <div className="space-y-2">
            {services.map((s, i) => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <button onClick={() => setExpandedSvc(expandedSvc === s.id ? null : s.id)}
                  className="w-full flex items-center gap-3 p-3 text-left">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {s.image_url ? <img src={s.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">💆</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-gray-900 truncate">{s.title || s.name}</p>
                    {s.description && <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{s.description}</p>}
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <span className="text-[10px] text-gray-400 flex items-center gap-0.5 justify-end"><Clock className="w-3 h-3" /> {s.duration_min || 60} min</span>
                      <p className="text-[14px] font-black text-gray-900">{s.price}€</p>
                    </div>
                    {expandedSvc === s.id ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                  </div>
                </button>
                {expandedSvc === s.id && s.description && (
                  <div className="px-4 pb-3 pt-0">
                    <p className="text-[12px] text-gray-500">{s.description}</p>
                  </div>
                )}
                {i < services.length - 1 && <div className="mx-3 border-t border-gray-50" />}
              </div>
            ))}
          </div>
        </div>

        {/* Bonus */}
        {bundle.bonus && (
          <div className="mx-4 mt-3 bg-amber-50 border border-amber-100 rounded-2xl p-3 flex items-center gap-3">
            <Gift className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-[12px] text-amber-700 font-medium">{bundle.bonus}</p>
          </div>
        )}

        {/* Prix */}
        <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-400 font-medium">Prix total</p>
              <p className="text-[14px] text-gray-400 line-through">{regularTotal}€</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-primary font-black uppercase">Prix bundle</p>
              <p className="text-[28px] font-black text-primary">{bundle.bundle_price}€</p>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 text-center">
              <p className="text-[10px] font-black text-rose-500">ÉCONOMISEZ</p>
              <p className="text-[13px] font-black text-rose-500">{savings}€ ({savingsPercent}%)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-3 z-20" style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        <button onClick={() => navigate(`/reservation?pro=${bundle.pro_email}&bundle=${bundle.id}`, { state: { services: services.map(s => ({ ...s, persons: 1 })), bundle } })}
          className="w-full py-4 rounded-2xl font-black text-[14px] uppercase tracking-widest text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #E8732A, #F59E0B)", boxShadow: "0 8px 30px rgba(232,115,42,0.35)" }}>
          📅 Réserver ce bundle
        </button>
        <p className="text-center text-[10px] text-gray-400 mt-1.5 flex items-center justify-center gap-1">
          <Shield className="w-3 h-3" /> Paiement 100% sécurisé
        </p>
      </div>
    </div>
  );
}
