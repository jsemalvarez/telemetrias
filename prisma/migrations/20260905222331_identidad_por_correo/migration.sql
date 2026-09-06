-- Identity is the email address. There is no separate username.
--
-- A rename and not a drop-and-add, even though this database is days old and
-- nothing has shipped: dropping the column would take the identities of the
-- three seeded rows with it and leave a table where nobody can sign in. The
-- rename keeps them. Two of those values are not addresses yet — `demo` and
-- `encargado` — and the seed rewrites them on its next run; the super's was
-- already one.
ALTER TABLE "users" RENAME COLUMN "username" TO "email";
ALTER INDEX "users_username_key" RENAME TO "users_email_key";

-- Whether the password was chosen by whoever created the account rather than by
-- its owner. Rows that already exist take the default and come out marked,
-- which is the safe direction to be wrong in: the seed settles its own users on
-- its next run, and anyone else genuinely has a password somebody else picked.
ALTER TABLE "users" ADD COLUMN "provisional_password" BOOLEAN NOT NULL DEFAULT true;

-- Who signed for this account. Nullable because the seeded users answer to
-- nobody; every account created through the application carries its author.
-- RESTRICT, like the client relation: an account that gave others cannot be
-- erased out from under them.
ALTER TABLE "users" ADD COLUMN "created_by_id" TEXT;
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
