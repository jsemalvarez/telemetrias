-- The time series: what the hardware has actually measured.
--
-- Every other table in this schema is a roster and stays roster-sized. This
-- one grows for as long as the product runs, and everything below is decided
-- by that.
--
-- **Two timestamps.** `measured_at` is what the device says; `received_at` is
-- what this server saw. The product promises to declare how old a reading is,
-- and it can only keep that promise with both: ships sail, lose signal, and
-- dump a fortnight of samples the moment they come back into range. With one
-- column, that batch reads as if it had all been measured on arrival.
--
-- **The primary key is the index.** There is no surrogate id: nothing
-- references a measurement, so an id column would be an extra 25 bytes plus a
-- second btree on the biggest table in the system, bought for nothing. The
-- composite key is exactly how this table gets read — one magnitude over a
-- range of time (`WHERE magnitude_id = $1 AND measured_at BETWEEN ...`), and
-- its latest sample by walking that same btree backwards — so the read path
-- and the uniqueness constraint are one structure and not two.
--
-- **And that key makes ingest idempotent.** MQTT delivers at least once, so
-- the bridge that will sit in front of this endpoint re-POSTs whatever it did
-- not get an answer for. Without a unique key every retry silently doubles a
-- reading and every average computed later is wrong, with nothing on screen to
-- suggest it. With it, a retry costs a conflict and nothing else — which is
-- why the endpoint inserts with ON CONFLICT DO NOTHING and reports back how
-- many rows it actually wrote.
--
-- The cost is real and worth naming: a device that truly measures the same
-- magnitude twice inside the same millisecond loses the second sample. That is
-- not a cadence this product has, and the day it arrives the fix is a finer
-- timestamp — not a second row claiming the same instant, which no later query
-- could tell apart anyway.
--
-- **No index on `measured_at` alone.** It would be the index for "everything
-- the fleet reported this hour", and there is no such screen. On a table of
-- this shape an unused index is not free: it is written on every insert, which
-- is the one operation this table does constantly. The day that query exists,
-- it gets its own index, in its own migration, with its own reason.
--
-- Written by hand from `prisma migrate diff` and applied with
-- `prisma migrate deploy`: `migrate dev` needs a TTY it does not get here.

-- CreateTable
CREATE TABLE "measurements" (
    "magnitude_id" TEXT NOT NULL,
    "measured_at" TIMESTAMPTZ(3) NOT NULL,
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "measurements_pkey" PRIMARY KEY ("magnitude_id","measured_at")
);

-- AddForeignKey
-- Cascade, like the magnitude's own relation to its device: a reading has no
-- life away from the magnitude that produced it. Nothing hard-deletes a
-- magnitude — `active` is the way out, precisely so that the history keeps its
-- name — so in practice this never fires. It is the database agreeing.
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_magnitude_id_fkey" FOREIGN KEY ("magnitude_id") REFERENCES "magnitudes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row level security, in the same migration that creates the table, for the
-- same reason as 20260906005824_padron_de_dispositivos: without it Supabase
-- publishes the table over PostgREST to anyone holding the publishable key,
-- which by definition ships to the browser. Here that would be every reading
-- of every company, readable by any visitor — the one promise this product
-- makes about isolation, broken by a default nobody chose.
--
-- No policy is declared, which leaves the table at zero rows for every REST
-- caller. The application reads through Prisma, on the connection that owns
-- the table, and an owner is not subject to RLS. The day the real-time panel
-- needs to read over REST — which is one of the ways it could be built, and is
-- not decided — that one case gets its policy, and only that case.
ALTER TABLE "measurements" ENABLE ROW LEVEL SECURITY;
