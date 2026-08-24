-- Keep admin style deletion working when the admin role is stored in Auth metadata.
DROP POLICY IF EXISTS "Style: suppression admin" ON public."Style";
CREATE POLICY "Style: suppression admin"
  ON public."Style"
  FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Use the same admin check when publishing or reverting a style.
DROP POLICY IF EXISTS "Style: modification admin" ON public."Style";
CREATE POLICY "Style: modification admin"
  ON public."Style"
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );