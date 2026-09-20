import { createHash } from 'node:crypto';
import defaultDb from '../config/pg.js';
import { assert, HttpError } from '../lib/errors.js';
import { assertBookable, assertTransition, validateDate, clockTime, CHANNELS } from '../domain/booking.js';

export function bookingInput(payload) {
  const ids = payload.service_ids || (payload.service_id ? [payload.service_id] : []);
  assert(Array.isArray(ids) && ids.length > 0 && ids.length <= 10 && ids.every(id => typeof id === 'string' && id.length <= 100), 400, 'SERVICE_REQUIRED', 'Choisissez une prestation enregistrée.');
  assert(new Set(ids).size === ids.length, 400, 'DUPLICATE_SERVICE', 'Une prestation ne peut pas être sélectionnée deux fois.');
  const addonIds = payload.addon_ids || [];
  assert(!payload.addons?.length || payload.addon_ids, 400, 'ADDON_IDS_REQUIRED', 'Resélectionnez les options de la prestation.');
  return { ids, date: payload.date, time: payload.time_slot || payload.time, persons: payload.persons ?? 1, addonIds, notes: typeof payload.notes === 'string' ? payload.notes.slice(0, 2000) : '' };
}

export function createBookingService(database=defaultDb){
const db=database;
const transaction=work=>database.transaction(work);
async function context(client, ids, date, { lock = false, excludeId } = {}) {
  const { rows: services } = await client.query('SELECT * FROM public."Service" WHERE id::text = ANY($1::text[]) ORDER BY id'+(lock?' FOR SHARE':''), [ids]);
  assert(services.length === ids.length, 404, 'SERVICE_NOT_FOUND', 'Une prestation a été supprimée.');
  const { rows: professionals } = await client.query('SELECT p.* FROM public."ProfilPro" p JOIN auth.users u ON lower(u.email) = lower(p.user_email) WHERE p.user_email = $1 ORDER BY p.created_at DESC LIMIT 1'+(lock?' FOR SHARE OF p':''), [services[0].pro_email]);
  const professional = professionals[0];
  assert(professional, 404, 'PROFESSIONAL_NOT_FOUND', 'Le compte professionnel n’existe plus.');
  if (lock) {
    // All channels and all updates acquire this lock before reading occupancy.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`booking:${professional.user_email}:${date}`]);
  }
  const { rows: reservations } = await client.query('SELECT * FROM public."Reservation" WHERE pro_email = $1 AND date::text = $2::text AND status = ANY($3::text[]) AND ($4::text IS NULL OR id::text <> $4)', [professional.user_email, date, ['en_attente', 'confirme'], excludeId || null]);
  return { professional, services, reservations };
}

async function createBooking(user, payload, { channel = 'app', idempotencyKey } = {}) {
  assert(user?.id && user?.email, 401, 'AUTH_REQUIRED', 'Connectez-vous pour réserver.');
  assert(CHANNELS.includes(channel), 400, 'INVALID_CHANNEL', 'Canal invalide.');
  const input = bookingInput(payload);
  validateDate(input.date);
  assert(typeof idempotencyKey === 'string' && /^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey), 400, 'IDEMPOTENCY_REQUIRED', 'Identifiant de réservation manquant.');
  const fingerprint = createHash('sha256').update(JSON.stringify({ ...input, channel })).digest('hex');
  return transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`request:${user.id}:${idempotencyKey}`]);
    const { rows: previous } = await client.query('SELECT * FROM public."Reservation" WHERE client_id = $1 AND idempotency_key = $2', [user.id, idempotencyKey]);
    if (previous[0]) {
      assert(previous[0].request_hash === fingerprint, 409, 'IDEMPOTENCY_CONFLICT', 'Cet identifiant a déjà été utilisé pour une autre réservation.');
      return previous[0];
    }
    const data = await context(client, input.ids, input.date, { lock: true });
    const quote = assertBookable({ ...data, ...input });
    const { rows } = await client.query(`INSERT INTO public."Reservation"
      (client_id, client_email, client_name, professional_id, pro_email, pro_name, service_id, service_ids,
       service_name, service_price, date, time_slot, end_time_slot, duration_min, persons, addons, total_price,
       status, payment_status, payment_type, salon_name, salon_address, seats_total, source, notes,
       created_by_id, idempotency_key, request_hash)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11::date,$12,$13,$14,$15,$16::jsonb,$17,
       'en_attente','non_paye','surplace',$18,$19,$20,$21,$22,$1,$23,$24) RETURNING *`, [
      user.id, user.email, user.user_metadata?.full_name || '', data.professional.id, data.professional.user_email,
      data.professional.salon_name || '', input.ids[0], JSON.stringify(input.ids), data.services.map(s => s.name || s.title).join(' + '),
      quote.price, input.date, input.time, quote.end, quote.duration, input.persons, JSON.stringify(quote.addons), quote.total,
      data.professional.salon_name || '', data.professional.address || '', quote.capacity, channel, input.notes,
      idempotencyKey, fingerprint,
    ]);
    await client.query('INSERT INTO public.bb_outbox (topic, aggregate_id, payload) VALUES ($1,$2,$3::jsonb)', ['booking.created', rows[0].id, JSON.stringify({ reservation_id: rows[0].id })]);
    return rows[0];
  });
}

async function getAvailability(payload) {
  const input = bookingInput(payload);
  validateDate(input.date);
  const data = await context(db, input.ids, input.date);
  const slots = [];
  for (let value = 0; value < 1440; value += 15) {
    try {
      const time = clockTime(value);
      const quote = assertBookable({ ...data, ...input, time });
      slots.push({ time, end: quote.end, price: quote.total, duration_min: quote.duration });
    } catch (error) {
      if (!(error instanceof HttpError) || !['CLOSED', 'PAST_BOOKING', 'OUTSIDE_OPENING_HOURS', 'BREAK', 'HOLIDAY', 'SLOT_UNAVAILABLE', 'OVERNIGHT_BOOKING_UNSUPPORTED'].includes(error.code)) throw error;
    }
  }
  return { date: input.date, timezone: data.professional.timezone || 'Europe/Paris', slots };
}

async function updateBooking(user, id, payload, {admin=false,requestId}={}) {
  assert(!('payment_status' in payload) && !('total_price' in payload), 403, 'PAYMENT_SERVER_ONLY', 'Les paiements sont validés exclusivement par le service de paiement.');
  assert(Object.keys(payload).every(key=>key==='status'),400,'FIELD_NOT_WRITABLE','Cette opération ne permet de modifier que le statut du rendez-vous.');
  return transaction(async client => {
    const { rows } = await client.query('SELECT * FROM public."Reservation" WHERE id::text = $1 FOR UPDATE', [id]);
    const booking = rows[0];
    assert(booking, 404, 'BOOKING_NOT_FOUND', 'Rendez-vous introuvable.');
    assertTransition(booking, user, payload.status,admin);
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`booking:${booking.pro_email}:${typeof booking.date === 'string' ? booking.date.slice(0, 10) : booking.date.toISOString().slice(0, 10)}`]);
    const { rows: updated } = await client.query('UPDATE public."Reservation" SET status = $1, updated_at = now(), completed_at = CASE WHEN $1 = \'termine\' THEN now()::text ELSE completed_at END WHERE id = $2 RETURNING *', [payload.status, booking.id]);
    await client.query('INSERT INTO public.bb_outbox (topic, aggregate_id, payload) VALUES ($1,$2,$3::jsonb)', ['booking.updated', booking.id, JSON.stringify({ reservation_id: booking.id, status: payload.status })]);
    if(admin)await client.query('INSERT INTO public.bb_audit_log(actor_id,action,resource,resource_id,changes,request_id) VALUES($1,$2,$3,$4,$5::jsonb,$6)',[user.id,'booking.status','Reservation',booking.id,JSON.stringify({from:booking.status,to:payload.status}),requestId]);
    return updated[0];
  });
}

return {createBooking,getAvailability,updateBooking};
}
export const {createBooking,getAvailability,updateBooking}=createBookingService();
