import {useEffect,useState} from 'react';
import {CreditCard,Truck,ArrowUpRight,RefreshCw} from 'lucide-react';
import {Capacitor} from '@capacitor/core';
import {api} from './api';
const money=n=>(Number(n)/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
const countries=[['FR','France'],['BE','Belgique'],['LU','Luxembourg'],['CH','Suisse'],['DE','Allemagne'],['ES','Espagne'],['IT','Italie'],['CA','Canada'],['MA','Maroc'],['SN','Sénégal'],['CI','Côte d’Ivoire'],['CM','Cameroun']];
export default function SellerCommerce({account,onSaved}){
 const [payment,setPayment]=useState(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[country,setCountry]=useState('FR');
 const [destinations,setDestinations]=useState(account.shipping_countries||[]),[fee,setFee]=useState(account.shipping_fee_cents/100||0),[threshold,setThreshold]=useState(account.free_shipping_from_cents==null?'':account.free_shipping_from_cents/100);
 async function refresh(){setError('');try{setPayment(await api('/payments'));}catch(e){setError(e.message);}}
 useEffect(()=>{refresh();},[]);
 async function open(path){
  setBusy(true);setError('');
  try{
   const {url}=await api(path,{method:'POST',body:{country}});
   const u=new URL(url);if(u.protocol!=='https:'||!['connect.stripe.com','dashboard.stripe.com'].includes(u.hostname))throw new Error('Adresse de paiement invalide.');
   if(Capacitor.isNativePlatform()){const {Browser}=await import('@capacitor/browser');await Browser.open({url:u.href});}
   else window.location.assign(u.href);
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function save(e){
  e.preventDefault();setBusy(true);setError('');setMessage('');
  try{
   const f=Number(fee)*100,t=Number(threshold)*100;
   if(!Number.isFinite(f)||Math.abs(f-Math.round(f))>0.00001||Math.abs(t-Math.round(t))>0.00001)throw new Error('Saisissez des montants avec deux décimales au maximum.');
   await api('/shipping',{method:'PUT',body:{shipping_countries:destinations,shipping_fee_cents:Math.round(f),free_shipping_from_cents:threshold===''?null:Math.round(t)}});
   await onSaved();setMessage('Vos conditions de livraison sont enregistrées.');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <div className="commerce-settings">
  {error&&<p className="notice" role="alert">{error}</p>}{message&&<p className="success" role="status">{message}</p>}
  <section className="panel settings-panel"><div className="section-heading"><h2><CreditCard size={22}/> Paiements et versements</h2><button className="icon-button" aria-label="Actualiser le statut de paiement" onClick={refresh}><RefreshCw size={19}/></button></div>
   <p className="muted">Vérifiez votre entreprise et votre compte bancaire auprès de Stripe pour recevoir les ventes de votre boutique.</p>
   {payment&&<><p className={'status '+(payment.ready?'actif':'pending')}>{payment.ready?'Versements activés':payment.connected?'Configuration à terminer':'Compte à connecter'}</p>
    {!payment.connected&&<label>Pays de votre entreprise<select value={country} onChange={e=>setCountry(e.target.value)}>{countries.map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></label>}
    <div className="commerce-actions"><button className="button primary" disabled={busy} onClick={()=>open('/payments/onboarding')}>{payment.ready?'Mettre à jour mes informations':'Configurer mes versements'}<ArrowUpRight size={18}/></button>{payment.connected&&<button className="button" disabled={busy} onClick={()=>open('/payments/dashboard')}>Ouvrir Stripe</button>}</div>
    {payment.connected&&!payment.ready&&<p className="muted">Terminez les étapes demandées par Stripe, puis actualisez le statut ici. Les ventes en ligne s’ouvrent une fois le compte validé.</p>}
    {payment.transfers?.length>0&&<div className="transfer-history"><h3>Transferts vers votre compte Stripe</h3>{payment.transfers.map(t=><div className="transfer-row" key={t.order_id}><span>#{t.order_id.slice(0,8)}<small>{new Date(t.created_at).toLocaleDateString('fr-FR')}</small></span><span>{money(t.amount_cents)}<small>Commission : {money(t.fee_cents)}</small></span><span>{({pending:'En attente',transferred:'Transféré',reversed:'Repris pour remboursement',cancelled:'Annulé'})[t.status]}</span></div>)}<p className="muted">Un transfert alimente votre compte Stripe. Le calendrier des versements bancaires est disponible dans Stripe.</p></div>}
   </>}
  </section>
  <section className="panel settings-panel"><h2><Truck size={22}/> Livraison</h2><p className="muted">Les frais sont appliqués une fois par commande passée à votre boutique.</p><form onSubmit={save}>
   <fieldset><legend>Pays desservis</legend><div className="shipping-countries">{countries.map(([code,name])=><label key={code}><input type="checkbox" checked={destinations.includes(code)} onChange={e=>setDestinations(prev=>e.target.checked?[...prev,code]:prev.filter(c=>c!==code))}/>{name}</label>)}</div></fieldset>
   <label>Frais de livraison (€)<input type="number" min="0" max="1000" step="0.01" required value={fee} onChange={e=>setFee(e.target.value)}/></label>
   <label>Livraison offerte dès (€)<input type="number" min="0" step="0.01" value={threshold} onChange={e=>setThreshold(e.target.value)} placeholder="Aucun seuil"/><small>Laissez vide si les frais s’appliquent à toutes les commandes.</small></label>
   <button className="button primary" disabled={busy||destinations.length===0}>{busy?'Enregistrement…':'Enregistrer la livraison'}</button>
  </form></section>
 </div>;
}
