-- Closes the door Supabase opens by itself.
--
-- Supabase publishes the `public` schema as a REST API (PostgREST). Anyone
-- holding the publishable key — which by definition ships to the browser — can
-- ask for
--
--   GET https://REF.supabase.co/rest/v1/users?select=*
--
-- and without this the answer is the whole roster, password hashes included.
-- Nothing has to be broken into: that is the normal behaviour of the product
-- over a table with no RLS, and it appears the moment these tables reach stage.
--
-- Enabling RLS without declaring any policy leaves those tables at zero rows
-- for everyone, which is exactly right: this application does not read through
-- the REST API. It reads through Prisma, on the connection that owns the
-- tables, and a table's owner is not subject to RLS (barring FORCE, which is
-- not used here). So the application notices nothing and the public API goes
-- silent.
--
-- The day something does need to read over REST, the policy for that one case
-- gets added — and only that case. Starting closed and opening on demand is the
-- only arrangement in which forgetting something does not publish a table.
--
-- Applied locally too, where there is no PostgREST and it changes nothing: a
-- development database that differs from production in its permissions stops
-- being useful for testing permissions.

ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;
