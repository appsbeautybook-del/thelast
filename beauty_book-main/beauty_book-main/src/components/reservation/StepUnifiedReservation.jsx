import { useState, useEffect } from "react";
import { ArrowLeft, Calendar as CalendarIcon, Clock, User, Check, Sparkles, Scissors, Info, Shield, ChevronRight } from "lucide-react";
import { format, addDays, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

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

export default function StepUnifiedReservation({
  booking,
  proProfile,
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
    return QUESTIONNAIRES.coiffure;
  };

  const questions = getQuestionSet();

  // Load saved preferences from localStorage
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem("bb_client_service_preferences");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // State for date & time & expert
  const [selectedDate, setSelectedDate] = useState(booking.date || addDays(new Date(), 1));
  const [selectedTime, setSelectedTime] = useState(booking.time || "10:00");
  const [selectedExpert, setSelectedExpert] = useState(booking.expert || "N'importe quel pro disponible");

  // Generate dates next 14 days
  const availableDates = Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i + 1));
  const timeSlots = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

  // Save answers to localStorage on change
  const handleAnswerSelect = (questionText, option) => {
    setAnswers(prev => {
      const next = { ...prev, [questionText]: option };
      try { localStorage.setItem("bb_client_service_preferences", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleValidateStep = () => {
    onUpdateBooking({
      date: selectedDate,
      time: selectedTime,
      expert: selectedExpert,
      customAnswers: answers
    });
    onNext();
  };

  const totalAmount = booking.services.reduce((sum, s) => sum + (parseFloat(s.price) || 0) * (s.persons || 1), 0);
  const totalMin = booking.services.reduce((sum, s) => sum + (parseInt(s.duration || s.duration_min) || 60), 0);

  return (
    <div className="min-h-screen bg-[#FFF5F0] font-display pb-36">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl px-5 pt-12 pb-4 flex items-center justify-between border-b border-gray-100 shadow-sm">
        <button onClick={onBack} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all">
          <ArrowLeft className="w-5 h-5 text-gray-900" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black text-[#E8732A] uppercase tracking-widest">Étape 1 sur 2</p>
          <p className="text-[17px] font-black text-gray-900">Date, Horaire & Préférences</p>
        </div>
        <div className="w-9" />
      </div>

      <div className="px-5 pt-5 space-y-6">

        {/* Selected Service Card Summary */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center shrink-0 border border-orange-200">
            <Sparkles className="w-7 h-7 text-[#E8732A]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-black text-gray-900 truncate">
              {primaryService.title || primaryService.name || "Réservation Service"}
            </p>
            <div className="flex items-center gap-2 mt-1 text-[12px] text-gray-400 font-medium">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#E8732A]" /> {totalMin} min</span>
              <span>•</span>
              <span className="font-black text-gray-900">{totalAmount} €</span>
            </div>
          </div>
        </div>

        {/* 1. Date Selector */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#E8732A]" />
            <h3 className="text-[16px] font-black text-gray-900">1. Choisissez votre Date</h3>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 hide-scrollbar">
            {availableDates.map((d, i) => {
              const isSelected = isSameDay(d, selectedDate);
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(d)}
                  className={`shrink-0 w-16 py-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all active:scale-95 ${
                    isSelected ? "border-[#E8732A] bg-orange-50/80 shadow-md" : "border-gray-100 bg-white"
                  }`}
                >
                  <span className={`text-[10px] font-black uppercase ${isSelected ? "text-[#E8732A]" : "text-gray-400"}`}>
                    {format(d, "EEE", { locale: fr })}
                  </span>
                  <span className={`text-[18px] font-black ${isSelected ? "text-[#E8732A]" : "text-gray-900"}`}>
                    {format(d, "d")}
                  </span>
                  <span className="text-[9px] font-bold text-gray-400">
                    {format(d, "MMM", { locale: fr })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Time Slot Selector */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#E8732A]" />
            <h3 className="text-[16px] font-black text-gray-900">2. Créneau Horaire</h3>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {timeSlots.map((slot) => {
              const isSelected = selectedTime === slot;
              return (
                <button
                  key={slot}
                  onClick={() => setSelectedTime(slot)}
                  className={`py-3 rounded-xl border-2 text-[13px] font-black transition-all active:scale-95 ${
                    isSelected ? "border-[#E8732A] bg-[#E8732A] text-white shadow-md" : "border-gray-100 bg-gray-50 text-gray-800"
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Expert Selector */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#E8732A]" />
            <h3 className="text-[16px] font-black text-gray-900">3. Choix du Professionnel</h3>
          </div>

          <div className="flex items-center gap-3 bg-orange-50/60 p-3.5 rounded-2xl border border-orange-100">
            <div className="w-10 h-10 rounded-full bg-[#E8732A] text-white font-black flex items-center justify-center text-sm">
              {(proProfile?.salon_name || "P")[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-black text-gray-900">{proProfile?.salon_name || "Pro disponible"}</p>
              <p className="text-[11px] text-gray-500 font-medium">Expert confirmé du salon</p>
            </div>
            <Check className="w-5 h-5 text-[#E8732A]" />
          </div>
        </div>

        {/* 4. DYNAMIC QUESTIONNAIRE SECTION (Adapts by Service Category & Saved in localStorage) */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Scissors className="w-5 h-5 text-[#E8732A]" />
            <div>
              <h3 className="text-[16px] font-black text-gray-900">4. Préparation & Caractéristiques</h3>
              <p className="text-[11px] text-gray-400 font-medium">Sauvegardé automatiquement pour vos prochaines réservations</p>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((qItem, qIdx) => {
              const currentAns = answers[qItem.question] || "";
              return (
                <div key={qIdx} className="space-y-2">
                  <p className="text-[13px] font-black text-gray-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-[#E8732A] text-[11px] font-black flex items-center justify-center">{qIdx + 1}</span>
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
                          className={`px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all border ${
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
