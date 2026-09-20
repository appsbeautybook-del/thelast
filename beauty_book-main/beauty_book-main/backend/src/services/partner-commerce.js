import {assert} from '../lib/errors.js';
export async function partnerCheckout(user,input,fetchImpl=fetch,env=process.env){
 const domain=env.SHOPIFY_STORE_DOMAIN,token=env.SHOPIFY_STOREFRONT_TOKEN;
 assert(domain&&/^[a-z0-9-]+\.myshopify\.com$/.test(domain)&&token,503,'PARTNER_NOT_CONFIGURED','La boutique partenaire n’est pas encore connectée.');
 assert(typeof input.variant_id==='string'&&/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(input.variant_id),400,'INVALID_VARIANT','Variante de produit invalide.');
 const query='mutation Cart($input: CartInput!) { cartCreate(input:$input) { cart { checkoutUrl lines(first:1) { nodes { quantity } } } userErrors { message } } }';
 const response=await fetchImpl('https://'+domain+'/api/2026-07/graphql.json',{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Storefront-Access-Token':token},body:JSON.stringify({query,variables:{input:{lines:[{merchandiseId:input.variant_id,quantity:1}],buyerIdentity:{email:user.email}}}}),signal:AbortSignal.timeout(20000)});
 assert(response.ok,502,'PARTNER_UNAVAILABLE','La boutique partenaire ne répond pas. Réessayez.');
 const result=await response.json(),cart=result.data?.cartCreate;
 assert(!result.errors?.length&&!cart?.userErrors?.length&&cart?.cart?.lines?.nodes?.[0]?.quantity===1,409,'PARTNER_CART_REJECTED','Ce produit ne peut pas être commandé actuellement.');
 const url=new URL(cart.cart.checkoutUrl);
 assert(url.protocol==='https:',502,'INVALID_CHECKOUT_URL','La boutique a renvoyé une adresse de paiement invalide.');
 return {checkoutUrl:url.href};
}
