-- Add lastScoresSyncAt to track when ESPN scores were last refreshed.
-- Add unique constraint on externalId so auto-schedule sync can dedupe safely.
-- SQLite: rebuild table via temporary table (the standard Prisma migration pattern).

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "externalId" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "buyIn" INTEGER NOT NULL DEFAULT 5000,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "cutLine" INTEGER,
    "lastScoresSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_Tournament" ("id", "name", "externalId", "startDate", "endDate", "buyIn", "status", "cutLine", "createdAt")
SELECT "id", "name", "externalId", "startDate", "endDate", "buyIn", "status", "cutLine", "createdAt"
FROM "Tournament";

DROP TABLE "Tournament";
ALTER TABLE "new_Tournament" RENAME TO "Tournament";

CREATE UNIQUE INDEX "Tournament_externalId_key" ON "Tournament"("externalId");

PRAGMA foreign_keys=ON;
