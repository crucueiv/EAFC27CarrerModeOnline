import { prisma as defaultPrisma } from "@/lib/prisma";
import type { PrismaClient, Prisma } from "@prisma/client";
import { withSerializableTransaction } from "@/lib/calendar/calendarDb";
import {
  computeEmailExpiry,
  isEmailVisible,
  pickEmailTemplate,
  type CooldownReasonLiteral,
} from "@/lib/transfers/negotiationRules";
import { processNegotiation, recordManagerRejectionCooldown } from "@/lib/transfers/processNegotiation";
import { releaseBudget } from "@/lib/transfers/budgetCommitment";
import {
  NEGOTIATION_EMAIL_TEMPLATES,
  getEmailTemplateById,
  type NegotiationEmailContext,
  type NegotiationEmailTemplateId,
} from "@/lib/transfers/emailTemplates";

export type { NegotiationEmailContext };

export interface OfertaPayload {
  dinero: number;
  jugadoresOfrecidos: string[];
}

export interface SendNegotiationEmailInput {
  negotiationId: string;
  senderUserId: string;
  receiverUserId: string;
  oferta: OfertaPayload;
  simulatedSentAt: Date;
  parentEmailId?: string;
  prismaClient?: PrismaClient;
  templateId?: NegotiationEmailTemplateId;
  kind?: "TRANSFER" | "LOAN";
}

export async function sendNegotiationEmail(input: SendNegotiationEmailInput): Promise<{
  ok: true;
  emailId: string;
  templateId: string;
  expiresAt: Date;
}> {
  const prisma = input.prismaClient ?? defaultPrisma;
  if (!prisma) throw new Error("sendNegotiationEmail: prisma unavailable");

  const parent = input.parentEmailId
    ? await prisma.negotiationEmail.findUnique({
        where: { id: input.parentEmailId },
        select: { templateId: true },
      })
    : null;

  const allowedKinds: ("TRANSFER" | "LOAN" | "BOTH")[] =
    input.kind === "TRANSFER"
      ? ["TRANSFER", "BOTH"]
      : input.kind === "LOAN"
        ? ["LOAN", "BOTH"]
        : ["TRANSFER", "LOAN", "BOTH"];

  let template = input.templateId
    ? getEmailTemplateById(input.templateId)
    : undefined;
  if (
    template &&
    input.kind &&
    template.kind !== "BOTH" &&
    template.kind !== input.kind
  ) {
    template = undefined;
  }
  if (!template) {
    template = pickEmailTemplate(
      NEGOTIATION_EMAIL_TEMPLATES,
      parent?.templateId ?? null,
      allowedKinds,
    );
  }

  const expiresAt = computeEmailExpiry(input.simulatedSentAt);

  const email = await prisma.negotiationEmail.create({
    data: {
      negotiationId: input.negotiationId,
      senderUserId: input.senderUserId,
      receiverUserId: input.receiverUserId,
      simulatedSentAt: input.simulatedSentAt,
      templateId: template.id,
      payload: input.oferta as unknown as Prisma.InputJsonValue,
      state: "PENDING_DELIVERY",
      parentEmailId: input.parentEmailId ?? null,
      expiresAt,
    },
  });

  return { ok: true, emailId: email.id, templateId: template.id, expiresAt };
}

export interface DeliverPendingEmailsInput {
  receiverUserId: string;
  recipientCurrentDate: Date;
  prismaClient?: PrismaClient;
}

export interface DeliverPendingEmailsResult {
  delivered: number;
  expired: number;
}

export async function deliverPendingEmailsForRecipient(
  input: DeliverPendingEmailsInput,
): Promise<DeliverPendingEmailsResult> {
  const prisma = input.prismaClient ?? defaultPrisma;
  if (!prisma) return { delivered: 0, expired: 0 };

  return withSerializableTransaction(prisma, async (tx) => {
    const pending = await tx.negotiationEmail.findMany({
      where: {
        receiverUserId: input.receiverUserId,
        state: "PENDING_DELIVERY",
      },
      include: {
        negotiation: {
          select: {
            id: true,
            buyerTeamId: true,
            sellerTeamId: true,
            playerId: true,
            status: true,
            agreedPrice: true,
          },
        },
      },
    });

    let delivered = 0;
    let expired = 0;

    for (const e of pending) {
      if (isEmailVisible(input.recipientCurrentDate, e.simulatedSentAt)) {
        if (input.recipientCurrentDate.getTime() > e.expiresAt.getTime()) {
          if (
            ["AGREED_PENDING_WINDOW", "AGREED_ACTIVE", "AGREED_CLUB"].includes(
              e.negotiation.status,
            ) &&
            e.negotiation.agreedPrice > 0
          ) {
            await releaseBudget(
              tx,
              e.negotiation.buyerTeamId,
              e.negotiation.agreedPrice,
            );
          }
          await tx.negotiationEmail.update({
            where: { id: e.id },
            data: { state: "EXPIRED" },
          });
          await tx.negotiation.update({
            where: { id: e.negotiationId },
            data: { status: "REJECTED", decidedAt: input.recipientCurrentDate },
          });
          expired++;
        } else {
          await tx.negotiationEmail.update({
            where: { id: e.id },
            data: { state: "DELIVERED", deliveredAt: input.recipientCurrentDate },
          });
          await tx.emailMessage.create({
            data: {
              userId: input.receiverUserId,
              from: "transferencias@eafc-career.online",
              subject: `Nueva oferta de fichaje`,
              body: `Tienes una oferta pendiente de revisar.`,
              canal: "NEGOTIATION",
              metadata: {
                type: "CLUB_NEGOTIATION_PENDING_WINDOW",
                canal: "HUMAN_EMAIL",
                negotiationId: e.negotiationId,
                emailId: e.id,
                templateId: e.templateId,
              },
            },
          });
          delivered++;
        }
      }
    }

    return { delivered, expired };
  });
}

export type RespondToEmailResponse = "ACCEPT" | "DENY" | "COUNTER";

export interface RespondToNegotiationEmailInput {
  emailId: string;
  response: RespondToEmailResponse;
  counterOferta?: OfertaPayload;
  simulatedNow: Date;
  prismaClient?: PrismaClient;
}

export type RespondToNegotiationEmailResult =
  | { ok: true; nextStatus: string }
  | { ok: false; reason: string };

export async function respondToNegotiationEmail(
  input: RespondToNegotiationEmailInput,
): Promise<RespondToNegotiationEmailResult> {
  const prisma = input.prismaClient ?? defaultPrisma;
  if (!prisma) return { ok: false, reason: "PRISMA_UNAVAILABLE" };

  return withSerializableTransaction(prisma, async (tx) => {
    const email = await tx.negotiationEmail.findUnique({
      where: { id: input.emailId },
      include: { negotiation: true },
    });
    if (!email) return { ok: false, reason: "EMAIL_NOT_FOUND" };
    if (email.state !== "DELIVERED") return { ok: false, reason: "EMAIL_NOT_DELIVERED" };

    await tx.negotiationEmail.update({
      where: { id: email.id },
      data: { state: "REPLIED" },
    });

    if (input.response === "DENY") {
      if (
        ["AGREED_PENDING_WINDOW", "AGREED_ACTIVE", "AGREED_CLUB"].includes(
          email.negotiation.status,
        ) &&
        email.negotiation.agreedPrice > 0
      ) {
        await releaseBudget(
          tx,
          email.negotiation.buyerTeamId,
          email.negotiation.agreedPrice,
        );
      }
      await tx.negotiation.update({
        where: { id: email.negotiationId },
        data: { status: "REJECTED", decidedAt: input.simulatedNow },
      });
      const reason: CooldownReasonLiteral = "MANAGER_REJECTED";
      const expiresAt = computeEmailExpiry(input.simulatedNow);
      await tx.negotiationCooldown.upsert({
        where: {
          buyerTeamId_sellerTeamId_playerId_reason: {
            buyerTeamId: email.negotiation.buyerTeamId,
            sellerTeamId: email.negotiation.sellerTeamId,
            playerId: email.negotiation.playerId,
            reason,
          },
        },
        create: {
          buyerTeamId: email.negotiation.buyerTeamId,
          sellerTeamId: email.negotiation.sellerTeamId,
          playerId: email.negotiation.playerId,
          reason,
          startsAt: input.simulatedNow,
          expiresAt,
          negotiationId: email.negotiationId,
        },
        update: {
          startsAt: input.simulatedNow,
          expiresAt,
          negotiationId: email.negotiationId,
        },
      });
      return { ok: true, nextStatus: "REJECTED" };
    }

    if (input.response === "ACCEPT") {
      const result = await processNegotiation({
        negotiationId: email.negotiationId,
        simulatedNow: input.simulatedNow,
        prismaClient: tx as unknown as PrismaClient,
        oferta: {
          dinero: (email.payload as unknown as OfertaPayload).dinero,
          jugadoresOfrecidos: (email.payload as unknown as OfertaPayload).jugadoresOfrecidos.map((id) => ({ id })),
        },
        canal: "HUMAN_EMAIL",
      });
      if (!result.ok) return { ok: false, reason: result.reason };
      return { ok: true, nextStatus: result.status };
    }

    if (!input.counterOferta) {
      return { ok: false, reason: "COUNTER_REQUIRES_OFERTA" };
    }
    const reverseKind: "TRANSFER" | "LOAN" =
      email.negotiation.type === "PERMANENT" ? "TRANSFER" : "LOAN";
    const reverse: { ok: true; emailId: string; templateId: string; expiresAt: Date } | null = await sendNegotiationEmail({
      negotiationId: email.negotiationId,
      senderUserId: email.receiverUserId,
      receiverUserId: email.senderUserId,
      oferta: input.counterOferta,
      simulatedSentAt: input.simulatedNow,
      parentEmailId: email.id,
      prismaClient: tx as unknown as PrismaClient,
      kind: reverseKind,
    });
    void reverse;
    return { ok: true, nextStatus: "PENDING_COUNTER_REPLY" };
  });
}

void recordManagerRejectionCooldown;
