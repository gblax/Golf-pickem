-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Golfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "externalId" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "buyIn" INTEGER NOT NULL DEFAULT 5000,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "cutLine" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TournamentGolfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "golferId" TEXT NOT NULL,
    "scoreToPar" INTEGER,
    "currentRound" INTEGER,
    "thru" TEXT,
    "madeTheCut" BOOLEAN,
    "position" TEXT,
    "isWithdrawn" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "TournamentGolfer_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TournamentGolfer_golferId_fkey" FOREIGN KEY ("golferId") REFERENCES "Golfer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeekEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "hasPaid" BOOLEAN NOT NULL DEFAULT false,
    "isDisqualified" BOOLEAN NOT NULL DEFAULT false,
    "totalScore" INTEGER,
    "finishPosition" INTEGER,
    "payout" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeekEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeekEntry_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekEntryId" TEXT NOT NULL,
    "tournamentGolferId" TEXT NOT NULL,
    "pickOrder" INTEGER NOT NULL,
    CONSTRAINT "Pick_weekEntryId_fkey" FOREIGN KEY ("weekEntryId") REFERENCES "WeekEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pick_tournamentGolferId_fkey" FOREIGN KEY ("tournamentGolferId") REFERENCES "TournamentGolfer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "mode" TEXT NOT NULL DEFAULT 'LIVE',
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "currentPickIndex" INTEGER NOT NULL DEFAULT 0,
    "draftOrder" TEXT NOT NULL DEFAULT '[]',
    "pickTimeLimit" INTEGER NOT NULL DEFAULT 120,
    "currentPickDeadline" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "Draft_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DraftPick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "draftId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tournamentGolferId" TEXT NOT NULL,
    "overallPickNumber" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "pickedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DraftPick_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DraftPick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DraftPick_tournamentGolferId_fkey" FOREIGN KEY ("tournamentGolferId") REFERENCES "TournamentGolfer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentGolfer_tournamentId_golferId_key" ON "TournamentGolfer"("tournamentId", "golferId");

-- CreateIndex
CREATE UNIQUE INDEX "WeekEntry_userId_tournamentId_key" ON "WeekEntry"("userId", "tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "Pick_weekEntryId_pickOrder_key" ON "Pick"("weekEntryId", "pickOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Draft_tournamentId_key" ON "Draft"("tournamentId");
