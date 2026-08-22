import { useState, useEffect } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Sun, CloudSun, Moon, Users } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isToday, isBefore, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';

const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_NAMES_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const BUFFER_MIN = 15; // minutes de transition/nettoyage entre chaque prestation

function timeToMin(t) {
  const [h, m] = (t || "00:00").split(":").map(Number);
  return h * 60 + m;
}
function isInConges(date, ouverture) {
  let raw = ouverture;
  if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch {} }
  const conges = raw?.conges || [];
  if (!conges.length) return false;
  const ts = date.getTime();
  return conges.some(c => {
    if (!c?.start || !c?.end) return false;
    const startTs = new Date(c.start + "T00:00:00").getTime();
    const endTs = new Date(c.end + "T23:59:59").getTime();
    return ts >= startTs && ts <= endTs;
  });
}
function addMinutes(t, mins) {
  const total = timeToMin(t) + mins;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function overlaps(startA, endA, startB, endB) {
  return timeToMin(startA) < timeToMin(endB) && timeToMin(endA) > timeToMin(startB);
}

/**
 * Génère les créneaux disponibles pour un jour donné à partir des horaires réels du pro.
 *
 * Règle professionnelle :
 *   L'intervalle entre créneaux = durée du service + buffer de transition (BUFFER_MIN).
 *   Ainsi, un service de 60 min avec 10 min de buffer donne des créneaux espacés de 70 min.
 *   → Pas de chevauchement possible, chaque prestation se termine avant la suivante.
 *
 * Chaque créneau est validé uniquement si sa fin (+ buffer) reste avant la fermeture.
 * Les pauses sont exclues.
 *
 * Retourne { open: false } si le pro est fermé ce jour.
 * Retourne { morning: [], afternoon: [], evening: [] } sinon.
 */
const DEFAULT_OUVERTURE = {
  lundi: { open: true, start: "09:00", end: "19:00" },
  mardi: { open: true, start: "09:00", end: "19:00" },
  mercredi: { open: true, start: "09:00", end: "19:00" },
  jeudi: { open: true, start: "09:00", end: "19:00" },
  vendredi: { open: true, start: "09:00", end: "19:00" },
  samedi: { open: true, start: "09:00", end: "18:00" },
  dimanche: { open: false },
};

function generateSlotsForDay(date, ouverture, pauses = [], duration = 60, travailNuit = false, minSlotMin = null) {
  // Parser ouverture si c'est une string JSON
  let rawOuverture = ouverture;
  if (typeof rawOuverture === "string") {
    try { rawOuverture = JSON.parse(rawOuverture); } catch {}
  }
  // Parser pauses si c'est une string JSON
  let rawPauses = pauses;
  if (typeof rawPauses === "string") {
    try { rawPauses = JSON.parse(rawPauses); } catch {}
  }

  // Vérifier si ouverture contient des jours valides avec la structure { open, start, end }
  const hasRealOuverture = rawOuverture && typeof rawOuverture === "object" && Object.keys(rawOuverture).length > 0 && Object.values(rawOuverture).some(v => v && typeof v === "object" && ("open" in v || "start" in v));
  const ov = hasRealOuverture ? rawOuverture : DEFAULT_OUVERTURE;

  const dow = getDay(date);
  const dayKey = DAY_NAMES_FR[dow];
  const dayConfig = ov[dayKey];

  if (!dayConfig || dayConfig.open === false || dayConfig.open === "false") {
    return { open: false };
  }

  if (isInConges(date, rawOuverture)) {
    return { open: false };
  }

  const interval = duration + BUFFER_MIN;
  const morning = [];
  const afternoon = [];
  const evening = [];
  // Créneaux nocturnes : 21h00 → 07h00 (lendemain, représentés de 21h à 31h en minutes)
  const night = [];

  // Plage journalière normale (ex: 09:00 → 19:00)
  const openMin = timeToMin(dayConfig.start || "09:00");
  const closeMin = timeToMin(dayConfig.end || "18:00");

    let cursor = openMin;
    while (cursor + duration <= closeMin) {
      const slotStr = `${String(Math.floor(cursor / 60)).padStart(2, "0")}:${String(cursor % 60).padStart(2, "0")}`;
      const endStr = addMinutes(slotStr, duration);
      const duringPause = (pauses || []).some(p => {
        const pStart = timeToMin(p.start || "00:00");
        const pEnd = timeToMin(p.end || "00:00");
        return timeToMin(slotStr) < pEnd && timeToMin(endStr) > pStart;
      });
      const isPast = minSlotMin !== null && cursor < minSlotMin;
      if (!duringPause && !isPast) {
        if (cursor < 12 * 60) morning.push(slotStr);
        else if (cursor < 18 * 60) afternoon.push(slotStr);
        else evening.push(slotStr);
      }
      cursor += interval;
    }

  // Plage nocturne si activée : 21h00 → 07h00 (les minutes > 24h sont représentées mod 24h pour l'affichage)
  if (travailNuit) {
    const nightStart = 21 * 60; // 21:00
    const nightEnd = 24 * 60 + 7 * 60; // 31:00 = 07:00 lendemain
    let nightCursor = nightStart;
    while (nightCursor + duration <= nightEnd) {
      const h = Math.floor(nightCursor / 60) % 24;
      const m = nightCursor % 60;
      const slotStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const nightMinSlot = minSlotMin !== null ? (minSlotMin < nightStart ? nightStart : minSlotMin > 24*60 ? minSlotMin - 24*60 : minSlotMin) : null;
      const isNightPast = nightMinSlot !== null && (h * 60 + m) < nightMinSlot;
      if (!isNightPast) night.push(slotStr);
      nightCursor += interval;
    }
  }

  return { open: true, morning, afternoon, evening, night };
}

function TimeSlotGroup({ label, icon: Icon, slots, selected, onSelect, occupancyMap, seatsTotal, duration }) {
  if (!slots || slots.length === 0) return null;

  const availableCount = slots.filter(t => {
    const endT = addMinutes(t, duration);
    const occupied = occupancyMap[`${t}-${endT}`] || 0;
    return occupied < seatsTotal;
  }).length;

  if (!slots || slots.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-gray-400" />
        <p className="text-[15px] font-black text-gray-900">{label}</p>
        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-auto">
          {availableCount} dispo
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {slots.map(time => {
          const endT = addMinutes(time, duration);
          const occupied = occupancyMap[`${time}-${endT}`] || 0;
          const available = seatsTotal - occupied;
          const isFull = available <= 0;
          const isSel = selected === time;
          return (
            <button
              key={time}
              onClick={() => !isFull && onSelect(time)}
              disabled={isFull}
              className="relative px-4 py-2.5 rounded-2xl border-2 text-[13px] font-black transition-all active:scale-95 flex flex-col items-center gap-0.5"
              style={{
                borderColor: isSel ? "#E8732A" : isFull ? "#f0f0f0" : "#e5e7eb",
                background: isSel ? "#E8732A" : isFull ? "#fafafa" : "white",
                color: isSel ? "white" : isFull ? "#d1d5db" : "#111827",
              }}
            >
              <span>{time}</span>
              {seatsTotal > 1 && (
                <span className={`text-[9px] font-black ${isSel ? "text-white/70" : isFull ? "text-red-300" : "text-teal-500"}`}>
                  {isFull ? "Complet" : `${available} siège${available > 1 ? "s" : ""}`}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function StepCalendar({ selectedDate, selectedTime, selectedSeat, expert, price, duration, proEmail, onSelectDate, onSelectTime, onSelectSeat, onNext, onBack }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [occupancyMap, setOccupancyMap] = useState({});
  const [seatsTotal, setSeatsTotal] = useState(1);
  const [proOuverture, setProOuverture] = useState(null);
  const [proPauses, setProPauses] = useState([]);
  const [travailNuit, setTravailNuit] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingPro, setLoadingPro] = useState(true);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = (getDay(startOfMonth(currentMonth)) + 6) % 7;
  const today = startOfDay(new Date());
  const dur = duration || 60;

  // Charger les horaires du pro une seule fois
  useEffect(() => {
    if (!proEmail) {
      // Pas de pro : on débloque tout de suite avec des horaires par défaut
      setProOuverture({
        lundi: { open: true, start: "09:00", end: "19:00" },
        mardi: { open: true, start: "09:00", end: "19:00" },
        mercredi: { open: true, start: "09:00", end: "19:00" },
        jeudi: { open: true, start: "09:00", end: "19:00" },
        vendredi: { open: true, start: "09:00", end: "19:00" },
        samedi: { open: true, start: "09:00", end: "18:00" },
        dimanche: { open: false },
      });
      setLoadingPro(false);
      return;
    }
    entities.ProfilPro.filter({ user_email: proEmail }, "-created_at", 1)
      .then(profils => {
        const p = profils[0];
        if (p) {
          setSeatsTotal(p.seats_count || 1);
          setTravailNuit(p.travail_nuit || false);
          // Synchroniser avec horaires (ModifierProfilPro) ET ouverture (HorairesConges)
          const ouvRaw = p.ouverture;
          const horRaw = p.horaires;
          const DAY_NAMES = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];
          const merged = {};
          DAY_NAMES.forEach(d => {
            const fromOuv = ouvRaw?.[d];
            const fromHor = horRaw?.[d];
            const fromOuvC = ouvRaw?.[d.charAt(0).toUpperCase() + d.slice(1)];
            const fromHorC = horRaw?.[d.charAt(0).toUpperCase() + d.slice(1)];
            merged[d] = fromOuv || fromHor || fromOuvC || fromHorC || null;
          });
          let ouverture = (Object.values(merged).some(v => v && typeof v === 'object'))
            ? merged
            : (ouvRaw || horRaw || null);
          if (typeof ouverture === "string") {
            try { ouverture = JSON.parse(ouverture); } catch {}
          }
          // Parser pauses si c'est une string JSON
          let pauses = p.pauses || [];
          if (typeof pauses === "string") {
            try { pauses = JSON.parse(pauses); } catch {}
          }
          setProOuverture(ouverture);
          setProPauses(pauses);
          console.log("[StepCalendar] Horaires chargés:", ouverture);
        } else {
          // Pro introuvable : horaires par défaut
          setProOuverture({
            lundi: { open: true, start: "09:00", end: "19:00" },
            mardi: { open: true, start: "09:00", end: "19:00" },
            mercredi: { open: true, start: "09:00", end: "19:00" },
            jeudi: { open: true, start: "09:00", end: "19:00" },
            vendredi: { open: true, start: "09:00", end: "19:00" },
            samedi: { open: true, start: "09:00", end: "18:00" },
            dimanche: { open: false },
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPro(false));
  }, [proEmail]);

  // Charger les réservations réelles quand la date change
  // Logique Planity/Treatwell : pour chaque créneau candidat, on cherche TOUTES les
  // réservations actives du pro ce jour-là qui se chevauchent avec lui, quelle que soit
  // leur heure de début d'origine. On compte les personnes (pas juste les réservations).
  useEffect(() => {
    if (!selectedDate || !proEmail) return;
    if (loadingPro) return; // attendre que le profil soit chargé
    setLoadingSlots(true);

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    // Générer tous les créneaux théoriques pour cette date
    const slotsForDay = generateSlotsForDay(selectedDate, proOuverture, proPauses, dur, travailNuit, isToday(selectedDate) ? (new Date().getHours() * 60 + new Date().getMinutes()) : null);
    const allSlots = slotsForDay.open !== false
      ? [...(slotsForDay.morning || []), ...(slotsForDay.afternoon || []), ...(slotsForDay.evening || []), ...(slotsForDay.night || [])]
      : [];

    // Utiliser asServiceRole pour voir toutes les réservations (pas seulement les siennes)
    entities.Reservation.filter({ pro_email: proEmail, date: dateStr }, "-created_at", 500)
      .then(reservations => {
        // Seules les réservations actives (pas annulées/terminées)
        const activeRes = reservations.filter(r =>
          ["en_attente", "confirme"].includes(r.status)
        );

        console.log(`[Calendrier] ${dateStr} — ${activeRes.length} résa(s) active(s) pour ${proEmail}`);

        // Pour chaque créneau candidat, calculer combien de sièges sont déjà pris
        // en cherchant toute réservation dont la plage [time_slot, end_time_slot] chevauche le créneau
        const map = {};
        allSlots.forEach(slot => {
          const endSlot = addMinutes(slot, dur);

          // On inclut un buffer : le créneau précédent doit être terminé + buffer avant notre début
          // => on vérifie que la réservation existante [resaStart, resaEnd+BUFFER] chevauche [slot, endSlot+BUFFER]
          const occupied = activeRes.filter(r => {
            const resaStart = r.time || r.time_slot;
            // Fin réelle de la résa + buffer de transition
            const resaEnd = addMinutes(r.end_time_slot || addMinutes(r.time || r.time_slot, r.duration_min || 60), BUFFER_MIN);
            // Notre créneau candidat + buffer
            const slotEnd = addMinutes(endSlot, BUFFER_MIN);
            return overlaps(slot, slotEnd, resaStart, resaEnd);
          }).reduce((sum, r) => sum + (r.persons || 1), 0);

          if (occupied > 0) {
            map[`${slot}-${endSlot}`] = occupied;
            console.log(`  Créneau ${slot}→${endSlot} : ${occupied} siège(s) occupé(s)`);
          }
        });

        setOccupancyMap(map);
      })
      .catch(err => {
        console.error("[Calendrier] Erreur chargement réservations:", err);
        setOccupancyMap({});
      })
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, proEmail, dur, proOuverture, proPauses, loadingPro]);

  // Calcule le prochain siège libre pour un créneau (logique Planity/Treatwell)
  // Siège = nombre de réservations qui se chevauchent déjà + 1
  const assignSeat = (time) => {
    if (!time) return null;
    const endT = addMinutes(time, dur);
    const occupied = occupancyMap[`${time}-${endT}`] || 0;
    const nextSeat = occupied + 1;
    return nextSeat <= seatsTotal ? nextSeat : null;
  };

  const handleSelectDate = (day) => {
    if (day.getTime() < today.getTime()) return;
    if (isInConges(day, proOuverture)) return;
    onSelectDate(day);
    onSelectTime(null);
    if (onSelectSeat) onSelectSeat(null);
  };

  const handleNext = () => {
    if (!selectedDate || !selectedTime) return;
    onNext();
  };

  // Générer les créneaux pour le jour sélectionné
  // On génère dès que loadingPro est false (même si proOuverture est null)
  const slots = selectedDate && !loadingPro
    ? generateSlotsForDay(selectedDate, proOuverture, proPauses, dur, travailNuit, isToday(selectedDate) ? (new Date().getHours() * 60 + new Date().getMinutes()) : null)
    : null;

  // Déterminer si un jour du calendrier a des créneaux disponibles (pour l'indicateur visuel)
  const isDayAvailable = (day) => {
    if (isInConges(day, proOuverture)) return false;
    const s = generateSlotsForDay(day, proOuverture, proPauses, dur, travailNuit, null);
    return s.open !== false && (s.morning?.length > 0 || s.afternoon?.length > 0 || s.evening?.length > 0 || s.night?.length > 0);
  };

  const expertAvatar = expert?.avatar
    ? <img src={expert.avatar} alt={expert.name} className="w-full h-full object-cover rounded-full" />
    : (
      <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: "#E8732A" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2.5"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>
    );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between border-b border-gray-100">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center active:scale-95 transition-all">
          <ArrowLeft className="w-5 h-5 text-gray-900" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Étape 3 sur 4</p>
          <p className="text-[17px] font-serif italic text-gray-900">Date & Heure</p>
        </div>
        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-primary">
          {expertAvatar}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {/* Expert chip + sièges */}
        <div className="px-5 pt-4 pb-2 flex items-center gap-3">
          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 flex-1">
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">{expertAvatar}</div>
            <div>
              <p className="text-[13px] font-black text-gray-900">{expert?.name || "Sans préférence"}</p>
              {!expert?.id && (
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#22c55e" }}>Premier disponible</p>
              )}
            </div>
          </div>
          {seatsTotal > 1 && (
            <div className="flex items-center gap-1.5 bg-orange-50 rounded-2xl px-3 py-2 border border-orange-100">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-[12px] font-black text-primary">{seatsTotal} sièges</span>
            </div>
          )}
        </div>

        {/* Info durée + intervalle */}
        <div className="px-5 pb-2">
          <div className="flex items-center gap-2 bg-blue-50 rounded-2xl px-4 py-2.5 border border-blue-100">
            <span className="text-[18px]">⏱️</span>
            <div>
              <p className="text-[12px] font-black text-blue-800">Durée du service : {dur} min</p>
              <p className="text-[10px] text-blue-500 font-medium">Créneaux calculés selon la durée du service + {BUFFER_MIN} min de transition</p>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="px-5 pt-2">
          <div className="flex items-center justify-between mb-3 pt-1">
            <div>
              <p className="text-[20px] font-black text-gray-900 capitalize">{format(currentMonth, "MMMM", { locale: fr })}</p>
              <p className="text-[20px] font-black text-gray-900 -mt-1">{format(currentMonth, "yyyy")}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-8 h-8 border border-gray-200 rounded-full flex items-center justify-center active:scale-95 transition-all">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-8 h-8 border border-gray-200 rounded-full flex items-center justify-center active:scale-95 transition-all">
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d, i) => (
              <div key={i} className="text-center text-[11px] font-black text-gray-300 uppercase py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5 mb-4">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
            {days.map(day => {
              const isPast = day.getTime() < today.getTime();
              const isClosed = !isPast && isInConges(day, proOuverture);
              const isSel = selectedDate && isSameDay(day, selectedDate);
              const isT = isToday(day);
              const hasSlots = !isPast && !isClosed && !loadingPro && isDayAvailable(day);
              const dayColor = isSel ? "#ffffff" : (isPast || isClosed) ? "#d1d5db" : isT ? "#E8732A" : "#111827";
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleSelectDate(day)}
                  className={`flex flex-col items-center justify-center aspect-square rounded-full text-[13px] font-black transition-all active:scale-90 relative ${isPast || isClosed ? "cursor-not-allowed" : "cursor-pointer"}`}
                  style={{
                    color: dayColor,
                    background: isSel ? "#E8732A" : "transparent",
                    border: isT && !isSel ? "2px solid #E8732A" : "2px solid transparent",
                    pointerEvents: isPast || isClosed ? "none" : "auto",
                    opacity: isPast || isClosed ? 0.35 : 1,
                  }}
                >
                  {format(day, "d")}
                  {hasSlots && !isSel && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ background: "#E8732A", opacity: 0.4 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Légende */}
        <div className="px-5 pb-1 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "#E8732A" }} />
            <span className="text-[10px] font-bold text-gray-400">Disponible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-200" />
            <span className="text-[10px] font-bold text-gray-400">Fermé</span>
          </div>
        </div>

        {/* Créneaux horaires */}
        {selectedDate && (
          <div className="px-5 pt-4 pb-2">
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-black text-primary uppercase tracking-widest capitalize">
                  {format(selectedDate, "EEEE d MMMM", { locale: fr })}
                </p>
                {(loadingSlots || loadingPro) && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
              </div>

              {loadingPro ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !proOuverture ? (
                <div className="bg-amber-50 rounded-2xl px-4 py-5 text-center border border-amber-100">
                  <p className="text-[14px] font-black text-amber-700">Horaires non configurés</p>
                  <p className="text-[12px] text-amber-500 font-medium mt-1">Le professionnel n'a pas encore renseigné ses horaires</p>
                </div>
              ) : slots?.open === false ? (
                <div className="bg-gray-50 rounded-2xl px-4 py-5 text-center">
                  <p className="text-[14px] font-black text-gray-400">Fermé ce jour</p>
                  <p className="text-[12px] text-gray-300 font-medium mt-1">Choisissez un autre jour</p>
                </div>
              ) : (slots?.morning?.length === 0 && slots?.afternoon?.length === 0 && slots?.evening?.length === 0) ? (
                <div className="bg-gray-50 rounded-2xl px-4 py-5 text-center">
                  <p className="text-[14px] font-black text-gray-400">Aucun créneau disponible</p>
                  <p className="text-[12px] text-gray-300 font-medium mt-1">Tous les créneaux sont complets pour ce jour</p>
                </div>
              ) : (
                <>
                  <TimeSlotGroup
                    label="Matinée"
                    icon={Sun}
                    slots={slots?.morning}
                    selected={selectedTime}
                    onSelect={(t) => { onSelectTime(t); if (onSelectSeat) onSelectSeat(assignSeat(t)); }}
                    occupancyMap={occupancyMap}
                    seatsTotal={seatsTotal}
                    duration={dur}
                  />
                  <TimeSlotGroup
                    label="Après-midi"
                    icon={CloudSun}
                    slots={slots?.afternoon}
                    selected={selectedTime}
                    onSelect={(t) => { onSelectTime(t); if (onSelectSeat) onSelectSeat(assignSeat(t)); }}
                    occupancyMap={occupancyMap}
                    seatsTotal={seatsTotal}
                    duration={dur}
                  />
                  <TimeSlotGroup
                    label="Soirée"
                    icon={Moon}
                    slots={slots?.evening}
                    selected={selectedTime}
                    onSelect={(t) => { onSelectTime(t); if (onSelectSeat) onSelectSeat(assignSeat(t)); }}
                    occupancyMap={occupancyMap}
                    seatsTotal={seatsTotal}
                    duration={dur}
                  />
                  {travailNuit && slots?.night?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2 mt-1">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">🌙 Mode Nuit — 21h–07h</span>
                      </div>
                      <TimeSlotGroup
                        label="Nuit"
                        icon={Moon}
                        slots={slots?.night}
                        selected={selectedTime}
                        onSelect={(t) => { onSelectTime(t); if (onSelectSeat) onSelectSeat(assignSeat(t)); }}
                        occupancyMap={occupancyMap}
                        seatsTotal={seatsTotal}
                        duration={dur}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar fixe */}
      <div className="px-5 pb-8 pt-4 border-t border-gray-50 bg-white flex-shrink-0">
        <div className="rounded-3xl overflow-hidden" style={{ background: "#111" }}>
          <div className="px-5 pt-4 pb-1 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Votre rendez-vous</p>
              <p className="text-[15px] font-black text-white capitalize">
                {selectedTime && selectedDate
                  ? `${selectedTime} · ${format(selectedDate, "EEE d MMM", { locale: fr })}`
                  : selectedDate
                  ? `${format(selectedDate, "EEEE d MMMM", { locale: fr })} — choisissez un horaire`
                  : "Choisissez une date"}
              </p>
              {selectedTime && dur && (
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                  Fin prévue : {addMinutes(selectedTime, dur)} · {dur} min
                  {selectedSeat && seatsTotal > 1 && (
                    <span className="ml-2 bg-primary/30 text-primary rounded-full px-2 py-0.5 text-[9px] font-black uppercase">Siège {selectedSeat}</span>
                  )}
                </p>
              )}
            </div>
            <span className="text-[18px] font-black text-white">{price}€</span>
          </div>
          <div className="px-5 pb-5 pt-3">
            <button
              onClick={handleNext}
              disabled={!selectedDate || !selectedTime}
              className="w-full py-4 rounded-2xl font-black text-[14px] uppercase tracking-widest text-white transition-all active:scale-95 disabled:opacity-40"
              style={{ background: "#E8732A" }}
            >
              Confirmer ce créneau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}