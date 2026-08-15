import { useState, useEffect } from "react";
import { Calendar, Clock, MapPin, CheckCircle2, Plus, Star, ChevronLeft, ChevronRight, Scissors, LayoutGrid, X, Hash, Phone, User, CreditCard } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import PostServiceReview from "@/components/reservation/PostServiceReview";
import RoutineModal from "@/components/routine/RoutineModal";
import RoutineDashboard from "@/components/routine/RoutineDashboard";

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const MAIN_TABS = ["À venir", "Passés", "Annulés", "Calendrier"];

// Convertit une réservation BDD en event calendrier
function reservationToEvent(r) {
  return {
    id: r.id,
    service: r.service_name,
    salon: r.salon_name || r.pro_name || "",
    date: r.date,
    time: r.time || r.time_slot,
    location: r.salon_address || "",
    status: r.status === "confirme" ? "confirmed" : r.status === "annule" ? "cancelled" : "pending",
    type: "rdv",
    dateObj: new Date(r.date),
    pro_email: r.pro_email,
    pro_name: r.pro_name,
    service_name: r.service_name,
    raw: r,
  };
}

function routineToEvents(routine) {
  // Génère les dates de la routine pour le mois courant et les 2 prochains mois
  const events = [];
  const today = new Date();
  const startDate = routine.objectif_debut ? new Date(routine.objectif_debut) : new Date(routine.created_date || today);
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 2);

  const colorMap = {
    "bg-blue-100": { color: "bg-blue-100", textColor: "text-blue-700" },
    "bg-pink-100": { color: "bg-pink-100", textColor: "text-pink-700" },
    "bg-purple-100": { color: "bg-purple-100", textColor: "text-purple-700" },
    "bg-green-100": { color: "bg-green-100", textColor: "text-green-700" },
    "bg-orange-100": { color: "bg-orange-100", textColor: "text-orange-700" },
    "bg-yellow-100": { color: "bg-yellow-100", textColor: "text-yellow-700" },
  };
  const colorInfo = colorMap[routine.color] || { color: "bg-blue-100", textColor: "text-blue-700" };

  // Calculer les jours de la semaine selon frequency
  let targetDays = []; // 0=dim, 1=lun, ..., 6=sam
  if (routine.frequency === "quotidien") {
    targetDays = [0, 1, 2, 3, 4, 5, 6];
  } else if (routine.days_of_week?.length > 0) {
    targetDays = routine.days_of_week;
  } else {
    targetDays = [1]; // lundi par défaut
  }

  const cur = new Date(Math.max(startDate, new Date(today.getFullYear(), today.getMonth() - 1, 1)));
  while (cur <= endDate) {
    if (targetDays.includes(cur.getDay())) {
      const dateStr = cur.toISOString().slice(0, 10);
      events.push({
        id: `routine-${routine.id}-${dateStr}`,
        service: routine.name,
        date: dateStr,
        time: routine.time || "",
        dateObj: new Date(cur),
        type: "routine",
        icon: routine.emoji || "✨",
        detail: `${routine.duration_min || 20} min`,
        ...colorInfo,
      });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return events;
}

function CalendarView({ reservations }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [routines, setRoutines] = useState([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => data?.user).then(user => {
      if (!user) return;
      entities.RoutineBeaute.filter({ user_email: user.email, status: "active" }, "-created_at", 50)
        .then(setRoutines).catch(() => {});
    }).catch(() => {});
  }, []);

  const rdvEvents = reservations.filter(r => r.status !== "annule").map(reservationToEvent);
  const routineEvents = routines.flatMap(routineToEvents);
  const allEvents = [...rdvEvents, ...routineEvents];

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const getEventsForDay = (day) => {
    const d = new Date(currentYear, currentMonth, day);
    return allEvents.filter(e =>
      e.dateObj.getFullYear() === d.getFullYear() &&
      e.dateObj.getMonth() === d.getMonth() &&
      e.dateObj.getDate() === d.getDate()
    );
  };

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const isToday = (day) => {
    const d = new Date(currentYear, currentMonth, day);
    return d.toDateString() === today.toDateString();
  };

  return (
    <div className="px-4 space-y-4">
      {/* Month Navigator */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={prevMonth} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <h2 className="text-[16px] font-black text-gray-900">{MONTHS_FR[currentMonth]} {currentYear}</h2>
          <button onClick={nextMonth} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 px-3 pb-1">
          {DAYS_FR.map(d => (
            <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase tracking-wider py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0 px-3 pb-4">
          {/* Empty cells for first day */}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const events = getEventsForDay(day);
            const hasRdv = events.some(e => e.type === "rdv");
            const hasRoutine = events.some(e => e.type === "routine");
            const isSelected = selectedDate === day;
            const todayDay = isToday(day);

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={`relative flex flex-col items-center justify-center rounded-2xl py-2 mx-0.5 mb-1 transition-all active:scale-95 ${
                  isSelected ? "bg-primary" :
                  todayDay ? "bg-primary/10" : ""
                }`}
              >
                <span className={`text-[13px] font-black ${isSelected ? "text-white" : todayDay ? "text-primary" : "text-gray-700"}`}>{day}</span>
                {(hasRdv || hasRoutine) && (
                  <div className="flex gap-0.5 mt-0.5">
                    {hasRdv && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-primary"}`} />}
                    {hasRoutine && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white/70" : "bg-blue-400"}`} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-5 pb-4 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-[10px] font-bold text-gray-500">Rendez-vous</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <span className="text-[10px] font-bold text-gray-500">Routine</span>
          </div>
        </div>
      </div>

      {/* Events for selected day */}
      {selectedDate && (
        <div className="space-y-3">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">
            {selectedEvents.length === 0 ? "Aucun événement" : `${selectedEvents.length} événement${selectedEvents.length > 1 ? "s" : ""} — ${selectedDate} ${MONTHS_FR[currentMonth]}`}
          </p>
          {selectedEvents.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-sm">
              <p className="text-[13px] text-gray-400 font-medium">Journée libre 🌸</p>
              <Link to="/services" className="mt-3 inline-block bg-primary text-white text-[11px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl shadow-md shadow-primary/30">
                Réserver
              </Link>
            </div>
          ) : (
            selectedEvents.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))
          )}
        </div>
      )}

      {/* Upcoming events */}
      {!selectedDate && (
        <div className="space-y-3">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Prochains rendez-vous</p>
          {allEvents.filter(e => e.dateObj >= today).length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-sm">
              <p className="text-[13px] text-gray-400 font-medium">Aucun RDV à venir 🌸</p>
              <Link to="/services" className="mt-3 inline-block bg-primary text-white text-[11px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl shadow-md shadow-primary/30">Réserver</Link>
            </div>
          ) : (
            allEvents
              .filter(e => e.dateObj >= today)
              .sort((a, b) => a.dateObj - b.dateObj)
              .slice(0, 5)
              .map(ev => <EventCard key={ev.id} event={ev} />)
          )}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }) {
  const dateObj = new Date(event.date);
  const dayName = DAYS_FR[dateObj.getDay()];
  const dayNum = dateObj.getDate();
  const monthShort = MONTHS_FR[dateObj.getMonth()].slice(0, 3);

  if (event.type === "routine") {
    return (
      <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 overflow-hidden`}>
        <div className={`w-16 shrink-0 ${event.color} flex flex-col items-center justify-center py-4`}>
          <span className="text-2xl">{event.icon}</span>
          <span className="text-[9px] font-black text-gray-500 uppercase mt-1">{dayName}</span>
          <span className="text-[14px] font-black text-gray-800">{dayNum}</span>
        </div>
        <div className="flex-1 py-3 pr-3">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${event.color} ${event.textColor}`}>ROUTINE</span>
          </div>
          <p className="text-[14px] font-black text-gray-900">{event.service}</p>
          <p className="text-[11px] font-medium text-gray-400 mt-0.5">{event.detail}</p>
          <div className="flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3 text-gray-300" />
            <span className="text-[11px] font-bold text-gray-400">{event.time}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 overflow-hidden">
      <div className="w-16 shrink-0 bg-primary/10 flex flex-col items-center justify-center py-4">
        <span className="text-[9px] font-black text-primary uppercase">{dayName}</span>
        <span className="text-[20px] font-black text-primary">{dayNum}</span>
        <span className="text-[9px] font-bold text-primary/70">{monthShort}</span>
      </div>
      <div className="flex-1 py-3">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Scissors className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-black text-primary uppercase tracking-widest">RDV</span>
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${event.status === "confirmed" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-500"}`}>
            {event.status === "confirmed" ? "Confirmé" : "En attente"}
          </span>
        </div>
        <p className="text-[14px] font-black text-gray-900">{event.service}</p>
        <p className="text-[11px] font-bold text-gray-400">{event.salon}</p>
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-gray-300" />
            <span className="text-[11px] font-bold text-gray-500">{event.time}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-gray-300" />
            <span className="text-[11px] font-bold text-gray-400">{event.location}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RendezVous() {
  const [activeTab, setActiveTab] = useState(0);
  const [reviewModal, setReviewModal] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [showRoutineDashboard, setShowRoutineDashboard] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("payment") === "success") {
      setPaymentSuccess(true);
      // Nettoyer l'URL sans rechargement
      window.history.replaceState({}, "", "/rendez-vous");
      setTimeout(() => setPaymentSuccess(false), 6000);
    }
  }, [location.search]);

  const loadReservations = () => {
    supabase.auth.getUser().then(({ data }) => data?.user).then(user => {
      if (!user) { setLoading(false); return; }
      entities.Reservation.filter({ client_email: user.email }, "-date", 100)
        .then(data => setReservations(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = reservations.filter(r => r.date >= today && !["annule"].includes(r.status));
  const past = reservations.filter(r => r.date < today || r.status === "termine");
  const cancelled = reservations.filter(r => r.status === "annule");

  return (
    <div className="font-display pb-4">

      {/* Bannière de succès paiement */}
      {paymentSuccess && (
        <div className="mx-5 mt-4 bg-green-500 text-white rounded-2xl px-4 py-4 flex items-center gap-3 shadow-lg shadow-green-500/30">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <div>
            <p className="text-[14px] font-black">Paiement réussi ! 🎉</p>
            <p className="text-[11px] text-white/80 font-medium">Votre réservation est confirmée. Vous recevrez un email de confirmation.</p>
          </div>
        </div>
      )}

      {/* Modals */}
      {showRoutineModal && (
        <RoutineModal onClose={() => setShowRoutineModal(false)} onCreated={() => setShowRoutineModal(false)} />
      )}
      {showRoutineDashboard && (
        <RoutineDashboard onClose={() => setShowRoutineDashboard(false)} />
      )}

      {/* Menu ajout */}
      {showAddMenu && (
        <div className="fixed inset-0 z-[200] flex items-end" onClick={() => setShowAddMenu(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white w-full rounded-t-3xl px-5 pt-4 pb-10 z-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-[18px] font-black text-gray-900 mb-1">Ajouter</h3>
            <p className="text-[13px] text-gray-400 font-medium mb-5">Que souhaitez-vous créer ?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setShowAddMenu(false); navigate("/services"); }}
                className="flex flex-col items-center gap-3 py-6 bg-orange-50 border-2 border-primary rounded-3xl active:scale-95 transition-all"
              >
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
                  <Scissors className="w-6 h-6 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-black text-primary">Réservation</p>
                  <p className="text-[11px] text-gray-400 font-medium">Prenez un RDV</p>
                </div>
              </button>
              <button
                onClick={() => { setShowAddMenu(false); setShowRoutineModal(true); }}
                className="flex flex-col items-center gap-3 py-6 bg-blue-50 border-2 border-blue-400 rounded-3xl active:scale-95 transition-all"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
                  <span className="text-[24px]">✨</span>
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-black text-blue-600">Routine</p>
                  <p className="text-[11px] text-gray-400 font-medium">Créez une routine</p>
                </div>
              </button>
            </div>
            <button onClick={() => setShowAddMenu(false)} className="w-full text-center text-[11px] font-black text-gray-400 mt-4 uppercase tracking-widest">Annuler</button>
          </div>
        </div>
      )}

      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black text-gray-900">Rendez-vous</h1>
          <p className="text-[13px] font-medium text-gray-400 mt-0.5">Gérez vos soins & routines</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tableau de bord routines */}
          <button
            onClick={() => setShowRoutineDashboard(true)}
            className="w-10 h-10 bg-white border border-gray-200 rounded-2xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
          >
            <LayoutGrid className="w-5 h-5 text-gray-600" />
          </button>
          {/* Bouton + */}
          <button
            onClick={() => setShowAddMenu(true)}
            className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-md shadow-primary/30 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-5 mb-4 overflow-x-auto hide-scrollbar">
        {MAIN_TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wide transition-all ${
              activeTab === i
                ? "bg-primary text-white shadow-md shadow-primary/30"
                : "bg-white text-gray-400 border border-gray-100"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>



      {/* Prochain RDV — visible sur tous les onglets sauf Calendrier */}
      {activeTab !== 3 && (() => {
        const next = upcoming.sort((a, b) => a.date.localeCompare(b.date) || a.time_slot?.localeCompare(b.time_slot))[0];
        if (!next) return null;
        return (
          <div className="px-5 mb-4">
            <div className="bg-gradient-to-r from-primary to-orange-600 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-primary/20">
              <div>
                <p className="text-[11px] font-black text-white/70 uppercase tracking-widest">Prochain RDV</p>
                <p className="text-[15px] font-black text-white mt-0.5">{next.service_name}</p>
                <p className="text-[11px] text-white/80 font-medium mt-0.5">
                  {DAYS_FR[new Date(next.date).getDay()]} {new Date(next.date).getDate()} {MONTHS_FR[new Date(next.date).getMonth()].slice(0,3)} · {next.time || next.time_slot}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* À venir */}
      {activeTab === 0 && (
        <div className="px-5 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-[15px] font-black text-gray-400">Aucun RDV à venir</p>
              <Link to="/services" className="mt-3 inline-block bg-primary text-white text-[11px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl">Réserver</Link>
            </div>
          ) : upcoming.map((r) => (
            <div key={r.id} onClick={() => setSelectedReservation(r)} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex active:scale-[0.99] transition-all cursor-pointer">
              <div className="w-20 shrink-0 bg-primary/10 flex flex-col items-center justify-center py-4">
                <span className="text-[9px] font-black text-primary uppercase">{DAYS_FR[new Date(r.date).getDay()]}</span>
                <span className="text-[22px] font-black text-primary leading-none">{new Date(r.date).getDate()}</span>
                <span className="text-[9px] font-bold text-primary/70">{MONTHS_FR[new Date(r.date).getMonth()].slice(0,3)}</span>
              </div>
              <div className="p-3 flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[14px] font-black text-gray-900 truncate">{r.service_name}</h3>
                  <span className={`shrink-0 text-[9px] font-black uppercase px-2 py-1 rounded-full ${r.status === "confirme" ? "bg-green-50 text-green-600" : "bg-primary/10 text-primary"}`}>
                    {r.status === "confirme" ? "Confirmé" : "En attente"}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-gray-400 mt-0.5">{r.salon_name || r.pro_name}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-primary" />
                    <span className="text-[11px] font-bold text-gray-700">{r.time || r.time_slot}</span>
                  </div>
                  {r.total_price > 0 && (
                    <span className="text-[11px] font-black text-primary">{r.total_price}€</span>
                  )}
                </div>
                {r.salon_address && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-gray-300" />
                    <span className="text-[11px] font-bold text-gray-400 truncate">{r.salon_address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Passés */}
      {activeTab === 1 && (
        <div className="px-5 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : past.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-[15px] font-black text-gray-400">Aucun RDV passé</p>
            </div>
          ) : past.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-black text-gray-900 truncate">{r.service_name}</p>
                <p className="text-[11px] font-bold text-gray-400">{r.salon_name || r.pro_name} · {r.date}</p>
              </div>
              <button
                onClick={() => setReviewModal(r)}
                className="shrink-0 flex items-center gap-1.5 bg-primary/10 text-primary text-[11px] font-black px-3 py-2 rounded-xl active:scale-95 transition-all uppercase tracking-widest"
              >
                <Star className="w-3.5 h-3.5 fill-primary" />
                Avis
              </button>
            </div>
          ))}
        </div>
      )}

      {reviewModal && (
        <PostServiceReview
          reservation={reviewModal}
          proEmail={reviewModal.pro_email}
          proName={reviewModal.pro_name || reviewModal.salon_name}
          onClose={() => setReviewModal(null)}
          onSubmitted={() => setReviewModal(null)}
        />
      )}

      {/* Annulés */}
      {activeTab === 2 && (
        <div className="px-5 space-y-3">
          {cancelled.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-[15px] font-black text-gray-400">Aucun RDV annulé</p>
            </div>
          ) : cancelled.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3 shadow-sm opacity-60">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-black text-gray-900 truncate">{r.service_name}</p>
                <p className="text-[11px] font-bold text-gray-400">{r.salon_name} · {r.date}</p>
              </div>
              <span className="text-[9px] font-black text-red-400 uppercase bg-red-50 px-2 py-1 rounded-full">Annulé</span>
            </div>
          ))}
        </div>
      )}

      {/* Calendrier */}
      {activeTab === 3 && <CalendarView reservations={reservations} />}

      {/* Modal récapitulatif RDV */}
      {selectedReservation && (
        <div className="fixed inset-0 z-[300] flex items-end" onClick={() => setSelectedReservation(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white w-full rounded-t-3xl z-10 overflow-hidden" onClick={e => e.stopPropagation()}
            style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 16px))" }}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
              <h3 className="text-[17px] font-black text-gray-900">Récapitulatif RDV</h3>
              <button onClick={() => setSelectedReservation(null)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Service & statut */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[18px] font-black text-gray-900 leading-tight">{selectedReservation.service_name}</p>
                  <p className="text-[13px] font-bold text-gray-400 mt-0.5">{selectedReservation.salon_name || selectedReservation.pro_name}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-black uppercase px-3 py-1.5 rounded-full ${selectedReservation.status === "confirme" ? "bg-green-50 text-green-600" : "bg-primary/10 text-primary"}`}>
                  {selectedReservation.status === "confirme" ? "Confirmé ✓" : "En attente"}
                </span>
              </div>

              {/* Détails */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</p>
                    <p className="text-[13px] font-black text-gray-900">
                      {DAYS_FR[new Date(selectedReservation.date).getDay()]} {new Date(selectedReservation.date).getDate()} {MONTHS_FR[new Date(selectedReservation.date).getMonth()]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Heure</p>
                    <p className="text-[13px] font-black text-gray-900">
                      {selectedReservation.time || selectedReservation.time_slot}{selectedReservation.end_time_slot ? ` → ${selectedReservation.end_time_slot}` : ""}
                      {selectedReservation.duration_min ? ` (${selectedReservation.duration_min} min)` : ""}
                    </p>
                  </div>
                </div>
                {(selectedReservation.salon_address) && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Adresse</p>
                      <p className="text-[13px] font-black text-gray-900">{selectedReservation.salon_address}</p>
                    </div>
                  </div>
                )}
                {selectedReservation.total_price > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                      <CreditCard className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Montant</p>
                      <p className="text-[13px] font-black text-gray-900">{selectedReservation.total_price} €</p>
                    </div>
                  </div>
                )}
                {selectedReservation.persons > 1 && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Personnes</p>
                      <p className="text-[13px] font-black text-gray-900">{selectedReservation.persons} personnes</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Code CRG */}
              {selectedReservation.crg_code && (
                <div className="bg-gradient-to-br from-primary/10 to-orange-50 border-2 border-primary/30 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-primary" />
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Code à communiquer au professionnel</p>
                  </div>
                  <p className="text-[36px] font-black text-gray-900 tracking-[0.3em] text-center py-2">{selectedReservation.crg_code}</p>
                  <p className="text-[10px] text-gray-400 font-medium text-center">Présentez ce code au professionnel pour valider votre arrivée</p>
                </div>
              )}

              {/* Notes */}
              {selectedReservation.notes && (
                <div className="bg-blue-50 rounded-2xl p-3">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Notes</p>
                  <p className="text-[12px] text-gray-700 font-medium">{selectedReservation.notes}</p>
                </div>
              )}

              {/* Boutons calendrier */}
              <div className="space-y-2 pt-2">
                {/* Google Calendar */}
                <a
                  href={(() => {
                    const pad = (n) => String(n).padStart(2, "0");
                    const [y, mo, d] = (selectedReservation.date || "2000-01-01").split("-").map(Number);
                    const [sh, sm] = (selectedReservation.time || selectedReservation.time_slot || "00:00").split(":").map(Number);
                    const endT = sh * 60 + sm + (selectedReservation.duration_min || 60);
                    const eh = Math.floor(endT / 60) % 24, em = endT % 60;
                    const fmt = (yy, mm, dd, hh, min) => `${yy}${pad(mm)}${pad(dd)}T${pad(hh)}${pad(min)}00`;
                    const p = new URLSearchParams({
                      action: "TEMPLATE",
                      text: `💆 BeautyBook – ${selectedReservation.service_name || "RDV"}`,
                      dates: `${fmt(y, mo, d, sh, sm)}/${fmt(y, mo, d, eh, em)}`,
                      details: `Prestataire: ${selectedReservation.salon_name || selectedReservation.pro_name || ""}\nCode: ${selectedReservation.crg_code || ""}`,
                      location: selectedReservation.salon_address || selectedReservation.salon_name || "",
                    });
                    return `https://calendar.google.com/calendar/render?${p.toString()}`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-[#4285F4] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all w-full"
                >
                  <Calendar className="w-4 h-4" />
                  Ajouter à Google Calendar
                </a>
                {/* Apple Calendar */}
                {(() => {
                  const pad = (n) => String(n).padStart(2, "0");
                  const [y, mo, d] = (selectedReservation.date || "2000-01-01").split("-").map(Number);
                  const [sh, sm] = (selectedReservation.time || selectedReservation.time_slot || "00:00").split(":").map(Number);
                  const endT = sh * 60 + sm + (selectedReservation.duration_min || 60);
                  const eh = Math.floor(endT / 60) % 24, em = endT % 60;
                  const fmtDate = (dt) => `${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
                  const dtStart = new Date(y, mo-1, d, sh, sm);
                  const dtEnd = new Date(y, mo-1, d, eh, em);
                  const ics = [
                    "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//BeautyBook//FR",
                    "BEGIN:VEVENT",
                    `DTSTART:${fmtDate(dtStart)}`,
                    `DTEND:${fmtDate(dtEnd)}`,
                    `SUMMARY:💆 ${selectedReservation.service_name || "RDV"}`,
                    `DESCRIPTION:Prestataire: ${selectedReservation.salon_name || ""}\\nCode: ${selectedReservation.crg_code || ""}`,
                    `LOCATION:${selectedReservation.salon_address || selectedReservation.salon_name || ""}`,
                    "STATUS:CONFIRMED",
                    "BEGIN:VALARM","TRIGGER:-P1D","ACTION:DISPLAY","DESCRIPTION:Rappel: votre RDV BeautyBook demain","END:VALARM",
                    "BEGIN:VALARM","TRIGGER:-PT2H","ACTION:DISPLAY","DESCRIPTION:Rappel: votre RDV BeautyBook dans 2 heures","END:VALARM",
                    "END:VEVENT","END:VCALENDAR"
                  ].join("\r\n");
                  const blob = new Blob([ics], { type: "text/calendar" });
                  const url = URL.createObjectURL(blob);
                  return (
                    <button
                      onClick={() => window.open(url, "_blank")}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all w-full"
                    >
                      <Calendar className="w-4 h-4" />
                      Ajouter à Apple Calendar
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}