import db from '../config/pg.js';
import {assert} from '../lib/errors.js';
export function createReceptionistService(database=db){
 async function professional(user){
  const {rows:[pro]}=await database.query('SELECT * FROM public."ProfilPro" WHERE owner_id=$1 AND status=$2 ORDER BY created_at LIMIT 1',[user.id,'actif']);
  assert(pro,403,'PROFESSIONAL_REQUIRED','Cet espace est réservé à un professionnel validé.');
  return pro;
 }
 async function overview(user){
  const pro=await professional(user);
  const {rows:[settings]}=await database.query('SELECT enabled,welcome_text,business_instructions FROM public.bb_receptionist_settings WHERE professional_id=$1',[pro.id]);
  const {rows:bookings}=await database.query('SELECT id,client_name,service_name,date,time_slot,status,total_price,persons FROM public."Reservation" WHERE pro_email=$1 AND date::text >= ((now() AT TIME ZONE $2)::date)::text AND date::text < ((now() AT TIME ZONE $2)::date+7)::text ORDER BY date,time_slot LIMIT 500',[pro.user_email,pro.timezone]);
  const {rows:leads}=await database.query('SELECT id,customer_name,customer_email,need,source,status,consented_at,created_at FROM public.bb_leads WHERE professional_id=$1 ORDER BY created_at DESC LIMIT 100',[pro.id]);
  const {rows:handoffs}=await database.query('SELECT h.id,h.reason,h.status,h.created_at,p.full_name AS customer_name,p.email AS customer_email FROM public.bb_handoffs h LEFT JOIN public.profiles p ON p.id=h.customer_id WHERE h.professional_id=$1 ORDER BY h.created_at DESC LIMIT 100',[pro.id]);
  return {professional:{id:pro.id,salon_name:pro.salon_name,timezone:pro.timezone},settings:settings||{enabled:false,welcome_text:'Bonjour, comment puis-je vous aider à préparer votre rendez-vous ?',business_instructions:''},bookings,leads,handoffs};
 }
 async function settings(user,input){
  const pro=await professional(user);
  assert(typeof input.enabled==='boolean'&&typeof input.welcome_text==='string'&&input.welcome_text.trim().length>=5&&input.welcome_text.length<=240&&typeof input.business_instructions==='string'&&input.business_instructions.length<=2000,400,'INVALID_RECEPTIONIST_SETTINGS','Vérifiez le message d’accueil et les consignes.');
  assert(Object.keys(input).every(k=>['enabled','welcome_text','business_instructions'].includes(k)),400,'FIELD_NOT_WRITABLE','Ce paramètre n’est pas modifiable.');
  const {rows:[record]}=await database.query('INSERT INTO public.bb_receptionist_settings(professional_id,enabled,welcome_text,business_instructions) VALUES($1,$2,$3,$4) ON CONFLICT(professional_id) DO UPDATE SET enabled=excluded.enabled,welcome_text=excluded.welcome_text,business_instructions=excluded.business_instructions,updated_at=now() RETURNING enabled,welcome_text,business_instructions',[pro.id,input.enabled,input.welcome_text.trim(),input.business_instructions.trim()]);
  return record;
 }
 async function updateRequest(user,kind,id,status){
  const pro=await professional(user);
  const table=kind==='lead'?'bb_leads':'bb_handoffs';
  assert((kind==='lead'?['new','contacted','converted','closed']:['pending','accepted','resolved']).includes(status),400,'INVALID_STATUS','Statut invalide.');
  const {rows:[record]}=await database.query('UPDATE public.'+table+' SET status=$1 WHERE id::text=$2 AND professional_id=$3 RETURNING id,status',[status,id,pro.id]);
  assert(record,404,'REQUEST_NOT_FOUND','Demande introuvable.');
  return record;
 }
 return {professional,overview,settings,updateRequest};
}
export const receptionist=createReceptionistService();
