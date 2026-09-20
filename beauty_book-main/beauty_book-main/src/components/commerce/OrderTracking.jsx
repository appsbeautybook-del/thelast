import {useCallback,useEffect,useState} from 'react';
import {useNavigate,useParams} from 'react-router-dom';
import {ArrowLeft,RefreshCw,Package,Truck} from 'lucide-react';
import {apiClient} from '@/lib/apiClient';
const labels={pending:'Paiement en attente',paid:'À préparer',preparing:'En préparation',shipped:'Expédié',delivered:'Livré',cancelled:'Annulé',refunded:'Remboursé'};
const payments={creating:'Paiement à terminer',open:'Paiement à terminer',paid:'Paiement confirmé',expired:'Paiement expiré',refund_required:'Remboursement en cours',refunded:'Remboursement confirmé'};
const money=n=>Number(n).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
export default function OrderTracking(){
 const {id}=useParams(),navigate=useNavigate(),[data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);
 const refresh=useCallback(async()=>{try{setData(await apiClient.get('/commandes/'+id));setError('');}catch(e){setError(e.message);}},[id]);
 useEffect(()=>{refresh();const timer=setInterval(refresh,20000);return()=>clearInterval(timer);},[refresh]);
 async function cancel(){setBusy(true);setError('');try{await apiClient.post('/commandes/'+id+'/refund',{});setConfirm(false);await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}}
 const canCancel=data?.payment_status==='paid'&&data.lines.every(l=>['paid','preparing'].includes(l.status));
 return <main className="min-h-full bg-[#f6f5f2] pb-28"><header className="flex gap-4 items-center bg-white border-b p-5"><button className="p-3 rounded-full bg-gray-100" aria-label="Retour aux commandes" onClick={()=>navigate('/mes-commandes')}><ArrowLeft size={20}/></button><h1 className="text-xl font-bold flex-1">Suivi de ma commande</h1><button aria-label="Actualiser la commande" onClick={refresh} className="p-3"><RefreshCw size={20}/></button></header><div className="max-w-2xl mx-auto p-5 space-y-5">
  {error&&<p role="alert" className="p-4 bg-red-50 text-red-800 rounded-xl">{error}</p>}
  {!data&&!error&&<p role="status">Chargement de la commande…</p>}
  {data&&<><section className="p-6 bg-white rounded-2xl"><p className="text-xs uppercase tracking-widest text-gray-500">Commande #{id.slice(0,8)}</p><h2 className="font-bold text-2xl mt-2">{payments[data.payment_status]||data.order.status}</h2><p className="mt-2 text-gray-500">{new Date(data.order.created_at).toLocaleString('fr-FR')}</p></section>
   <section className="p-6 bg-white rounded-2xl space-y-5"><h2 className="font-bold flex gap-2"><Package/>Vos articles</h2>{data.lines.map(l=><article key={l.id} className="border-t pt-4"><div className="flex justify-between gap-4"><h3 className="font-bold">{l.product_name}</h3><span>{money(l.quantity*l.unit_price)}</span></div><p className="text-sm mt-2">{l.quantity} unité(s) · {labels[l.status]||l.status}</p>{l.tracking_number&&<p className="p-3 rounded-xl bg-green-50 mt-3 flex gap-2 text-sm"><Truck size={18}/>{l.carrier} · Suivi : {l.tracking_number}</p>}</article>)}<div className="flex justify-between border-t pt-3"><span>Livraison</span><span>{money(data.order.shipping)}</span></div><div className="flex justify-between text-xl font-bold"><span>Total</span><span>{money(data.order.total)}</span></div></section>
   <section className="p-6 bg-white rounded-2xl"><h2 className="font-bold mb-3">Adresse de livraison</h2><address className="not-italic text-gray-600">{data.order.shipping_address?.firstName} {data.order.shipping_address?.lastName}<br/>{data.order.shipping_address?.address1}<br/>{data.order.shipping_address?.address2&&<>{data.order.shipping_address.address2}<br/></>}{data.order.shipping_address?.zip} {data.order.shipping_address?.city} · {data.order.shipping_address?.country}</address></section>
   {canCancel&&<section className="p-6 bg-white rounded-2xl">{confirm?<><p>Annuler cette commande et demander le remboursement intégral de {money(data.order.total)} ?</p><p className="text-sm text-gray-500 my-3">Le suivi affichera le remboursement après confirmation du prestataire de paiement.</p><div className="flex gap-3"><button disabled={busy} onClick={cancel} className="p-3 bg-red-700 text-white rounded-xl">{busy?'Demande en cours…':'Confirmer l’annulation'}</button><button disabled={busy} onClick={()=>setConfirm(false)} className="p-3 border rounded-xl">Conserver ma commande</button></div></>:<button onClick={()=>setConfirm(true)} className="text-red-700 p-3 border rounded-xl">Annuler avant l’expédition</button>}</section>}
  </>}
 </div></main>;
}
