import { useState, useEffect } from "react";
import { ArrowLeft, Check, ChevronRight, MessageCircle, Minus, Plus, Clock, Users, Zap } from "lucide-react";
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';

export default function StepServices({ selected, onSelect, onNext, onBack, proEmail, bundle }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [proProfile, setProProfile] = useState(null);
  const [localSelected, setLocalSelected] = useState(selected.length ? selected : []);

  const isPreselected = selected.length > 0;
  const isBundle = !!bundle;

  useEffect(() => {
    const query = proEmail
      ? entities.Service.filter({ pro_email: proEmail, status: "actif" }, "-created_at", 50)
      : entities.Service.filter({ status: "actif" }, "-created_at", 50);

    const proQuery = proEmail
      ? entities.ProfilPro.filter({ user_email: proEmail }, "-created_at", 1).catch(() => [])
      : Promise.resolve([]);

    Promise.all([query.catch(() => []), proQuery])
      .then(([svcs, profils]) => {
        setServices(svcs);
        if (profils[0]) setProProfile(profils[0]);
      })
      .finally(() => setLoading(false));
  }, [proEmail]);

  const getEntry = (svcId) => localSelected.find(s => s.id === svcId);

  const toggle = (svc) => {
    setLocalSelected(prev => {
      const exists = prev.find(s => s.id === svc.id);
      if (exists) return prev.filter(s => s.id !== svc.id);
      return [...prev, { ...svc, persons: 1 }];
    });
  };

  const updatePersons = (svcId, delta) => {
    setLocalSelected(prev =>
      prev.map(s => s.id === svcId
        ? { ...s, persons: Math.max(1, Math.min(10, (s.persons || 1) + delta)) }
        : s
      )
    );
  };

  const totalPrice = localSelected.reduce((sum, s) => sum + s.price * (s.persons || 1), 0);
  const totalPersons = localSelected.reduce((sum, s) => sum + (s.persons || 1), 0);

  const handleNext = () => {
    onSelect(localSelected);
    onNext();
  };

  // ── VUE BUNDLE : services pré-sélectionnés avec infos bundle ─────────────────
  if (isBundle && isPreselected) {
    const totalPrice = localSelected.reduce((sum, s) => sum + (s.bundle_price || s.price) * (s.persons || 1), 0);
    const bundlePrice = bundle.bundle_price || totalPrice;
    return (
      <div className="h-screen bg-white flex flex-col overflow-hidden font-display">
        <div className="px-5 pt-12 pb-4 flex items-center justify-between flex-shrink-0">
          <button onClick={onBack} className="w-9 h-9 flex items-center justify-center active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5 text-gray-900" />
          </button>
          <span className="text-[13px] font-black text-gray-900 uppercase tracking-widest">Réservation Bundle</span>
          <div className="w-9" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 space-y-4 min-h-0">
          {/* Bundle header card */}
          <div className="bg-gradient-to-br from-[#E8732A] to-[#F59E0B] rounded-3xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Bundle</span>
            </div>
            <h2 className="text-[20px] font-black leading-tight">{bundle.name}</h2>
            {bundle.description && <p className="text-[12px] text-white/80 mt-1">{bundle.description}</p>}
            <div className="flex items-center gap-3 mt-3">
              <span className="text-[28px] font-black">{bundlePrice}€</span>
              {bundle.discount_percent > 0 && (
                <span className="bg-white/20 text-white text-[11px] font-black px-2 py-0.5 rounded-full">-{bundle.discount_percent}%</span>
              )}
            </div>
            {bundle.bonus && (
              <div className="mt-3 bg-white/10 rounded-xl px-3 py-2">
                <p className="text-[11px] text-white/90">🎁 {bundle.bonus}</p>
              </div>
            )}
          </div>

          {/* Services inclus */}
          <div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Services inclus ({localSelected.length})</p>
            <div className="space-y-2">
              {localSelected.map(svc => {
                const entry = localSelected.find(s => s.id === svc.id);
                return (
                  <div key={svc.id} className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                    {svc.image_url && (
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                        <img src={svc.image_url} alt={svc.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-black text-gray-900">{svc.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-[11px] text-gray-400 font-medium">{svc.duration_min || 60} min</span>
                      </div>
                    </div>
                    <span className="text-[14px] font-black text-gray-900 shrink-0">{svc.price}€</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nombre de personnes */}
          <div className="space-y-3">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Nombre de personnes</p>
            <div className="flex items-center justify-between bg-orange-50 border-2 border-orange-100 rounded-3xl px-6 py-5">
              <button
                onClick={() => {
                  const minP = bundle.min_persons || 1;
                  setLocalSelected(prev => prev.map(s => ({ ...s, persons: Math.max(minP, (s.persons || 1) - 1) })));
                }}
                className="w-12 h-12 rounded-full bg-white border border-orange-200 flex items-center justify-center active:scale-95 transition-all shadow-sm"
              >
                <Minus className="w-5 h-5 text-primary" />
              </button>
              <div className="text-center">
                <span className="text-[52px] font-black text-gray-900 leading-none">{localSelected[0]?.persons || 1}</span>
                <p className="text-[12px] text-gray-400 font-medium mt-1">
                  {(localSelected[0]?.persons || 1) === 1 ? "personne" : "personnes"}
                </p>
              </div>
              <button
                onClick={() => {
                  const maxP = bundle.max_persons || 10;
                  setLocalSelected(prev => prev.map(s => ({ ...s, persons: Math.min(maxP, (s.persons || 1) + 1) })));
                }}
                className="w-12 h-12 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-all shadow-md shadow-primary/30"
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>
            {bundle.is_group && (
              <p className="text-center text-[11px] text-gray-400">
                De {bundle.min_persons || 2} à {bundle.max_persons || 6} personnes
              </p>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="px-5 pb-8 pt-4 border-t border-gray-100 bg-white flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total bundle</p>
              <span className="text-[18px] font-black text-primary">{bundlePrice}€</span>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Personnes</p>
              <span className="text-[16px] font-black text-gray-900">{localSelected[0]?.persons || 1}</span>
            </div>
          </div>
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-2xl font-black text-[15px] uppercase tracking-widest text-white flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-[#E8732A]/30"
            style={{ background: "#E8732A" }}
          >
            Continuer
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // ── VUE PRÉ-SÉLECTIONNÉE : juste le sélecteur de personnes ─────────────────
  if (isPreselected) {
    const svc = localSelected[0];
    const entry = localSelected[0];
    return (
      <div className="h-screen bg-white flex flex-col overflow-hidden font-display">
        {/* Header */}
        <div className="px-5 pt-12 pb-4 flex items-center justify-between flex-shrink-0">
          <button onClick={onBack} className="w-9 h-9 flex items-center justify-center active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5 text-gray-900" />
          </button>
          <span className="text-[13px] font-black text-gray-900 uppercase tracking-widest">Réservation</span>
          <div className="w-9" />
        </div>

        <div className="flex-1 flex flex-col px-5 justify-center gap-6">
          {/* Carte service sélectionné */}
          <div className="bg-gray-900 rounded-3xl p-5 flex items-center gap-4">
            {svc.image_url && (
              <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0">
                <img src={svc.image_url} alt={svc.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{svc.category}</p>
              <p className="text-[18px] font-black text-white leading-tight">{svc.title}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-gray-400 text-[12px] font-medium">
                  <Clock className="w-3 h-3" />{svc.duration_min} min
                </span>
                <span className="text-primary font-black text-[16px]">{svc.price}€</span>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            </div>
          </div>

          {/* Sélecteur personnes */}
          <div className="space-y-3">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Nombre de personnes</p>
            <div className="flex items-center justify-between bg-orange-50 border-2 border-orange-100 rounded-3xl px-6 py-5">
              <button
                onClick={() => updatePersons(svc.id, -1)}
                className="w-12 h-12 rounded-full bg-white border border-orange-200 flex items-center justify-center active:scale-95 transition-all shadow-sm"
              >
                <Minus className="w-5 h-5 text-primary" />
              </button>
              <div className="text-center">
                <span className="text-[52px] font-black text-gray-900 leading-none">{entry.persons}</span>
                <p className="text-[12px] text-gray-400 font-medium mt-1">
                  {entry.persons === 1 ? "personne" : "personnes"}
                </p>
              </div>
              <button
                onClick={() => updatePersons(svc.id, +1)}
                className="w-12 h-12 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-all shadow-md shadow-primary/30"
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>
            <p className="text-center text-[13px] text-gray-400 font-medium">
              Total : <span className="font-black text-gray-900">{svc.price * entry.persons}€</span>
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="px-5 pb-8 pt-4 border-t border-gray-100 bg-white flex-shrink-0">
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-2xl font-black text-[15px] uppercase tracking-widest text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
            style={{ background: "#E8732A" }}
          >
            Continuer
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // ── VUE NORMALE : liste complète des services ────────────────────────────────
  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden font-display">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between flex-shrink-0">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center active:scale-95 transition-all">
          <ArrowLeft className="w-5 h-5 text-gray-900" />
        </button>
        <div className="flex items-center gap-2">
          {proProfile?.avatar_url && (
            <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-primary shrink-0">
              <img src={proProfile.avatar_url} alt={proProfile.salon_name} className="w-full h-full object-cover" />
            </div>
          )}
          <span className="text-[13px] font-black text-gray-900 uppercase tracking-widest">
            {proProfile?.salon_name || "Réservation"}
          </span>
        </div>
        <div className="w-9" />
      </div>

      {/* Title */}
      <div className="px-5 pb-4 flex-shrink-0">
        <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-2">Étape 1 sur 3</p>
        <h1 className="text-[36px] font-black text-gray-900 leading-tight">Choix des<br />Services</h1>
        <p className="text-[13px] text-gray-400 font-medium mt-1">
          Sélectionnez vos services et indiquez le nombre de personnes.
        </p>
      </div>

      {/* Services list — scrollable */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3 min-h-0">
        {/* Conseil banner */}
        <div className="relative h-20 rounded-3xl overflow-hidden mb-2 cursor-pointer active:scale-[0.98] transition-all">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-gray-700" />
          <div className="absolute inset-0 p-4 flex flex-col justify-center">
            <p className="text-white text-[15px] font-black leading-tight">Besoin d'un conseil ?</p>
            <p className="text-gray-300 text-[11px] font-medium">Nos experts sont là pour vous guider.</p>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <span className="text-[40px]">✂️</span>
            <p className="text-[14px] font-black text-gray-500">Aucun service disponible</p>
          </div>
        ) : services.map(svc => {
          const entry = getEntry(svc.id);
          const isSelected = !!entry;
          return (
            <div
              key={svc.id}
              className="bg-white border-2 rounded-2xl overflow-hidden transition-all"
              style={{ borderColor: isSelected ? "#E8732A" : "#f0f0f0" }}
            >
              <button
                onClick={() => toggle(svc)}
                className="w-full flex items-center gap-4 px-4 py-4 active:scale-[0.99] transition-all text-left"
              >
                {svc.image_url && (
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
                    <img src={svc.image_url} alt={svc.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{svc.category}</p>
                  <p className="text-[15px] font-black text-gray-900 leading-tight">{svc.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-[11px] text-gray-400 font-medium">{svc.duration_min} min</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[18px] font-black text-gray-900">{svc.price}€</span>
                  <div
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{ borderColor: isSelected ? "#E8732A" : "#d1d5db", background: isSelected ? "#E8732A" : "transparent" }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>
                </div>
              </button>

              {isSelected && (
                <div className="flex items-center justify-between px-4 py-3 bg-orange-50 border-t border-orange-100">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-[12px] font-black text-gray-700">Nombre de personnes</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updatePersons(svc.id, -1)}
                      className="w-8 h-8 rounded-full bg-white border border-orange-200 flex items-center justify-center active:scale-95 transition-all shadow-sm"
                    >
                      <Minus className="w-3.5 h-3.5 text-primary" />
                    </button>
                    <span className="text-[16px] font-black text-gray-900 w-5 text-center">{entry.persons}</span>
                    <button
                      onClick={() => updatePersons(svc.id, +1)}
                      className="w-8 h-8 rounded-full bg-primary flex items-center justify-center active:scale-95 transition-all shadow-sm shadow-primary/30"
                    >
                      <Plus className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                  <span className="text-[13px] font-black text-primary">{svc.price * entry.persons}€</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="px-5 pb-8 pt-4 border-t border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Votre sélection</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[15px] font-black text-gray-900">
                {localSelected.length} service{localSelected.length > 1 ? "s" : ""}
              </span>
              {totalPersons > 0 && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                  <span className="text-[14px] font-black text-gray-600 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />{totalPersons} pers.
                  </span>
                </>
              )}
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[15px] font-black text-primary">{totalPrice}€</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleNext}
          disabled={localSelected.length === 0}
          className="w-full py-4 rounded-2xl font-black text-[15px] uppercase tracking-widest text-white flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
          style={{ background: "#E8732A" }}
        >
          Continuer
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}