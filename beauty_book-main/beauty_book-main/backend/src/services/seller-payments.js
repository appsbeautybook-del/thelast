import db from '../config/pg.js';
import {assert} from '../lib/errors.js';
import {stripeClient} from './payments-provider.js';
function sellerUrl(){
 assert(process.env.SELLER_APP_URL,503,'SELLER_URL_REQUIRED','L’adresse de l’application vendeur doit être configurée.');
 const u=new URL(process.env.SELLER_APP_URL);
 assert(u.protocol==='https:'||(process.env.NODE_ENV!=='production'&&u.hostname==='localhost'),503,'SELLER_URL_INVALID','Adresse vendeur invalide.');
 return u.origin;
}
export function createSellerPayments(database=db,{getStripe=stripeClient,getSellerUrl=sellerUrl}={}){
 async function account(user,client=database){
  const {rows:[seller]}=await client.query('SELECT * FROM public.bb_seller_accounts WHERE user_id=$1',[user.id]);
  assert(seller?.status==='active',403,'SELLER_APPROVAL_REQUIRED','Votre compte vendeur doit être validé.');
  return seller;
 }
 async function status(user){
  const seller=await account(user);
  if(!seller.stripe_account_id)return {connected:false,ready:false};
  const a=await getStripe().accounts.retrieve(seller.stripe_account_id);
  const {rows:transfers}=await database.query('SELECT order_id,amount_cents,fee_cents,status,created_at FROM public.bb_seller_transfers WHERE seller_id=$1 ORDER BY created_at DESC LIMIT 100',[user.id]);
  return {connected:true,ready:a.capabilities?.transfers==='active'&&a.payouts_enabled,details_submitted:a.details_submitted,requirements:a.requirements?.currently_due||[],transfers};
 }
 async function onboarding(user,input){
  const stripe=getStripe(),url=getSellerUrl();
  const seller=await database.transaction(async client=>{
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['connect:'+user.id]);
   const s=await account(user,client);
   if(!s.stripe_account_id){
    assert(typeof input.country==='string'&&/^[A-Z]{2}$/.test(input.country),400,'COUNTRY_REQUIRED','Choisissez le pays de votre entreprise.');
    const a=await stripe.accounts.create({type:'express',country:input.country,email:user.email,capabilities:{transfers:{requested:true}},metadata:{seller_user_id:user.id}},{idempotencyKey:'seller-account-'+user.id});
    assert(a.id,502,'CONNECT_FAILED','Le compte de paiement n’a pas pu être créé.');
    await client.query('UPDATE public.bb_seller_accounts SET stripe_account_id=$1,updated_at=now() WHERE user_id=$2',[a.id,user.id]);s.stripe_account_id=a.id;
   }
   return s;
  });
  const link=await stripe.accountLinks.create({account:seller.stripe_account_id,type:'account_onboarding',return_url:url+'/?section=settings&connect=return',refresh_url:url+'/?section=settings&connect=refresh'});
  return {url:link.url};
 }
 async function dashboard(user){
  const s=await account(user);assert(s.stripe_account_id,409,'CONNECT_REQUIRED','Configurez votre compte de paiement.');
  return {url:(await getStripe().accounts.createLoginLink(s.stripe_account_id)).url};
 }
 async function shipping(user,input){
  await account(user);
  assert(Array.isArray(input.shipping_countries)&&input.shipping_countries.length>0&&input.shipping_countries.length<=50&&input.shipping_countries.every(c=>typeof c==='string'&&/^[A-Z]{2}$/.test(c)),400,'INVALID_COUNTRIES','Sélectionnez vos pays de livraison.');
  assert(Number.isInteger(input.shipping_fee_cents)&&input.shipping_fee_cents>=0&&input.shipping_fee_cents<=100000,400,'INVALID_SHIPPING_FEE','Les frais de livraison sont invalides.');
  assert(input.free_shipping_from_cents===null||(Number.isInteger(input.free_shipping_from_cents)&&input.free_shipping_from_cents>=0),400,'INVALID_SHIPPING_THRESHOLD','Le seuil de livraison offerte est invalide.');
  const {rows:[settings]}=await database.query('UPDATE public.bb_seller_accounts SET shipping_countries=$1,shipping_fee_cents=$2,free_shipping_from_cents=$3,shipping_configured=true,updated_at=now() WHERE user_id=$4 RETURNING shipping_countries,shipping_fee_cents,free_shipping_from_cents,shipping_configured',[[...new Set(input.shipping_countries)],input.shipping_fee_cents,input.free_shipping_from_cents,user.id]);
  return {settings};
 }
 return {status,onboarding,dashboard,shipping};
}
export const sellerPayments=createSellerPayments();
