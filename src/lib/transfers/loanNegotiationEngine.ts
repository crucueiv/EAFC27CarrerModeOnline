export type LoanDuration = "SHORT_TERM" | "ONE_YEAR" | "TWO_YEARS";

export type LoanQuoteCategory =
  | "greeting"
  | "rejectionDuration"
  | "rejectionWage"
  | "rejectionBuyOption"
  | "counterOfferWage"
  | "counterOfferBuyOption"
  | "highTensionWarning"
  | "accepted"
  | "maxTensionHangup";

export const LOAN_QUOTE_BANKS: Record<LoanQuoteCategory, string[]> = {
  greeting: [
    "Buenas. Habla el mánager de {seller}. Me han dicho que están interesados en una cesión por {player}. ¿Qué condiciones manejan?",
    "Saludos. {player} no entra en nuestros planes a corto plazo, pero podemos hablar de una salida temporal. Cuénteme.",
    "Hola, escucho su propuesta. {player} es un jugador con futuro, pero aquí no tiene minutos. Veamos qué ofrecen."
  ],
  rejectionDuration: [
    "Esas condiciones temporales no me convencen. Una cesión a {durationLabel} es demasiado corta/larga para nuestros objetivos formativos.",
    "No, esa duración no la acepto. {player} necesita un plan claro, y {durationLabel} no encaja con lo que buscamos.",
    "Rechazado. {durationLabel} no nos sirve: ni nos da tiempo a desarrollarlo ni compensa el vacío que deja."
  ],
  rejectionWage: [
    "¿{wageShareBuyerPct}% del sueldo? Eso es una miseria. {player} cobra bien y se merece que ambas partes aporten de verdad.",
    "No. Con {wageShareBuyerPct}% de su parte, el riesgo lo asumo casi entero. Eso no es un reparto, es un regalo.",
    "Rechazado de plano. Si solo pagan {wageShareBuyerPct}% del salario, prefiero quedarme con {player} y darle minutos en la cantera."
  ],
  rejectionBuyOption: [
    "Cesión con opción a compra por {buyOptionPrice}€? No. {player} vale más en el mercado; si la ejecutan, perdemos dinero.",
    "Olvídese. Sin opción de compra hablamos, con esa opción por {buyOptionPrice}€ ni siquiera abro la carpeta.",
    "No, gracias. Una opción a {buyOptionPrice}€ es regalarlo. Si no la quitan, no hay cesión."
  ],
  counterOfferWage: [
    "Su propuesta de {wageShareBuyerPct}% no compensa. Bajen a {counterWageShareBuyerPct}% para nosotros, o cerramos la conversación.",
    "Agradezco el interés, pero el reparto debe ser más justo. {counterWageShareBuyerPct}% por su parte es lo mínimo aceptable.",
    "No nos temblará la mano para retener a {player} si insisten en {wageShareBuyerPct}%. Mi contrapropuesta es {counterWageShareBuyerPct}%."
  ],
  counterOfferBuyOption: [
    "La opción de compra por {buyOptionPrice}€ me parece baja. Súbanla a {counterBuyOptionPrice}€ y tenemos algo que hablar.",
    "Si quieren opción de compra, que sea a {counterBuyOptionPrice}€. Por {buyOptionPrice}€ me quedo con el jugador sin dudar.",
    "No voy a malvender a {player}. Acepto cesión con opción si suben la cláusula a {counterBuyOptionPrice}€."
  ],
  highTensionWarning: [
    "Miren, mi paciencia se está acabando. Si siguen con esta táctica, cuelgo en cinco minutos.",
    "Esto es un tira y afloja constante. O cierran con una oferta razonable o doy por terminada la llamada.",
    "He sido flexible, pero hay un límite. Última oportunidad antes de cortar la negociación por {player}."
  ],
  accepted: [
    "Trato hecho. {player} será su jugador durante la cesión en los términos acordados. Enviaré los papeles esta misma tarde.",
    "Cerrado. Ha costado pero llegamos a un acuerdo. Les deseo lo mejor con {player} durante la cesión.",
    "Aceptamos. {player} sale cedido en las condiciones que pactamos. Suerte con él."
  ],
  maxTensionHangup: [
    "Se acabó. He esperado demasiado por una oferta seria. La cesión de {player} queda cancelada. Buenas tardes.",
    "Mi paciencia se agotó. No llamen más por {player}, la negociación está cerrada. *Cuelga*",
    "No pienso seguir perdiendo el tiempo. {player} se queda con nosotros. Adiós."
  ]
};

export const DURATION_LABELS: Record<LoanDuration, string> = {
  SHORT_TERM: "corto plazo (hasta fin de temporada)",
  ONE_YEAR: "1 año",
  TWO_YEARS: "2 años",
};

export function getRandomLoanQuote(
  category: LoanQuoteCategory,
  replacements: {
    player?: string;
    seller?: string;
    duration?: LoanDuration;
    durationLabel?: string;
    wageShareBuyerPct?: number;
    counterWageShareBuyerPct?: number;
    buyOptionPrice?: number;
    counterBuyOptionPrice?: number;
  } = {},
  index?: number,
): string {
  const list = LOAN_QUOTE_BANKS[category];
  const safeIndex =
    typeof index === "number" && Number.isInteger(index) && index >= 0 && index < list.length
      ? index
      : Math.floor(Math.random() * list.length);
  const template = list[safeIndex];
  let result = template;
  if (replacements.player) {
    result = result.replaceAll("{player}", replacements.player);
  }
  if (replacements.seller) {
    result = result.replaceAll("{seller}", replacements.seller);
  }
  if (replacements.durationLabel) {
    result = result.replaceAll("{durationLabel}", replacements.durationLabel);
  } else if (replacements.duration) {
    result = result.replaceAll("{durationLabel}", DURATION_LABELS[replacements.duration]);
  }
  if (typeof replacements.wageShareBuyerPct === "number") {
    result = result.replaceAll("{wageShareBuyerPct}", String(replacements.wageShareBuyerPct));
  }
  if (typeof replacements.counterWageShareBuyerPct === "number") {
    result = result.replaceAll(
      "{counterWageShareBuyerPct}",
      String(replacements.counterWageShareBuyerPct),
    );
  }
  if (typeof replacements.buyOptionPrice === "number") {
    result = result.replaceAll(
      "{buyOptionPrice}",
      formatPrice(replacements.buyOptionPrice),
    );
  }
  if (typeof replacements.counterBuyOptionPrice === "number") {
    result = result.replaceAll(
      "{counterBuyOptionPrice}",
      formatPrice(replacements.counterBuyOptionPrice),
    );
  }
  return result;
}

function formatPrice(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

export type ComputeLoanParamsInput = {
  playerOverall: number;
  playerPotential: number;
  playerAge: number;
  playerWeeklyWage: number;
  playerMarketValue: number;
  sellerTeamBudget: number;
  buyerTeamBudget: number;
  isShortTerm: boolean;
  hasBuyOption: boolean;
  randomSeed?: number;
};

export type LoanNegotiationParams = {
  baseWageShareBuyerPct: number;
  desiredWageShareBuyerPct: number;
  lowballWageThreshold: number;
  baseBuyOptionPrice: number;
  targetBuyOptionPrice: number;
  lowballBuyOptionThreshold: number;
};

export function computeLoanNegotiationParams(
  input: ComputeLoanParamsInput,
): LoanNegotiationParams {
  const seed = input.randomSeed ?? Math.random();
  const noise = (seed % 1) * 20 - 10;
  const youthFactor = input.playerAge <= 23 ? 5 : 0;
  const budgetFactor =
    input.sellerTeamBudget > input.buyerTeamBudget * 1.5 ? -5 : input.sellerTeamBudget < input.buyerTeamBudget * 0.7 ? 5 : 0;
  const desiredWageShareBuyerPct = Math.max(
    30,
    Math.min(70, Math.round(50 + noise + youthFactor + budgetFactor)),
  );
  const lowballWageThreshold = Math.max(20, desiredWageShareBuyerPct - 20);

  const baseBuyOptionPrice = Math.round(
    input.playerMarketValue * (input.isShortTerm ? 1.4 : 1.7),
  );
  const targetBuyOptionPrice = Math.round(
    input.playerMarketValue * (input.isShortTerm ? 1.7 : 2.1),
  );
  const lowballBuyOptionThreshold = Math.round(input.playerMarketValue * 1.15);

  return {
    baseWageShareBuyerPct: 50,
    desiredWageShareBuyerPct,
    lowballWageThreshold,
    baseBuyOptionPrice,
    targetBuyOptionPrice,
    lowballBuyOptionThreshold,
  };
}

export function formatEuro(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));
}
