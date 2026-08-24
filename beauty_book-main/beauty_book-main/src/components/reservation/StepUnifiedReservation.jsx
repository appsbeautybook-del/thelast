import { useState, useEffect } from "react";
import { ArrowLeft, Calendar as CalendarIcon, Clock, User, Check, ChevronRight, ChevronLeft, Sun, Cloud, Users } from "lucide-react";
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay, isSameMonth, isBefore, startOfDay, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { entities } from "@/api/entities";

export default function StepUnifiedReservation({
  booking,
  proProfile,
  onUpdateBooking,
  onNext,
  onBack
}) {
  const primaryService = booking.services?.[0] || {};
  const proEmail = primaryService.pro_email || booking.salon?.pro_email;

  const [selectedDate, setSelectedDate] = useState(booking.date || addDays(new Date(), 1));
  const [selectedTime, setSelectedTime] = useState(booking.time || null);
  const [selectedExpert, setSelectedExpert] = useState(booking.expert || null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Fetch team members
  useEffect(() => {
    if (!proEmail) return;
    setLoadingTeam(true);
    entities.MembreEquipe.filter({ pro_email: proEmail, status: "active" }, "-created_at", 50)
      .then(res => { setTeamMembers(res || []); setLoadingTeam(false); })
      .catch(() => setLoadingTeam(false));
  }, [proEmail]);

  // Generate calendar days for month view
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const timeSlots = [
    { time: "09:00", period: "morning" },
    { time: "10:00", period: "morning" },
    { time: "11:00", period: "morning" },
    { time: "12:00", period: "morning" },
    { time: "13:00", period: "afternoon" },
    { time: "14:00", period: "afternoon" },
    { time: "15:00", period: "afternoon" },
    { time: "16:00", period: "afternoon" },
    { time: "17:00", period: "afternoon" },
    { time: "18:00", period: "afternoon" },
    { time: "19:00", period: "afternoon" },
  ];

  // Simulate availability per slot (6 seats max)
  const getAvailability = (time) => {
    const seed = time.charCodeAt(0) + (selectedDate?.getDate() || 0);
    return Math.max(0, Math.min(6, (seed % 5) + 1));
  };

  const morningSlots = timeSlots.filter(s => s.period === "morning");
  const afternoonSlots = timeSlots.filter(s => s.period === "afternoon");

  const morningAvailable = morningSlots.filter(s => getAvailability(s.time) > 0).length;
  const afternoonAvailable = afternoonSlots.filter(s => getAvailability(s.time) > 0).length;

  const handleValidateStep = () => {
    if (!selectedDate || !selectedTime) return;
    onUpdateBooking({
      date: selectedDate,
      time: selectedTime,
      expert: selectedExpert || "N'importe quel pro disponible",
    });
    onNext();
  };

  const totalAmount = booking.services.reduce((sum, s) => sum + (parseFloat(s.price) || 0) * (s.persons || 1), 0);
  const totalMin = booking.services.reduce((sum, s) => sum + (parseInt(s.duration || s.duration_min) || 60), 0);

  const isDateDisabled = (day) => {
    if (isBefore(day, startOfDay(new Date()))) return true;
    return false;
  };

  // Check if date has availability (simulated)
  const dateHasAvailability = (day) => {
    if (isDateDisabled(day)) return false;
    const dayOfWeek = day.getDay();
    if (dayOfWeek === 0) return false; // Closed on Sunday
    const seed = day.getDate() + day.getMonth();
    return seed % 7 !== 0;
  };

  return (
    <div className="min-h-screen bg-[#FFF5F0] font-display pb-36">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl px-5 pt-12 pb-4 flex items-center justify-between border-b border-gray-100 shadow-sm">
        <button onClick={onBack} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all">
          <ArrowLeft className="w-5 h-5 text-gray-900" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black text-[#E8732A] uppercase tracking-widest">Étape 1 sur 3</p>
          <p className="text-[17px] font-black text-gray-900">Date, Horaire & Professionnel</p>
        </div>
        <div className="w-9" />
      </div>

      <div className="px-5 pt-5 space-y-5">

        {/* Selected Service Card Summary */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center shrink-0 border border-orange-200">
            <CalendarIcon className="w-7 h-7 text-[#E8732A]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-black text-gray-900 truncate">
              {primaryService.title || primaryService.name || "Réservation Service"}
            </p>
            <div className="flex items-center gap-2 mt-1 text-[12px] text-gray-400 font-medium">
              <span>{totalMin} min</span>
              <span>•</span>
              <span className="font-black text-gray-900">{totalAmount} €</span>
            </div>
          </div>
        </div>

        {/* 1. CALENDAR - Full Month View */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h3 className="text-[17px] font-black text-gray-900 capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: fr })}
            </h3>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              const inMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const disabled = isDateDisabled(day);
              const hasAvailability = dateHasAvailability(day);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={i}
                  onClick={() => !disabled && inMonth && setSelectedDate(day)}
                  disabled={!inMonth || disabled}
                  className={`relative flex flex-col items-center justify-center py-2.5 rounded-xl transition-all active:scale-95 ${
                    !inMonth ? "opacity-0 pointer-events-none" :
                    isSelected ? "bg-[#E8732A] shadow-md" :
                    disabled ? "text-gray-300 cursor-not-allowed" :
                    "text-gray-900 hover:bg-orange-50"
                  }`}
                >
                  <span className={`text-[15px] font-black ${
                    isSelected ? "text-white" :
                    isToday ? "text-[#E8732A]" : ""
                  }`}>
                    {format(day, "d")}
                  </span>
                  {/* Availability dot */}
                  {inMonth && !disabled && (
                    <div className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      isSelected ? "bg-white/80" :
                      hasAvailability ? "bg-[#E8732A]" : "bg-gray-300"
                    }`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 pt-2 border-t border-gray-50">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#E8732A]" />
              <span className="text-[10px] font-bold text-gray-400">Disponible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <span className="text-[10px] font-bold text-gray-400">Complet / Fermé</span>
            </div>
          </div>
        </div>

        {/* 2. TIME SLOTS - Grouped by Matinée / Après-midi */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#E8732A]" />
            <h3 className="text-[16px] font-black text-gray-900">Créneaux du {selectedDate ? format(selectedDate, "EEEE d MMMM", { locale: fr }) : "..."}</h3>
          </div>

          {/* Matinée */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="text-[14px] font-black text-gray-800">Matinée</span>
              </div>
              <span className="text-[11px] font-black text-[#E8732A] uppercase tracking-wider">{morningAvailable} DISPO</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {morningSlots.map(({ time }) => {
                const seats = getAvailability(time);
                const isSelected = selectedTime === time;
                const isEmpty = seats === 0;
                return (
                  <button
                    key={time}
                    onClick={() => !isEmpty && setSelectedTime(time)}
                    disabled={isEmpty}
                    className={`px-4 py-3 rounded-2xl border-2 flex flex-col items-center min-w-[70px] transition-all active:scale-95 ${
                      isSelected ? "border-[#E8732A] bg-[#E8732A] shadow-md" :
                      isEmpty ? "border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed" :
                      "border-gray-100 bg-white"
                    }`}
                  >
                    <span className={`text-[15px] font-black ${isSelected ? "text-white" : "text-gray-900"}`}>
                      {time}
                    </span>
                    <span className={`text-[10px] font-bold ${isSelected ? "text-white/80" : "text-[#E8732A]"}`}>
                      {isEmpty ? "Complet" : `${seats} sièges`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Après-midi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-orange-300" />
                <span className="text-[14px] font-black text-gray-800">Après-midi</span>
              </div>
              <span className="text-[11px] font-black text-[#E8732A] uppercase tracking-wider">{afternoonAvailable} DISPO</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {afternoonSlots.map(({ time }) => {
                const seats = getAvailability(time);
                const isSelected = selectedTime === time;
                const isEmpty = seats === 0;
                return (
                  <button
                    key={time}
                    onClick={() => !isEmpty && setSelectedTime(time)}
                    disabled={isEmpty}
                    className={`px-4 py-3 rounded-2xl border-2 flex flex-col items-center min-w-[70px] transition-all active:scale-95 ${
                      isSelected ? "border-[#E8732A] bg-[#E8732A] shadow-md" :
                      isEmpty ? "border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed" :
                      "border-gray-100 bg-white"
                    }`}
                  >
                    <span className={`text-[15px] font-black ${isSelected ? "text-white" : "text-gray-900"}`}>
                      {time}
                    </span>
                    <span className={`text-[10px] font-bold ${isSelected ? "text-white/80" : "text-[#E8732A]"}`}>
                      {isEmpty ? "Complet" : `${seats} sièges`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. PROFESSIONAL / TEAM SELECTOR */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#E8732A]" />
            <h3 className="text-[16px] font-black text-gray-900">Choix du Professionnel</h3>
          </div>

          <div className="space-y-2">
            {/* Any professional option */}
            <button
              onClick={() => setSelectedExpert(null)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all active:scale-[0.98] text-left ${
                selectedExpert === null ? "border-[#E8732A] bg-orange-50/60 shadow-sm" : "border-gray-100 bg-white"
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#E8732A] to-[#E84466] text-white font-black flex items-center justify-center text-sm shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-black text-gray-900">N'importe quel pro disponible</p>
                <p className="text-[11px] text-gray-400 font-medium">Premier créneau libre trouvé</p>
              </div>
              {selectedExpert === null && <Check className="w-5 h-5 text-[#E8732A] shrink-0" />}
            </button>

            {/* Salon pro card */}
            {proProfile && (
              <button
                onClick={() => setSelectedExpert(proProfile)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all active:scale-[0.98] text-left ${
                  selectedExpert?.id === proProfile.id ? "border-[#E8732A] bg-orange-50/60 shadow-sm" : "border-gray-100 bg-white"
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-[#E8732A] text-white font-black flex items-center justify-center text-sm shrink-0 overflow-hidden">
                  {proProfile.avatar_url ? (
                    <img src={proProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (proProfile.salon_name || "P")[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-black text-gray-900">{proProfile.salon_name || "Professionnel"}</p>
                  <p className="text-[11px] text-gray-400 font-medium truncate">
                    {proProfile.specialites || "Expert confirmé du salon"}
                  </p>
                </div>
                {selectedExpert?.id === proProfile.id && <Check className="w-5 h-5 text-[#E8732A] shrink-0" />}
              </button>
            )}

            {/* Team members */}
            {loadingTeam && (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-[#E8732A] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {teamMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedExpert(member)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all active:scale-[0.98] text-left ${
                  selectedExpert?.id === member.id ? "border-[#E8732A] bg-orange-50/60 shadow-sm" : "border-gray-100 bg-white"
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-orange-100 text-[#E8732A] font-black flex items-center justify-center text-sm shrink-0 overflow-hidden">
                  {member.membre_avatar ? (
                    <img src={member.membre_avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (member.membre_name || member.name || "M")[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-black text-gray-900">{member.membre_name || member.name}</p>
                  <p className="text-[11px] text-gray-400 font-medium truncate">
                    {member.specialites || member.specialties || member.role || "Membre de l'équipe"}
                  </p>
                </div>
                {selectedExpert?.id === member.id && <Check className="w-5 h-5 text-[#E8732A] shrink-0" />}
              </button>
            ))}

            {!loadingTeam && teamMembers.length === 0 && !proProfile && (
              <div className="text-center py-4 text-[13px] text-gray-400 font-medium">
                Aucun professionnel disponible pour ce service
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-[70px] left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-3 z-[90] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <button
          onClick={handleValidateStep}
          disabled={!selectedDate || !selectedTime}
          className="w-full py-4 rounded-2xl font-black text-[15px] uppercase tracking-widest text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: selectedDate && selectedTime ? "linear-gradient(135deg, #E8732A, #E84466)" : "#ccc", boxShadow: selectedDate && selectedTime ? "0 8px 25px rgba(232,115,42,0.35)" : "none" }}
        >
          Continuer <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
