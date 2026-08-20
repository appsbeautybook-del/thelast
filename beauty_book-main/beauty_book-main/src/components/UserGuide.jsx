import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronRight, Hand } from "lucide-react";

const GUIDE_KEY = "bb_didacticiel_seen";

const STEPS = [
  {
    target: "[data-tour='hero']",
    title: "Bienvenue !",
    desc: "Voici votre fil d'actualité beauté. Faites défiler pour découvrir les offres et tendances.",
    placement: "bottom",
  },
  {
    target: "[data-tour='categories']",
    title: "Explorez par catégorie",
    desc: "Coiffure, maquillage, ongles... Trouvez rapidement le service qui vous intéresse.",
    placement: "bottom",
  },
  {
    target: "[data-tour='services']",
    title: "Services tendance",
    desc: "Les prestations les plus populaires du moment. Appuyez pour voir les détails et réserver.",
    placement: "bottom",
  },
  {
    target: "[data-tour='boutique']",
    title: "Boutique",
    desc: "Commandez vos produits beauté préférés directement depuis l'appli.",
    placement: "top",
  },
  {
    target: "[data-tour='nav-explore']",
    title: "Services & Salons",
    desc: "Parcourez le catalogue complet des prestations et trouvez le salon idéal.",
    placement: "top",
  },
  {
    target: "[data-tour='nav-rdv']",
    title: "Mes rendez-vous",
    desc: "Consultez vos réservations à venir, confirmez ou annulez en un tap.",
    placement: "top",
  },
];

function getScrollParent(el) {
  let node = el?.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    if (style.overflow === "auto" || style.overflow === "scroll" || style.overflowY === "auto" || style.overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return window;
}

export default function UserGuide() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const seen = localStorage.getItem(GUIDE_KEY);
    if (!seen) {
      const t = setTimeout(() => setActive(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const measure = useCallback(() => {
    const s = STEPS[step];
    if (!s) return;
    const el = document.querySelector(s.target);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    });
  }, [step]);

  useEffect(() => {
    if (!active) return;
    measure();
    const onResize = () => measure();
    const onScroll = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [active, measure]);

  // Scroll target into view
  useEffect(() => {
    if (!active) return;
    const s = STEPS[step];
    if (!s) return;
    const el = document.querySelector(s.target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [active, step]);

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

  if (!active || !targetRect) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const PAD = 12;
  const tooltipWidth = Math.min(300, window.innerWidth - 48);

  // Position tooltip
  let tooltipTop, tooltipLeft;
  if (s.placement === "bottom") {
    tooltipTop = targetRect.bottom + PAD + 8;
    tooltipLeft = Math.max(24, Math.min(targetRect.centerX - tooltipWidth / 2, window.innerWidth - tooltipWidth - 24));
  } else {
    tooltipTop = Math.max(16, targetRect.top - PAD - 140);
    tooltipLeft = Math.max(24, Math.min(targetRect.centerX - tooltipWidth / 2, window.innerWidth - tooltipWidth - 24));
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
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#tour-mask)" />
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
        ref={overlayRef}
        className="fixed z-[9999] bg-white rounded-2xl shadow-2xl px-5 py-4"
        style={{
          top: tooltipTop,
          left: tooltipLeft,
          width: tooltipWidth,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Step counter */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black text-primary uppercase tracking-widest">
            {step + 1} / {STEPS.length}
          </span>
          <button onClick={close} className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
            <X className="w-3 h-3 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <h3 className="text-[15px] font-black text-gray-900 mb-1">{s.title}</h3>
        <p className="text-[12px] text-gray-400 font-medium leading-relaxed mb-4">{s.desc}</p>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <button onClick={next}
            className="flex items-center gap-1.5 bg-primary text-white text-[11px] font-black px-4 py-2 rounded-full active:scale-95 transition-all shrink-0">
            {isLast ? "C'est parti !" : "Suivant"}
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
        <div
          className="absolute w-3 h-3 bg-white rotate-45 -z-10"
          style={{
            ...(s.placement === "bottom"
              ? { top: -6, left: targetRect.centerX - tooltipLeft - 6 }
              : { bottom: -6, left: targetRect.centerX - tooltipLeft - 6 }
            ),
          }}
        />
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes tour-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232,115,42,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(232,115,42,0); }
        }
      `}</style>
    </>
  );
}
