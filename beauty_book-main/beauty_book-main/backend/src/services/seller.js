import db from '../config/pg.js';
import { assert } from '../lib/errors.js';

export function validateProduct(input) {
  assert(input && typeof input === 'object' && !Array.isArray(input),400,'INVALID_PRODUCT','Produit invalide.');
  const allowed = ['name','description','price','old_price','category','brand','images','status','min_qty'];
  assert(Object.keys(input).every(key => allowed.includes(key)), 400, 'FIELD_NOT_WRITABLE', 'Un champ de produit n’est pas modifiable.');
  assert(typeof input.name === 'string' && input.name.trim().length >= 2 && input.name.length <= 180, 400, 'INVALID_PRODUCT_NAME', 'Le nom du produit doit contenir entre 2 et 180 caractères.');
  assert(Number.isFinite(Number(input.price)) && Number(input.price) > 0, 400, 'INVALID_PRICE', 'Le prix doit être supérieur à zéro.');
  assert(Number(input.price)<=99999999.99 && Math.abs(Number(input.price)*100-Math.round(Number(input.price)*100))<0.00001,400,'INVALID_PRICE','Le prix doit contenir au maximum deux décimales.');
  assert(input.old_price == null || input.old_price === '' || (Number.isFinite(Number(input.old_price)) && Number(input.old_price)>=Number(input.price) && Number(input.old_price)<=99999999.99),400,'INVALID_OLD_PRICE','L’ancien prix doit être supérieur ou égal au prix courant.');
  assert(Number.isInteger(Number(input.min_qty)) && Number(input.min_qty)>0 && Number(input.min_qty)<=100000,400,'INVALID_MIN_QUANTITY','La quantité minimum doit être un entier positif.');
  assert(['actif','inactif','brouillon'].includes(input.status), 400, 'INVALID_STATUS', 'Statut de produit invalide.');
  assert(Array.isArray(input.images) && input.images.length <= 8 && input.images.every(url => typeof url === 'string' && /^https:\/\//.test(url)), 400, 'INVALID_IMAGES', 'Les photos doivent être téléversées avant enregistrement.');
  return {
    name: input.name.trim(), description: String(input.description || '').slice(0,5000), price: Number(input.price),
    old_price: input.old_price == null || input.old_price === '' ? null : Number(input.old_price),
    category: String(input.category || '').slice(0,100), brand: String(input.brand || '').slice(0,100), images: input.images,
    status: input.status, min_qty: Number.isInteger(Number(input.min_qty)) && Number(input.min_qty) > 0 ? Number(input.min_qty) : 1,
  };
}

export function createSellerService(database = db) {
const db=database;
const transaction=work=>database.transaction(work);
async function requireSellerAccount(user) {
  const { rows } = await db.query('SELECT user_id,shop_name,status,low_stock_threshold,shipping_countries,shipping_fee_cents,free_shipping_from_cents,shipping_configured FROM public.bb_seller_accounts WHERE user_id=$1', [user.id]);
  assert(rows[0]?.status === 'active', 403, 'SELLER_APPROVAL_REQUIRED', 'Votre compte vendeur doit être validé pour accéder à cet espace.');
  return rows[0];
}
async function applySeller(user, input) {
  assert(typeof input.shop_name === 'string' && input.shop_name.trim().length >= 2 && input.shop_name.trim().length <= 120,400,'INVALID_SHOP_NAME','Le nom de la boutique doit contenir entre 2 et 120 caractères.');
  const {rows} = await db.query(`INSERT INTO public.bb_seller_accounts (user_id,shop_name) VALUES ($1,$2)
    ON CONFLICT (user_id) DO NOTHING RETURNING user_id,status`,[user.id,input.shop_name.trim()]);
  if(rows[0]) return rows[0];
  const {rows: existing} = await db.query('SELECT user_id,status FROM public.bb_seller_accounts WHERE user_id=$1',[user.id]);
  return existing[0];
}
async function sellerOverview(user) {
  const account = await requireSellerAccount(user);
  const [{ rows: products }, { rows: orders }, { rows: movements }, {rows: stats}] = await Promise.all([
    db.query('SELECT id,name,description,price,old_price,stock,status,images,category,brand,min_qty,updated_at FROM public."Produit" WHERE seller_user_id=$1 ORDER BY created_at DESC LIMIT 500', [user.id]),
    db.query('SELECT l.id,l.order_id,l.product_id,l.product_name,l.quantity,l.unit_price,l.status,l.tracking_number,l.carrier,l.created_at,CASE WHEN l.status IN (\'paid\',\'preparing\',\'shipped\',\'delivered\') THEN coalesce(o.shipping_details,to_jsonb(o.shipping_address)) END AS shipping_address FROM public.bb_order_lines l JOIN public."Commande" o ON o.id=l.order_id WHERE l.seller_id=$1 ORDER BY l.created_at DESC LIMIT 200', [user.id]),
    db.query('SELECT m.id,m.product_id,p.name,m.quantity,m.reason,m.stock_after,m.created_at FROM public.bb_inventory_movements m JOIN public."Produit" p ON p.id=m.product_id WHERE m.seller_id=$1 ORDER BY m.created_at DESC LIMIT 40', [user.id]),
    db.query(`SELECT (SELECT count(*)::integer FROM public."Produit" WHERE seller_user_id=$1) AS product_count,
      (SELECT count(*)::integer FROM public."Produit" WHERE seller_user_id=$1 AND status='actif' AND stock<=$2) AS low_stock_count,
      count(*) FILTER(WHERE status IN ('paid','preparing'))::integer AS to_prepare,
      coalesce(sum(quantity*unit_price) FILTER(WHERE status IN ('paid','preparing','shipped','delivered')),0) AS sales_total
      FROM public.bb_order_lines WHERE seller_id=$1`,[user.id,account.low_stock_threshold]),
  ]);
  return {
    account, products, orders, movements,
    stats: stats[0],
    limits: {products:500,orders:200,movements:40},
  };
}

async function saveProduct(user, input, id) {
  await requireSellerAccount(user);
  const data = validateProduct(input);
  const keys = Object.keys(data);
  return transaction(async client => {
    let rows;
    if (id) {
      ({ rows } = await client.query(`UPDATE public."Produit" SET (${keys.map(key=>'"'+key+'"').join(',')}) = (SELECT ${keys.map(key=>'"'+key+'"').join(',')} FROM jsonb_populate_record(NULL::public."Produit",$1::jsonb)),updated_at=now() WHERE id::text=$2 AND seller_user_id=$3 RETURNING *`, [JSON.stringify(data),id,user.id]));
    } else {
      ({ rows } = await client.query(`INSERT INTO public."Produit" (${keys.map(k=>'"'+k+'"').join(',')},seller_user_id,pro_email,stock) SELECT ${keys.map(k=>'"'+k+'"').join(',')},$2,$3,0 FROM jsonb_populate_record(NULL::public."Produit",$1::jsonb) RETURNING *`, [JSON.stringify(data),user.id,user.email]));
    }
    assert(rows[0],404,'PRODUCT_NOT_FOUND','Produit introuvable dans votre catalogue.');
    return rows[0];
  });
}

async function adjustInventory(user, id, payload, requestKey) {
  await requireSellerAccount(user);
  assert(Number.isInteger(payload.quantity) && payload.quantity !== 0 && Math.abs(payload.quantity)<=100000,400,'INVALID_QUANTITY','Quantité invalide.');
  assert(typeof payload.reason === 'string' && payload.reason.trim().length >= 3,400,'REASON_REQUIRED','Précisez la raison du mouvement.');
  assert(typeof requestKey === 'string' && /^[A-Za-z0-9_-]{16,100}$/.test(requestKey),400,'IDEMPOTENCY_REQUIRED','Identifiant de mouvement manquant.');
  return transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`inventory:${user.id}:${requestKey}`]);
    const { rows: previous } = await client.query('SELECT * FROM public.bb_inventory_movements WHERE seller_id=$1 AND request_key=$2',[user.id,requestKey]);
    if (previous[0]) {
      assert(String(previous[0].product_id) === id && previous[0].quantity === payload.quantity && previous[0].reason === payload.reason.trim().slice(0,500),409,'IDEMPOTENCY_CONFLICT','Ce mouvement existe avec des données différentes.');
      return previous[0];
    }
    const { rows } = await client.query('UPDATE public."Produit" SET stock=stock+$1,updated_at=now() WHERE id::text=$2 AND seller_user_id=$3 AND stock+$1>=0 RETURNING stock,id',[payload.quantity,id,user.id]);
    assert(rows[0],409,'STOCK_UPDATE_REJECTED','Stock insuffisant ou produit inaccessible.');
    const { rows: movements } = await client.query('INSERT INTO public.bb_inventory_movements (product_id,seller_id,quantity,reason,stock_after,request_key) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',[rows[0].id,user.id,payload.quantity,payload.reason.trim().slice(0,500),rows[0].stock,requestKey]);
    return movements[0];
  });
}

async function fulfillOrder(user,id,payload) {
  await requireSellerAccount(user);
  return transaction(async client => {
    const {rows:[reference]}=await client.query('SELECT order_id FROM public.bb_order_lines WHERE id::text=$1 AND seller_id=$2',[id,user.id]);
    assert(reference,404,'ORDER_NOT_FOUND','Commande introuvable.');
    const {rows:[payment]}=await client.query('SELECT status FROM public.bb_order_payments WHERE order_id=$1 FOR SHARE',[reference.order_id]);
    assert(payment?.status==='paid',409,'ORDER_NOT_PAID','Le paiement de cette commande n’est pas confirmé.');
    await client.query('SELECT id FROM public."Commande" WHERE id=$1 FOR UPDATE',[reference.order_id]);
    const { rows } = await client.query('SELECT * FROM public.bb_order_lines WHERE id::text=$1 AND seller_id=$2 FOR UPDATE',[id,user.id]);
    const line=rows[0];
    assert(line,404,'ORDER_NOT_FOUND','Commande introuvable.');
    const transitions={paid:['preparing'],preparing:['shipped'],shipped:['delivered']};
    assert(transitions[line.status]?.includes(payload.status),409,'INVALID_TRANSITION','Cette commande ne peut pas passer à ce statut.');
    if(payload.status==='shipped') assert(typeof payload.tracking_number==='string' && payload.tracking_number.trim() && typeof payload.carrier==='string' && payload.carrier.trim(),400,'TRACKING_REQUIRED','Indiquez le transporteur et le numéro de suivi.');
    const {rows:updated}=await client.query('UPDATE public.bb_order_lines SET status=$1,tracking_number=COALESCE($2,tracking_number),carrier=COALESCE($3,carrier),updated_at=now() WHERE id=$4 RETURNING *',[payload.status,payload.tracking_number?.slice(0,120)||null,payload.carrier?.slice(0,80)||null,line.id]);
    const {rows:statuses}=await client.query('SELECT status FROM public.bb_order_lines WHERE order_id=$1',[line.order_id]);
    const states=statuses.map(s=>s.status);
    const status=states.every(s=>s==='delivered')?'livre':states.every(s=>['shipped','delivered'].includes(s))?'expedie':states.some(s=>['preparing','shipped','delivered'].includes(s))?'en_preparation':'confirme';
    await client.query('UPDATE public."Commande" SET status=$1,updated_at=now() WHERE id=$2',[status,line.order_id]);
    await client.query('INSERT INTO public.bb_outbox (topic,aggregate_id,payload) VALUES ($1,$2,$3::jsonb)',['order.fulfillment',line.order_id,JSON.stringify({line_id:line.id,status:payload.status})]);
    return updated[0];
  });
}

return {requireSellerAccount,applySeller,sellerOverview,saveProduct,adjustInventory,fulfillOrder};
}
export const {requireSellerAccount,applySeller,sellerOverview,saveProduct,adjustInventory,fulfillOrder} = createSellerService();
