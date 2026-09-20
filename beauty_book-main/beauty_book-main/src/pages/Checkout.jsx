import {useEffect,useRef,useState} from 'react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {ArrowLeft,Lock,Package,RefreshCw,Truck} from 'lucide-react';
import {apiClient} from '@/lib/apiClient';
import {useAuth} from '@/lib/AuthContext';
const money=cents=>(cents/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
const countries=[['FR','France'],['BE','Belgique'],['LU','Luxembourg'],['CH','Suisse'],['DE','Allemagne'],['ES','Espagne'],['IT','Italie'],['CA','Canada'],['MA','Maroc'],['SN','Sénégal'],['CI','Côte d’Ivoire'],['CM','Cameroun']];
export default function Checkout(){
 const navigate=useNavigate(),[params]=useSearchParams(),{user}=useAuth();
 const [items,setItems]=useState([]),[quote,setQuote]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [address,setAddress]=useState({firstName:'',lastName:'',address1:'',address2:'',city:'',zip:'',country:'FR',phone:''});
 const key=useRef(null),product=params.get('productId'),variant=params.get('variantId');
 useEffect(()=>{
  let alive=true;setLoading(true);setError('');
  if(!user||variant){setLoading(false);return;}
  (product?Promise.resolve([{product_id:product,quantity:Math.max(1,Number(params.get('quantity'))||1)}]):apiClient.get('/cart').then(r=>r.panier.items))
   .then(async rows=>{if(!rows.length)throw new Error('Votre panier est vide.');const clean=rows.map(i=>({product_id:i.product_id||i.produit_id,quantity:i.quantity}));const q=await apiClient.post('/commerce/quote',{items:clean,country:address.country});if(alive){setItems(clean);setQuote(q);}})
   .catch(e=>{if(alive){setQuote(null);setError(e.message);}}).finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;};
 },[user?.id,product,variant,address.country]);
 function change(field,value){setAddress(a=>({...a,[field]:value}));key.current=null;}
 async function pay(e){
  e.preventDefault();setError('');setBusy(true);
  try{
   const body={items,shipping_address:address,expected_total_cents:quote?.total_cents};
   const fingerprint=JSON.stringify(body),storageKey='bb_checkout_attempt_'+user.id;
   if(!key.current){try{const old=JSON.parse(sessionStorage.getItem(storageKey));if(old?.fingerprint===fingerprint&&Date.now()-old.time<35*60*1000)key.current=old.key;}catch{}}
   key.current ||=crypto.randomUUID();
   sessionStorage.setItem(storageKey,JSON.stringify({key:key.current,fingerprint,time:Date.now()}));
   const result=await apiClient.post('/payments/checkout-session',body,{headers:{'Idempotency-Key':key.current}});
   const target=new URL(result.checkoutUrl);if(target.protocol!=='https:'||target.hostname!=='checkout.stripe.com')throw new Error('Adresse de paiement invalide.');
   window.location.assign(target.href);
  }catch(e){setError(e.message);if(e.code==='PRICE_CHANGED'){setQuote(await apiClient.post('/commerce/quote',{items,country:address.country}).catch(()=>null));key.current=null;}}
  finally{setBusy(false);}
 }
 async function partnerCheckout(){
  setBusy(true);setError('');
  try{const r=await apiClient.post('/commerce/partner-checkout',{variant_id:variant});const u=new URL(r.checkoutUrl);if(u.protocol!=='https:')throw new Error('Adresse de paiement invalide.');window.location.assign(u.href);}catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <main className="min-h-full bg-[#f6f5f2] pb-28 text-gray-900">
  <header className="flex items-center gap-4 border-b bg-white p-5"><button className="p-3 rounded-full bg-gray-100" aria-label="Retour au panier" onClick={()=>navigate('/panier')}><ArrowLeft size={20}/></button><div><p className="text-xs tracking-widest uppercase text-gray-500">BeautyBook · Boutique</p><h1 className="text-2xl font-bold">Finaliser ma commande</h1></div></header>
  <div className="max-w-3xl mx-auto p-5 space-y-5">
   {!user?<section className="bg-white p-6 rounded-2xl"><h2 className="font-bold">Connectez-vous pour continuer</h2><p className="my-3">Votre commande sera rattachée à votre compte.</p><button className="bg-primary text-white rounded-xl px-5 py-3" onClick={()=>navigate('/login?redirect='+encodeURIComponent(window.location.pathname+window.location.search))}>Me connecter</button></section>:<>
    {error&&<div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">{error}</div>}
    {variant?<section className="bg-white p-6 rounded-2xl space-y-4"><Package/><h2 className="font-bold text-xl">Achat auprès de la boutique partenaire</h2><p>Le prix, la livraison et le suivi de cette commande sont gérés par la boutique partenaire sur sa page de paiement.</p><button className="bg-primary text-white rounded-xl px-5 py-3" onClick={partnerCheckout} disabled={busy}>{busy?'Ouverture…':'Ouvrir le paiement de la boutique'}</button></section>:loading?<p role="status" className="flex gap-3 items-center"><RefreshCw className="animate-spin"/>Vérification des prix et de la livraison…</p>:<form onSubmit={pay} className="space-y-5">
     <section className="bg-white rounded-2xl p-6 space-y-4"><h2 className="text-lg font-bold flex gap-2"><Truck/>Votre livraison</h2><div className="grid sm:grid-cols-2 gap-4">{[['firstName','Prénom','given-name'],['lastName','Nom','family-name'],['address1','Adresse','address-line1'],['address2','Complément d’adresse','address-line2'],['zip','Code postal','postal-code'],['city','Ville','address-level2'],['phone','Téléphone','tel']].map(([field,label,auto])=><label key={field} className="text-sm font-medium">{label}<input className="block w-full border rounded-xl p-3 mt-1" autoComplete={auto} type={field==='phone'?'tel':'text'} required={!['address2','phone'].includes(field)} maxLength={160} value={address[field]} onChange={e=>change(field,e.target.value)}/></label>)}<label className="text-sm font-medium">Pays<select className="block w-full border rounded-xl p-3 mt-1" value={address.country} onChange={e=>change('country',e.target.value)}>{countries.map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></label></div><p className="text-sm text-gray-500">Confirmation et suivi dans le compte {user.email}.</p></section>
     {quote&&<section className="bg-white rounded-2xl p-6 space-y-4"><h2 className="text-lg font-bold">Votre récapitulatif</h2>{quote.items.map(i=><div className="flex justify-between gap-4 border-b pb-3" key={i.product_id}><div><strong>{i.name}</strong><p className="text-sm text-gray-500">{i.shop_name} · Quantité {i.quantity}</p></div><span>{money(Math.round(i.unit_price*100)*i.quantity)}</span></div>)}{quote.shipments.map(s=><div className="flex justify-between text-sm" key={s.seller_id}><span>Livraison · {s.shop_name}</span><span>{money(s.shipping_cents)}</span></div>)}<div className="flex justify-between text-xl font-bold pt-3 border-t"><span>Total à payer</span><span>{money(quote.total_cents)}</span></div><button disabled={busy} className="w-full min-h-12 rounded-xl bg-primary text-white font-bold p-4 disabled:opacity-60">{busy?'Préparation du paiement…':'Payer '+money(quote.total_cents)}</button><p className="flex gap-2 items-center text-sm text-gray-500"><Lock size={16}/>Vos coordonnées bancaires sont saisies sur Stripe.</p></section>}
    </form>}
   </>}
  </div>
 </main>;
}
