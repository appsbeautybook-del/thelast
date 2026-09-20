BEGIN;
-- These policies replace historical policies only on the listed BeautyBook tables.
ALTER TABLE public."DemandeProV2" ADD COLUMN IF NOT EXISTS statut text NOT NULL DEFAULT 'en_attente';
ALTER TABLE public."DemandeProV2" ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'en_attente';
ALTER TABLE public."DemandeProV2" ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public."ProfilPro" ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.bb_record_owner(r jsonb, field text) RETURNS boolean
LANGUAGE sql STABLE SET search_path=public,pg_temp AS $$
 SELECT CASE WHEN field IN ('id','owner_id','created_by_id','seller_user_id','user_id')
 THEN r->>field=auth.uid()::text ELSE lower(r->>field)=lower(auth.jwt()->>'email') END
$$;
CREATE OR REPLACE FUNCTION public.bb_protect_owned_record() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE field text; new_data jsonb; old_data jsonb; expected text;
BEGIN
 IF current_user NOT IN ('anon','authenticated') THEN RETURN NEW; END IF;
 new_data:=to_jsonb(NEW);
 IF TG_OP='INSERT' THEN
   field:=TG_ARGV[0];
   expected:=CASE WHEN field IN ('owner_id','created_by_id','seller_user_id','user_id') THEN auth.uid()::text ELSE auth.jwt()->>'email' END;
   IF new_data->>field IS NOT NULL AND new_data->>field IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Identity cannot be impersonated' USING ERRCODE='42501'; END IF;
   NEW:=jsonb_populate_record(NEW,jsonb_build_object(field,expected,'created_by_id',auth.uid()));
 ELSE
   old_data:=to_jsonb(OLD);
   FOREACH field IN ARRAY ARRAY['id','created_by_id','owner_id','seller_user_id',TG_ARGV[0]] LOOP
     IF new_data->field IS DISTINCT FROM old_data->field THEN RAISE EXCEPTION 'Ownership is immutable' USING ERRCODE='42501'; END IF;
   END LOOP;
 END IF;
 IF TG_NARGS>1 THEN
   FOREACH field IN ARRAY string_to_array(TG_ARGV[1],',') LOOP
    IF TG_OP='UPDATE' AND to_jsonb(NEW)->field IS DISTINCT FROM to_jsonb(OLD)->field THEN RAISE EXCEPTION 'Server managed field: %',field USING ERRCODE='42501'; END IF;
   END LOOP;
 END IF;
 RETURN NEW;
END $$;

DO $$ DECLARE item record; pol record; own text; readable text; writable text; BEGIN
 FOR item IN SELECT * FROM (VALUES
  ('ProfilPro','user_email','catalog','status,verified,abonnement,abonnement_expires_at,stripe_customer_id,rating,reviews_count,followers'),
  ('Service','pro_email','catalog','rating,reviews_count'),
  ('Style','author_email','content','likes,views'),('Reel','author_email','content','likes,views,comments_count'),
  ('Publication','author_email','content','likes,comments_count'),
  ('CommentaireStyle','user_email','public',''),('reel_comment','user_email','public','likes'),
  ('RoutineBeaute','user_email','private',''),('Panier','user_email','private',''),
  ('UserMemory','user_email','private',''),('MariaConversation','user_email','private',''),
  ('VisiteVirtuelle','pro_email','public',''),('ServiceBundle','pro_email','public',''),
  ('CatalogueOption','pro_email','public',''),('MembreEquipe','pro_email','private',''),
  ('Client','pro_email','private','total_spent,total_rdv'),('DemandeProV2','user_email','application','statut,status,admin_notes'),
  ('DemandefFranchise','user_email','application','status'),
  ('user_like','user_email','private',''),('user_favorite','user_email','private',''),
  ('user_follow','follower_email','public',''),('Repub','user_email','public',''),
  ('reel_comment_report','user_email','private','status'),
  ('Produit','seller_user_id','server_catalog',''),('Commande','client_email','server_private',''),
  ('PointsFidelite','user_email','server_private',''),('PointsFidelitePro','user_email','server_private',''),
  ('SoldeBeautyPay','user_email','server_private',''),('UserSubscription','user_email','server_private',''),
  ('ProPaymentMethod','user_email','server_private',''),
  ('Annonce','pro_email','server_catalog',''),('StyleCategory','created_by_id','server_public',''),
  ('StyleSubCategory','created_by_id','server_public',''),('ImmobilierListing','created_by_id','content',''),
  ('LiveSession','host_email','live','mux_stream_key'),('LiveMessage','user_email','live_message',''),
  ('AppConfig','created_by_id','config','')
 ) AS rules(name,owner_field,kind,protected) LOOP
  IF to_regclass(format('public.%I',item.name)) IS NULL THEN CONTINUE; END IF;
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=item.name LOOP
   EXECUTE format('DROP POLICY %I ON public.%I',pol.policyname,item.name);
  END LOOP;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',item.name);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',item.name);
  own:=format('public.bb_record_owner(to_jsonb(%I),%L)',item.name,item.owner_field);
  readable:=CASE
   WHEN item.kind IN ('public','server_public','live_message') THEN 'true'
   WHEN item.kind IN ('catalog','server_catalog') THEN format('(to_jsonb(%I)->>''status'' IN (''actif'',''active'') OR %s)',item.name,own)
   WHEN item.kind IN ('content','live') THEN format('(to_jsonb(%I)->>''status'' IN (''publie'',''published'',''live'',''actif'') OR %s)',item.name,own)
   WHEN item.kind='config' THEN format('(to_jsonb(%I)->>''key'' IN (''home_config'',''homepage_config'',''appearance_config'',''explorer_config'',''boutique_banners'',''boutique_categories'',''loyalty_config'',''fidelite_config'',''payment_config'') AND to_jsonb(%I)->>''value'' !~* ''secret|password|access_token|service_role|sk-[a-z0-9]'')',item.name,item.name)
   ELSE own END;
  EXECUTE format('GRANT SELECT ON public.%I TO anon,authenticated',item.name);
  EXECUTE format('CREATE POLICY bb_read ON public.%I FOR SELECT USING (%s)',item.name,readable);
  IF item.kind NOT IN ('server_private','server_catalog','server_public','config') THEN
   writable:=own;
   IF item.owner_field='pro_email' THEN
    writable:=format('(%s AND EXISTS(SELECT 1 FROM public."ProfilPro" p WHERE p.owner_id=auth.uid() AND p.status=''actif''))',own);
   END IF;
   EXECUTE format('GRANT INSERT,UPDATE,DELETE ON public.%I TO authenticated',item.name);
   IF item.name<>'ProfilPro' THEN
    IF item.kind='application' THEN
     EXECUTE format('CREATE POLICY bb_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (%s AND coalesce(to_jsonb(%I)->>''status'',''en_attente'')=''en_attente'' AND coalesce(to_jsonb(%I)->>''statut'',''en_attente'')=''en_attente'' AND coalesce(to_jsonb(%I)->>''admin_notes'','''')='''')',item.name,own,item.name,item.name,item.name);
    ELSE EXECUTE format('CREATE POLICY bb_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',item.name,writable); END IF;
   END IF;
   EXECUTE format('CREATE POLICY bb_update ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',item.name,writable,writable);
   IF item.name<>'ProfilPro' THEN EXECUTE format('CREATE POLICY bb_delete ON public.%I FOR DELETE TO authenticated USING (%s)',item.name,writable); END IF;
   EXECUTE format('DROP TRIGGER IF EXISTS bb_owned_record ON public.%I',item.name);
   EXECUTE format('CREATE TRIGGER bb_owned_record BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bb_protect_owned_record(%L,%L)',item.name,item.owner_field,item.protected);
  END IF;
 END LOOP;
END $$;

-- Conversation access belongs to its participants. Recipients and content cannot be rewritten.
DO $$ DECLARE item record; pol record; participant text; sender text; BEGIN
 FOR item IN SELECT * FROM (VALUES('MessageChat','sender_email','receiver_email'),('CallLog','caller_email','callee_email'),('CallSignal','caller_email','callee_email')) r(name,sender,recipient) LOOP
  IF to_regclass(format('public.%I',item.name)) IS NULL THEN CONTINUE; END IF;
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=item.name LOOP EXECUTE format('DROP POLICY %I ON public.%I',pol.policyname,item.name); END LOOP;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',item.name);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',item.name);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON public.%I TO authenticated',item.name);
  sender:=format('%I=auth.jwt()->>''email''',item.sender);
  participant:=format('(%s OR %I=auth.jwt()->>''email'')',sender,item.recipient);
  EXECUTE format('CREATE POLICY bb_participant ON public.%I FOR SELECT TO authenticated USING(%s)',item.name,participant);
  EXECUTE format('CREATE POLICY bb_sender ON public.%I FOR INSERT TO authenticated WITH CHECK(%s)',item.name,sender);
  EXECUTE format('CREATE POLICY bb_participant_update ON public.%I FOR UPDATE TO authenticated USING(%s) WITH CHECK(%s)',item.name,participant,participant);
  EXECUTE format('DROP TRIGGER IF EXISTS bb_owned_record ON public.%I',item.name);
  EXECUTE format('CREATE TRIGGER bb_owned_record BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bb_protect_owned_record(%L,%L)',item.name,item.sender,item.recipient||',content,attachment_url');
 END LOOP;
END $$;

DO $$ DECLARE pol record; BEGIN
 IF to_regclass('public."Notification"') IS NOT NULL THEN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='Notification' LOOP EXECUTE format('DROP POLICY %I ON public."Notification"',pol.policyname); END LOOP;
  REVOKE ALL ON public."Notification" FROM anon,authenticated;
  GRANT SELECT,UPDATE ON public."Notification" TO authenticated;
  ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY bb_own_notification ON public."Notification" FOR SELECT TO authenticated USING(user_email=auth.jwt()->>'email');
  CREATE POLICY bb_read_notification ON public."Notification" FOR UPDATE TO authenticated USING(user_email=auth.jwt()->>'email') WITH CHECK(user_email=auth.jwt()->>'email');
  DROP TRIGGER IF EXISTS bb_owned_record ON public."Notification";
  CREATE TRIGGER bb_owned_record BEFORE UPDATE ON public."Notification" FOR EACH ROW EXECUTE FUNCTION public.bb_protect_owned_record('user_email','title,message,body,type,action_url,data');
 END IF;
END $$;
COMMIT;
