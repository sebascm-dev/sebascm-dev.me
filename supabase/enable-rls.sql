-- Enable Row Level Security on every application table.
--
-- WHY THIS MATTERS
-- Supabase exposes the `public` schema through PostgREST. Any table created
-- there is reachable over HTTP with the anon key unless RLS is enabled. The
-- `profile` table holds personal data (DNI, phone, birth date, address), so
-- leaving it unprotected would publish it to anyone who reads the anon key
-- from the browser bundle.
--
-- WHY THIS DOES NOT BREAK THE APP
-- The Next.js app connects through DATABASE_URL as the `postgres` role, which
-- bypasses RLS. Enabling RLS with no policies therefore blocks PostgREST
-- (anon / authenticated) while leaving Drizzle queries untouched.
--
-- Run this in the Supabase Studio SQL Editor AFTER `drizzle-kit push`.
-- Re-running it is safe.

ALTER TABLE public.profile  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Deny by default: no policies are defined on purpose.
--
-- If you later want published projects readable by the public API, add:
--
--   CREATE POLICY "published projects are public"
--     ON public.projects FOR SELECT
--     TO anon
--     USING (published = true);
--
-- Never add a permissive policy to `public.profile`.


-- VERIFICATION
-- Every row must report rowsecurity = true. Any table listed with false is
-- still readable through the public API.
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
