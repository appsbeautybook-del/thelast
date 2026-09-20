BEGIN;
CREATE TABLE IF NOT EXISTS public.bb_carts (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 items jsonb NOT NULL DEFAULT '[]', updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.bb_order_payments (
 order_id uuid PRIMARY KEY REFERENCES public."Commande"(id) ON DELETE RESTRICT,
 user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 request_key text NOT NULL, request_hash text NOT NULL,
 amount_cents bigint NOT NULL CHECK(amount_cents>=50), currency text NOT NULL DEFAULT 'eur',
 status text NOT NULL DEFAULT 'creating' CHECK(status IN ('creating','open','paid','expired','refund_required','refunded')),
 stripe_session_id text UNIQUE, checkout_url text, payment_intent_id text,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_key)
);
CREATE TABLE IF NOT EXISTS public.bb_seller_transfers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES public."Commande"(id) ON DELETE RESTRICT,
 seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 stripe_account_id text NOT NULL, amount_cents bigint NOT NULL CHECK(amount_cents>=0), fee_cents bigint NOT NULL CHECK(fee_cents>=0),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','transferred','reversed','cancelled')),
 stripe_transfer_id text UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(order_id,seller_id)
);
ALTER TABLE public.bb_seller_accounts ADD COLUMN IF NOT EXISTS shipping_countries text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.bb_seller_accounts ADD COLUMN IF NOT EXISTS shipping_fee_cents integer NOT NULL DEFAULT 0 CHECK(shipping_fee_cents>=0 AND shipping_fee_cents<=100000);
ALTER TABLE public.bb_seller_accounts ADD COLUMN IF NOT EXISTS free_shipping_from_cents integer CHECK(free_shipping_from_cents>=0);
ALTER TABLE public.bb_seller_accounts ADD COLUMN IF NOT EXISTS shipping_configured boolean NOT NULL DEFAULT false;
ALTER TABLE public.bb_order_lines ADD COLUMN IF NOT EXISTS stock_released boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS bb_order_payments_reconcile ON public.bb_order_payments(expires_at) WHERE status IN ('creating','open');
ALTER TABLE public.bb_order_payments ADD COLUMN IF NOT EXISTS reconcile_after timestamptz NOT NULL DEFAULT now();
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['bb_carts','bb_order_payments','bb_seller_transfers'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO service_role',t);
 END LOOP;
END $$;
COMMIT;
