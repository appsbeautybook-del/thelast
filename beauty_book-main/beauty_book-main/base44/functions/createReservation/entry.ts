import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function timeToMin(t) {
  const [h, m] = (t || "00:00").split(":").map(Number);
  return h * 60 + m;
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

// Vérifie si un créneau est dans les horaires d'ouverture du pro
function isWithinOpeningHours(date, timeSlot, ouverture) {
  if (!ouverture || Object.keys(ouverture).length === 0) return true;
  const days = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  const dow = new Date(date).getDay();
  const dayKey = days[dow];
  const d = ouverture[dayKey];
  if (!d || !d.open) return false;
  const slotMin = timeToMin(timeSlot);
  const startMin = timeToMin(d.start || "00:00");
  const endMin = timeToMin(d.end || "23:59");
  return slotMin >= startMin && slotMin < endMin;
}

// Vérifie si le créneau est dans une pause
function isDuringBreak(timeSlot, pauses) {
  if (!pauses || pauses.length === 0) return false;
  const slotMin = timeToMin(timeSlot);
  return pauses.some(p => {
    const pStart = timeToMin(p.start || "00:00");
    const pEnd = timeToMin(p.end || "00:00");
    return slotMin >= pStart && slotMin < pEnd;
  });
}

// Génère un fichier ICS pour le calendrier
function generateICS({ summary, description, location, dtStart, dtEnd, uid }) {
  const fmt = (d) => d.replace(/[-:]/g, "").replace("T", "T").slice(0,15) + "Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BeautyBook//FR",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `DTSTART:${fmt(dtStart)}`,
    `DTEND:${fmt(dtEnd)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      pro_email, pro_name, service_name, service_id, service_price,
      date, time_slot, duration_min, addons, total_price, notes,
      salon_name, salon_address, persons = 1,
      service_location = "salon", client_address, client_postal_code, client_city,
      client_latitude, client_longitude, transport_fee = 0, transport_distance_km = 0,
      payment_type = "full", // "full" | "acompte"
      crg_code
    } = body;

    if (!pro_email || !service_name || !date || !time_slot) {
      return Response.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    const dur = duration_min || 60;
    const endSlot = addMinutes(time_slot, dur);

    // ── Récupérer le profil pro ──
    const profilResults = await base44.asServiceRole.entities.ProfilPro.filter(
      { user_email: pro_email }, "-created_date", 1
    );
    const profil = profilResults[0];
    const seatsTotal = profil?.seats_count || 1;
    const ouverture = profil?.ouverture || {};
    const pauses = profil?.pauses || [];

    // ── Vérifier les horaires d'ouverture ──
    if (!isWithinOpeningHours(date, time_slot, ouverture)) {
      return Response.json({ error: "Ce créneau est en dehors des horaires d'ouverture du professionnel." }, { status: 409 });
    }

    // ── Vérifier les pauses ──
    if (isDuringBreak(time_slot, pauses)) {
      return Response.json({ error: "Ce créneau est pendant une pause du professionnel." }, { status: 409 });
    }

    // ── Vérifier les réservations actives qui se chevauchent ──
    const existingRes = await base44.asServiceRole.entities.Reservation.filter(
      { pro_email, date }, "-created_date", 200
    );
    const seatsOccupied = existingRes
      .filter(r => ["en_attente", "confirme"].includes(r.status))
      .filter(r => overlaps(time_slot, endSlot, r.time_slot, r.end_time_slot || addMinutes(r.time_slot, r.duration_min || 60)))
      .reduce((sum, r) => sum + (r.persons || 1), 0);

    const seatsAvailable = seatsTotal - seatsOccupied;
    if (persons > seatsAvailable) {
      return Response.json({
        error: `Plus assez de sièges disponibles. Disponible: ${seatsAvailable}, demandé: ${persons}`,
        seats_available: seatsAvailable,
        seats_total: seatsTotal,
      }, { status: 409 });
    }

    // ── Calculer l'acompte (30% du total) ──
    const acompteAmount = payment_type === "acompte" ? Math.round(total_price * 0.3 * 100) / 100 : 0;
    // Paiement simulé : on confirme directement sans Stripe
    const paymentStatus = payment_type === "acompte" ? "acompte_paye" : "paye";
    const reservationStatus = "confirme";

    // ── Créer la réservation ── (asServiceRole pour éviter les restrictions RLS)
    const reservation = await base44.asServiceRole.entities.Reservation.create({
      client_email: user.email,
      client_name: user.full_name,
      pro_email,
      pro_name,
      service_id,
      service_name,
      service_price,
      date,
      time_slot,
      end_time_slot: endSlot,
      duration_min: dur,
      persons,
      addons: addons || [],
      total_price,
      service_location,
      client_address,
      client_postal_code,
      client_city,
      client_latitude,
      client_longitude,
      transport_fee,
      transport_distance_km,
      acompte_amount: acompteAmount,
      notes,
      salon_name,
      salon_address,
      seats_total: seatsTotal,
      status: reservationStatus,
      payment_status: paymentStatus,
      payment_type,
      reminder_scheduled: true,
      crg_code: crg_code || null,
    });

    // ── Générer le fichier ICS ──
    const dateTimeStart = `${date}T${time_slot}:00`;
    const [eh, em] = endSlot.split(":").map(Number);
    const dateTimeEnd = `${date}T${endSlot}:00`;
    const icsContent = generateICS({
      summary: `💆 ${service_name} – BeautyBook`,
      description: `Prestataire: ${salon_name || pro_name}\\nAdresse: ${salon_address || ""}\\nDurée: ${dur} min`,
      location: salon_address || salon_name || "",
      dtStart: dateTimeStart,
      dtEnd: dateTimeEnd,
      uid: `beautybook-${reservation.id}`,
    });
    const icsBase64 = btoa(unescape(encodeURIComponent(icsContent)));

    // ── Lien Google Calendar ──
    const gcalParams = new URLSearchParams({
      action: "TEMPLATE",
      text: `💆 ${service_name} – BeautyBook`,
      dates: (() => {
        const pad = (n) => String(n).padStart(2, "0");
        const [y, mo, d] = date.split("-").map(Number);
        const [sh, sm] = time_slot.split(":").map(Number);
        const endTotalMin = sh * 60 + sm + dur;
        const eh = Math.floor(endTotalMin / 60) % 24;
        const em = endTotalMin % 60;
        const fmt = (yy, mm, dd, hh, min) => `${yy}${pad(mm)}${pad(dd)}T${pad(hh)}${pad(min)}00`;
        return `${fmt(y, mo, d, sh, sm)}/${fmt(y, mo, d, eh, em)}`;
      })(),
      details: `Prestataire: ${salon_name || pro_name}\nCode de validation: ${crg_code || "—"}`,
      location: salon_address || salon_name || "",
    });
    const gcalLink = `https://calendar.google.com/calendar/render?${gcalParams.toString()}`;

    // ── Notification client (avec remerciement + Google Calendar) ──
    await base44.entities.Notification.create({
      user_email: user.email,
      type: "reservation",
      title: "✅ Réservation confirmée !",
      body: `Merci ${user.full_name?.split(" ")[0] || ""} ! Votre rendez-vous pour "${service_name}" est confirmé le ${date} à ${time_slot}. À très bientôt ! 🌟`,
      link: "/rendez-vous",
      read: false,
      data: { reservation_id: reservation.id, ics_base64: icsBase64, gcal_link: gcalLink },
    });

    // ── Notification pro ──
    await base44.asServiceRole.entities.Notification.create({
      user_email: pro_email,
      type: "reservation",
      title: "📅 Nouvelle réservation",
      body: `${user.full_name} a réservé : ${service_name} le ${date} à ${time_slot} (${persons} pers.)`,
      link: "/pro/gestion-agenda",
      read: false,
    });

    console.log(`✅ Réservation ${reservation.id}: ${service_name} ${date} ${time_slot} | ${persons} pers. | payment: ${payment_type}`);

    return Response.json({
      reservation,
      ics_base64: icsBase64,
      success: true,
      seats_available: seatsAvailable - persons,
    });
  } catch (error) {
    console.error("❌ createReservation error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
