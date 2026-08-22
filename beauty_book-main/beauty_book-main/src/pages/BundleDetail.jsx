import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Star, Heart, Shield, Gift, Calendar, Plus } from "lucide-react";
import { entities } from "@/api/entities";

export default function BundleDetail() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { id } = useParams();
  const [bundle, setBundle] = useState(state?.bundle || null);
  const [services, setServices] = useState([]);
  const [proProfile, setProProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const totalDuration = services.reduce((sum, s) => sum + (parseInt(s.duration_min) || 60), 0);
  const durH = Math.floor(totalDuration / 60);
  const durM = totalDuration % 60;
  const durStr = durH > 0 ? `${durH}h${durM > 0 ? String(durM).padStart(2, '0') : ''}` : `${durM}min`;
  const regularTotal = services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
  const savings = regularTotal - (bundle.bundle_price || 0);
  const savingsPercent = bundle.discount_percent || (regularTotal > 0 ? Math.round((savings / regularTotal) * 100) : 0);

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-display">
      {/* Hero section with image */}
      <div className="relative h-[420px] overflow-hidden">
        {bundle.image_url ? (
          <img src={bundle.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-3 z-10">
          <button onClick={() => navigate(-1)} className="w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center active:scale-95">
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>
          <button className="w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center active:scale-95">
            <Heart className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Badge */}
        <div className="absolute top-20 left-4 z-10">
          <span className="bg-white/95 backdrop-blur text-[10px] font-black text-[#E8732A] px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1">
            🔥 LE PLUS RÉSERVÉ
          </span>
        </div>

        {/* Name & description at bottom */}
        <div className="absolute bottom-6 left-5 right-5 z-10">
          <h2 className="text-[32px] font-black text-white leading-tight">
            {bundle.name} <span className="text-2xl">✨</span>
          </h2>
          {bundle.description && (
            <p className="text-[14px] text-white/85 mt-1 leading-relaxed">{bundle.description}</p>
          )}
        </div>
      </div>

      <div className="pb-32">
        {/* Stats row */}
        <div className="mx-4 -mt-6 bg-white rounded-2xl shadow-md border border-gray-100 p-4 flex items-center justify-around relative z-10">
          <div className="text-center">
            <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-1.5">
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-[11px] text-gray-400 font-medium">Durée totale</p>
            <p className="text-[16px] font-black text-gray-900">{durStr}</p>
          </div>
          <div className="w-px h-12 bg-gray-100" />
          <div className="text-center">
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-1.5">
              <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L9 9H2l6 4.5L5.5 21 12 16.5 18.5 21 16 13.5 22 9h-7z"/></svg>
            </div>
            <p className="text-[11px] text-gray-400 font-medium">Économisez</p>
            <p className="text-[16px] font-black text-[#E8732A]">{savingsPercent}%</p>
          </div>
          <div className="w-px h-12 bg-gray-100" />
          <div className="text-center">
            <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-1.5">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            <p className="text-[11px] text-gray-400 font-medium">Note des clientes</p>
            <p className="text-[16px] font-black text-gray-900">{proProfile?.rating || 4.9}/5</p>
          </div>
        </div>

        {/* Services included */}
        <div className="px-4 mt-6">
          <h3 className="text-[18px] font-black text-gray-900 mb-4">Ce que comprend ce bundle</h3>
          <div className="space-y-0">
            {services.map((s, i) => {
              const durMin = parseInt(s.duration_min) || 60;
              const durH2 = Math.floor(durMin / 60);
              const durM2 = durMin % 60;
              const durDisplay = durH2 > 0 ? `${durH2}h${durM2 > 0 ? String(durM2).padStart(2, '0') : ''}` : `${durM2} min`;
              return (
                <div key={s.id}>
                  <div className="flex items-center gap-3 py-4">
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
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[12px] text-gray-400 font-medium flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" /> {durDisplay}
                      </span>
                      <p className="text-[16px] font-black text-gray-900 mt-1">{s.price}€</p>
                    </div>
                  </div>
                  {i < services.length - 1 && (
                    <div className="flex justify-center -my-1 relative z-10">
                      <div className="w-7 h-7 bg-[#E8732A] rounded-full flex items-center justify-center shadow-sm">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pricing summary */}
        <div className="mx-4 mt-6 bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[12px] text-gray-400 font-medium">Prix total</p>
              <p className="text-[16px] text-gray-500 line-through">{regularTotal}€</p>
            </div>
            <div className="text-center">
              <p className="text-[12px] text-[#E8732A] font-bold">Prix bundle</p>
              <p className="text-[28px] font-black text-[#E8732A] leading-tight">{bundle.bundle_price}€</p>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 text-center">
              <p className="text-[11px] font-black text-rose-500">ÉCONOMISEZ</p>
              <p className="text-[14px] font-black text-rose-500">{savings}€ ({savingsPercent}%)</p>
            </div>
          </div>
          {bundle.bonus && (
            <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
              <span className="text-lg">🎁</span>
              <p className="text-[12px] text-gray-600 font-medium">
                <span className="font-black text-gray-800">Bonus inclus :</span> {bundle.bonus} 🎁
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-3 z-[120]" style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        <button onClick={() => navigate(`/reservation?pro=${bundle.pro_email}&bundle=${bundle.id}`, { state: { services: services.map(s => ({ ...s, persons: 1 })), bundle } })}
          className="w-full py-4 rounded-2xl font-black text-[15px] uppercase tracking-widest text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #E8732A, #E84466)", boxShadow: "0 8px 30px rgba(232,115,42,0.35)" }}>
          <Calendar className="w-5 h-5" /> Réserver ce bundle
        </button>
        <p className="text-center text-[10px] text-gray-400 mt-1.5 flex items-center justify-center gap-1">
          <Shield className="w-3 h-3" /> Paiement 100% sécurisé
        </p>
      </div>
    </div>
  );
}
