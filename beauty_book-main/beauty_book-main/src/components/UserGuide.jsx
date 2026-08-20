import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

const GUIDE_KEY = "bb_didacticiel_seen";

// Page group labels
const PAGES = {
  home: "Accueil",
  maria: "Maria AI",
  reels: "Social",
  boutique: "Boutique",
  immobilier: "Immobilier",
  rdv: "Rendez-vous",
  fidelite: "Fidélité",
  profil: "Profil",
};

// Steps: navigate + highlight
const STEPS = [
  // ── HOME ──
  { page: "home", target: "[data-tour='hero']", title: "Bienvenue sur BeautyBook !",
    desc: "Votre appli beauté tout-en-un. Ce didacticiel va vous guider à travers les fonctionnalités principales.",
    placement: "bottom" },
  { page: "home", target: "[data-tour='categories']", title: "Catégories",
    desc: "Filtrez par type de service : coiffure, maquillage, ongles, soins, massage, barbier...",
    placement: "bottom" },
  { page: "home", target: "[data-tour='services']", title: "Services Tendance",
    desc: "Les prestations les plus populaires du moment. Appuyez pour voir les détails et réserver.",
    placement: "bottom" },
  { page: "home", target: "[data-tour='salon-mois']", title: "Salon du Mois",
    desc: "Le salon le mieux noté du moment, classé par catégorie. Balayez pour voir les autres catégories.",
    placement: "bottom" },
  { page: "home", target: "[data-tour='expert-mois']", title: "Expertise du Mois",
    desc: "Le particulier le mieux noté, spécialisé par catégorie. Balayez pour explorer.",
    placement: "bottom" },

  // ── MARIA AI ──
  { page: "maria", navigate: "/maria", wait: 800,
    target: "[data-tour='maria-scan']", title: "Scan Capillaire",
    desc: "Analysez votre cuir chevelu et vos cheveux avec l'IA. Obtenez des recommandations personnalisées.",
    placement: "bottom" },
  { page: "maria", target: "[data-tour='maria-simulator']", title: "AI Hairstyle Changer",
    desc: "Simulez une nouvelle coiffure sur votre photo. Essayez avant de vous décider !",
    placement: "bottom" },
  { page: "maria", target: "[data-tour='maria-styliste']", title: "Styliste IA",
    desc: "L'IA vous recommande le look parfait selon votre visage, votre style et vos envies.",
    placement: "bottom" },

  // ── REELS / SOCIAL ──
  { page: "reels", navigate: "/reels", wait: 800,
    target: "[data-tour='reels-feed']", title: "Fil Social",
    desc: "Découvrez les publications des coiffeurs, maquilleurs et artistes beauté. Likez, commentez, partagez.",
    placement: "bottom" },
  { page: "reels", target: "[data-tour='reels-offre']", title: "Offres & Réservations",
    desc: "Chaque publication peut contenir un produit à acheter ou un service à réserver. Appuyez sur 'Offre' pour en savoir plus.",
    placement: "left" },

  // ── BOUTIQUE ──
  { page: "boutique", navigate: "/boutique", wait: 800,
    target: "[data-tour='boutique-search']", title: "Recherche de Produits",
    desc: "Recherchez par nom, marque ou utilisez la recherche par image pour trouver un produit exact.",
    placement: "bottom" },
  { page: "boutique", target: "[data-tour='boutique-styliste']", title: "Styliste IA",
    desc: "Un assistant IA vous recommande les produits adaptés à votre type de cheveux et vos besoins.",
    placement: "bottom" },

  // ── IMMOBILIER ──
  { page: "immobilier", navigate: "/immobilier", wait: 800,
    target: "[data-tour='immobilier-listings']", title: "Offres Immobilières",
    desc: "Trouvez l'espace idéal pour ouvrir ou étendre votre salon de beauté. Locaux, équipements, tout y est.",
    placement: "bottom" },

  // ── RENDEZ-VOUS ──
  { page: "rdv", navigate: "/rendez-vous", wait: 800,
    target: "[data-tour='rdv-routines']", title: "Mes Routines",
    desc: "Accédez à vos routines beauté enregistrées. Suivez vos rituels de soin personnalisés.",
    placement: "bottom" },
  { page: "rdv", target: "[data-tour='rdv-add']", title: "Créer une Routine",
    desc: "Créez une nouvelle routine en combinant vos services et soins préférés.",
    placement: "bottom" },

  // ── FIDÉLITÉ ──
  { page: "fidelite", navigate: "/programme-fidelite", wait: 800,
    target: "[data-tour='fidelite-points']", title: "Vos Points",
    desc: "Gagnez des points à chaque réservation ou achat. Échangez-les contre des récompenses exclusives.",
    placement: "bottom" },
  { page: "fidelite", target: "[data-tour='fidelite-rewards']", title: "Récompenses",
    desc: "Services gratuits, réductions, produits offerts... Découvrez tout ce que vous pouvez obtenir.",
    placement: "top" },

  // ── PROFIL ──
  { page: "profil", navigate: "/profil", wait: 800,
    target: "[data-tour='profil-score']", title: "Score de Fiabilité",
    desc: "Votre note de confiance basée sur vos avis, réservations et activité sur l'appli.",
    placement: "bottom" },
  { page: "profil", target: "[data-tour='profil-devenir-pro']", title: "Devenir Pro",
    desc: "Passez au niveau supérieur ! Créez votre profil professionnel et proposez vos services.",
    placement: "top" },
];

export default function UserGuide() {
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [navigating, setNavigating] = useState(false);
  const measureRef = useRef(null);

  useEffect(() => {
    const seen = localStorage.getItem(GUIDE_KEY);
    if (!seen) {
      const t = setTimeout(() => setActive(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const findTarget = useCallback((sel) => {
    return document.querySelector(sel);
  }, []);

  const measure = useCallback(() => {
    const s = STEPS[step];
    if (!s) return;
    const el = findTarget(s.target);
    if (!el) {
      setTargetRect(null);
      return false;
    }
    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top, left: rect.left,
      width: rect.width, height: rect.height,
      bottom: rect.bottom,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    });
    return true;
  }, [step, findTarget]);

  // Navigate + measure with retry
  useEffect(() => {
    if (!active) return;
    const s = STEPS[step];
    if (!s) return;

    setNavigating(true);
    setTargetRect(null);

    // Navigate if needed
    if (s.navigate) {
      navigate(s.navigate, { replace: true });
    }

    // Measure with retry
    const waitMs = s.wait || 300;
    let attempts = 0;
    const maxAttempts = 20;
    const interval = setInterval(() => {
      attempts++;
      if (measure() || attempts >= maxAttempts) {
        clearInterval(interval);
        setNavigating(false);
        // Scroll into view
        const el = findTarget(s.target);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, waitMs / 2);

    return () => clearInterval(interval);
  }, [active, step, navigate, measure, findTarget]);

  // Re-measure on scroll/resize
  useEffect(() => {
    if (!active) return;
    const onResize = () => measure();
    const onScroll = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [active, measure]);

  const close = () => {
    localStorage.setItem(GUIDE_KEY, "1");
    setActive(false);
    setStep(0);
    setTargetRect(null);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else close();
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!active || navigating) return null;

  const s = STEPS[step];
  if (!s || !targetRect) return null;

  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const PAD = 12;
  const tooltipWidth = Math.min(300, window.innerWidth - 48);

  // Position tooltip
  let tooltipTop, tooltipLeft;
  if (s.placement === "bottom") {
    tooltipTop = targetRect.bottom + PAD + 8;
    tooltipLeft = Math.max(24, Math.min(targetRect.centerX - tooltipWidth / 2, window.innerWidth - tooltipWidth - 24));
  } else if (s.placement === "top") {
    tooltipTop = Math.max(16, targetRect.top - PAD - 160);
    tooltipLeft = Math.max(24, Math.min(targetRect.centerX - tooltipWidth / 2, window.innerWidth - tooltipWidth - 24));
  } else {
    // left
    tooltipTop = Math.max(16, targetRect.top - 20);
    tooltipLeft = Math.max(16, targetRect.left - tooltipWidth - 20);
  }

  return (
    <>
      {/* Overlay with cutout */}
      <div className="fixed inset-0 z-[9998]" onClick={close}>
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - PAD}
                y={targetRect.top - PAD}
                width={targetRect.width + PAD * 2}
                height={targetRect.height + PAD * 2}
                rx="16"
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#tour-mask)" />
        </svg>

        {/* Highlight border pulse */}
        <div
          className="absolute rounded-2xl border-2 border-white/80 pointer-events-none"
          style={{
            top: targetRect.top - PAD,
            left: targetRect.left - PAD,
            width: targetRect.width + PAD * 2,
            height: targetRect.height + PAD * 2,
            animation: "tour-pulse 2s ease-in-out infinite",
          }}
        />
      </div>

      {/* Tooltip */}
      <div
        className="fixed z-[9999] bg-white rounded-2xl shadow-2xl px-5 py-4"
        style={{ top: tooltipTop, left: tooltipLeft, width: tooltipWidth }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header: page label + step counter */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">
            {PAGES[s.page] || s.page}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400">
              {step + 1}/{STEPS.length}
            </span>
            <button onClick={close} className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
              <X className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <h3 className="text-[15px] font-black text-gray-900 mb-1">{s.title}</h3>
        <p className="text-[12px] text-gray-400 font-medium leading-relaxed mb-4">{s.desc}</p>

        {/* Navigation + progress */}
        <div className="flex items-center gap-2">
          {!isFirst && (
            <button onClick={prev}
              className="w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center active:scale-95 transition-all shrink-0">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
          )}
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <button onClick={next}
            className="flex items-center gap-1.5 bg-primary text-white text-[11px] font-black px-4 py-2 rounded-full active:scale-95 transition-all shrink-0">
            {isLast ? "Terminer" : "Suivant"}
            {!isLast && <ChevronRight className="w-3 h-3" />}
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <button onClick={close}
            className="w-full mt-2 text-[10px] font-bold text-gray-300 uppercase tracking-widest text-center py-1">
            Passer le didacticiel
          </button>
        )}

        {/* Arrow */}
        {s.placement !== "left" && (
          <div
            className="absolute w-3 h-3 bg-white rotate-45 -z-10"
            style={s.placement === "bottom"
              ? { top: -6, left: targetRect.centerX - tooltipLeft - 6 }
              : { bottom: -6, left: targetRect.centerX - tooltipLeft - 6 }
            }
          />
        )}
        {s.placement === "left" && (
          <div
            className="absolute w-3 h-3 bg-white rotate-45 -z-10"
            style={{ top: 20, right: -6 }}
          />
        )}
      </div>

      <style>{`
        @keyframes tour-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232,115,42,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(232,115,42,0); }
        }
      `}</style>
    </>
  );
}
