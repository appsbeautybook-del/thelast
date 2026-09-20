-- Give the authenticated admin used by the admin panel one consistent RLS check.
-- This accepts both the profile role and Auth metadata used by the admin login.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ),
    false
  );
$$;

DO $$
DECLARE
  table_name text;
  admin_tables text[] := ARRAY[
    'profiles', 'Style', 'StyleCategory', 'StyleSubCategory', 'Reel',
    'Service', 'ProfilPro', 'Reservation', 'Avis', 'CommentaireStyle',
    'Notification', 'Produit', 'Commande', 'Annonce', 'AppConfig',
    'ImmobilierListing', 'PointsFidelite', 'PointsFidelitePro',
    'DemandeProV2', 'DemandefFranchise', 'MembreEquipe', 'CatalogueOption',
    'Client', 'LiveSession', 'LiveMessage', 'MessageChat'
  ];
BEGIN
  FOREACH table_name IN ARRAY admin_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'admin_full_access', table_name);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())',
        'admin_full_access', table_name
      );
    END IF;
  END LOOP;
END;
$$;