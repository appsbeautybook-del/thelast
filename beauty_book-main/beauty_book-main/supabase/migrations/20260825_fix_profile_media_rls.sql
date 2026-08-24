-- Allow professionals to update their existing profile, including legacy rows
-- created before created_by_id was populated.
DROP POLICY IF EXISTS "ProfilPro: modif propriétaire" ON public."ProfilPro";
CREATE POLICY "ProfilPro: modif propriétaire"
  ON public."ProfilPro"
  FOR UPDATE
  USING (
    auth.uid() = created_by_id
    OR user_email = auth.email()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = created_by_id
    OR user_email = auth.email()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );