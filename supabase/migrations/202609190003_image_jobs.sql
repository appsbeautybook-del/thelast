BEGIN;
CREATE TABLE IF NOT EXISTS public.bb_image_jobs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_key text NOT NULL,request_hash text NOT NULL,kind text NOT NULL CHECK(kind IN ('hair','article','outfit','exchange')),
 label text NOT NULL,input jsonb NOT NULL,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','completed','failed','uncertain','deleted')),
 output_path text,error_code text,created_at timestamptz NOT NULL DEFAULT now(),started_at timestamptz,finished_at timestamptz,
 UNIQUE(user_id,request_key)
);
ALTER TABLE public.bb_image_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bb_image_jobs FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.bb_image_jobs TO service_role;
CREATE INDEX IF NOT EXISTS bb_image_jobs_queue ON public.bb_image_jobs(created_at) WHERE status='queued';
CREATE INDEX IF NOT EXISTS bb_image_jobs_owner ON public.bb_image_jobs(user_id,created_at DESC);
DO $$ BEGIN
 IF to_regclass('storage.buckets') IS NOT NULL THEN
  INSERT INTO storage.buckets(id,name,public) VALUES('ai-results','ai-results',false) ON CONFLICT(id) DO UPDATE SET public=false;
 END IF;
 IF to_regclass('storage.objects') IS NOT NULL THEN
  DROP POLICY IF EXISTS bb_generated_guard ON storage.objects;
  CREATE POLICY bb_generated_guard ON storage.objects AS RESTRICTIVE FOR ALL TO anon,authenticated
   USING(bucket_id<>'ai-results') WITH CHECK(bucket_id<>'ai-results');
 END IF;
END $$;
COMMIT;
