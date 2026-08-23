import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

const LOGO_IMG = "https://media.base44.com/images/public/6a0ba7bd3d55dddeb85a8366/47f6dcd4b_generated_image.png";

export default function AuthModal({ open, onClose, message }) {
  const navigate = useNavigate();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <div
        className="relative bg-white w-full sm:max-w-[360px] sm:rounded-[32px] rounded-t-[32px] p-6 pb-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition-all z-10"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>

        {/* Logo BeautyBook */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-[18px] overflow-hidden shadow-lg shadow-[#E8732A]/20 border-2 border-[#E8732A]/20">
            <img src={LOGO_IMG} alt="BeautyBook" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Brand name */}
        <h2 className="text-[22px] font-black text-center text-gray-900 mb-1" style={{ fontFamily: "inherit" }}>
          BeautyBook
        </h2>

        {/* Divider */}
        <div className="w-10 h-[3px] bg-gradient-to-r from-[#E8732A] to-[#E84466] rounded-full mx-auto mb-4" />

        {/* Message */}
        <p className="text-[13px] text-gray-400 font-medium text-center mb-7 leading-relaxed px-2">
          {message || "Connectez-vous pour profiter de toutes les fonctionnalités de BeautyBook."}
        </p>

        {/* CTA Se connecter */}
        <button
          onClick={() => { onClose(); navigate("/connexion"); }}
          className="w-full py-4 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white active:scale-[0.98] transition-all shadow-xl shadow-[#E8732A]/30"
          style={{ background: "linear-gradient(135deg, #E8732A, #E84466)" }}
        >
          Se connecter
        </button>

        {/* Créer un compte */}
        <button
          onClick={() => { onClose(); navigate("/onboarding"); }}
          className="w-full py-3.5 mt-3 rounded-2xl font-black text-[12px] uppercase tracking-widest text-gray-400 active:scale-[0.98] transition-all border border-gray-150 hover:bg-gray-50"
        >
          Créer un compte gratuit
        </button>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 mt-5">
          <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">100% sécurisé</span>
          <span className="text-gray-200">·</span>
          <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Gratuit</span>
          <span className="text-gray-200">·</span>
          <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Sans engagement</span>
        </div>
      </div>
    </div>
  );
}
