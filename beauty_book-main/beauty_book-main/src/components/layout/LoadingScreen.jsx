import React from 'react';

export default function LoadingScreen({ message = "Chargement..." }) {
  return (
    <div className="bb-loading-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');

        .bb-loading-screen {
          position: fixed;
          inset: 0;
          background: linear-gradient(160deg, #0f0e17 0%, #1a0a00 50%, #2d1200 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          overflow: hidden;
        }

        /* ── Particles ── */
        .bb-ls-particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .bb-ls-particle {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,107,0,0.6) 0%, transparent 70%);
          animation: bbParticleFloat linear infinite;
          will-change: transform, opacity;
        }

        @keyframes bbParticleFloat {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-20vh) scale(1); opacity: 0; }
        }

        /* ── Glow rings ── */
        .bb-ls-glow {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(255,107,0,0.12);
          animation: bbGlowPulse 3s ease-in-out infinite;
        }
        .bb-ls-glow.g1 { width: 300px; height: 300px; animation-delay: 0s; }
        .bb-ls-glow.g2 { width: 460px; height: 460px; animation-delay: 0.8s; border-color: rgba(255,107,0,0.07); }
        .bb-ls-glow.g3 { width: 620px; height: 620px; animation-delay: 1.6s; border-color: rgba(255,107,0,0.04); }

        @keyframes bbGlowPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.04); opacity: 0.3; }
        }

        /* ── Logo container ── */
        .bb-ls-logo-wrap {
          position: relative;
          width: 96px;
          height: 96px;
          margin-bottom: 32px;
        }
        .bb-ls-logo-bg {
          position: absolute;
          inset: 0;
          border-radius: 28px;
          background: linear-gradient(135deg, #FF6B00, #FF8C38);
          box-shadow:
            0 0 0 0 rgba(255,107,0,0.4),
            0 20px 60px rgba(255,107,0,0.3);
          animation: bbLogoPulse 2.5s ease-in-out infinite;
        }
        @keyframes bbLogoPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,107,0,0.4), 0 20px 60px rgba(255,107,0,0.3); }
          50% { box-shadow: 0 0 0 16px rgba(255,107,0,0), 0 20px 60px rgba(255,107,0,0.5); }
        }
        .bb-ls-logo-icon {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 42px;
          font-weight: 800;
          font-family: 'Plus Jakarta Sans', sans-serif;
          letter-spacing: -2px;
        }

        /* ── Brand text ── */
        .bb-ls-brand {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
          margin-bottom: 4px;
          text-shadow: 0 2px 20px rgba(255,107,0,0.3);
        }
        .bb-ls-brand span { color: #FF6B00; }
        .bb-ls-tagline {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 56px;
        }

        /* ── Progress bar ── */
        .bb-ls-progress-wrap {
          width: 200px;
          height: 3px;
          background: rgba(255,255,255,0.08);
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .bb-ls-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #FF6B00, #FFAA66);
          border-radius: 999px;
          animation: bbProgressFill 2.2s ease-in-out infinite;
          box-shadow: 0 0 8px rgba(255,107,0,0.6);
        }
        @keyframes bbProgressFill {
          0% { width: 0%; opacity: 1; }
          70% { width: 85%; opacity: 1; }
          90% { width: 92%; opacity: 0.8; }
          100% { width: 100%; opacity: 0; }
        }

        /* ── Status text ── */
        .bb-ls-status {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.08em;
          animation: bbStatusPulse 2s ease-in-out infinite;
        }
        @keyframes bbStatusPulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.7; }
        }

        /* ── Floating dots ── */
        .bb-ls-dots {
          display: flex;
          gap: 7px;
          margin-top: 24px;
        }
        .bb-ls-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255,107,0,0.6);
          animation: bbDotBounce 1.4s ease-in-out infinite;
        }
        .bb-ls-dot:nth-child(1) { animation-delay: 0s; }
        .bb-ls-dot:nth-child(2) { animation-delay: 0.2s; }
        .bb-ls-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bbDotBounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1.2); opacity: 1; background: #FF6B00; }
        }

        /* ── Version badge ── */
        .bb-ls-version {
          position: absolute;
          bottom: 32px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          letter-spacing: 0.05em;
        }
      `}</style>

      {/* Background glow rings */}
      <div className="bb-ls-glow g1" />
      <div className="bb-ls-glow g2" />
      <div className="bb-ls-glow g3" />

      {/* Floating particles */}
      <div className="bb-ls-particles">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="bb-ls-particle"
            style={{
              width: `${8 + (i % 4) * 6}px`,
              height: `${8 + (i % 4) * 6}px`,
              left: `${(i * 8.3) % 100}%`,
              animationDuration: `${4 + (i % 5) * 1.2}s`,
              animationDelay: `${(i * 0.4) % 3}s`,
            }}
          />
        ))}
      </div>

      {/* Logo */}
      <div className="bb-ls-logo-wrap">
        <div className="bb-ls-logo-bg" />
        <div className="bb-ls-logo-icon">B</div>
      </div>

      {/* Brand */}
      <div className="bb-ls-brand">Beauty<span>Book</span></div>
      <div className="bb-ls-tagline">L'app beauté intelligente</div>

      {/* Progress */}
      <div className="bb-ls-progress-wrap">
        <div className="bb-ls-progress-bar" />
      </div>

      {/* Status */}
      <div className="bb-ls-status">{message}</div>

      {/* Dots */}
      <div className="bb-ls-dots">
        <div className="bb-ls-dot" />
        <div className="bb-ls-dot" />
        <div className="bb-ls-dot" />
      </div>

      {/* Version */}
      <div className="bb-ls-version">BeautyBook v2.0</div>
    </div>
  );
}
