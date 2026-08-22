import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft, Heart, Timer, Percent, Star, MapPin,
  BadgeCheck, ChevronRight, Calendar, Shield,
  Sparkles, Package
} from "lucide-react";
import { entities } from "@/api/entities";

export default function BundleDetail() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { id } = useParams();
  const [bundle, setBundle] = useState(state?.bundle || null);
  const [services, setServices] = useState([]);
  const [proProfile, setProProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [similarBundles, setSimilarBundles] = useState([]);
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
        b.service_ids?.length
          ? entities.Service.filter({}, "-created_at", 500).catch(() => [])
          : Promise.resolve([]),
        entities.ProfilPro.filter({ user_email: b.pro_email }, "-created_at", 1).catch(() => []),
      ]);
      const matched = (svcs || []).filter(s => b.service_ids?.includes(s.id));
      setServices(matched);
      setProProfile(profils[0] || null);

      if (profils[0]?.user_email) {
        entities.Avis.filter({ cible_email: profils[0].user_email, type: "client_to_pro" }, "-created_at", 20)
          .then(setReviews).catch(() => {});
      }

      entities.ServiceBundle.filter({ pro_email: b.pro_email }, "-created_at", 10)
        .then(rows => setSimilarBundles((rows || []).filter(rb => rb.id !== b.id).slice(0, 4)))
        .catch(() => {});
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
  const durStr = durH > 0 ? durH + "h" + (durM > 0 ? String(durM).padStart(2, "0") : "") : durM + "min";
  const regularTotal = services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
  const savings = regularTotal - (bundle.bundle_price || 0);
  const savingsPercent = bundle.discount_percent || (regularTotal > 0 ? Math.round((savings / regularTotal) * 100) : 0);
  const avgRating = proProfile?.rating || (reviews.length > 0 ? (reviews.reduce((s, r) => s + (r.note || 5), 0) / reviews.length).toFixed(1) : "4.9");

  const fmtDur = (s) => {
    const m = parseInt(s.duration_min) || 60;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return h > 0 ? h + "h" + (rm > 0 ? String(rm).padStart(2, "0") : "") : rm + " min";
  };

  const goBundle = (b) => {
    if (b.is_group) navigate("/bundle-groupe/" + b.id, { state: { bundle: b } });
    else navigate("/bundle/" + b.id, { state: { bundle: b } });
  };

  return (
    <div className="min-h-screen bg-[#FFF5F0] font-display">
      <div className="relative h-[320px] overflow-hidden rounded-b-[32px]">
        {bundle.image_url ? (
          <img src={bundle.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400" />
        )}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-3 z-10">
          <button onClick={() => navigate(-1)} className="w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center active:scale-95">
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>
          <button className="w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center active:scale-95">
            <Heart className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="absolute bottom-5 left-5 right-5 z-10">
          <h1 className="text-[28px] font-black text-white leading-tight">
            beauty book <span className="text-[#E8732A]">{"\u2728"}</span>
          </h1>
          <p className="text-[13px] text-white/80 mt-1">bundle</p>
        </div>
      </div>

      <div className="pb-32">
        <div className="mx-4 -mt-8 bg-white rounded-[24px] shadow-lg border border-gray-50 p-5 flex items-center justify-around relative z-10">
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-2">
              <Timer className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-[11px] text-gray-400 font-medium">Dur\u00e9e totale</p>
            <p className="text-[17px] font-black text-gray-900 mt-0.5">{durStr}</p>
          </div>
          <div className="w-px h-14 bg-gray-100" />
          <div className="text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-2">
              <Percent className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-[11px] text-gray-400 font-medium">\u00c9conomisez</p>
            <p className="text-[17px] font-black text-[#E8732A] mt-0.5">{savingsPercent}%</p>
          </div>
          <div className="w-px h-14 bg-gray-100" />
          <div className="text-center">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            <p className="text-[11px] text-gray-400 font-medium">Note</p>
            <p className="text-[17px] font-black text-gray-900 mt-0.5">{avgRating}/5</p>
          </div>
        </div>

        {proProfile && (
          <div className="mx-4 mt-6">
            <h3 className="text-[13px] text-gray-400 font-bold uppercase tracking-wider mb-3">Professionnel</h3>
            <button
              onClick={() => navigate("/pro/vue-client", { state: { email: proProfile.user_email } })}
              className="w-full bg-white rounded-[20px] border border-gray-100 p-4 flex items-center gap-3 active:scale-[0.98] transition-all"
            >
              <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-[#E8732A] to-[#E84466] shrink-0 flex items-center justify-center">
                {proProfile.photo_url ? (
                  <img src={proProfile.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xl font-black">{(proProfile.name || "P")[0]}</span>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[15px] font-black text-gray-900 truncate">{proProfile.name || proProfile.user_email}</p>
                  <BadgeCheck className="w-4 h-4 text-[#E8732A] shrink-0" />
                </div>
                {proProfile.adresse && (
                  <p className="text-[12px] text-gray-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 shrink-0" /> {proProfile.adresse}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-[12px] font-bold text-gray-700">{avgRating}</span>
                  </div>
                  <span className="text-[11px] text-gray-300">|</span>
                  <span className="text-[12px] text-gray-400">{reviews.length} avis</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
            </button>
          </div>
        )}

        <div className="px-4 mt-7">
          <h3 className="text-[20px] font-black text-gray-900 mb-4">Ce que comprend ce bundle</h3>
          <div className="space-y-0">
            {services.map((s, i) => (
              <div key={s.id}>
                <button
                  onClick={() => navigate("/service/" + s.id, { state: { service: s } })}
                  className="w-full flex items-center gap-4 py-4 active:scale-[0.98] transition-all text-left"
                >
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                    {s.image_url ? (
                      <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-orange-50">
                        <Sparkles className="w-6 h-6 text-[#E8732A]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-black text-gray-900">{s.title || s.name}</p>
                    {s.description && (
                      <p className="text-[12px] text-gray-400 line-clamp-2 mt-0.5 leading-relaxed">{s.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[12px] text-gray-400 font-medium flex items-center gap-1 justify-end">
                      <Timer className="w-3 h-3" /> {fmtDur(s)}
                    </span>
                    <p className="text-[18px] font-black text-gray-900 mt-1">{s.price} {"\u20AC"}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
                {i < services.length - 1 && (
                  <div className="flex justify-center -my-1 relative z-10">
                    <div className="w-7 h-7 bg-[#E8732A] rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white text-lg font-bold leading-none">+</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-4 mt-6 bg-white rounded-[24px] border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-gray-400 font-medium">Prix total</p>
              <p className="text-[16px] text-gray-500 line-through">{regularTotal} {"\u20AC"}</p>
            </div>
            <div className="text-center">
              <p className="text-[13px] text-[#E8732A] font-bold">Prix bundle</p>
              <p className="text-[32px] font-black text-[#E8732A] leading-tight">{bundle.bundle_price} {"\u20AC"}</p>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-2xl px-4 py-2 text-center">
              <p className="text-[11px] font-black text-rose-500 uppercase">\u00c9conomisez</p>
              <p className="text-[14px] font-black text-rose-500">{savings > 0 ? savings : Math.abs(savings)}{"\u20AC"} ({savingsPercent}%)</p>
            </div>
          </div>
          {bundle.bonus && (
            <div className="flex items-center gap-2 pt-3 mt-3 border-t border-gray-50">
              <div className="w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-[#E8732A]" />
              </div>
              <p className="text-[13px] text-gray-600 font-medium">
                <span className="font-black text-gray-800">Bonus inclus :</span> {bundle.bonus}
              </p>
            </div>
          )}
        </div>

        {reviews.length > 0 && (
          <div className="mx-4 mt-7">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] font-black text-gray-900">Avis des clientes</h3>
              <span className="text-[13px] text-gray-400 font-medium">{reviews.length} avis</span>
            </div>
            <div className="space-y-3">
              {reviews.slice(0, 5).map((r, i) => (
                <div key={r.id || i} className="bg-white rounded-[20px] border border-gray-100 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-100 to-orange-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-[#E8732A]">
                        {(r.auteur_name || r.auteur_email || "U")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-gray-900 truncate">{r.auteur_name || "Cliente"}</p>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, si) => (
                          <Star key={si} className={"w-3 h-3 " + (si < (r.note || 5) ? "text-amber-400 fill-amber-400" : "text-gray-200")} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {r.commentaire && (
                    <p className="text-[13px] text-gray-600 leading-relaxed">{r.commentaire}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {similarBundles.length > 0 && (
          <div className="mx-4 mt-7">
            <h3 className="text-[20px] font-black text-gray-900 mb-4">Bundles similaires</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
              {similarBundles.map((sb) => (
                <button
                  key={sb.id}
                  onClick={() => goBundle(sb)}
                  className="snap-start shrink-0 w-[200px] bg-white rounded-[20px] border border-gray-100 overflow-hidden active:scale-[0.97] transition-all text-left"
                >
                  <div className="h-[100px] overflow-hidden bg-gray-100">
                    {sb.image_url ? (
                      <img src={sb.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-100 to-orange-100 flex items-center justify-center">
                        <Package className="w-8 h-8 text-[#E8732A]/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[13px] font-black text-gray-900 truncate">{sb.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{sb.service_ids?.length || 0} services</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[16px] font-black text-[#E8732A]">{sb.bundle_price} {"\u20AC"}</p>
                      {sb.is_group && (
                        <span className="text-[9px] font-bold bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full uppercase">Groupe</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-[76px] left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-3 z-[100]" style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        <button onClick={() => navigate("/reservation?pro=" + bundle.pro_email + "&bundle=" + bundle.id, { state: { services: services.map(s => ({ ...s, persons: 1 })), bundle } })}
          className="w-full py-4 rounded-2xl font-black text-[16px] uppercase tracking-widest text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #E8732A, #E84466)", boxShadow: "0 8px 30px rgba(232,115,42,0.35)" }}>
          <Calendar className="w-5 h-5" /> R\u00c9SERVER CE BUNDLE
        </button>
        <p className="text-center text-[10px] text-gray-400 mt-1.5 flex items-center justify-center gap-1">
          <Shield className="w-3 h-3" /> Paiement 100% s\u00e9curis\u00e9
        </p>
      </div>
    </div>
  );
}
