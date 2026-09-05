-- CreateEnum
CREATE TYPE "NegotiationChannel" AS ENUM ('AI_CALL', 'HUMAN_EMAIL');

-- CreateEnum
CREATE TYPE "NegotiationEmailState" AS ENUM ('PENDING_DELIVERY', 'DELIVERED', 'REPLIED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NegotiationCooldownReason" AS ENUM ('MANAGER_REJECTED', 'PLAYER_CONTRACT_REJECTED');

-- AlterTable
ALTER TABLE "EmailMessage" ADD COLUMN     "canal" TEXT;

-- AlterTable
ALTER TABLE "Negotiation" ADD COLUMN     "canal" "NegotiationChannel" NOT NULL DEFAULT 'AI_CALL',
ADD COLUMN     "tension" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "NegotiationEmail" (
    "id" TEXT NOT NULL,
    "negotiationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "receiverUserId" TEXT NOT NULL,
    "simulatedSentAt" TIMESTAMP(3) NOT NULL,
    "simulatedDeliveredAt" TIMESTAMP(3),
    "templateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "state" "NegotiationEmailState" NOT NULL DEFAULT 'PENDING_DELIVERY',
    "parentEmailId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NegotiationEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NegotiationCooldown" (
    "id" TEXT NOT NULL,
    "buyerTeamId" TEXT NOT NULL,
    "sellerTeamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "reason" "NegotiationCooldownReason" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "negotiationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NegotiationCooldown_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NegotiationEmail_receiverUserId_state_idx" ON "NegotiationEmail"("receiverUserId", "state");

-- CreateIndex
CREATE INDEX "NegotiationEmail_negotiationId_idx" ON "NegotiationEmail"("negotiationId");

-- CreateIndex
CREATE INDEX "NegotiationEmail_state_expiresAt_idx" ON "NegotiationEmail"("state", "expiresAt");

-- CreateIndex
CREATE INDEX "NegotiationCooldown_buyerTeamId_expiresAt_idx" ON "NegotiationCooldown"("buyerTeamId", "expiresAt");

-- CreateIndex
CREATE INDEX "NegotiationCooldown_sellerTeamId_playerId_expiresAt_idx" ON "NegotiationCooldown"("sellerTeamId", "playerId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "NegotiationCooldown_buyerTeamId_sellerTeamId_playerId_reaso_key" ON "NegotiationCooldown"("buyerTeamId", "sellerTeamId", "playerId", "reason");

-- CreateIndex
CREATE INDEX "EmailMessage_userId_canal_idx" ON "EmailMessage"("userId", "canal");

-- CreateIndex
CREATE INDEX "Negotiation_sellerTeamId_status_canal_idx" ON "Negotiation"("sellerTeamId", "status", "canal");

-- AddForeignKey
ALTER TABLE "NegotiationEmail" ADD CONSTRAINT "NegotiationEmail_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "Negotiation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegotiationEmail" ADD CONSTRAINT "NegotiationEmail_parentEmailId_fkey" FOREIGN KEY ("parentEmailId") REFERENCES "NegotiationEmail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegotiationCooldown" ADD CONSTRAINT "NegotiationCooldown_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "Negotiation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

