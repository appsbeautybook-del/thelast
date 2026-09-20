import BeautyImage from '@/components/ui/BeautyImage';
﻿import { useState, useRef, useEffect, useCallback } from "react";
import {
  X, Play, Pause, Volume2, VolumeX, ZoomIn, ZoomOut,
  SkipBack, SkipForward, Scissors, Zap, AudioLines, Plus,
  Search, Download, Wand2, Settings, Palette, Type,
  Image as ImageIcon, Trash2, ChevronDown, Check, Layers,
  FlipHorizontal, RotateCcw, RotateCcw as Undo
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const PRIMARY = "#f97316";
const PRIMARY_ALPHA = "rgba(249,115,22,";
const CLIP_COLORS = ["#2563eb","#7c3aed","#059669","#d97706","#dc2626","#0891b2","#c026d3"];

const FILTERS = [
  { id: null, label: "Normal", css: "" },
  { id: "grayscale", label: "N&B", css: "grayscale(100%)" },
  { id: "sepia", label: "Sepia", css: "sepia(80%)" },
  { id: "warm", label: "Chaud", css: "saturate(150%) hue-rotate(-20deg)" },
  { id: "cool", label: "Froid", css: "saturate(120%) hue-rotate(30deg)" },
  { id: "vivid", label: "Vivid", css: "saturate(200%) contrast(110%)" },
  { id: "fade", label: "Fade", css: "brightness(110%) saturate(70%) contrast(90%)" },
];

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const FONTS = ["Arial", "Georgia", "Courier New", "Impact", "Comic Sans MS", "Verdana"];

const TRANSITIONS = [
  { id: "none", label: "Aucune" },
  { id: "fade", label: "Fondu" },
  { id: "dissolve", label: "Dissolution" },
  { id: "wipe", label: "Balayage" },
];

// ── WaveformBars ──────────────────────────────────────────────────────────────
function WaveformBars({ color, totalW, duration, currentTime }) {
  const barCount = Math.min(Math.floor(totalW / 3), 200);
  const barsRef = useRef(null);
  if (!barsRef.current || barsRef.current.length !== barCount) {
    barsRef.current = Array.from({ length: barCount }, () => 15 + Math.random() * 70);
  }
  return (
    <div className="flex items-end gap-px h-full px-1">
      {barsRef.current.map((h, i) => {
        const pct = duration > 0 ? (i / barCount) * 100 : 0;
        const isPast = duration > 0 && pct <= (currentTime / duration) * 100;
        return <div key={i} className="flex-1 rounded-full transition-all duration-75" style={{ height: `${h}%`, minWidth: 2, background: isPast ? color : `${color}44` }} />;
      })}
    </div>
  );
}

// ── ClipBlock ─────────────────────────────────────────────────────────────────
function ClipBlock({ label, startX, width, color, isActive, onClick, onDelete, onTrimLeft, onTrimRight, onDragMove }) {
  const dragRef = useRef({ dragging: false, startX: 0 });
  const handlePointerDown = useCallback((e) => {
    if (e.target.closest(".trim-handle") || e.target.closest("button")) return;
    e.stopPropagation();
    dragRef.current = { dragging: true, startX: e.clientX };
    const onMove = (ev) => { if (dragRef.current.dragging) onDragMove?.(ev.clientX - dragRef.current.startX); };
    const onUp = () => { dragRef.current.dragging = false; document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp); };
    document.addEventListener("pointermove", onMove); document.addEventListener("pointerup", onUp);
  }, [onDragMove]);

  return (
    <div className="absolute top-0.5 bottom-0.5 rounded-lg overflow-visible cursor-grab active:cursor-grabbing transition-all group/clip"
      style={{ left: startX, width: Math.max(width, 30), background: isActive ? `linear-gradient(135deg, ${color}, ${color}dd)` : `linear-gradient(135deg, ${color}, ${color}aa)`, border: isActive ? "2px solid rgba(255,255,255,0.6)" : "none", zIndex: isActive ? 10 : 1, minHeight: 44 }}
      onClick={onClick} onPointerDown={handlePointerDown}>
      <div className="absolute inset-0 flex items-center px-3 overflow-hidden">
        <span className="text-[10px] font-bold text-white truncate">{label || "Clip"}</span>
      </div>
      {onTrimLeft && <div className="trim-handle absolute -left-1 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover/clip:opacity-100 bg-white/50 rounded-l" onPointerDown={(e) => { e.stopPropagation(); onTrimLeft(e); }} />}
      {onTrimRight && <div className="trim-handle absolute -right-1 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover/clip:opacity-100 bg-white/50 rounded-r" onPointerDown={(e) => { e.stopPropagation(); onTrimRight(e); }} />}
      {onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover/clip:opacity-100 shadow">✕</button>}
    </div>
  );
}

// ── ToolPanel ─────────────────────────────────────────────────────────────────
function ToolPanel({ tool, isDark, cardBg, panelBorder, textPrimary, textMuted, PRIMARY, onClose, brightness, setBrightness, contrast, setContrast, saturation, setSaturation, filter, setFilter, speed, setSpeed, textOverlay, setTextOverlay, flipH, setFlipH }) {
  const panelBg = isDark ? "rgba(10,10,10,0.95)" : "rgba(255,255,255,0.95)";

  if (tool === "RETOUCHE") return (
    <div className="px-4 py-3 space-y-3" style={{ background: panelBg, borderTop: `1px solid ${panelBorder}` }}>
      <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: textMuted }}>Retouche</p>
      {[{ label: "Luminosité", value: brightness, set: setBrightness, min: 50, max: 150 }, { label: "Contraste", value: contrast, set: setContrast, min: 50, max: 150 }, { label: "Saturation", value: saturation, set: setSaturation, min: 0, max: 200 }].map(s => (
        <div key={s.label} className="flex items-center gap-3">
          <span className="text-[11px] w-20" style={{ color: textMuted }}>{s.label}</span>
          <input type="range" min={s.min} max={s.max} value={s.value} onChange={e => s.set(Number(e.target.value))} className="flex-1 h-1 rounded-full appearance-none" style={{ background: PRIMARY }} />
          <span className="text-[10px] font-mono w-8 text-right" style={{ color: textMuted }}>{s.value}%</span>
        </div>
      ))}
    </div>
  );

  if (tool === "FILTRES") return (
    <div className="px-4 py-3" style={{ background: panelBg, borderTop: `1px solid ${panelBorder}` }}>
      <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: textMuted }}>Filtres</p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map(f => (
          <button key={f.id || "none"} onClick={() => setFilter(f.id)} className="shrink-0 px-3 py-2 rounded-xl text-[10px] font-bold transition-all" style={{ background: filter === f.id ? PRIMARY : cardBg, color: filter === f.id ? "#fff" : textMuted, border: `1px solid ${filter === f.id ? PRIMARY : panelBorder}` }}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (tool === "COUPER") return (
    <div className="px-4 py-3" style={{ background: panelBg, borderTop: `1px solid ${panelBorder}` }}>
      <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: textMuted }}>Vitesse</p>
      <div className="flex gap-2 flex-wrap">
        {SPEEDS.map(s => (
          <button key={s} onClick={() => setSpeed(s)} className="px-4 py-2 rounded-xl text-[11px] font-bold transition-all" style={{ background: speed === s ? PRIMARY : cardBg, color: speed === s ? "#fff" : textMuted, border: `1px solid ${speed === s ? PRIMARY : panelBorder}` }}>
            {s}x
          </button>
        ))}
      </div>
    </div>
  );

  if (tool === "VITESSE") return (
    <div className="px-4 py-3" style={{ background: panelBg, borderTop: `1px solid ${panelBorder}` }}>
      <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: textMuted }}>Vitesse</p>
      <div className="flex gap-2 flex-wrap">
        {SPEEDS.map(s => (
          <button key={s} onClick={() => setSpeed(s)} className="px-4 py-2 rounded-xl text-[11px] font-bold transition-all" style={{ background: speed === s ? PRIMARY : cardBg, color: speed === s ? "#fff" : textMuted, border: `1px solid ${speed === s ? PRIMARY : panelBorder}` }}>
            {s}x
          </button>
        ))}
      </div>
    </div>
  );

  if (tool === "TEXTE") return (
    <div className="px-4 py-3 space-y-3" style={{ background: panelBg, borderTop: `1px solid ${panelBorder}` }}>
      <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: textMuted }}>Texte</p>
      <input value={textOverlay.text} onChange={e => setTextOverlay(p => ({ ...p, text: e.target.value }))} placeholder="Votre texte..."
        className="w-full px-4 py-3 rounded-xl text-[13px] outline-none" style={{ background: cardBg, border: `1px solid ${panelBorder}`, color: textPrimary }} />
      <div className="flex gap-2 flex-wrap">
        {FONTS.map(f => (
          <button key={f} onClick={() => setTextOverlay(p => ({ ...p, fontFamily: f }))} className="px-3 py-1.5 rounded-lg text-[10px] font-bold" style={{ background: textOverlay.fontFamily === f ? PRIMARY : cardBg, color: textOverlay.fontFamily === f ? "#fff" : textMuted, fontFamily: f }}>
            {f}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[11px]" style={{ color: textMuted }}>Taille</span>
        <input type="range" min={8} max={72} value={textOverlay.fontSize} onChange={e => setTextOverlay(p => ({ ...p, fontSize: Number(e.target.value) }))} className="flex-1 h-1 rounded-full" style={{ background: PRIMARY }} />
        <span className="text-[10px] font-mono" style={{ color: textMuted }}>{textOverlay.fontSize}px</span>
      </div>
      <div className="flex gap-2">
        {["#ffffff","#000000","#ff0000","#00ff00","#0000ff","#ffff00","#ff00ff","#00ffff"].map(c => (
          <button key={c} onClick={() => setTextOverlay(p => ({ ...p, color: c }))} className="w-7 h-7 rounded-full border-2" style={{ background: c, borderColor: textOverlay.color === c ? PRIMARY : "transparent" }} />
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => setTextOverlay(p => ({ ...p, bold: !p.bold }))} className="px-3 py-1.5 rounded-lg text-[11px] font-black" style={{ background: textOverlay.bold ? PRIMARY : cardBg, color: textOverlay.bold ? "#fff" : textMuted }}>G</button>
        <button onClick={() => setTextOverlay(p => ({ ...p, italic: !p.italic }))} className="px-3 py-1.5 rounded-lg text-[11px] italic" style={{ background: textOverlay.italic ? PRIMARY : cardBg, color: textOverlay.italic ? "#fff" : textMuted }}>I</button>
      </div>
      <button onClick={() => setTextOverlay(p => ({ ...p, show: !p.show }))} className="w-full py-2 rounded-xl text-[11px] font-bold" style={{ background: textOverlay.show ? PRIMARY : cardBg, color: textOverlay.show ? "#fff" : textMuted }}>
        {textOverlay.show ? "Masquer le texte" : "Afficher le texte"}
      </button>
    </div>
  );

  return null;
}

// ── Main VideoEditor ──────────────────────────────────────────────────────────
export default function VideoEditor({ videoUrl, sound, soundUrl, onClose, onDone, onAddSound, onRemoveSound }) {
  const videoRef = useRef(null);
  const audioRefs = useRef({});
  const fileInput2Ref = useRef(null);
  const fileInputAudioRef = useRef(null);
  const fileInputImageRef = useRef(null);
  const scrollRef = useRef(null);
  const autoScrollRef = useRef(null);
  const previewAudioRef = useRef(null);

  const { theme } = useTheme();
  const isDark = theme === "dark" || theme === "night";

  // ── State ──
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [originalMuted, setOriginalMuted] = useState(false);
  const [originalSoundRemoved, setOriginalSoundRemoved] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [videoClips, setVideoClips] = useState([]);
  const [audioTracks, setAudioTracks] = useState([]);
  const [activeClipIdx, setActiveClipIdx] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [filter, setFilter] = useState(null);
  const [speed, setSpeed] = useState(1);
  const [flipH, setFlipH] = useState(false);
  const [textOverlay, setTextOverlay] = useState({ text: "", x: 50, y: 50, fontSize: 24, color: "#ffffff", fontFamily: "Arial", show: false, bold: true, italic: false });
  const [imageOverlays, setImageOverlays] = useState([]);
  const [activeTool, setActiveTool] = useState(null);
  const [transition, setTransition] = useState("none");
  const [showSoundPanel, setShowSoundPanel] = useState(false);
  const [soundSearch, setSoundSearch] = useState("");
  const [soundResults, setSoundResults] = useState([]);
  const [soundSearching, setSoundSearching] = useState(false);
  const [previewingSound, setPreviewingSound] = useState(null);

  // ── Derived ──
  const TRACK_H = 48;
  const LABEL_W = 56;
  const PPS = 100 * zoom;
  const totalW = Math.max(duration * PPS, 600);
  const panelBg = isDark ? "rgba(10,10,10,0.95)" : "rgba(255,255,255,0.95)";
  const panelBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textMuted = isDark ? "#6b7280" : "#9ca3af";
  const activeAAudio = audioTracks.filter(t => t.type !== "original");

  const timeToX = useCallback((t) => (t / (duration || 1)) * totalW, [duration, totalW]);
  const xToTime = useCallback((x) => Math.max(0, Math.min(duration, (x / totalW) * duration)), [duration, totalW]);

  const rulerMarks = [];
  if (duration > 0) {
    const step = zoom >= 8 ? 1 : zoom >= 4 ? 2 : zoom >= 2 ? 5 : 10;
    for (let t = 0; t <= duration + step; t += step) rulerMarks.push(Math.min(t, duration));
  }

  const fmtTC = (s) => {
    if (!s || isNaN(s)) return "00:00:00:00";
    return `00:${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}:${String(Math.floor((s % 1) * 30)).padStart(2, "0")}`;
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  const getFilterCSS = () => {
    let css = `brightness(${brightness / 100}) contrast(${contrast / 100}) saturate(${saturation / 100})`;
    const f = FILTERS.find(fi => fi.id === filter);
    if (f?.css) css += ` ${f.css}`;
    if (flipH) css += " scaleX(-1)";
    return css;
  };

  // ── Handlers ──
  const handlePlayheadDrag = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    const rect = scrollRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sl = scrollRef.current?.scrollLeft || 0;
    const seek = (cx) => { const v = videoRef.current; if (!v) return; const t = xToTime(cx - rect.left + sl); v.currentTime = t; setCurrentTime(t); };
    seek(e.clientX ?? e.touches?.[0]?.clientX ?? 0);
    const onMove = (ev) => seek(ev.touches ? ev.touches[0].clientX : ev.clientX);
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove, { passive: false }); document.addEventListener("mouseup", onUp);
  }, [xToTime]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.currentTime >= trimEnd && trimEnd > 0) { v.pause(); setIsPlaying(false); v.currentTime = trimStart; }
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration); setTrimEnd(v.duration);
    if (audioTracks.length === 0) setAudioTracks([{ id: 0, name: "Son original", url: videoUrl, type: "original", volume: 100, muted: false }]);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) { v.pause(); } else { if (v.currentTime >= trimEnd - 0.1) v.currentTime = trimStart; v.play().catch(() => {}); }
    setIsPlaying(!isPlaying);
  };

  const handleClip2 = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newClips = files.map((file, i) => ({ id: `clip_${Date.now()}_${i}`, url: URL.createObjectURL(file), type: file.type.startsWith("image/") ? "image" : "video", name: file.name.replace(/\.[^.]+$/, ""), color: CLIP_COLORS[videoClips.length % CLIP_COLORS.length] }));
    setVideoClips(prev => [...prev, ...newClips]); setActiveClipIdx(videoClips.length); e.target.value = "";
  };

  const handleImportAudio = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioTracks(prev => [...prev, { id: Date.now(), name: file.name.replace(/\.[^.]+$/, ""), url: URL.createObjectURL(file), type: "imported", volume: 80, muted: false }]);
    e.target.value = "";
  };

  const handleAddImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageOverlays(prev => [...prev, { url: URL.createObjectURL(file), x: 60, y: 120, scale: 1 }]);
    e.target.value = "";
  };

  const cutAtPlayhead = () => {
    const v = videoRef.current;
    if (!v || v.currentTime <= trimStart || v.currentTime >= trimEnd) return;
    const clip = { id: `clip_${Date.now()}`, url: videoUrl, type: "video", name: "Clip coupé", color: CLIP_COLORS[videoClips.length % CLIP_COLORS.length], startTime: v.currentTime - trimStart };
    setVideoClips(prev => [...prev, clip]);
  };

  const toggleOriginalSound = () => setOriginalSoundRemoved(prev => !prev);

  // ── Zoom ──
  const handleZoomAtCursor = useCallback((e, delta) => {
    const container = scrollRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const timeAtCursor = xToTime(mouseX + container.scrollLeft);
    setZoom(z => {
      const newZoom = Math.max(0.5, Math.min(10, z + delta));
      const newTotalW = Math.max(duration * 100 * newZoom, 600);
      const newTimeToX = (t) => (t / (duration || 1)) * newTotalW;
      requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollLeft = newTimeToX(timeAtCursor) - mouseX; });
      return newZoom;
    });
  }, [duration, xToTime]);

  const handleZoomSlider = useCallback((e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const update = (ev) => { const cx = ev.clientX ?? ev.touches?.[0]?.clientX ?? 0; setZoom(0.5 + Math.max(0, Math.min(1, (cx - rect.left) / rect.width)) * 9.5); };
    update(e);
    const onMove = (ev) => update(ev);
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  }, []);

  const handleWheel = useCallback((e) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) handleZoomAtCursor(e, e.deltaY > 0 ? -0.3 : 0.3);
      else if (scrollRef.current) scrollRef.current.scrollLeft += e.deltaY || e.deltaX;
    }
  }, [handleZoomAtCursor]);

  // ── Auto-scroll ──
  useEffect(() => {
    if (!isPlaying || !scrollRef.current) { if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current); return; }
    const container = scrollRef.current;
    const animate = () => { if (!isPlaying || !scrollRef.current) return; container.scrollLeft += (timeToX(currentTime) - container.clientWidth / 2 - container.scrollLeft) * 0.15; autoScrollRef.current = requestAnimationFrame(animate); };
    autoScrollRef.current = requestAnimationFrame(animate);
    return () => { if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current); };
  }, [isPlaying, currentTime, timeToX]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
      if (e.key === "ArrowLeft") { const v = videoRef.current; if (v) { v.currentTime = Math.max(trimStart, v.currentTime - 1/30); setCurrentTime(v.currentTime); } }
      if (e.key === "ArrowRight") { const v = videoRef.current; if (v) { v.currentTime = Math.min(trimEnd, v.currentTime + 1/30); setCurrentTime(v.currentTime); } }
      if (e.key === "m") setOriginalMuted(m => !m);
      if (e.key === "l") setFlipH(f => !f);
      if (e.key === "c") cutAtPlayhead();
      if (e.key === "Escape") setActiveTool(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [trimStart, trimEnd]);

  // ── Sound search ──
  const searchSounds = async () => {
    if (!soundSearch.trim()) return;
    setSoundSearching(true);
    try { const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(soundSearch)}&media=music&limit=20`); const data = await res.json(); setSoundResults(data.results || []); } catch { setSoundResults([]); }
    setSoundSearching(false);
  };

  const selectSound = (track) => {
    setAudioTracks(prev => [...prev, { id: Date.now(), name: `${track.trackName} - ${track.artistName}`, url: track.previewUrl, type: "imported", volume: 80, muted: false }]);
    setShowSoundPanel(false); onAddSound?.({ name: track.trackName, url: track.previewUrl });
  };

  const previewSound = (track) => {
    if (previewingSound === track.previewUrl) { previewAudioRef.current?.pause(); setPreviewingSound(null); }
    else { previewAudioRef.current?.pause(); const audio = new Audio(track.previewUrl); audio.volume = 0.5; audio.play().catch(() => {}); previewAudioRef.current = audio; setPreviewingSound(track.previewUrl); audio.onended = () => setPreviewingSound(null); }
  };

  // ── Render ──
  return (
    <div className="fixed inset-0 z-[90] font-display flex flex-col" style={{ background: isDark ? "linear-gradient(180deg, #0a0a0a, #141414, #0a0a0a)" : "linear-gradient(180deg, #f8f9fa, #e9ecef, #f8f9fa)" }}>
      {audioTracks.filter(t => t.type !== "original" || originalSoundRemoved).map(track => (
        <audio key={track.id} ref={el => { if (el) audioRefs.current[track.id] = el; }} src={track.url} loop={track.type === "original"} />
      ))}
      <input ref={fileInput2Ref} type="file" accept="video/*,image/*" multiple className="hidden" onChange={handleClip2} />
      <input ref={fileInputAudioRef} type="file" accept="audio/*" className="hidden" onChange={handleImportAudio} />
      <input ref={fileInputImageRef} type="file" accept="image/*" className="hidden" onChange={handleAddImage} />

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4" style={{ paddingTop: "calc(12px + env(safe-area-inset-top, 0px))", paddingBottom: 12, background: panelBg, backdropFilter: "blur(20px)", borderBottom: `1px solid ${panelBorder}` }}>
        <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-90" style={{ background: isDark ? "rgba(255,255,255,0.08)" : "#f3f4f6", border: `1px solid ${panelBorder}` }}>
          <X className="w-5 h-5" style={{ color: textPrimary }} />
        </button>
        <div className="flex items-center gap-2 rounded-full px-5 py-2.5" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "#ffffff", border: `1px solid ${panelBorder}` }}>
          <Wand2 className="w-4 h-4" style={{ color: PRIMARY }} />
          <span className="text-[14px] font-bold" style={{ color: textPrimary }}>Montage</span>
        </div>
        <button onClick={() => onDone({ trimStart, trimEnd, originalSoundRemoved, audioTracks, videoClips, brightness, contrast, saturation, filter, speed, flipH, textOverlay, imageOverlays, transition })}
          className="text-white text-[13px] font-black px-6 py-2.5 rounded-xl active:scale-95 transition-all" style={{ background: PRIMARY, boxShadow: `0 4px 16px ${PRIMARY_ALPHA}0.35)` }}>
          Terminer
        </button>
      </div>

      {/* ── Video preview ── */}
      <div className="relative mx-4 mt-3 rounded-2xl overflow-hidden bg-black shadow-lg" style={{ maxHeight: "40vh" }}>
        <video ref={videoRef} src={videoUrl} autoPlay loop playsInline muted={originalMuted} style={{ width: "100%", maxHeight: "40vh", objectFit: "contain", filter: getFilterCSS(), playbackRate: speed }}
          onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} />
        <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center z-10">
          {!isPlaying && <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg"><Play className="w-8 h-8 text-white ml-1" /></div>}
        </button>
        {/* Son original badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 z-20 shadow-sm">
          <Volume2 className="w-3.5 h-3.5" style={{ color: PRIMARY }} />
          <span className="text-gray-800 text-[11px] font-bold">Son original</span>
          <button onClick={() => setOriginalMuted(m => !m)} className="text-gray-400 hover:text-gray-600">
            {originalMuted ? <VolumeX className="w-3 h-3" /> : <X className="w-3 h-3" />}
          </button>
        </div>
        {/* Text overlay */}
        {textOverlay.show && textOverlay.text && (
          <div className="absolute z-20 pointer-events-none px-2" style={{ left: `${textOverlay.x}%`, top: `${textOverlay.y}%`, transform: "translate(-50%, -50%)", color: textOverlay.color, fontSize: `${textOverlay.fontSize}px`, fontFamily: textOverlay.fontFamily, fontWeight: textOverlay.bold ? "bold" : "normal", fontStyle: textOverlay.italic ? "italic" : "normal", textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}>
            {textOverlay.text}
          </div>
        )}
        {/* Image overlays */}
        {imageOverlays.map((img, i) => (
          <BeautyImage key={i} src={img.url} className="absolute z-20 pointer-events-none rounded-lg shadow-lg" style={{ left: img.x, top: img.y, width: 80 * img.scale, height: 80 * img.scale, objectFit: "cover" }} />
        ))}
      </div>

      {/* ── Time display ── */}
      <div className="flex items-center justify-between px-5 py-2">
        <span className="text-[12px] font-mono" style={{ color: textMuted }}>{formatTime(trimStart)}</span>
        <span className="text-[12px] font-mono font-bold" style={{ color: textPrimary }}>{formatTime(currentTime)} / {formatTime(duration)}</span>
        <span className="text-[12px] font-mono" style={{ color: textMuted }}>{formatTime(trimEnd)}</span>
      </div>

      {/* ── Zoom controls ── */}
      <div className="flex items-center justify-between px-4 py-1.5">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.5))} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: cardBg, border: `1px solid ${panelBorder}` }}>
            <ZoomOut className="w-3.5 h-3.5" style={{ color: textMuted }} />
          </button>
          <div className="relative h-1.5 w-24 rounded-full cursor-pointer" style={{ background: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb" }} onPointerDown={handleZoomSlider}>
            <div className="absolute rounded-full shadow-md" style={{ left: `${((zoom - 0.5) / 9.5) * 100}%`, width: 10, height: 10, top: -3, background: PRIMARY, transform: "translateX(-50%)" }} />
          </div>
          <button onClick={() => setZoom(z => Math.min(10, z + 0.5))} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: cardBg, border: `1px solid ${panelBorder}` }}>
            <ZoomIn className="w-3.5 h-3.5" style={{ color: textMuted }} />
          </button>
          <span className="text-[11px] font-mono font-bold" style={{ color: textMuted }}>{zoom.toFixed(1)}x</span>
        </div>
        <button onClick={toggleOriginalSound} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold"
          style={originalSoundRemoved ? { background: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" } : { background: cardBg, color: textMuted, border: `1px solid ${panelBorder}` }}>
          <Volume2 className="w-3 h-3" /> SON ORIG.
        </button>
      </div>

      {/* ── Timeline ── */}
      <div className="flex mx-2 rounded-xl overflow-hidden flex-1 min-h-0" style={{ background: isDark ? "#12122a" : "#ffffff", border: `1px solid ${panelBorder}` }}>
        <div className="shrink-0" style={{ width: LABEL_W }}>
          <div className="flex items-center justify-center" style={{ height: 22, background: isDark ? "#1e1e38" : "#f3f4f6", borderBottom: `1px solid ${panelBorder}` }}>
            <span className="text-[7px] font-bold uppercase tracking-wider" style={{ color: textMuted }}>TIME</span>
          </div>
          {["V1", "V2"].map(tid => (
            <div key={tid} className="flex items-center gap-1 px-1.5" style={{ height: TRACK_H, background: isDark ? "#1a1a35" : "#f9fafb", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
              <span className="text-[8px] font-black" style={{ color: "#3b82f6" }}>{tid}</span>
            </div>
          ))}
          <div className="flex items-center gap-1 px-1.5" style={{ height: TRACK_H, background: isDark ? "#1a1a35" : "#f9fafb", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
            <span className="text-[8px] font-black" style={{ color: "#10b981" }}>A1</span>
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden relative" style={{ scrollbarWidth: "thin" }} onWheel={handleWheel}>
          <div className="relative" style={{ width: totalW }}>
            {/* Ruler */}
            <div className="relative" style={{ height: 22, background: isDark ? "#1e1e38" : "#f3f4f6" }} onPointerDown={handlePlayheadDrag}>
              {rulerMarks.map((t, i) => (<div key={i} className="absolute top-0" style={{ left: timeToX(t) }}><div className="w-px h-3" style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)" }} /><span className="text-[6px] font-mono block text-center mt-0.5" style={{ color: textMuted }}>{fmtTC(t)}</span></div>))}
              <div className="absolute top-0 bottom-0 w-0.5 z-30 pointer-events-none" style={{ left: timeToX(currentTime), background: "#ff3333" }}>
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-0 h-0" style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "7px solid #ff3333" }} />
              </div>
            </div>
            {/* V1 */}
            <div className="relative" style={{ height: TRACK_H, borderBottom: "1px solid rgba(0,0,0,0.04)" }} onPointerDown={(e) => { if (e.target === e.currentTarget) handlePlayheadDrag(e); }}>
              <ClipBlock label="Clip principal" startX={timeToX(trimStart)} width={timeToX(trimEnd) - timeToX(trimStart)} color="#f97316" isActive={activeClipIdx === 0} onClick={() => setActiveClipIdx(0)}
                onTrimLeft={(e) => { const sx = e.clientX, os = trimStart; const mv = (ev) => setTrimStart(Math.max(0, Math.min(os + (ev.clientX - sx) / PPS, trimEnd - 0.3))); const up = () => { document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up); }; document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up); }}
                onTrimRight={(e) => { const sx = e.clientX, oe = trimEnd; const mv = (ev) => setTrimEnd(Math.max(trimStart + 0.3, Math.min(oe + (ev.clientX - sx) / PPS, duration))); const up = () => { document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up); }; document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up); }} />
              {videoClips.map((clip, idx) => (<ClipBlock key={clip.id} label={clip.name || `Clip ${idx + 2}`} startX={timeToX(trimEnd + idx * 3)} width={3 * PPS} color={clip.color || CLIP_COLORS[idx % CLIP_COLORS.length]} isActive={activeClipIdx === idx + 1} onClick={() => setActiveClipIdx(idx + 1)} onDelete={() => setVideoClips(prev => prev.filter((_, i) => i !== idx))} onDragMove={(dx) => setVideoClips(prev => prev.map((c, i) => i === idx ? { ...c, _offset: (c._offset || 0) + dx / PPS } : c))} />))}
              <div className="absolute top-0 bottom-0 w-px pointer-events-none z-10" style={{ left: timeToX(currentTime), background: "rgba(255,51,51,0.4)" }} />
            </div>
            {/* V2 */}
            <div className="relative" style={{ height: TRACK_H, borderBottom: "1px solid rgba(0,0,0,0.04)" }} onPointerDown={(e) => { if (e.target === e.currentTarget) handlePlayheadDrag(e); }}>
              <div className="absolute top-0 bottom-0 w-px pointer-events-none z-10" style={{ left: timeToX(currentTime), background: "rgba(255,51,51,0.4)" }} />
            </div>
            {/* A1 */}
            <div className="relative" style={{ height: TRACK_H, borderBottom: "1px solid rgba(0,0,0,0.04)" }} onPointerDown={(e) => { if (e.target === e.currentTarget) handlePlayheadDrag(e); }}>
              <div className="absolute top-1 bottom-1 rounded-lg overflow-hidden" style={{ left: 0, width: timeToX(Math.min(trimEnd, duration)), background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
                <WaveformBars color="#3b82f6" totalW={totalW} duration={duration} currentTime={currentTime} />
              </div>
              <div className="absolute top-0 bottom-0 w-px pointer-events-none z-10" style={{ left: timeToX(currentTime), background: "rgba(255,51,51,0.4)" }} />
            </div>
            {activeAAudio.map((track) => (
              <div key={track.id} className="relative" style={{ height: TRACK_H, borderBottom: "1px solid rgba(0,0,0,0.04)" }} onPointerDown={(e) => { if (e.target === e.currentTarget) handlePlayheadDrag(e); }}>
                <div className="absolute top-1 bottom-1 rounded-lg overflow-hidden" style={{ left: 0, width: timeToX(duration), background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", opacity: track.muted ? 0.4 : 1 }}>
                  <WaveformBars color="#10b981" totalW={totalW} duration={duration} currentTime={currentTime} />
                </div>
                <div className="absolute top-0 bottom-0 w-px pointer-events-none z-10" style={{ left: timeToX(currentTime), background: "rgba(255,51,51,0.4)" }} />
              </div>
            ))}
            <div className="absolute top-0 bottom-0 w-0.5 z-30 pointer-events-none" style={{ left: timeToX(currentTime), background: "#ff3333" }} />
          </div>
        </div>
      </div>

      {/* ── Add clip button ── */}
      <button onClick={() => fileInput2Ref.current?.click()} className="mx-4 mt-3 flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed text-[13px] font-bold active:scale-[0.98] transition-all" style={{ borderColor: `${PRIMARY_ALPHA}0.35)`, color: PRIMARY }}>
        <Plus className="w-4 h-4" /> AJOUTER UN CLIP
      </button>

      {/* ── Transport controls ── */}
      <div className="flex items-center justify-center gap-3 px-4 py-3">
        <button onClick={() => { const v = videoRef.current; if (v) { v.currentTime = Math.max(trimStart, v.currentTime - 5); setCurrentTime(v.currentTime); } }} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: cardBg, border: `1px solid ${panelBorder}` }}>
          <SkipBack className="w-4 h-4" style={{ color: textMuted }} />
        </button>
        <button onClick={togglePlay} className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg" style={{ background: PRIMARY, boxShadow: `0 4px 20px ${PRIMARY_ALPHA}0.4)` }}>
          {isPlaying ? <Pause className="w-7 h-7 text-white" /> : <Play className="w-7 h-7 text-white ml-1" />}
        </button>
        <button onClick={() => { const v = videoRef.current; if (v) { v.currentTime = Math.min(trimEnd, v.currentTime + 5); setCurrentTime(v.currentTime); } }} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: cardBg, border: `1px solid ${panelBorder}` }}>
          <SkipForward className="w-4 h-4" style={{ color: textMuted }} />
        </button>
        <button className="flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-bold" style={{ background: cardBg, border: `1px solid ${panelBorder}`, color: textMuted }}>
          <Zap className="w-3.5 h-3.5" /> {speed}x
        </button>
        <button onClick={() => setShowSoundPanel(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold" style={{ background: cardBg, border: `1px solid ${panelBorder}`, color: textMuted }}>
          <AudioLines className="w-3.5 h-3.5" /> Ajouter un son
        </button>
        <button onClick={() => setOriginalMuted(m => !m)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: cardBg, border: `1px solid ${panelBorder}` }}>
          {originalMuted ? <VolumeX className="w-4 h-4" style={{ color: textMuted }} /> : <Volume2 className="w-4 h-4" style={{ color: textMuted }} />}
        </button>
      </div>

      {/* ── Tool buttons ── */}
      <div className="flex items-center justify-around px-3 pb-4">
        {[{ id: "RETOUCHE", label: "RETOUCHE", icon: <Settings className="w-5 h-5" /> }, { id: "FILTRES", label: "FILTRES", icon: <Palette className="w-5 h-5" /> }, { id: "COUPER", label: "COUPER", icon: <Scissors className="w-5 h-5" /> }, { id: "VITESSE", label: "VITESSE", icon: <Zap className="w-5 h-5" /> }, { id: "TEXTE", label: "TEXTE", icon: <Type className="w-5 h-5" /> }].map(tool => (
          <button key={tool.id} onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)} className="flex flex-col items-center gap-1.5 w-14 py-2 rounded-xl transition-all">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: activeTool === tool.id ? `${PRIMARY_ALPHA}0.15)` : (isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6"), border: activeTool === tool.id ? `1px solid ${PRIMARY}` : `1px solid ${panelBorder}` }}>
              <span style={{ color: activeTool === tool.id ? PRIMARY : textMuted }}>{tool.icon}</span>
            </div>
            <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: activeTool === tool.id ? PRIMARY : textMuted }}>{tool.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tool panels ── */}
      {activeTool && <ToolPanel tool={activeTool} isDark={isDark} cardBg={cardBg} panelBorder={panelBorder} textPrimary={textPrimary} textMuted={textMuted} PRIMARY={PRIMARY} onClose={() => setActiveTool(null)} brightness={brightness} setBrightness={setBrightness} contrast={contrast} setContrast={setContrast} saturation={saturation} setSaturation={setSaturation} filter={filter} setFilter={setFilter} speed={speed} setSpeed={setSpeed} textOverlay={textOverlay} setTextOverlay={setTextOverlay} flipH={flipH} setFlipH={setFlipH} />}

      {/* ── Sound Panel ── */}
      {showSoundPanel && (
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: isDark ? "#0a0a0a" : "#f8f9fa" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${panelBorder}` }}>
            <button onClick={() => { setShowSoundPanel(false); previewAudioRef.current?.pause(); setPreviewingSound(null); }} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: cardBg, border: `1px solid ${panelBorder}` }}>
              <X className="w-5 h-5" style={{ color: textPrimary }} />
            </button>
            <span className="text-[16px] font-black" style={{ color: textPrimary }}>Ajouter un son</span>
            <div className="w-10" />
          </div>
          <div className="px-4 py-3 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: cardBg, border: `1px solid ${panelBorder}` }}>
              <AudioLines className="w-4 h-4" style={{ color: textMuted }} />
              <input value={soundSearch} onChange={(e) => setSoundSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") searchSounds(); }} placeholder="Artiste, titre, genre..." className="flex-1 bg-transparent text-[14px] outline-none" style={{ color: textPrimary }} />
            </div>
            <button onClick={searchSounds} className="px-4 py-3 rounded-xl text-[13px] font-black" style={{ color: PRIMARY }}>Rechercher</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-20">
            {soundSearching && <div className="text-center py-8" style={{ color: textMuted }}>Recherche en cours...</div>}
            {!soundSearching && soundResults.length === 0 && soundSearch && <div className="text-center py-8" style={{ color: textMuted }}>Aucun résultat</div>}
            {soundResults.map((track, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl mb-2" style={{ background: cardBg, border: `1px solid ${panelBorder}` }}>
                <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-200">
                  {track.artworkUrl100 && <BeautyImage src={track.artworkUrl100} alt="" className="w-full h-full object-cover" />}
                  <button onClick={() => previewSound(track)} className="absolute inset-0 flex items-center justify-center bg-black/30">
                    {previewingSound === track.previewUrl ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold truncate" style={{ color: textPrimary }}>{track.trackName}</p>
                  <p className="text-[11px] truncate" style={{ color: textMuted }}>{track.artistName}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[11px] font-mono" style={{ color: textMuted }}>{Math.floor(track.trackTimeMillis / 60000)}:{String(Math.floor((track.trackTimeMillis % 60000) / 1000)).padStart(2, "0")}</span>
                  <button onClick={() => selectSound(track)} className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ color: "#10b981", background: "rgba(16,185,129,0.1)" }}>Aperçu</button>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3" style={{ background: isDark ? "#0a0a0a" : "#f8f9fa", borderTop: `1px solid ${panelBorder}` }}>
            <button onClick={() => { setShowSoundPanel(false); fileInputAudioRef.current?.click(); }} className="w-full py-4 rounded-2xl text-white text-[14px] font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-all" style={{ background: PRIMARY, boxShadow: `0 4px 20px ${PRIMARY_ALPHA}0.4)` }}>
              <Download className="w-5 h-5" /> Importer depuis mes fichiers
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
