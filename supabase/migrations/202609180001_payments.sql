BEGIN;
CREATE TABLE IF NOT EXISTS public.bb_payment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reservation_id uuid UNIQUE NOT NULL REFERENCES public."Reservation"(id),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, stripe_session_id text UNIQUE, checkout_url text,
  amount_cents bigint NOT NULL CHECK(amount_cents>0), currency text NOT NULL DEFAULT 'eur',
  status text NOT NULL DEFAULT 'creating' CHECK(status IN ('creating','open','paid','expired','refund_required','refunded')),
  payment_intent_id text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.bb_webhook_events (
  provider text NOT NULL, event_id text NOT NULL, event_type text NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(provider,event_id)
);
ALTER TABLE public.bb_payment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bb_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bb_payment_sessions,public.bb_webhook_events FROM anon,authenticated;
GRANT ALL ON public.bb_payment_sessions,public.bb_webhook_events TO service_role;
COMMIT;
