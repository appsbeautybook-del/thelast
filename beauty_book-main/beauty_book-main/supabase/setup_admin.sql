-- ============================================================
-- SETUP ADMIN ACCOUNT — Exécuter dans le SQL Editor de Supabase
-- ============================================================

-- 1. Créer le compte admin dans Supabase Auth
--    ATTENTION: Changez le mot de passe ci-dessous avant d'exécuter !
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, confirmation_token,
  recovery_token, email_change_token_new, email_change
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@beautybook.fr',
  crypt('BeautyBook@2025!', gen_salt('bf')),
  now(), now(), now(), '', '', '', ''
)
ON CONFLICT (email) DO NOTHING;

-- 2. Créer/mettre à jour le profil admin
INSERT INTO public.profiles (id, email, full_name, role, updated_at)
SELECT id, 'admin@beautybook.fr', 'Admin BeautyBook', 'admin', now()
FROM auth.users WHERE email = 'admin@beautybook.fr'
ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'Admin BeautyBook';

-- 3. Vérifier que tout est bon
SELECT id, email, role FROM auth.users WHERE email = 'admin@beautybook.fr';
SELECT id, email, role FROM public.profiles WHERE email = 'admin@beautybook.fr';
