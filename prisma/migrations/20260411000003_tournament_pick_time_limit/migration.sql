-- Tournament-level pick time limit (seconds) used as the default when a
-- draft is created for this tournament. Admins can override per tournament.

ALTER TABLE "Tournament" ADD COLUMN "pickTimeLimit" INTEGER NOT NULL DEFAULT 120;
