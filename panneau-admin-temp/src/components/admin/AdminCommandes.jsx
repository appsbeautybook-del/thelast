import {useEffect,useState,useCallback} from 'react';
import {adminApi} from '@/lib/adminApiClient';
import {apiClient} from '@/lib/apiClient';
import {Search,RefreshCw} from 'lucide-react';
const labels={en_attente:'Paiement en attente',confirme:'Confirmée',en_preparation:'En préparation',expedie:'Expédiée',livre:'Livrée',annule:'Annulée',rembourse:'Remboursée'};
export default function AdminCommandes(){
 const [orders,setOrders]=useState([]),[loading,setLoading]=useState(true),[search,setSearch]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[selected,setSelected]=useState(null),[message,setMessage]=useState('');
 const load=useCallback(async()=>{try{setOrders(await adminApi.listCommandes());setError('');}catch(e){setError(e.message);}finally{setLoading(false);}},[]);
 useEffect(()=>{load();const timer=setInterval(load,30000);return()=>clearInterval(timer);},[load]);
 async function refund(){
  setBusy(true);setMessage('');setError('');
  try{const r=await apiClient.post('/admin/commandes/'+selected.id+'/refund',{});setMessage(r.status==='refunded'?'Le remboursement est confirmé.':'La demande de remboursement est enregistrée. Le prestataire de paiement doit encore la confirmer.');setSelected(null);await load();}catch(e){setError(e.message);}finally{setBusy(false);}
 }
 const filtered=orders.filter(c=>[c.id,c.client_email,c.client_name].some(v=>String(v||'').toLowerCase().includes(search.toLowerCase())));
 return <section className="space-y-4"><div className="flex gap-3 items-center"><Search size={20}/><input aria-label="Rechercher une commande" placeholder="Client, email ou numéro de commande" value={search} onChange={e=>setSearch(e.target.value)} className="border rounded-xl p-3 flex-1"/><button className="p-3" onClick={load} aria-label="Actualiser les commandes"><RefreshCw size={20}/></button></div>
  {error&&<p role="alert" className="p-4 bg-red-50 text-red-800 rounded-xl">{error}</p>}{message&&<p role="status" className="p-4 bg-green-50 text-green-800 rounded-xl">{message}</p>}
  {selected&&<div className="p-5 border border-red-200 bg-white rounded-2xl"><h2 className="font-bold">Rembourser la commande #{selected.id.slice(0,8)}</h2><p className="my-3">Le montant intégral sera demandé au prestataire. L’opération est tracée dans le journal d’administration.</p><button disabled={busy} className="p-3 bg-red-700 text-white rounded-xl mr-3" onClick={refund}>{busy?'En cours…':'Confirmer le remboursement'}</button><button disabled={busy} onClick={()=>setSelected(null)} className="p-3 border rounded-xl">Fermer</button></div>}
  {loading?<p role="status">Chargement…</p>:filtered.length===0?<p>Aucune commande à afficher.</p>:filtered.map(c=><article className="p-5 bg-white rounded-2xl border space-y-3" key={c.id}><div className="flex justify-between gap-4"><div><h2 className="font-bold">{c.client_name||c.client_email}</h2><p className="text-sm text-gray-500">{c.client_email} · #{c.id.slice(0,8)}</p></div><strong>{Number(c.total||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}</strong></div><p>{labels[c.status]||c.status} · Paiement : {c.payment_status}</p>{(c.items||[]).map((i,n)=><p key={n} className="text-sm text-gray-600">{i.name} × {i.quantity}</p>)}{c.payment_status==='paye'&&['confirme','en_preparation'].includes(c.status)&&<button className="border border-red-200 text-red-700 p-3 rounded-xl" onClick={()=>setSelected(c)}>Annuler et rembourser</button>}<p className="text-xs text-gray-500">Le statut d’expédition suit les actions des vendeurs et le statut de paiement suit les événements du prestataire.</p></article>)}
 </section>;
}
