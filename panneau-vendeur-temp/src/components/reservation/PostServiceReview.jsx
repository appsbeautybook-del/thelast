import { useState } from "react";
import { Star, X, Loader } from "lucide-react";
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';

export default function PostServiceReview({ reservation, proEmail, proName, onClose, onSubmitted }) {
  const [note, setNote] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (note === 0) return;
    setSaving(true);
    await entities.Avis.create({
      reservation_id: reservation.id,
      type: "client_to_pro",
      auteur_email: reservation.client_email,
      auteur_nom: reservation.client_name,
      cible_email: proEmail || reservation.pro_email,
      cible_nom: proName || reservation.pro_name,
      note,
      commentaire,
      service_nom: reservation.service_name,
    });
    setSaving(false);
    setDone(true);
    setTimeout(() => { onSubmitted?.(); onClose?.(); }, 1800);
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-[200] flex items-end bg-black/30 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-t-3xl w-full px-6 pt-5 pb-10 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-300">
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <Star className="w-8 h-8 text-white fill-white" />
            </div>
            <p className="text-[18px] font-black text-gray-900">Merci pour votre avis !</p>
            <p className="text-[13px] text-gray-400 font-medium">Il est maintenant visible sur la fiche du service.</p>
          </div>
          <button onClick={onClose} className="w-full py-4 rounded-2xl font-black text-[14px] uppercase tracking-widest text-white" style={{ background: "#E8732A" }}>
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full px-6 pt-5 pb-10 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-300">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-1">Votre avis compte</p>
          <h3 className="text-[22px] font-black text-gray-900 leading-tight">
            Comment s'est passée<br />votre prestation ?
          </h3>
          <p className="text-[13px] text-gray-400 font-medium mt-1">{reservation.service_name} chez {proName || reservation.salon_name}</p>
        </div>

        {/* Étoiles */}
        <div className="flex justify-center gap-3 mb-6">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setNote(star)}
              className="active:scale-110 transition-all"
            >
              <Star
                className="w-10 h-10 transition-all"
                fill={(hovered || note) >= star ? "#E8732A" : "none"}
                stroke={(hovered || note) >= star ? "#E8732A" : "#d1d5db"}
              />
            </button>
          ))}
        </div>

        {note > 0 && (
          <p className="text-center text-[13px] font-black text-primary mb-4">
            {["", "Pas satisfait", "Peut mieux faire", "Correct", "Bien", "Excellent !"][note]}
          </p>
        )}

        {/* Commentaire */}
        <div className="mb-5">
          <textarea
            value={commentaire}
            onChange={e => setCommentaire(e.target.value)}
            placeholder="Décrivez votre expérience (optionnel)..."
            rows={3}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-medium text-gray-700 outline-none resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={note === 0 || saving}
          className="w-full py-4 rounded-2xl font-black text-[14px] uppercase tracking-widest text-white flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
          style={{ background: "#E8732A" }}
        >
          {saving ? <><Loader className="w-4 h-4 animate-spin" />Envoi...</> : <>Publier mon avis →</>}
        </button>

        <button onClick={onClose} className="w-full text-center text-[11px] font-black text-gray-300 mt-3 uppercase tracking-widest">Plus tard</button>
      </div>
    </div>
  );
}