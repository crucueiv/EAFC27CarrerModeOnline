export type NegotiationEmailTemplateId =
  | "FORMAL_DS"
  | "DIRECT_COACH"
  | "INSISTENT"
  | "BRIEF"
  | "ENTHUSIASTIC";

export type NegotiationEmailKind = "TRANSFER" | "LOAN" | "BOTH";

export interface NegotiationEmailContext {
  playerName: string;
  sourceTeamName: string;
  targetTeamName: string;
  amount: string;
  counterparties: string[];
  kind: "TRANSFER" | "LOAN";
  durationLabel?: string;
  wageShare?: string;
  buyOptionPrice?: string;
  isCounter?: boolean;
  senderName: string;
}

export interface NegotiationEmailTemplate {
  id: NegotiationEmailTemplateId;
  label: string;
  kind: NegotiationEmailKind;
  subject(ctx: NegotiationEmailContext): string;
  body(ctx: NegotiationEmailContext): string;
}

function money(amount: string): string {
  return `${amount} €`;
}

function counterpartiesLine(cp: string[]): string {
  if (cp.length === 0) return "";
  if (cp.length === 1) return `Además incluiríamos a ${cp[0]}.`;
  return `Además incluiríamos a ${cp.join(", ")}.`;
}

export const NEGOTIATION_EMAIL_TEMPLATES: readonly NegotiationEmailTemplate[] = [
  {
    id: "FORMAL_DS",
    label: "Director deportivo — formal",
    kind: "TRANSFER",
    subject: (ctx) => `Oferta formal por ${ctx.playerName}`,
    body: (ctx) =>
      `Estimado/a responsable de ${ctx.targetTeamName},\n\n` +
      `Por medio de la presente, ${ctx.sourceTeamName} desea formalizar una oferta por el jugador ${ctx.playerName} ` +
      `por un importe de ${money(ctx.amount)}. ${counterpartiesLine(ctx.counterparties)} ` +
      `Confiamos en que la propuesta sea de su interés y quedamos a la espera de su respuesta.\n\n` +
      `Atentamente,\n${ctx.senderName}`,
  },
  {
    id: "DIRECT_COACH",
    label: "Entrenador — directo",
    kind: "TRANSFER",
    subject: (ctx) => `Oferta por ${ctx.playerName}`,
    body: (ctx) =>
      `Hola,\n\n` +
      `Desde ${ctx.sourceTeamName} queremos a ${ctx.playerName}. Te ofrezco ${money(ctx.amount)}. ` +
      `${counterpartiesLine(ctx.counterparties)} ` +
      `Dime algo y cerramos.\n\n` +
      `— ${ctx.senderName}`,
  },
  {
    id: "INSISTENT",
    label: "Insistente (3ª oferta)",
    kind: "TRANSFER",
    subject: (ctx) => `Insistimos: ${ctx.playerName}`,
    body: (ctx) =>
      `${ctx.targetTeamName},\n\n` +
      `Volvemos a la carga por ${ctx.playerName}. Esta vez subimos a ${money(ctx.amount)}. ` +
      `${counterpartiesLine(ctx.counterparties)} ` +
      `No creo que podamos mover más la oferta, así que te pido una respuesta clara.\n\n` +
      `${ctx.senderName}`,
  },
  {
    id: "BRIEF",
    label: "Breve (cesión)",
    kind: "LOAN",
    subject: (ctx) => `Cesión de ${ctx.playerName}`,
    body: (ctx) => {
      const lines = [
        `Cesión: ${ctx.durationLabel ?? "por definir"}.`,
        `Importe: ${money(ctx.amount)}.`,
      ];
      if (ctx.wageShare) lines.push(`Sueldo: ${ctx.wageShare}.`);
      if (ctx.buyOptionPrice) lines.push(`Opción de compra: ${money(ctx.buyOptionPrice)}.`);
      return `Hola,\n\n${lines.join("\n")}\n\nSaludos,\n${ctx.senderName}`;
    },
  },
  {
    id: "ENTHUSIASTIC",
    label: "Entusiasta (aceptación)",
    kind: "BOTH",
    subject: (ctx) => `¡Trato cerrado por ${ctx.playerName}!`,
    body: (ctx) =>
      `¡Genial! Cerramos ${ctx.playerName} por ${money(ctx.amount)}. ` +
      `Haremos las gestiones contractuales en cuanto se abra la ventana.\n\n` +
      `Gracias,\n${ctx.senderName}`,
  },
];

export function getEmailTemplateById(
  id: string,
): NegotiationEmailTemplate | undefined {
  return NEGOTIATION_EMAIL_TEMPLATES.find((t) => t.id === id);
}
