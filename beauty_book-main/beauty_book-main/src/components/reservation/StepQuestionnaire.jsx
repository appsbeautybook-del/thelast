import { useState, useEffect } from "react";
import { ArrowLeft, Scissors, Save, ChevronRight, Check } from "lucide-react";

const QUESTIONNAIRES = {
  coiffure: [
    { id: "hair_type", question: "Quelle est la nature de vos cheveux ?", options: ["Crépus / Afro (4A-4C)", "Bouclés / Frisés (3A-3C)", "Ondulés (2A-2C)", "Lisses (1A-1C)"] },
    { id: "hair_length", question: "Quelle est votre longueur de cheveux actuelle ?", options: ["Courts", "Mi-longs", "Longs", "Très longs"] },
    { id: "extensions_provided", question: "Fourniture des mèches / rajouts ?", options: ["Mèches fournies par le salon", "J'apporte mes propres mèches"] },
    { id: "sensitivities", question: "Avez-vous des sensibilités particulières ?", options: ["Cuir chevelu sensible", "Bordures délicates", "Aucune particularité"] },
  ],
  onglerie: [
    { id: "nail_status", question: "Quel est l'état actuel de vos ongles ?", options: ["Ongles naturels", "Pose gel/résine à déposer (+15 min)", "Ongles fragiles/abîmés"] },
    { id: "nail_shape", question: "Quelle forme d'ongle souhaitez-vous ?", options: ["Carrée", "Amande", "Stiletto", "Ronde"] },
  ],
  visage: [
    { id: "skin_type", question: "Quel est votre type de peau ?", options: ["Sèche / Déshydratée", "Mixte à Grasse", "Sensible / Réactive", "Normale"] },
    { id: "allergies", question: "Allergies ou réactivités connues ?", options: ["Aucune allergie", "Peau très réactive / Allergique"] },
  ],
  massage: [
    { id: "target_areas", question: "Quelles zones de tension privilégier ?", options: ["Dos & Épaules", "Jambes & Pieds", "Tête & Nuque", "Corps entier"] },
    { id: "pressure", question: "Quelle intensité de pression désirez-vous ?", options: ["Douce & Relaxante", "Modérée", "Forte & Profonde"] },
  ],
  general: [
    { id: "prep_notes", question: "Préférences particulières pour votre rendez-vous", options: ["Silence / Moment de détente", "Conseils personnalisés souhaités", "Pas de préférence"] },
  ]
};

const STORAGE_KEY = "bb_client_service_preferences";

export default function StepQuestionnaire({
  booking,
  onUpdateBooking,
  onNext,
  onBack
}) {
  const primaryService = booking.services?.[0] || {};
  const categoryRaw = (primaryService.category || "coiffure").toLowerCase();

  const getQuestionSet = () => {
    if (categoryRaw.includes("coiff") || categoryRaw.includes("cheveux") || categoryRaw.includes("tresses") || categoryRaw.includes("braid")) return QUESTIONNAIRES.coiffure;
    if (categoryRaw.includes("ongle") || categoryRaw.includes("manucure") || categoryRaw.includes("pedicure") || categoryRaw.includes("nail")) return QUESTIONNAIRES.onglerie;
    if (categoryRaw.includes("visage") || categoryRaw.includes("soin") || categoryRaw.includes("maquillage") || categoryRaw.includes("beaute")) return QUESTIONNAIRES.visage;
    if (categoryRaw.includes("massage") || categoryRaw.includes("spa") || categoryRaw.includes("bien-etre")) return QUESTIONNAIRES.massage;
    return QUESTIONNAIRES.general;
  };

  const questions = getQuestionSet();

  // Load saved preferences from localStorage
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const [savePreference, setSavePreference] = useState(() => {
    try {
      const pref = localStorage.getItem("bb_save_preferences_enabled");
      return pref !== "false";
    } catch {}
    return true;
  });

  // Save answers to localStorage on change
  const handleAnswerSelect = (questionText, option) => {
    setAnswers(prev => {
      const next = { ...prev, [questionText]: option };
      if (savePreference) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  };

  const toggleSavePreference = () => {
    const newVal = !savePreference;
    setSavePreference(newVal);
    try {
      localStorage.setItem("bb_save_preferences_enabled", String(newVal));
      if (!newVal) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
      }
    } catch {}
  };

  const handleValidateStep = () => {
    onUpdateBooking({ customAnswers: answers });
    onNext();
  };

  // Check if all questions answered
  const allAnswered = questions.every(q => answers[q.question]);

  return (
    <div className="min-h-screen bg-[#FFF5F0] font-display pb-36">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl px-5 pt-12 pb-4 flex items-center justify-between border-b border-gray-100 shadow-sm">
        <button onClick={onBack} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all">
          <ArrowLeft className="w-5 h-5 text-gray-900" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black text-[#E8732A] uppercase tracking-widest">Étape 2 sur 3</p>
          <p className="text-[17px] font-black text-gray-900">Vos Préférences</p>
        </div>
        <div className="w-9" />
      </div>

      <div className="px-5 pt-5 space-y-5">

        {/* Save preference toggle */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                <Save className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-[13px] font-black text-gray-900">Sauvegarder mes réponses</p>
                <p className="text-[11px] text-gray-400 font-medium">Réutilisées automatiquement la prochaine fois</p>
              </div>
            </div>
            <button
              onClick={toggleSavePreference}
              className={`relative w-12 h-7 rounded-full transition-all ${savePreference ? "bg-[#E8732A]" : "bg-gray-200"}`}
            >
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${savePreference ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>

        {/* Dynamic Questionnaire Section */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Scissors className="w-5 h-5 text-[#E8732A]" />
            <div>
              <h3 className="text-[16px] font-black text-gray-900">Préparation & Caractéristiques</h3>
              <p className="text-[11px] text-gray-400 font-medium">
                {primaryService.title || primaryService.name || "Votre service"}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {questions.map((qItem, qIdx) => {
              const currentAns = answers[qItem.question] || "";
              return (
                <div key={qIdx} className="space-y-2.5">
                  <p className="text-[14px] font-black text-gray-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-[#E8732A] text-[12px] font-black flex items-center justify-center shrink-0">
                      {qIdx + 1}
                    </span>
                    {qItem.question}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {qItem.options.map((opt) => {
                      const isSelected = currentAns === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleAnswerSelect(qItem.question, opt)}
                          className={`px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border ${
                            isSelected
                              ? "bg-[#E8732A] text-white border-[#E8732A] shadow-sm"
                              : "bg-gray-50 text-gray-700 border-gray-100 hover:bg-gray-100"
                          }`}
                        >
                          {isSelected && <span className="mr-1">✓</span>}
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-[70px] left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-3 z-[90] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <button
          onClick={handleValidateStep}
          className="w-full py-4 rounded-2xl font-black text-[15px] uppercase tracking-widest text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #E8732A, #E84466)", boxShadow: "0 8px 25px rgba(232,115,42,0.35)" }}
        >
          Continuer vers la confirmation <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
