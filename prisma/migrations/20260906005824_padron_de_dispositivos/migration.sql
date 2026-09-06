-- The device roster: microcontrollers, and the magnitudes each one reports.
--
-- Two tables and not one. A device reports several quantities — bus voltage,
-- current, winding temperature, power factor — and each carries its own
-- minimum and maximum. Thresholds on the device row would be a schema that
-- only holds while every installation measures exactly one thing.
--
-- Which magnitudes exist is data, not schema. PRODUCT.md is explicit that the
-- metrics are undecided, so there is no enum here and no column per metric:
-- somebody enters a magnitude the way they enter a device.
--
-- Measurements are still absent, on purpose. This is the roster; the time
-- series is another table on another layer, and it lands when there is a
-- transport to fill it.
--
-- Written by hand from `prisma migrate diff` and applied with
-- `prisma migrate deploy`: `migrate dev` needs a TTY it does not get here.

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "location" TEXT,
    "client_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magnitudes" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT,
    "min" DOUBLE PRECISION,
    "max" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "magnitudes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Unique across the whole system, not per client: this is what an incoming
-- message will be attributed by, and it arrives before anyone knows whose it
-- is. Two companies declaring the same serial is a mistake at the dock, and it
-- is better to refuse it at the roster than to guess later.
CREATE UNIQUE INDEX "devices_serial_key" ON "devices"("serial");

-- CreateIndex
CREATE INDEX "devices_client_id_idx" ON "devices"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "magnitudes_device_id_key_key" ON "magnitudes"("device_id", "key");

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magnitudes" ADD CONSTRAINT "magnitudes_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row level security, in the same migration that creates the tables.
--
-- Not in a follow-up migration like 20260905165620_enable_rls, and not because
-- that one was wrong: it had tables to catch up with. From here on a table is
-- created and closed in one step, so there is no window — not even one
-- migration wide — in which Supabase would publish it over PostgREST to
-- anyone holding the publishable key that ships to the browser.
--
-- No policy is declared, which leaves both tables at zero rows for every REST
-- caller. That is exactly right: this application reads through Prisma, on the
-- connection that owns the tables, and an owner is not subject to RLS. The day
-- something genuinely needs to read over REST, that one case gets its policy.
ALTER TABLE "devices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "magnitudes" ENABLE ROW LEVEL SECURITY;
