-- Reconciles the historical local schema and the remote Data API schema inspected
-- on 2026-09-19. Additive only: original columns and historic addresses are retained.
BEGIN;
ALTER TABLE public."Commande" ADD COLUMN IF NOT EXISTS total_price numeric;
ALTER TABLE public."Commande" ADD COLUMN IF NOT EXISTS total numeric;
ALTER TABLE public."Commande" ADD COLUMN IF NOT EXISTS subtotal numeric;
ALTER TABLE public."Commande" ADD COLUMN IF NOT EXISTS shipping numeric;
ALTER TABLE public."Commande" ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public."Commande" ADD COLUMN IF NOT EXISTS payment_intent_id text;
ALTER TABLE public."Commande" ADD COLUMN IF NOT EXISTS shipping_details jsonb;
UPDATE public."Commande" SET total_price=total WHERE total_price IS NULL AND total IS NOT NULL;
UPDATE public."Commande" SET total=total_price WHERE total IS NULL AND total_price IS NOT NULL;
-- Do not convert historic free-text addresses into invented structured addresses.
UPDATE public."Commande" SET shipping_details=to_jsonb(shipping_address)
 WHERE shipping_details IS NULL AND jsonb_typeof(to_jsonb(shipping_address))='object';

ALTER TABLE public."Service" ADD COLUMN IF NOT EXISTS rating numeric;
ALTER TABLE public."Service" ADD COLUMN IF NOT EXISTS reviews_count integer NOT NULL DEFAULT 0;
ALTER TABLE public."Avis" ADD COLUMN IF NOT EXISTS note numeric;
ALTER TABLE public."Avis" ADD COLUMN IF NOT EXISTS commentaire text;
ALTER TABLE public."Avis" ADD COLUMN IF NOT EXISTS auteur_nom text;
ALTER TABLE public."Avis" ADD COLUMN IF NOT EXISTS cible_nom text;
ALTER TABLE public."Avis" ADD COLUMN IF NOT EXISTS service_nom text;
ALTER TABLE public."Avis" ADD COLUMN IF NOT EXISTS auteur_avatar text;
ALTER TABLE public."Avis" ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}';
ALTER TABLE public."Avis" ADD COLUMN IF NOT EXISTS criteres jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public."Avis" ADD COLUMN IF NOT EXISTS reponse_pro text;
ALTER TABLE public."Avis" ADD COLUMN IF NOT EXISTS response_at text;
UPDATE public."Avis" a SET
 note=coalesce(note,(to_jsonb(a)->>'rating')::numeric),
 commentaire=coalesce(commentaire,to_jsonb(a)->>'comment'),
 auteur_nom=coalesce(auteur_nom,to_jsonb(a)->>'auteur_name'),
 cible_nom=coalesce(cible_nom,to_jsonb(a)->>'cible_name'),
 service_nom=coalesce(service_nom,to_jsonb(a)->>'service_name'),
 reponse_pro=coalesce(reponse_pro,to_jsonb(a)->>'response');
COMMIT;
