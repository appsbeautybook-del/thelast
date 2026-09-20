BEGIN;
ALTER TABLE public."Notification" ADD COLUMN IF NOT EXISTS outbox_id uuid REFERENCES public.bb_outbox(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bb_notification_delivery ON public."Notification"(outbox_id,user_email) WHERE outbox_id IS NOT NULL;
COMMIT;
