import Stripe from 'stripe';
import {assert} from '../lib/errors.js';
export function stripeClient(){
 assert(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_WEBHOOK_SECRET,503,'PAYMENTS_NOT_CONFIGURED','Le paiement en ligne n’est pas encore disponible.');
 return new Stripe(process.env.STRIPE_SECRET_KEY,{timeout:20000,maxNetworkRetries:1});
}
export function applicationUrl(){
 assert(process.env.APP_URL,503,'APP_URL_REQUIRED','L’adresse de retour de paiement doit être configurée.');
 const url=new URL(process.env.APP_URL);
 assert(url.protocol==='https:'||(process.env.NODE_ENV!=='production'&&['localhost','127.0.0.1'].includes(url.hostname)),503,'APP_URL_INVALID','Adresse de retour de paiement invalide.');
 return url.origin;
}
