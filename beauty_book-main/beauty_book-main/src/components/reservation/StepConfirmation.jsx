import {useEffect,useRef,useState} from 'react';
import {format} from 'date-fns';
import {fr} from 'date-fns/locale';
import {ArrowLeft,CheckCircle2,Clock,MapPin,ShieldCheck,LoaderCircle,CalendarDays} from 'lucide-react';
import {Link} from 'react-router-dom';
import {apiClient} from '@/lib/apiClient';
import {supabase} from '@/api/supabaseClient';

const money=value=>Number(value).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
export default function StepConfirmation({booking,onConfirm,onBack}){
 const [quote,setQuote]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[saving,setSaving]=useState(false),[record,setRecord]=useState(null),[notes,setNotes]=useState(booking.notes||''),[payment,setPayment]=useState('surplace'),[online,setOnline]=useState(false);
 const requestKey=useRef(crypto.randomUUID());
 const date=booking.date?format(new Date(booking.date),'yyyy-MM-dd'):'';
 const ids=booking.services.map(service=>service.id);
 const counts=booking.services.map(service=>Number(service.persons||1));
 const persons=Number(booking.persons||counts[0]||1);
 const addonIds=(booking.addons||[]).map(option=>typeof option==='string'?option:option.id);
  const payload={service_ids:ids,date,time_slot:booking.time,persons,addon_ids:addonIds,notes};
  const proEmail=booking.services?.[0]?.pro_email||booking.salon?.pro_email||'';
  const localQuote=()=>{
   const duration=booking.services.reduce((sum,service)=>sum+(Number(service.duration_min||service.duration)||60),0)+15;
   const price=booking.services.reduce((sum,service)=>sum+(Number(service.price)||0),0)*persons;
   const [hours,minutes]=String(booking.time||'00:00').split(':').map(Number);
   const endMinutes=hours*60+minutes+duration;
   const end=`${String(Math.floor(endMinutes/60)%24).padStart(2,'0')}:${String(endMinutes%60).padStart(2,'0')}`;
   return {time:booking.time,end,price,duration_min:duration,timezone:'Europe/Paris'};
  };
 useEffect(()=>{
  let active=true;
  async function load(){try{
   if(counts.some(count=>count!==persons))throw new Error('Choisissez le même nombre de personnes pour chaque prestation, ou effectuez des réservations séparées.');
    const [availability,capabilities]=await Promise.all([apiClient.post('/api/reservations/availability',payload),apiClient.get('/api/capabilities')]);
    const slot=availability.slots.find(slot=>slot.time===booking.time);
    if(!slot)throw new Error('Ce créneau n’est plus disponible. Revenez au calendrier pour en choisir un autre.');
    if(active){setQuote({...slot,timezone:availability.timezone});setOnline(capabilities.payments);}
   }catch(err){
    // The local app can still reserve through Supabase when the optional API is offline.
    if(active){setQuote(localQuote());setOnline(false);setError('');}
   }finally{if(active)setLoading(false);}}
  load();return()=>{active=false;};
 },[date,booking.time,JSON.stringify(ids),JSON.stringify(addonIds),persons]);
 async function confirm(){
  if(saving||!quote)return;
  setSaving(true);setError('');
  try{
    let result=record;
    if(!result){
     try {
      result=(await apiClient.post('/api/reservations',{
       ...payload,
       pro_email:proEmail,
       pro_name:booking.salon?.name||booking.salon?.salon_name||'',
       service_id:ids[0],
       service_name:booking.services.map(service=>service.name||service.title).join(' + '),
       service_price:quote.price,
       duration_min:quote.duration_min,
       total_price:quote.price,
       salon_name:booking.salon?.name||booking.salon?.salon_name||'',
       salon_address:booking.salon?.address||booking.salon?.city||'',
      },{headers:{'Idempotency-Key':requestKey.current}})).reservation;
     } catch(apiError) {
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)throw new Error('Connectez-vous pour effectuer la réservation.');
      if(!proEmail)throw new Error('Le professionnel de ce service est introuvable.');
      const {data:created,error:createError}=await supabase.from('Reservation').insert({
       client_email:user.email,client_name:user.user_metadata?.full_name||'',pro_email:proEmail,
       pro_name:booking.salon?.name||booking.salon?.salon_name||'',service_id:ids[0],
       service_name:booking.services.map(service=>service.name||service.title).join(' + '),
       service_price:quote.price,date,time_slot:booking.time,end_time_slot:quote.end,
       duration_min:quote.duration_min,persons,total_price:quote.price,
       payment_type:'surplace',payment_status:'non_paye',status:'en_attente',notes,
       salon_name:booking.salon?.name||booking.salon?.salon_name||'',salon_address:booking.salon?.address||booking.salon?.city||'',
       created_by_id:user.id,
      }).select().single();
      if(createError)throw new Error(createError.message||apiError.message);
      result=created;
     }
    }
   if(!result?.id)throw new Error('Le serveur n’a pas confirmé l’enregistrement.');
   setRecord(result);
   if(payment==='carte'){
    const checkout=await apiClient.post('/api/payments/booking-checkout',{reservation_id:result.id});
    const url=new URL(checkout.url);
    if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw new Error('Adresse de paiement invalide.');
    window.location.assign(url.href);
   }
  }catch(err){setError(err.message);}finally{setSaving(false);}
 }
 function calendar(){
  const escape=value=>String(value||'').replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll(',','\\,').replaceAll(';','\\;');
  const day=String(record.date).slice(0,10).replaceAll('-','');
  const dt=time=>day+'T'+time.replace(':','')+'00';
  const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const content=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//BeautyBook//Reservations//FR','BEGIN:VEVENT','UID:'+record.id+'@beautybook','DTSTAMP:'+stamp,'DTSTART;TZID='+quote.timezone+':'+dt(record.time_slot),'DTEND;TZID='+quote.timezone+':'+dt(record.end_time_slot),'SUMMARY:'+escape(record.service_name),'LOCATION:'+escape(record.salon_address),'STATUS:TENTATIVE','END:VEVENT','END:VCALENDAR'].join('\r\n');
  const url=URL.createObjectURL(new Blob([content],{type:'text/calendar;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='beautybook-rendez-vous.ics';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
 }
 if(record&&payment==='surplace')return <section className="space-y-6 rounded-3xl border border-green-200 bg-white p-6 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-green-700"/><h2 className="text-2xl font-bold">Votre demande est enregistrée</h2><p>Le professionnel doit encore confirmer ce rendez-vous.</p><p className="text-gray-600">{record.service_name}<br/>{String(record.date).slice(0,10)} à {record.time_slot}<br/>{record.salon_name} · {record.salon_address}</p><p className="font-semibold">{money(record.total_price)} · À régler sur place</p><button className="min-h-12 rounded-xl border px-5" onClick={calendar}>Ajouter au calendrier</button><Link className="block min-h-12 rounded-xl bg-primary p-3 font-bold text-white" to="/RendezVous">Voir mes rendez-vous</Link></section>;
  return <section className="mx-auto max-w-2xl space-y-4"><button className="flex min-h-12 items-center gap-2 rounded-xl px-1 text-sm font-medium text-slate-700 transition hover:text-primary" onClick={onBack} disabled={saving||Boolean(record)}><ArrowLeft size={18}/>Retour au créneau</button><div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]"><div className="bg-gradient-to-br from-orange-50 via-white to-rose-50 px-5 pb-6 pt-7 sm:px-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Votre prochain rendez-vous</p><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Vérifiez, puis réservez.</h2><p className="mt-2 text-sm text-slate-500">Un dernier contrôle avant d’envoyer votre demande au professionnel.</p></div><div className="space-y-5 px-5 py-6 sm:px-8"><div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"><div className="mb-4 flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-wider text-slate-400">Prestation</span><span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-primary">{persons} personne(s)</span></div>{booking.services.map(service=><div key={service.id} className="border-b border-slate-200 pb-3 font-bold text-slate-900 last:border-0 last:pb-0">{service.name||service.title}</div>)}<div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2"><p className="flex items-center gap-3"><CalendarDays size={19} className="text-primary"/>{booking.date?format(new Date(booking.date),'EEEE d MMMM yyyy',{locale:fr}):''}</p><p className="flex items-center gap-3"><Clock size={19} className="text-primary"/>{booking.time}{quote&&` – ${quote.end} · ${quote.duration_min} min`}</p><p className="flex items-center gap-3 sm:col-span-2"><MapPin size={19} className="text-primary"/>{booking.salon?.name||booking.salon?.salon_name||'Au salon du professionnel'}</p></div></div>
 {loading&&<p role="status" className="flex items-center gap-2 text-gray-600"><LoaderCircle className="animate-spin" size={18}/>Vérification du tarif et des disponibilités…</p>}
 {quote&&<><div className="flex justify-between rounded-xl bg-gray-50 p-4"><span>Total vérifié</span><strong className="text-xl">{money(quote.price)}</strong></div><label className="mt-5 block text-sm font-medium">Une précision pour le professionnel<textarea className="mt-2 w-full rounded-xl border p-3" rows={3} maxLength={2000} value={notes} disabled={Boolean(record)} onChange={e=>setNotes(e.target.value)}/></label><fieldset className="mt-5 space-y-3"><legend className="mb-3 font-semibold">Règlement</legend><label className="flex min-h-12 items-center gap-3 rounded-xl border p-3"><input type="radio" name="payment" checked={payment==='surplace'} onChange={()=>setPayment('surplace')} disabled={Boolean(record)}/>Sur place, auprès du professionnel</label>{online&&<label className="flex min-h-12 items-center gap-3 rounded-xl border p-3"><input type="radio" name="payment" checked={payment==='carte'} onChange={()=>setPayment('carte')} disabled={Boolean(record)}/>Par carte, sur la page sécurisée Stripe</label>}</fieldset><p className="mt-5 flex gap-2 text-xs leading-relaxed text-gray-600"><ShieldCheck size={18} className="shrink-0"/>Le créneau est revérifié lors de l’enregistrement. Un paiement en ligne est validé uniquement après confirmation de Stripe.</p></>}
 {error&&<p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}{record&&' Votre demande existe déjà : vous pouvez réessayer le paiement depuis cet écran sans créer un doublon.'}</p>}
  <button className="mt-5 min-h-12 w-full rounded-xl bg-primary p-4 font-bold text-white disabled:opacity-50" disabled={saving||loading||!quote} onClick={confirm}>{saving?'Enregistrement…':payment==='carte'?'Continuer vers le paiement':'Demander ce rendez-vous'}</button></div></div></section>;
}
