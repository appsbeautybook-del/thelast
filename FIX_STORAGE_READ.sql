-- FIX: Restaurer la lecture publique des images Storage
-- Exécuter dans Supabase SQL Editor

-- S'assurer que le bucket est bien public
UPDATE storage.buckets SET public = true WHERE id = 'uploads';

-- Supprimer les anciennes policiesStorage cassées
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Lecture publique (ANON + AUTH)
CREATE POLICY "storage_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads');

-- Insert pour tous
CREATE POLICY "storage_insert_public"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'uploads');

-- Update pour auth
CREATE POLICY "storage_update_auth"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'uploads')
  WITH CHECK (bucket_id = 'uploads');

-- Delete pour auth
CREATE POLICY "storage_delete_auth"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'uploads');
