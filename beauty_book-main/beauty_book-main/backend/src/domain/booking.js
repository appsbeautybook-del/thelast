import { assert } from '../lib/errors.js';

export const ACTIVE_BOOKINGS = ['en_attente', 'confirme'];
export const CHANNELS = ['app', 'maria', 'phone', 'website', 'social'];
const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export function minutes(value) {
  assert(typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value), 400, 'INVALID_TIME', 'Heure invalide.');
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}
export const clockTime = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
export const overlaps = (start, end, otherStart, otherEnd) => start < otherEnd && end > otherStart;

export function validateDate(date) {
  assert(typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date), 400, 'INVALID_DATE', 'Date invalide.');
  const parsed = new Date(`${date}T12:00:00Z`);
  assert(!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date, 400, 'INVALID_DATE', 'Date invalide.');
  return parsed;
}

export function localDateTime(now, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function serviceQuote(services, persons = 1, addonIds = [], now = new Date()) {
  assert(Number.isInteger(persons) && persons >= 1 && persons <= 20, 400, 'INVALID_PERSONS', 'Nombre de personnes invalide.');
  assert(Array.isArray(services) && services.length > 0 && services.length <= 10, 400, 'SERVICE_REQUIRED', 'Sélectionnez une prestation.');
  let cents = 0;
  let duration = 0;
  for (const service of services) {
    assert(service && ['actif', 'active', 'publie'].includes(service.status), 409, 'SERVICE_UNAVAILABLE', 'Cette prestation n’est plus disponible.');
    const regularPrice = Number(service.price);
    const promotion = service.promo_price != null && service.promo_ends_at && new Date(service.promo_ends_at) > now;
    const price = promotion ? Number(service.promo_price) : regularPrice;
    const length = Number(service.duration_min || service.duration);
    assert(Number.isFinite(price) && price >= 0 && Number.isInteger(length) && length > 0, 409, 'SERVICE_INCOMPLETE', 'Le tarif ou la durée de la prestation doit être renseigné.');
    cents += Math.round(price * 100);
    duration += length;
  }
  assert(Array.isArray(addonIds) && addonIds.length <= 20 && new Set(addonIds).size === addonIds.length, 400, 'INVALID_ADDONS', 'Options invalides.');
  const available = services.flatMap(service => Array.isArray(service.addons) ? service.addons : []);
  const addons = addonIds.map(id => {
    const option = available.find(item => String(item.id) === String(id));
    assert(option && Number.isFinite(Number(option.price)) && Number(option.price) >= 0, 409, 'ADDON_UNAVAILABLE', 'Une option choisie n’est plus disponible.');
    const extraDuration = Number(option.duration_min || 0);
    assert(Number.isInteger(extraDuration) && extraDuration >= 0, 409, 'ADDON_INCOMPLETE', 'La durée d’une option est invalide.');
    cents += Math.round(Number(option.price) * 100);
    duration += extraDuration;
    return { id: option.id, name: option.name, price: Number(option.price), duration_min: extraDuration };
  });
  assert(duration <= 720, 400, 'DURATION_TOO_LONG', 'La durée demandée dépasse une journée de réservation.');
  return { duration, price: cents / 100, total: cents * persons / 100, addons };
}

export function assertBookable({ professional, services, reservations, date, time, persons = 1, addonIds = [], now = new Date() }) {
  const parsed = validateDate(date);
  assert(professional && ['actif', 'active'].includes(professional.status), 409, 'PROFESSIONAL_UNAVAILABLE', 'Ce professionnel n’est plus disponible.');
  assert(services.every(service => service.pro_email === professional.user_email), 400, 'PROFESSIONAL_MISMATCH', 'Les prestations doivent appartenir au même professionnel.');
  const quote = serviceQuote(services, persons, addonIds, now);
  const start = minutes(time);
  const end = start + quote.duration;
  assert(end < 1440, 409, 'OVERNIGHT_BOOKING_UNSUPPORTED', 'Choisissez un créneau entièrement compris dans la journée.');
  const timeZone = professional.timezone || 'Europe/Paris';
  assert(`${date}T${time}` > localDateTime(now, timeZone), 409, 'PAST_BOOKING', 'Ce créneau est déjà passé.');
  const day = days[parsed.getUTCDay()];
  const hours = professional.ouverture && Object.keys(professional.ouverture).length ? professional.ouverture : professional.horaires || {};
  const schedule = hours[day];
  assert(schedule?.open === true, 409, 'CLOSED', 'Le professionnel est fermé à cette date.');
  const opening = minutes(schedule.start);
  const closing = minutes(schedule.end);
  assert(start >= opening && end <= closing, 409, 'OUTSIDE_OPENING_HOURS', 'La prestation doit se terminer avant la fermeture.');
  const holidays = professional.conges || hours.conges || [];
  assert(!holidays.some(holiday => date >= holiday.start && date <= (holiday.end || holiday.start)), 409, 'HOLIDAY', 'Le professionnel est en congé.');
  const breaks = [...(professional.pauses || []).filter(pause => !pause.days || pause.days.includes(day))];
  if (schedule.pause_start && schedule.pause_end) breaks.push({ start: schedule.pause_start, end: schedule.pause_end });
  assert(!breaks.some(pause => overlaps(start, end, minutes(pause.start), minutes(pause.end))), 409, 'BREAK', 'Ce créneau empiète sur une pause.');
  const capacity = Number(professional.seats_count || 1);
  assert(Number.isInteger(capacity) && capacity > 0, 409, 'CAPACITY_INVALID', 'La capacité du professionnel doit être renseignée.');
  // Sweep line: consecutive appointments must not be summed as simultaneous occupancy.
  const events = [{ at: start, delta: persons }, { at: end, delta: -persons }];
  for (const booking of reservations.filter(item => ACTIVE_BOOKINGS.includes(item.status))) {
    const from = minutes(booking.time_slot || booking.time);
    const to = booking.end_time_slot ? minutes(booking.end_time_slot) : from + Number(booking.duration_min);
    assert(Number.isFinite(to) && to > from, 409, 'AGENDA_INCONSISTENT', 'Un rendez-vous existant doit être vérifié par le professionnel.');
    if (overlaps(start, end, from, to)) {
      events.push({ at: Math.max(start, from), delta: Number(booking.persons || 1) });
      events.push({ at: Math.min(end, to), delta: -Number(booking.persons || 1) });
    }
  }
  events.sort((a, b) => a.at - b.at || a.delta - b.delta);
  let occupied = 0;
  for (const event of events) {
    occupied += event.delta;
    assert(occupied <= capacity, 409, 'SLOT_UNAVAILABLE', 'Ce créneau n’a plus assez de places disponibles.');
  }
  return { ...quote, end: clockTime(end), capacity, timeZone };
}

export function assertTransition(booking, user, nextStatus, admin = false) {
  const client = Boolean(user.id && booking.client_id === user.id) || Boolean(user.email && booking.client_email === user.email);
  const professional = Boolean(user.email && booking.pro_email === user.email);
  assert(client || professional || admin, 403, 'BOOKING_FORBIDDEN', 'Vous ne pouvez pas modifier ce rendez-vous.');
  const transitions = { en_attente: ['confirme', 'annule'], confirme: ['annule', 'termine', 'no_show'], annule: [], termine: [], no_show: [] };
  assert(transitions[booking.status]?.includes(nextStatus), 409, 'INVALID_TRANSITION', 'Cette modification n’est plus possible.');
  assert(admin || professional || nextStatus === 'annule', 403, 'PROFESSIONAL_ONLY', 'Seul le professionnel peut confirmer ou terminer ce rendez-vous.');
}
