import { useNavigate } from "react-router-dom";
import { X, Lock, UserPlus } from "lucide-react";

export default function AuthModal({ open, onClose, message }) {
  const navigate = useNavigate();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-[28px] w-full max-w-[340px] p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fadeInUp 0.3s ease-out" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition-all"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        <div className="w-14 h-14 bg-gradient-to-br from-[#E8732A] to-[#E84466] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
          <Lock className="w-7 h-7 text-white" />
        </div>

        <h3 className="text-[20px] font-black text-gray-900 text-center mb-2">
          Connectez-vous
        </h3>
        <p className="text-[13px] text-gray-400 font-medium text-center mb-6 leading-relaxed">
          {message || "Vous devez avoir un compte pour accéder à cette fonctionnalité."}
        </p>

        <button
          onClick={() => { onClose(); navigate("/connexion"); }}
          className="w-full py-3.5 rounded-2xl font-black text-[13px] uppercase tracking-widest text-white active:scale-[0.98] transition-all shadow-lg"
          style={{ background: "linear-gradient(135deg, #E8732A, #E84466)" }}
        >
          Se connecter
        </button>

        <button
          onClick={() => { onClose(); navigate("/onboarding"); }}
          className="w-full py-3 mt-2.5 rounded-2xl font-black text-[12px] uppercase tracking-widest text-gray-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Créer un compte
        </button>
      </div>
    </div>
  );
}
