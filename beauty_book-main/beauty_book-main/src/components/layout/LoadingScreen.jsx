import React from 'react';
import { Sparkles, Bot, Scissors } from 'lucide-react';

export default function LoadingScreen({ message = "Chargement intelligent..." }) {
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden select-none font-display">
      <style>{`
        @keyframes orbGlow {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.7; }
          50% { transform: scale(1.15) rotate(180deg); opacity: 0.95; }
        }
        @keyframes pulseLogo {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(255, 107, 0, 0.4)); }
          50% { transform: scale(1.06); filter: drop-shadow(0 0 35px rgba(255, 107, 0, 0.7)); }
        }
        @keyframes shimmerLine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-orb { animation: orbGlow 8s ease-in-out infinite; }
        .animate-logo-pulse { animation: pulseLogo 3s ease-in-out infinite; }
        .animate-shimmer { animation: shimmerLine 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>

      {/* Ambient glowing background orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-orange-600/30 via-pink-600/20 to-amber-500/10 rounded-full blur-[120px] pointer-events-none animate-orb" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-500/20 rounded-full blur-[90px] pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative z-10 flex flex-col items-center p-8 sm:p-12 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-2xl shadow-2xl shadow-black/80 max-w-sm w-full mx-4 text-center">
        
        {/* Brand Icon / Logo */}
        <div className="relative mb-6 animate-logo-pulse">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-xl shadow-orange-500/30 border border-white/20">
            <span className="text-4xl font-black tracking-tighter">B</span>
          </div>
          <div className="absolute -bottom-1 -right-1 bg-slate-950 p-1.5 rounded-full border border-orange-500/50 shadow-md">
            <Sparkles className="w-4 h-4 text-orange-400 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
        </div>

        {/* Brand Title */}
        <h1 className="text-2xl font-black tracking-tight text-white mb-1">
          Beauty<span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Book</span>
        </h1>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-8">
          L'expérience Beauté & IA
        </p>

        {/* Progress Bar Container */}
        <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden relative mb-4 border border-white/5">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 rounded-full animate-shimmer" />
        </div>

        {/* Dynamic Status Text */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Bot className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
          <span>{message}</span>
        </div>

        {/* Subtle decorative badges */}
        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between w-full text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1"><Scissors className="w-3 h-3 text-slate-400" /> Salons & Pros</span>
          <span className="text-orange-400/80">Grok Voice 1.0</span>
        </div>
      </div>
    </div>
  );
}
