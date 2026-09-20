import Stripe from 'stripe';
import db from '../config/pg.js';
import {assert,HttpError} from '../lib/errors.js';
import {commerce} from './commerce.js';

export function createOutboxWorker(database=db,{commerceEvent=commerce.deliverEvent,refund=async(payment,key)=>{
 assert(process.env.STRIPE_SECRET_KEY,503,'PAYMENTS_NOT_CONFIGURED','Stripe non configuré.');
 const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{timeout:20000,maxNetworkRetries:1});
 const created=await stripe.refunds.create({payment_intent:payment.payment_intent_id},{idempotencyKey:key});
 return created.status==='succeeded'?created:stripe.refunds.retrieve(created.id);
}}={}){
 async function notify(client,event,email,title,message,url){
  if(!email)return;
  // The event lock and the unique reference make retries safe even after a worker restart.
  await client.query('INSERT INTO public."Notification"(user_email,title,message,type,action_url,is_read,outbox_id) VALUES($1,$2,$3,$4,$5,false,$6) ON CONFLICT(outbox_id,user_email) WHERE outbox_id IS NOT NULL DO NOTHING',[email,title,message,event.topic,url,event.id]);
 }
 async function handle(client,event){
  if(event.topic==='lead.created'){
   await notify(client,event,event.payload.pro_email,'Nouvelle demande client','Un client vous a transmis sa demande et ses coordonnées. Consultez votre réceptionniste.','/receptionnist-ia');
   return;
  }
  if(['commerce.paid','commerce.refund'].includes(event.topic)){
   const result=await commerceEvent(client,event);
   if(!result?.notify)return;
   const {rows:[order]}=await client.query('SELECT client_email FROM public."Commande" WHERE id=$1',[event.aggregate_id]);
   if(order)await notify(client,event,order.client_email,event.topic==='commerce.paid'?'Commande payée':'Remboursement confirmé',event.topic==='commerce.paid'?'Le paiement a été confirmé. Les boutiques peuvent préparer votre commande.':'Le remboursement de votre commande est confirmé.','/commande/'+event.aggregate_id);
   return;
  }
  if(event.topic.startsWith('booking.') || event.topic==='payment.confirmed'){
   const {rows:[booking]}=await client.query('SELECT * FROM public."Reservation" WHERE id=$1',[event.aggregate_id]);
   if(!booking)return;
   const title=event.topic==='booking.created'?'Nouvelle demande de rendez-vous':event.topic==='payment.confirmed'?'Paiement confirmé':'Rendez-vous mis à jour';
   const status=event.payload.status||booking.status;
   const message=booking.service_name+' · '+String(booking.date).slice(0,10)+' à '+booking.time_slot+' · '+({en_attente:'en attente',confirme:'confirmé',annule:'annulé',termine:'terminé',no_show:'absence signalée'})[status];
   await notify(client,event,booking.client_email,title,message,'/RendezVous');
   await notify(client,event,booking.pro_email,title,message,'/pro/GestionAgenda');
   return;
  }
  if(event.topic==='professional.reviewed'){
   const {rows:[user]}=await client.query('SELECT email FROM auth.users WHERE id=$1',[event.payload.user_id]);
   if(user)await notify(client,event,user.email,'Votre demande professionnelle',event.payload.status==='approuvee'?'Votre profil professionnel est activé. Renseignez vos horaires avant de recevoir des réservations.':'Votre demande a été refusée. Contactez le support pour en connaître les détails.','/Profil');
   return;
  }
  if(event.topic==='order.fulfillment'){
   const {rows:[order]}=await client.query('SELECT client_email FROM public."Commande" WHERE id=$1',[event.aggregate_id]);
   if(order)await notify(client,event,order.client_email,'Votre commande avance','Une ligne de votre commande est passée au statut : '+({preparing:'en préparation',shipped:'expédiée',delivered:'livrée'}[event.payload.status]||event.payload.status),'/mes-commandes');
   return;
  }
  if(event.topic==='payment.refund_required'){
   const {rows:[payment]}=await client.query('SELECT * FROM public.bb_payment_sessions WHERE id=$1 FOR UPDATE',[event.payload.payment_id]);
   if(!payment||payment.status==='refunded')return;
   assert(payment.status==='refund_required'&&payment.payment_intent_id,409,'REFUND_NOT_READY','Paiement non remboursable.');
   const result=await refund(payment,'beautybook-refund-'+payment.id);
   assert(result?.id && result.status==='succeeded',502,'REFUND_PENDING','Le remboursement n’est pas encore confirmé par Stripe.');
   await client.query("UPDATE public.bb_payment_sessions SET status='refunded',updated_at=now() WHERE id=$1",[payment.id]);
   await client.query('UPDATE public."Reservation" SET payment_status=$1,updated_at=now() WHERE id=$2',['rembourse',payment.reservation_id]);
   const {rows:[user]}=await client.query('SELECT email FROM auth.users WHERE id=$1',[payment.user_id]);
   if(user)await notify(client,event,user.email,'Remboursement confirmé','Le paiement reçu après l’annulation de votre rendez-vous a été remboursé.','/RendezVous');
   return;
  }
  throw new HttpError(500,'OUTBOX_TOPIC_UNSUPPORTED','Aucun traitement enregistré pour cet événement.');
 }
 async function runOne(){
  let failedId;
  try{
   return await database.transaction(async client=>{
    const {rows:[event]}=await client.query("SELECT * FROM public.bb_outbox WHERE status IN ('pending','failed') AND next_attempt_at<=now() AND attempts<10 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1");
    if(!event)return false;
    failedId=event.id;
    await handle(client,event);
    await client.query("UPDATE public.bb_outbox SET status='sent',attempts=attempts+1,delivered_at=now(),last_error_code=NULL WHERE id=$1",[event.id]);
    return true;
   });
  }catch(error){
   if(!failedId)throw error;
   await database.query("UPDATE public.bb_outbox SET status='failed',attempts=attempts+1,last_error_code=$1,next_attempt_at=now()+interval '1 minute'*least(60,power(2,attempts)) WHERE id=$2 AND status<>'sent'",[error instanceof HttpError?error.code:'DELIVERY_FAILED',failedId]);
   return true;
  }
 }
 return {runOne};
}
export const {runOne}=createOutboxWorker();
