BEGIN;
CREATE TABLE IF NOT EXISTS public.bb_live_credentials(
 session_id uuid PRIMARY KEY REFERENCES public."LiveSession"(id) ON DELETE CASCADE,
 stream_key text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bb_live_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bb_live_credentials FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.bb_live_credentials TO service_role;
INSERT INTO public.bb_live_credentials(session_id,stream_key)
 SELECT id,mux_stream_key FROM public."LiveSession" WHERE nullif(mux_stream_key,'') IS NOT NULL
 ON CONFLICT(session_id) DO UPDATE SET stream_key=excluded.stream_key;
UPDATE public."LiveSession" SET mux_stream_key=NULL WHERE mux_stream_key IS NOT NULL;
CREATE OR REPLACE FUNCTION public.bb_clear_client_metrics() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE field text; data jsonb; BEGIN
 IF current_user NOT IN ('anon','authenticated') THEN RETURN NEW; END IF;
 data:=to_jsonb(NEW);
 FOREACH field IN ARRAY ARRAY['likes','views','comments_count','rating','reviews_count','viewers','viewers_count','total_spent','total_rdv','followers'] LOOP
  IF NOT data ? field THEN CONTINUE; END IF;
  IF TG_OP='INSERT' THEN data:=jsonb_set(data,ARRAY[field],'0'::jsonb);
  ELSIF data->field IS DISTINCT FROM to_jsonb(OLD)->field THEN RAISE EXCEPTION 'Metrics are server managed' USING ERRCODE='42501';
  END IF;
 END LOOP;
 IF TG_TABLE_NAME='LiveSession' AND nullif(data->>'mux_stream_key','') IS NOT NULL THEN RAISE EXCEPTION 'Broadcast credentials are server managed' USING ERRCODE='42501'; END IF;
 RETURN jsonb_populate_record(NEW,data);
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['Service','Style','Reel','Publication','Client','LiveSession','reel_comment'] LOOP
  IF to_regclass(format('public.%I',t)) IS NOT NULL THEN
   EXECUTE format('DROP TRIGGER IF EXISTS bb_clear_metrics ON public.%I',t);
   EXECUTE format('CREATE TRIGGER bb_clear_metrics BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bb_clear_client_metrics()',t);
  END IF;
 END LOOP;
END $$;

ALTER TABLE public."Avis" ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='Avis' LOOP
  EXECUTE format('DROP POLICY %I ON public."Avis"',p.policyname);
 END LOOP;
END $$;
ALTER TABLE public."Avis" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."Avis" FROM anon,authenticated;
GRANT SELECT ON public."Avis" TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public."Avis" TO authenticated;
CREATE POLICY bb_review_read ON public."Avis" FOR SELECT USING(
 auteur_email=auth.jwt()->>'email' OR cible_email=auth.jwt()->>'email' OR
 (status='published' AND (type='client_to_pro' OR (type='pro_to_client' AND EXISTS(
   SELECT 1 FROM public."ProfilPro" p WHERE p.owner_id=auth.uid() AND p.status='actif'
 ))))
);
CREATE POLICY bb_review_create ON public."Avis" FOR INSERT TO authenticated WITH CHECK(auteur_email=auth.jwt()->>'email' AND created_by_id=auth.uid() AND status='published');
CREATE POLICY bb_review_update ON public."Avis" FOR UPDATE TO authenticated USING(auteur_email=auth.jwt()->>'email' OR cible_email=auth.jwt()->>'email') WITH CHECK(auteur_email=auth.jwt()->>'email' OR cible_email=auth.jwt()->>'email');
CREATE POLICY bb_review_delete ON public."Avis" FOR DELETE TO authenticated USING(auteur_email=auth.jwt()->>'email' AND created_by_id=auth.uid());
CREATE OR REPLACE FUNCTION public.bb_validate_review() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE booking public."Reservation"; author public.profiles; criterion record; BEGIN
 IF current_user NOT IN ('anon','authenticated') THEN RETURN NEW; END IF;
 IF NEW.note IS NULL OR NEW.note<1 OR NEW.note>5 OR NEW.note<>trunc(NEW.note) OR length(coalesce(NEW.commentaire,''))>4000 OR length(coalesce(NEW.reponse_pro,''))>4000 THEN
  RAISE EXCEPTION 'Invalid review' USING ERRCODE='23514';
 END IF;
 IF jsonb_typeof(NEW.criteres) IS DISTINCT FROM 'object' OR cardinality(NEW.images)>8 THEN RAISE EXCEPTION 'Invalid review details' USING ERRCODE='23514'; END IF;
 FOR criterion IN SELECT * FROM jsonb_each_text(NEW.criteres) LOOP
  IF NOT (criterion.key='presence' AND criterion.value IN ('present','retard','absent')) AND
     NOT (criterion.key IN ('ponctualite','communication','proprete') AND criterion.value ~ '^[0-5]$') THEN
   RAISE EXCEPTION 'Invalid review criteria' USING ERRCODE='23514';
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM unnest(NEW.images) image WHERE image !~ '^https://') THEN RAISE EXCEPTION 'Invalid review media' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN
  SELECT * INTO booking FROM public."Reservation" WHERE id::text=NEW.reservation_id::text;
  IF booking.id IS NULL OR (
    (NEW.type='client_to_pro' AND booking.client_id=auth.uid() AND booking.status='termine' AND NEW.cible_email=booking.pro_email)
    OR (NEW.type='pro_to_client' AND booking.pro_email=auth.jwt()->>'email' AND booking.status IN ('termine','no_show') AND NEW.cible_email=booking.client_email)) IS NOT TRUE THEN
   RAISE EXCEPTION 'Completed appointment and matching participants required' USING ERRCODE='42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('review:'||NEW.reservation_id::text||':'||(auth.uid())::text,0));
  IF EXISTS(SELECT 1 FROM public."Avis" WHERE reservation_id::text=NEW.reservation_id::text AND auteur_email=auth.jwt()->>'email') THEN
   RAISE EXCEPTION 'Appointment already reviewed' USING ERRCODE='23505';
  END IF;
  SELECT * INTO author FROM public.profiles WHERE id=auth.uid();
  NEW.auteur_email:=auth.jwt()->>'email'; NEW.created_by_id:=auth.uid(); NEW.status:='published'; NEW.reponse_pro:=NULL; NEW.response_at:=NULL;
  NEW.auteur_nom:=coalesce(nullif(author.full_name,''),nullif(to_jsonb(author)->>'username',''),'Membre BeautyBook'); NEW.auteur_avatar:=author.avatar_url;
  NEW.cible_nom:=CASE WHEN NEW.type='client_to_pro' THEN booking.pro_name ELSE booking.client_name END;
  NEW.service_nom:=booking.service_name; NEW.created_at:=now();
 ELSE
  IF OLD.auteur_email=auth.jwt()->>'email' THEN
   IF (to_jsonb(NEW)-ARRAY['note','commentaire','images','criteres','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['note','commentaire','images','criteres','updated_at']) THEN
    RAISE EXCEPTION 'Only review content is editable' USING ERRCODE='42501';
   END IF;
  ELSE
   IF (to_jsonb(NEW)-ARRAY['reponse_pro','response_at','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['reponse_pro','response_at','updated_at']) THEN
    RAISE EXCEPTION 'Only response is editable' USING ERRCODE='42501';
   END IF;
   NEW.response_at:=now()::text;
  END IF;
 END IF;
 -- Keep optional columns of the old local schema consistent, without requiring
 -- those columns on the remote schema. French fields are the canonical API.
 NEW:=jsonb_populate_record(NEW,jsonb_build_object('rating',NEW.note,'comment',NEW.commentaire,'auteur_name',NEW.auteur_nom,'cible_name',NEW.cible_nom,'service_name',NEW.service_nom,'response',NEW.reponse_pro));
 NEW.updated_at:=now();
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bb_validate_review ON public."Avis";
CREATE TRIGGER bb_validate_review BEFORE INSERT OR UPDATE ON public."Avis" FOR EACH ROW EXECUTE FUNCTION public.bb_validate_review();

CREATE OR REPLACE FUNCTION public.bb_refresh_review_metrics() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE target text; BEGIN
 target:=CASE WHEN TG_OP='DELETE' THEN OLD.cible_email ELSE NEW.cible_email END;
 PERFORM pg_advisory_xact_lock(hashtextextended('review-metrics:'||target,0));
 UPDATE public."ProfilPro" p SET rating=a.average,reviews_count=a.count
 FROM (SELECT round(avg(note),1) average,count(*)::integer count FROM public."Avis"
       WHERE cible_email=target AND type='client_to_pro' AND status='published' AND note BETWEEN 1 AND 5) a
 WHERE p.user_email=target;
 UPDATE public."Service" s SET rating=a.average,reviews_count=a.count FROM (
  SELECT sv.id,round(avg(v.note),1) average,count(v.id)::integer count FROM public."Service" sv
  LEFT JOIN public."Reservation" r ON r.service_id::text=sv.id::text
  LEFT JOIN public."Avis" v ON v.reservation_id::text=r.id::text AND v.type='client_to_pro' AND v.status='published' AND v.note BETWEEN 1 AND 5
  WHERE sv.pro_email=target GROUP BY sv.id
 ) a WHERE s.id=a.id;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.bb_refresh_review_metrics() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS bb_refresh_review_metrics ON public."Avis";
CREATE TRIGGER bb_refresh_review_metrics AFTER INSERT OR UPDATE OR DELETE ON public."Avis" FOR EACH ROW EXECUTE FUNCTION public.bb_refresh_review_metrics();
COMMIT;
