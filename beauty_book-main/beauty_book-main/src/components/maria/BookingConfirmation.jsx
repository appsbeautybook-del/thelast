import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '@/lib/apiClient';

export default function BookingConfirmation({ proposal }) {
  const [state,setState]=useState('pending');
  const [error,setError]=useState('');
  const [reservation,setReservation]=useState(null);
  async function confirm() {
    setState('saving'); setError('');
    try {
      const data=await apiClient.post('/api/ai/confirm-booking',{id:proposal.id});
      setReservation(data.reservation); setState('saved');
    } catch(err) { setError(err.message); setState('pending'); }
  }
  return <section className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 p-4" aria-label="Proposition de rendez-vous">
    <h3 className="font-bold">{state==='saved' ? 'Rendez-vous enregistré' : 'Confirmer votre rendez-vous'}</h3>
    <p className="mt-2 text-sm">{proposal.date} à {proposal.time_slot} · {proposal.duration_min} min · {Number(proposal.price).toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}</p>
    <p className="mt-1 text-xs text-gray-600">{proposal.timezone} · Paiement sur place</p>
    {error && <p role="alert" className="my-2 text-sm text-red-700">{error}</p>}
    {reservation ? <><p className="my-2 text-sm">En attente de confirmation du professionnel.</p><Link to="/rendez-vous" className="underline">Voir mes rendez-vous</Link></> :
      <button type="button" disabled={state==='saving'} onClick={confirm} className="mt-3 min-h-11 rounded-xl bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-50">{state==='saving'?'Vérification du créneau…':'Confirmer la réservation'}</button>}
  </section>;
}
