import { useState, useEffect } from "react";
import { X, ChevronRight, Scissors, Search, Calendar, ShoppingBag, Sparkles, MapPin } from "lucide-react";

const GUIDE_KEY = "bb_user_guide_seen";

const STEPS = [
  {
    icon: Scissors,
    iconBg: "bg-gradient-to-br from-orange-400 to-primary",
    title: "Bienvenue sur BeautyBook !",
    desc: "Votre appli beauté tout-en-un. Découvrez les fonctionnalités en quelques secondes.",
    highlight: null,
  },
  {
    icon: Search,
    iconBg: "bg-gradient-to-br from-blue-400 to-blue-600",
    title: "Trouvez votre expert",
    desc: "Explorez les salons, coiffeurs et professionnels beauté autour de vous. Filtrez par catégorie, prix ou avis.",
    highlight: "categories",
  },
  {
    icon: Calendar,
    iconBg: "bg-gradient-to-br from-green-400 to-emerald-500",
    title: "Réservez en un tap",
    desc: "Choisissez un créneau, confirmez votre rendez-vous. C'est tout ! Vous recevrez une confirmation instantanée.",
    highlight: "rdv",
  },
  {
    icon: ShoppingBag,
    iconBg: "bg-gradient-to-br from-purple-400 to-violet-500",
    title: "Commandez vos produits",
    desc: "Boutique de soins, accessoires et kits beauté. Livraison rapide ou retrait sur place.",
    highlight: "shop",
  },
  {
    icon: Sparkles,
    iconBg: "bg-gradient-to-br from-pink-400 to-rose-500",
    title: "Explorez les Reels",
    desc: "Vidéos de coiffure, tutoriels maquillage, tendances... Likez, commentez et partagez vos coups de cœur.",
    highlight: "reels",
  },
  {
    icon: MapPin,
    iconBg: "bg-gradient-to-br from-amber-400 to-orange-500",
    title: "Gagnez du temps",
    desc: "La carte interactive montre les pros proches de vous. VTC disponible pour vos déplacements.",
    highlight: "explore",
  },
];

export default function UserGuide() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(GUIDE_KEY);
    if (!seen) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const close = () => {
    localStorage.setItem(GUIDE_KEY, "1");
    setVisible(false);
    setStep(0);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      close();
    }
  };

  if (!visible) return null;

  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6" onClick={close}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative bg-white rounded-[32px] px-6 pt-10 pb-8 max-w-[340px] w-full shadow-2xl text-center"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={close}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all">
          <X className="w-4 h-4 text-gray-500" />
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-gray-200"
            }`} />
          ))}
        </div>

        {/* Icon */}
        <div className={`w-20 h-20 ${s.iconBg} rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-lg`}>
          <Icon className="w-10 h-10 text-white" strokeWidth={1.8} />
        </div>

        {/* Text */}
        <h2 className="text-[20px] font-black text-gray-900 mb-2 leading-tight">{s.title}</h2>
        <p className="text-[13px] text-gray-400 font-medium leading-relaxed mb-8">{s.desc}</p>

        {/* CTA */}
        <button onClick={next}
          className="w-full py-4 rounded-full font-black text-[14px] uppercase tracking-widest text-white active:scale-95 transition-all flex items-center justify-center gap-2"
          style={{ background: "#E8732A" }}>
          {isLast ? "Commencer" : "Suivant"}
          {!isLast && <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Skip */}
        {!isLast && (
          <button onClick={close}
            className="w-full mt-3 py-2 text-[12px] font-bold text-gray-400 uppercase tracking-widest active:scale-95 transition-all">
            Passer
          </button>
        )}
      </div>
    </div>
  );
}
