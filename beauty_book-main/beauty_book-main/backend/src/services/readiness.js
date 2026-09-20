import db from '../config/pg.js';
export const requiredSchema={
 bb_admin_memberships:['user_id','active','permissions'],bb_outbox:['next_attempt_at'],bb_seller_accounts:['shipping_configured'],
 bb_order_payments:['reconcile_after'],bb_seller_transfers:['stripe_account_id'],bb_order_lines:['stock_released'],
 bb_payment_sessions:['status'],bb_carts:['items'],bb_action_intents:['result'],bb_leads:['consented_at'],
 bb_image_jobs:['output_path'],bb_live_credentials:['stream_key'],
 ProfilPro:['owner_id','timezone'],Reservation:['client_id','idempotency_key'],
 Commande:['shipping_details','payment_intent_id'],Avis:['note','commentaire','reponse_pro','status'],
};
export async function inspectSchema(database=db){
 const {rows}=await database.query('SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=ANY($2::text[])',['public',Object.keys(requiredSchema)]);
 const missing_tables=[],missing_columns=[];
 for(const [table,fields] of Object.entries(requiredSchema)){
  const columns=rows.filter(r=>r.table_name===table).map(r=>r.column_name);
  if(!columns.length)missing_tables.push(table);else for(const field of fields)if(!columns.includes(field))missing_columns.push(table+'.'+field);
 }
 return {ready:missing_tables.length===0&&missing_columns.length===0,missing_tables,missing_columns};
}
