import {useState} from 'react';
import apiClient from '@/lib/apiClient';
import BookingConfirmation from './BookingConfirmation';
export default function ActionConfirmation({proposal,onConfirmed}){
 const [busy,setBusy]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState('');
 if(proposal.type==='ACTION_GROUP')return <>{proposal.items.map(p=><ActionConfirmation key={p.id} proposal={p} onConfirmed={onConfirmed}/>)}</>;
 if(proposal.type==='BOOKING_CONFIRMATION')return <BookingConfirmation proposal={proposal}/>;
 if(proposal.type!=='ACTION_CONFIRMATION')return null;
 async function confirm(){
  setBusy(true);setError('');
  try{await apiClient.post('/ai/confirm-action',{id:proposal.id});setSaved(true);onConfirmed?.();}catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <section className="rounded-2xl border border-emerald-200 bg-emerald-50 text-gray-900 p-4 mt-4">
  <h3 className="font-bold">{proposal.kind==='lead'?'Partager ma demande avec '+proposal.professional:'Valider le changement de rendez-vous'}</h3>
  {proposal.kind==='lead'?<><p className="text-sm my-2">{proposal.need}</p><p className="text-sm">Votre nom, votre adresse email et cette demande seront transmis à ce professionnel.</p></>:<p className="text-sm my-2">{proposal.booking.service_name} · {proposal.booking.client_name} · {String(proposal.booking.date).slice(0,10)} à {proposal.booking.time_slot}<br/>Nouveau statut : {proposal.status==='confirme'?'Confirmé':'Annulé'}</p>}
  {error&&<p role="alert" className="text-red-800 my-2">{error}</p>}
  {saved?<p role="status" className="font-bold mt-3">{proposal.kind==='lead'?'Votre demande a été transmise.':'La modification est enregistrée.'}</p>:<button disabled={busy} className="bg-emerald-800 text-white rounded-xl min-h-12 p-3 mt-3 font-bold disabled:opacity-60" onClick={confirm}>{busy?'Enregistrement…':proposal.kind==='lead'?'Confirmer le partage':'Confirmer la modification'}</button>}
 </section>;
}
