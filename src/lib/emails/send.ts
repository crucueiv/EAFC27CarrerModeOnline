import { prisma } from "@/lib/prisma";
import { generateClubNegotiationEmail, generateReleaseClauseEmail } from "./templates";

type SendClubNegotiationParams = {
  recipientUserId: string;
  playerName: string;
  playerOverall: number;
  buyingClubName: string;
  buyingManagerName: string;
  years?: number;
  salary?: number;
  signingBonus?: number;
};

type SendReleaseClauseParams = {
  recipientUserId: string;
  playerName: string;
  playerOverall: number;
  releaseClause: number;
  buyingClubName: string;
  buyingManagerName: string;
  years?: number;
  salary?: number;
  signingBonus?: number;
};

export async function sendClubNegotiationEmail(params: SendClubNegotiationParams) {
  const recipient = await prisma.user.findUnique({
    where: { id: params.recipientUserId },
    include: { clubTeam: true },
  });
  if (!recipient) return;

  const { subject, body, agent } = generateClubNegotiationEmail({
    managerName: recipient.username || "Manager",
    clubName: recipient.clubTeam?.name || "Su club",
    playerName: params.playerName,
    playerOverall: params.playerOverall,
    buyingClubName: params.buyingClubName,
    buyingManagerName: params.buyingManagerName,
    years: params.years,
    salary: params.salary,
    signingBonus: params.signingBonus,
  });

  await prisma.emailMessage.create({
    data: {
      userId: params.recipientUserId,
      from: agent.email,
      subject,
      body,
      metadata: {
        type: "CLUB_NEGOTIATION",
        playerName: params.playerName,
        playerOverall: params.playerOverall,
        buyingClubName: params.buyingClubName,
        buyingManagerName: params.buyingManagerName,
        agentName: agent.name,
        agentAgency: agent.agency,
      },
    },
  });
}

export async function sendReleaseClauseEmail(params: SendReleaseClauseParams) {
  const recipient = await prisma.user.findUnique({
    where: { id: params.recipientUserId },
    include: { clubTeam: true },
  });
  if (!recipient) return;

  const { subject, body, agent } = generateReleaseClauseEmail({
    managerName: recipient.username || "Manager",
    clubName: recipient.clubTeam?.name || "Su club",
    playerName: params.playerName,
    playerOverall: params.playerOverall,
    releaseClause: params.releaseClause,
    buyingClubName: params.buyingClubName,
    buyingManagerName: params.buyingManagerName,
    years: params.years,
    salary: params.salary,
    signingBonus: params.signingBonus,
  });

  await prisma.emailMessage.create({
    data: {
      userId: params.recipientUserId,
      from: agent.email,
      subject,
      body,
      metadata: {
        type: "RELEASE_CLAUSE",
        playerName: params.playerName,
        playerOverall: params.playerOverall,
        releaseClause: params.releaseClause,
        buyingClubName: params.buyingClubName,
        buyingManagerName: params.buyingManagerName,
        agentName: agent.name,
        agentAgency: agent.agency,
      },
    },
  });
}
