BEGIN;
ALTER TABLE public.bb_receptionist_settings ADD COLUMN IF NOT EXISTS welcome_text text NOT NULL DEFAULT 'Bonjour, comment puis-je vous aider à préparer votre rendez-vous ?';
ALTER TABLE public.bb_receptionist_settings ADD COLUMN IF NOT EXISTS business_instructions text NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS public.bb_action_intents(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('booking_status','lead')),payload jsonb NOT NULL, result jsonb,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.bb_leads(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),professional_id uuid NOT NULL REFERENCES public."ProfilPro"(id) ON DELETE CASCADE,
 customer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,customer_name text,customer_email text,
 need text NOT NULL,source text NOT NULL,consented_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','converted','closed')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(professional_id,customer_id)
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['bb_action_intents','bb_leads'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO service_role',t);
 END LOOP;
END $$;
COMMIT;
