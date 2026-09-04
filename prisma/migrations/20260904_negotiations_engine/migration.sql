-- Migration: negotiations_engine
-- Adds Negotiation model + NegotiationStatus/TransferType enums + back-links on Transfer/Loan + Loan.squadRoleSnapshot

-- CreateEnum
CREATE TYPE "NegotiationStatus" AS ENUM (
  'PENDING_AGREEMENT',
  'AGREED_PENDING_WINDOW',
  'AGREED_ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'REJECTED'
);

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM (
  'PERMANENT',
  'LOAN_SHORT_TERM',
  'LOAN_1_YEAR',
  'LOAN_2_YEARS'
);

-- CreateTable: Negotiation
CREATE TABLE "Negotiation" (
  "id"                   TEXT NOT NULL,
  "playerId"             TEXT NOT NULL,
  "buyerTeamId"          TEXT NOT NULL,
  "sellerTeamId"         TEXT NOT NULL,
  "buyerId"              TEXT,
  "sellerId"             TEXT,
  "seasonId"             TEXT NOT NULL,
  "type"                 "TransferType" NOT NULL,
  "status"               "NegotiationStatus" NOT NULL DEFAULT 'PENDING_AGREEMENT',
  "agreedPrice"          DOUBLE PRECISION NOT NULL,
  "buyoutOptionPrice"    DOUBLE PRECISION,
  "sellerSalaryPercent"  INTEGER NOT NULL DEFAULT 0,
  "buyerSalaryPercent"   INTEGER NOT NULL DEFAULT 100,
  "offeredWage"          DOUBLE PRECISION NOT NULL,
  "offeredContractYears" INTEGER,
  "squadRole"            TEXT,
  "effectiveDate"        TIMESTAMP(3) NOT NULL,
  "windowOpensAt"        TIMESTAMP(3) NOT NULL,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt"            TIMESTAMP(3),

  CONSTRAINT "Negotiation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Negotiation" ADD CONSTRAINT "Negotiation_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Negotiation" ADD CONSTRAINT "Negotiation_buyerTeamId_fkey"
  FOREIGN KEY ("buyerTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Negotiation" ADD CONSTRAINT "Negotiation_sellerTeamId_fkey"
  FOREIGN KEY ("sellerTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Negotiation" ADD CONSTRAINT "Negotiation_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Negotiation" ADD CONSTRAINT "Negotiation_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Negotiation" ADD CONSTRAINT "Negotiation_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Negotiation_playerId_status_idx" ON "Negotiation"("playerId", "status");
CREATE INDEX "Negotiation_buyerTeamId_status_idx" ON "Negotiation"("buyerTeamId", "status");
CREATE INDEX "Negotiation_sellerTeamId_status_idx" ON "Negotiation"("sellerTeamId", "status");
CREATE INDEX "Negotiation_status_effectiveDate_idx" ON "Negotiation"("status", "effectiveDate");
CREATE INDEX "Negotiation_seasonId_status_idx" ON "Negotiation"("seasonId", "status");

-- AddColumn on Transfer: negotiationId
ALTER TABLE "Transfer" ADD COLUMN "negotiationId" TEXT;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_negotiationId_key" UNIQUE ("negotiationId");
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_negotiationId_fkey"
  FOREIGN KEY ("negotiationId") REFERENCES "Negotiation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddColumn on Loan: negotiationId + squadRoleSnapshot
ALTER TABLE "Loan" ADD COLUMN "negotiationId" TEXT;
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_negotiationId_key" UNIQUE ("negotiationId");
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_negotiationId_fkey"
  FOREIGN KEY ("negotiationId") REFERENCES "Negotiation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Loan" ADD COLUMN "squadRoleSnapshot" TEXT;
