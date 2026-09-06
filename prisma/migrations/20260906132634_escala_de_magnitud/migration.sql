-- The dial a magnitude is drawn on.
--
-- **These are not the same numbers as `min`/`max`, and the whole panel rests
-- on that distinction.** `min` and `max` are the thresholds that raise an
-- alarm; `scale_min` and `scale_max` are the extent of the instrument face.
--
-- Neither pair can stand in for the other. A winding temperature alarms above
-- 75 °C and has no meaningful minimum, so the thresholds give no floor to draw
-- from. A bus voltage watched between 385 V and 420 V still has to be able to
-- show 380 V, and a dial that started at its own lower threshold would push
-- that reading off the face — hiding precisely the value somebody needs to
-- see. Deriving one from the other with padding would be this schema guessing
-- at an instrument range it was never told.
--
-- Nullable, and a magnitude without them is not broken: it is one the screen
-- draws as a digital readout instead of a dial. Inventing a scale from the
-- data that has arrived would move the face under the needle every time a new
-- extreme showed up, which is the one thing an instrument may never do.
--
-- Both or neither, and the floor strictly below the ceiling. That is enforced
-- here and not left to the application because half a scale is not a state
-- this system should be able to hold: it reaches the gauge as an arc with no
-- length, or as a division by zero.
--
-- Note for whoever runs `prisma migrate diff` next: Prisma cannot represent a
-- CHECK constraint, so it does not see this one. It will not try to drop it,
-- and it will not recreate it either — if this table is ever rebuilt from the
-- datamodel, the constraint has to be carried over by hand.
--
-- Written by hand from `prisma migrate diff` and applied with
-- `prisma migrate deploy`: `migrate dev` needs a TTY it does not get here.

-- AlterTable
ALTER TABLE "magnitudes" ADD COLUMN     "scale_max" DOUBLE PRECISION,
ADD COLUMN     "scale_min" DOUBLE PRECISION;

-- AddConstraint
ALTER TABLE "magnitudes" ADD CONSTRAINT "magnitudes_escala_entera" CHECK (
    ("scale_min" IS NULL AND "scale_max" IS NULL)
    OR ("scale_min" IS NOT NULL AND "scale_max" IS NOT NULL AND "scale_min" < "scale_max")
);
