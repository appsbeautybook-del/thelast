import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('security migration on isolated PostgreSQL enforces identity, booking and secret permissions',async()=>{
  const pg=new PGlite();
  try {
    await pg.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
      GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
      CREATE TABLE public.profiles(id uuid PRIMARY KEY,email text,role text DEFAULT 'user',full_name text);
      CREATE TABLE public."ProfilPro"(id uuid PRIMARY KEY,user_email text);
      CREATE TABLE public."Service"(id uuid PRIMARY KEY,pro_email text);
      CREATE TABLE public."Produit"(id uuid PRIMARY KEY);
      CREATE TABLE public."Commande"(id uuid PRIMARY KEY);
      CREATE TABLE public."Reservation"(id uuid PRIMARY KEY,client_email text,pro_email text,date date,status text);
      CREATE TABLE public."SocialCredentials"(id uuid PRIMARY KEY,credentials jsonb);
      CREATE TABLE public."SocialConnections"(id uuid PRIMARY KEY,access_token text);
      CREATE TABLE public."VerificationCode"(id uuid PRIMARY KEY,code text);
      GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role;
      ALTER TABLE public."Reservation" ENABLE ROW LEVEL SECURITY;
      CREATE POLICY insecure_all ON public."Reservation" FOR ALL USING(true) WITH CHECK(true);
      INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000001','one@test.invalid'),('00000000-0000-0000-0000-000000000002','two@test.invalid');
      INSERT INTO public.profiles VALUES ('00000000-0000-0000-0000-000000000001','one@test.invalid','user','One'),('00000000-0000-0000-0000-000000000002','two@test.invalid','user','Two');
    `);
    const migration=await fs.readFile(new URL('../../../../supabase/migrations/202609170001_secure_backend.sql',import.meta.url),'utf8');
    await pg.exec(migration);
    await pg.exec(migration); // Repeat deploy does not re-open policies or duplicate state.
    await pg.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false); SELECT set_config('request.jwt.claims','{"email":"one@test.invalid"}',false);`);
    assert.equal((await pg.query('SELECT * FROM public.profiles')).rows.length,1);
    await pg.exec(`UPDATE public.profiles SET full_name='Updated' WHERE id=auth.uid()`);
    await assert.rejects(pg.exec(`UPDATE public.profiles SET role='admin' WHERE id=auth.uid()`));
    await assert.rejects(pg.exec(`UPDATE public.profiles SET email='two@test.invalid' WHERE id=auth.uid()`));
    await assert.rejects(pg.exec(`INSERT INTO public."Reservation"(id,client_email) VALUES(gen_random_uuid(),'one@test.invalid')`));
    await assert.rejects(pg.exec('SELECT * FROM public."SocialConnections"'));
    await assert.rejects(pg.exec('SELECT * FROM public.bb_admin_memberships'));
    await assert.rejects(pg.exec('INSERT INTO public.bb_admin_memberships(user_id,role,permissions) VALUES(auth.uid(),\'owner\',\'{*}\')'));
    await pg.exec('RESET ROLE');
    const policies=await pg.query(`SELECT policyname FROM pg_policies WHERE tablename='Reservation'`);
    assert.deepEqual(policies.rows.map(row=>row.policyname),['bb_reservation_participant']);
  } finally { await pg.close(); }
});
