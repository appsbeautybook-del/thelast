import BeautyImage from '@/components/ui/BeautyImage';
import { useState, useEffect, useRef, useCallback } from "react";
import { ExternalLink, X, Play } from "lucide-react";

export default function SponsoredCard({ annonce, onClose, variant = "reels" }) {
  if (!annonce || (!annonce.image_url && !annonce.video_url)) return null;

  return (
    <>
      {variant === "styles" ? (
        <StylesAd annonce={annonce} onClose={onClose} />
      ) : (
        <ReelsAd annonce={annonce} onClose={onClose} />
      )}
    </>
  );
}

function VideoPlayer({ src, poster, className, style }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);

  const tryPlay = useCallback(() => {
    if (!ref.current) return;
    ref.current.play().catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (!src || failed) return;
    const el = ref.current;
    if (!el) return;
    el.load();
    const onCanPlay = () => tryPlay();
    el.addEventListener("canplay", onCanPlay);
    return () => el.removeEventListener("canplay", onCanPlay);
  }, [src, failed, tryPlay]);

  if (failed) {
    return (
      <div className={`relative ${className}`} style={style}>
        {poster && <BeautyImage src={poster} alt="" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <button onClick={tryPlay} className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-all">
            <Play className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <video ref={ref} src={src} poster={poster} className={className} style={style}
      muted playsInline preload="auto" controls={false} />
  );
}

function AdCountdown({ total = 5, onSkip }) {
  const [count, setCount] = useState(total);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) { onSkip(); return; }
    if (count <= 0) { setDone(true); return; }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, done, onSkip]);

  if (done) return null;
  return (
    <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
      <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
      <span className="text-white text-[12px] font-black">{count}s</span>
    </div>
  );
}

/* ── REELS ── */
function ReelsAd({ annonce, onClose }) {
  const [showSkip, setShowSkip] = useState(false);
  const isVideo = !!annonce.video_url;

  return (
    <div className="relative w-full h-full flex flex-col bg-black overflow-hidden">
      <div className="flex-1 relative">
        {isVideo ? (
          <VideoPlayer src={annonce.video_url} poster={annonce.image_url} className="w-full h-full object-cover" style={{ width: "100%", height: "100%" }} />
        ) : (
          <BeautyImage src={annonce.image_url} alt={annonce.title} className="w-full h-full object-cover" />
        )}

        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Header */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-4 pb-2 bg-gradient-to-b from-black/50 to-transparent" style={{ paddingTop: "calc(16px + env(safe-area-inset-top, 0px))" }}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {annonce.sponsor_logo ? (
              <BeautyImage src={annonce.sponsor_logo} alt={annonce.sponsor_name} className="w-10 h-10 rounded-full object-cover border-2 border-white/30 shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/80 flex items-center justify-center shrink-0">
                <span className="text-white text-[14px] font-black">{(annonce.sponsor_name || "S")[0]}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white text-[14px] font-black truncate drop-shadow-lg">{annonce.sponsor_name}</p>
              <p className="text-white/60 text-[11px] font-medium">Sponsorisé</p>
            </div>
          </div>

          {isVideo ? (
            <div className="flex items-center gap-2 shrink-0">
              {!showSkip ? (
                <AdCountdown total={5} onSkip={() => setShowSkip(true)} />
              ) : (
                <button onClick={onClose} className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 text-[12px] font-black text-gray-900 active:scale-95 transition-all shadow-lg">
                  Ignorer
                </button>
              )}
            </div>
          ) : (
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-white/60 shrink-0">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Bottom */}
        <div className="absolute bottom-0 inset-x-0 px-4 pb-6">
          <h3 className="text-white text-[18px] font-black mb-1 drop-shadow-lg">{annonce.title}</h3>
          {annonce.description && (
            <p className="text-white/70 text-[13px] leading-snug mb-3 line-clamp-2 drop-shadow">{annonce.description}</p>
          )}
          <button
            onClick={() => { if (annonce.cta_url) window.open(annonce.cta_url, "_blank"); }}
            className="w-full flex items-center justify-between bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 active:scale-[0.98] transition-all shadow-lg"
          >
            <span className="text-[14px] font-black text-gray-900">{annonce.cta_label || "En savoir plus"}</span>
            <ExternalLink className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── STYLES ── */
function StylesAd({ annonce, onClose }) {
  const [showSkip, setShowSkip] = useState(false);
  const isVideo = !!annonce.video_url;

  return (
    <div className="relative w-full h-full flex flex-col bg-white overflow-hidden rounded-none">
      {/* Sponsor — directement en dessous des catégories (coiffure, maquillage, etc.) */}
      <div className="px-4 py-3 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {annonce.sponsor_logo ? (
              <BeautyImage src={annonce.sponsor_logo} alt={annonce.sponsor_name} className="w-9 h-9 rounded-full object-cover border border-gray-100 shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary text-[13px] font-black">{(annonce.sponsor_name || "S")[0]}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-black text-gray-900 truncate">{annonce.sponsor_name}</p>
              <p className="text-[10px] text-gray-400 font-medium">Sponsorisé</p>
            </div>
          </div>
          {isVideo ? (
            !showSkip ? (
              <AdCountdown total={5} onSkip={() => setShowSkip(true)} />
            ) : (
              <button onClick={onClose} className="bg-gray-100 rounded-full px-3 py-1.5 text-[11px] font-black text-gray-600 active:scale-95 transition-all">
                Ignorer
              </button>
            )
          ) : (
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-gray-400 shrink-0">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Image / Vidéo — redimensionnée pour remplir l'espace entre sponsor et CTA */}
      <div className="flex-1 relative overflow-hidden">
        {isVideo ? (
          <VideoPlayer src={annonce.video_url} poster={annonce.image_url} className="w-full h-full object-cover" style={{ width: "100%", height: "100%" }} />
        ) : (
          <BeautyImage src={annonce.image_url} alt={annonce.title} className="w-full h-full object-cover" />
        )}
      </div>

      {/* CTA — sticky bottom pour rester juste au-dessus du menu navigation */}
      <div className="sticky bottom-0 px-4 py-3 bg-white z-10">
        <button
          onClick={() => { if (annonce.cta_url) window.open(annonce.cta_url, "_blank"); }}
          className="w-full flex items-center justify-between bg-primary rounded-2xl px-4 py-3 active:scale-[0.98] transition-all shadow-md shadow-primary/20"
        >
          <span className="text-[14px] font-black text-white">{annonce.cta_label || "En savoir plus"}</span>
          <ExternalLink className="w-4 h-4 text-white/70" />
        </button>
      </div>
    </div>
  );
}