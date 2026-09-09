export type LoanDuration = "SHORT_TERM" | "ONE_YEAR" | "TWO_YEARS";

export type LoanNegotiationPhase =
  | "DURATION"
  | "BUY_OPTION"
  | "WAGE"
  | "BUY_OPTION_PRICE";

export type LoanQuoteCategory =
  | "greeting"
  | "durationAccepted"
  | "rejectionDuration"
  | "buyOptionYesAccepted"
  | "buyOptionNoAccepted"
  | "buyOptionDecisionRejected"
  | "wageAcceptedContinue"
  | "rejectionWage"
  | "rejectionBuyOption"
  | "counterOfferWage"
  | "counterOfferBuyOption"
  | "highTensionWarning"
  | "lowballHangup"
  | "accepted"
  | "maxTensionHangup"
  | "notInterested";

export const LOAN_QUOTE_BANKS: Record<LoanQuoteCategory, string[]> = {
  greeting: [
    "Dígame, habla {manager} desde {seller}. Me han comentado que están interesados en una cesión por {player}. ¿Qué condiciones manejan?",
    "Saludos. Soy {manager}, del cuerpo técnico de {seller}. {player} no entra en nuestros planes a corto plazo, pero podemos hablar de una salida temporal. Cuénteme.",
    "Hola, escucha. Soy {manager} y llevo el área deportiva de {seller}. {player} es un jugador con futuro, pero aquí no tiene minutos. Veamos qué ofrecen.",
    "Buenas tardes. Soy {manager} y le atiendo por parte de {seller}. {player} necesita minutos, y ustedes parecen el destino ideal. ¿Qué presupuesto manejan?",
    "Qué tal. {manager} al habla, mánager de {seller}. Hace días que me suena el nombre de {player} para una salida, así que dígame, ¿qué traen sobre la mesa?",
  ],
  durationAccepted: [
    "De acuerdo, {durationLabel} me parece un plazo razonable para {player}. Pero antes de cerrar nada, hablemos del resto de condiciones. ¿Contemplan opción de compra?",
    "Vale, la duración me cuadra. {durationLabel} le dará tiempo a {player} para coger ritmo sin desestabilizar la planificación de {seller}. Siguiente punto: ¿hay opción de compra sobre la mesa?",
    "Aceptamos {durationLabel}. Ahora la pregunta importante: ¿quieren tener la posibilidad de quedarse con {player} definitivamente, o es una cesión pura?",
    "{durationLabel} está bien, no pongo pegas por ese lado. Avancemos: ¿cesión limpia o con opción de compra al final?",
    "Perfecto, {durationLabel} encaja con nuestros planes en {seller} para {player}. Dígame: ¿incluimos opción de compra o solo préstamo?",
    "Por la duración no hay problema, me vale {durationLabel}. Ahora necesito saber: ¿quieren tener la llave para fichar a {player} definitivamente?",
  ],
  rejectionDuration: [
    "Esas condiciones temporales no me convencen. Una cesión a {durationLabel} no encaja con el plan que tenemos en {seller} para {player}.",
    "No, esa duración no la acepto. {player} necesita un plan claro, y {durationLabel} no se ajusta al proyecto deportivo de {seller}.",
    "Rechazado. Como le dije, {durationLabel} no nos sirve: ni nos da tiempo a desarrollarlo ni compensa el vacío que deja {player} en {seller}.",
    "Lo siento, pero {durationLabel} no me sirve ni a mí ni a {player}. Necesito algo que nos permita reevaluar al futbolista antes de que vuelva a {seller}.",
    "Esa ventana de {durationLabel} se me queda corta para un proyecto serio. Si quieren a {player} tendrán que pensar en otra cesión más larga.",
    "Ni de broma. {durationLabel} no encaja con la planificación de la plantilla. Si quieren a {player}, hablemos de una cesión que nos deje margen para reinsertarle en {seller}.",
  ],
  buyOptionYesAccepted: [
    "Bien, incluiremos la opción de compra en el acuerdo. Ya negociaremos la cifra cuando toque. Ahora hablemos del reparto salarial de {player}.",
    "De acuerdo, opción de compra contemplada. Pero primero lo primero: ¿qué porcentaje del sueldo de {player} están dispuestos a asumir durante la cesión?",
    "Acepto negociar una opción de compra. La cifra la discutimos al final. Ahora pasemos al tema del salario: ¿cuánto de la ficha de {player} cubren?",
    "Opción de compra, apuntado. Pero el dinero manda, y alguien tiene que pagar la nómina. ¿Qué parte del sueldo de {player} se quedan ustedes?",
    "Muy bien, cesión con opción de compra. Antes de hablar de cifras de traspaso, resolvamos quién paga qué del sueldo de {player}.",
    "Incluimos la opción de compra, sí. Ahora el balón está en su tejado: ¿cuánto del salario de {player} asumen ustedes semanalmente?",
  ],
  buyOptionNoAccepted: [
    "Perfecto, cesión pura sin opción de compra. {player} vuelve a {seller} al final del periodo. Hablemos del reparto salarial.",
    "Sin opción de compra, entendido. Es un préstamo limpio, {player} regresa a casa cuando acabe. ¿Qué porcentaje del sueldo asumen ustedes?",
    "De acuerdo, sin opción de compra. {player} seguirá siendo nuestro. Ahora: ¿cuánto de su ficha semanal pagan durante la cesión?",
    "Aceptado: cesión temporal sin compromisos futuros. Pero alguien tiene que pagar la nómina de {player}. ¿Cuánto se quedan?",
    "Cesión sin opción de compra, me parece bien. {player} es nuestro y volverá a {seller}. Pasemos al tema peliagudo: el sueldo.",
    "Sin opción de compra, de acuerdo. {player} es propiedad de {seller} y punto. Ahora dígame: ¿qué parte del salario cubren ustedes?",
  ],
  buyOptionDecisionRejected: [
    "Ni hablar. {player} es propiedad de {seller} y no vamos a poner su futuro en juego con una opción de compra. Cesión pura o nada.",
    "¿Opción de compra por {player}? Olvídense. Este jugador tiene futuro en {seller} y no voy a arriesgar perderlo. Solo cesión.",
    "No. La directiva de {seller} ha sido clara: {player} no tiene cláusula de salida. Si quieren cesión, será sin opción de compra.",
    "Rotundamente no. {player} es un activo estratégico para {seller}. La cesión es temporal y punto. Nada de opciones de compra.",
    "Mire, {player} no está en venta ni directa ni indirectamente. Si les interesa la cesión, es sin opción de compra. ¿Seguimos o no?",
    "Eso no lo voy a aceptar. {player} vuelve a {seller} cuando acabe la cesión, sin peros. Quítense la opción de compra de la cabeza.",
  ],
  wageAcceptedContinue: [
    "El {wageShareBuyerPct}% del sueldo me parece justo. Bien, ahora queda el capítulo final: definamos el precio de la opción de compra por {player}.",
    "Aceptamos ese reparto salarial. {wageShareBuyerPct}% por su parte cuadra los números. Solo falta pactar la opción de compra y firmamos.",
    "Con {wageShareBuyerPct}% cubrimos los gastos en {seller}. Último punto sobre la mesa: ¿cuánto proponen para la opción de compra de {player}?",
    "Correcto, {wageShareBuyerPct}% es un trato equitativo para la ficha de {player}. Vamos al capítulo final: la cifra de la opción de compra.",
    "{wageShareBuyerPct}% por su parte, nosotros cubrimos el resto. Me convence. Ahora dígame: ¿cuánto ponen sobre la mesa para quedarse con {player}?",
    "El salario queda resuelto con ese {wageShareBuyerPct}%. Perfecto. Ahora la última pieza del puzzle: el precio de la opción de compra.",
  ],
  rejectionWage: [
    "¿{wageShareBuyerPct}% del sueldo? Eso es una miseria. {player} cobra bien y se merece que ambas partes aporten de verdad.",
    "No. Con {wageShareBuyerPct}% de su parte, el riesgo lo asumo casi entero. Eso no es un reparto, es un regalo para {seller}.",
    "Rechazado de plano. Si solo pagan {wageShareBuyerPct}% del salario, prefiero quedarme con {player} y darle minutos en la cantera de {seller}.",
    "Vamos a ver, yo no soy adivino: {wageShareBuyerPct}% no me cuadra. Necesito una oferta seria si quieren contar con {player}.",
    "Perdone, {manager} habla. Con {wageShareBuyerPct}% del sueldo no llegamos ni a cubrir la gasolina. Suban la apuesta o cerramos la conversación.",
    "Imposible. {wageShareBuyerPct}% del salario no compensa ni el desgaste de planificar la baja temporal de {player}. Suban la cifra o lo damos por cerrado.",
  ],
  rejectionBuyOption: [
    "Cesión con opción a compra por {buyOptionPrice}€? No. {player} vale más en el mercado; si la ejecutan, perdemos dinero en {seller}.",
    "Olvídese. Sin opción de compra hablamos, con esa opción por {buyOptionPrice}€ ni siquiera abro la carpeta. {player} vale bastante más.",
    "No, gracias. Una opción a {buyOptionPrice}€ es regalarlo. Si no la quitan, no hay cesión. Así de claro, {manager} al habla.",
    "Esa opción de compra está regalada. Por {buyOptionPrice}€ me quedo con {player} y me ahorro esta llamada.",
    "No insistan. {player} no es un paquete promocional: con {buyOptionPrice}€ de opción de compra no llegamos ni a la indemnización de {seller}.",
    "Esa cláusula es humo. Por {buyOptionPrice}€ pierdo dinero contante y sonante, así que o la subimos o {player} no sale cedido. Siguiente.",
  ],
  counterOfferWage: [
    "Su propuesta de {wageShareBuyerPct}% no compensa. Bajen a {counterWageShareBuyerPct}% para nosotros, o cerramos la conversación.",
    "Agradezco el interés, pero el reparto debe ser más justo. {counterWageShareBuyerPct}% por su parte es lo mínimo aceptable en {seller}.",
    "No nos temblará la mano para retener a {player} si insisten en {wageShareBuyerPct}%. Mi contrapropuesta es {counterWageShareBuyerPct}%, {manager} hablando.",
    "Voy a ser claro: para que {player} salga cedido, {counterWageShareBuyerPct}% es lo mínimo. {wageShareBuyerPct}% me parece una falta de respeto.",
    "Tiren de calculadora. Cubrir {counterWageShareBuyerPct}% es lo único que me cuadra. Con {wageShareBuyerPct}% prefiero no mover a {player} de {seller}.",
  ],
  counterOfferBuyOption: [
    "La opción de compra por {buyOptionPrice}€ me parece baja. Súbanla a {counterBuyOptionPrice}€ y tenemos algo que hablar.",
    "Si quieren opción de compra, que sea a {counterBuyOptionPrice}€. Por {buyOptionPrice}€ me quedo con {player} sin dudar.",
    "No voy a malvender a {player}. Acepto cesión con opción si suben la cláusula a {counterBuyOptionPrice}€, {manager} habla.",
    "Escúcheme bien: {buyOptionPrice}€ es calderilla. Si hablamos de opción de compra, hablamos en serio: a partir de {counterBuyOptionPrice}€.",
    "Mire, en {seller} tenemos un plan de tesorería. {counterBuyOptionPrice}€ es lo mínimo que cuadra en los libros. {buyOptionPrice}€ no me sirve.",
  ],
  highTensionWarning: [
    "Miren, mi paciencia se está acabando. Si siguen con esta táctica, cuelgo en cinco minutos, {manager} habla.",
    "Esto es un tira y afloja constante. O cierran con una oferta razonable o doy por terminada la llamada por {player}.",
    "He sido flexible, pero hay un límite. Última oportunidad antes de cortar la negociación por {player}, se lo advierto.",
    "Como {manager}, les digo: no voy a seguir mareando la perdiz. Suban la oferta o nos despedimos cordialmente.",
    "Voy a poner las cartas sobre la mesa. Una más fuera de lugar y {player} se queda en {seller} el resto de la temporada. ¿Estamos?",
  ],
  lowballHangup: [
    "¿{wageShareBuyerPct}%? Vuelvan cuando se les baje la euforia. Con esa cifra no merece la pena ni seguir hablando. *Cuelga*",
    "No, no y no. Esa oferta insulta al scouting de {seller} y a {player}. Se acabó la conversación, {manager} les dice adiós.",
    "¿Pretenden que ceda a {player} por {wageShareBuyerPct}% del sueldo? No me hagan perder más tiempo. *Clic*",
    "Perdone, ¿ustedes se han leído la propuesta antes de enviarla? {wageShareBuyerPct}% es una broma. Cuelgue, mejor.",
    "Llamaremos cuando se les pase la borrachera de cifras. {wageShareBuyerPct}% no se acerca ni a la mitad de lo aceptable. Hasta nunca.",
  ],
  accepted: [
    "Trato hecho. {player} será su jugador durante la cesión en los términos acordados. Enviaré los papeles esta misma tarde, {manager} al habla.",
    "Cerrado. Ha costado pero llegamos a un acuerdo. Les deseo lo mejor con {player} durante la cesión en {seller}.",
    "Aceptamos. {player} sale cedido en las condiciones que pactamos. Suerte con él y cuiden a la criatura.",
    "Hecho. {player} viajará en cuanto se firme la documentación. Espero que rinda como creemos en {seller}.",
    "Trato cerrado. {player} será su responsabilidad hasta el final del periodo. Espero informes y, si crece, hablamos en un futuro.",
  ],
  maxTensionHangup: [
    "Se acabó. He esperado demasiado por una oferta seria. La cesión de {player} queda cancelada. Buenas tardes.",
    "Mi paciencia se agotó. No llamen más por {player}, la negociación está cerrada. *Cuelga*",
    "No pienso seguir perdiendo el tiempo. {player} se queda con nosotros en {seller}. Adiós.",
    "Lamento decirles esto, pero se acabó. {player} no se mueve de {seller} en estas condiciones. *Clic*",
    "Hemos llegado al límite. {player} seguirá en {seller} y nosotros a lo nuestro. Suerte la próxima, {manager} les saluda.",
  ],
  notInterested: [
    "Les voy a ser claro: {player} es intocable para nosotros esta temporada, así que ni se moleste en ofertar.",
    "Por aquí no va a salir. {player} es pieza clave en el esquema de {seller} y no entra en nuestros planes cederle.",
    "No pierdan el tiempo. {player} está por encima de la media del equipo y no tenemos intención de soltarle. Buen intento, {manager} hablando.",
    "Les agradezco el interés, pero la respuesta es no. {player} se queda en {seller}, no hay cesión que valga.",
    "Miren, no vamos a entrar en números. {player} no está en venta ni en cesión, es jugador intransferible para este proyecto. Gracias por llamar.",
  ],
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
    manager?: string;
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
  if (replacements.manager) {
    result = result.replaceAll("{manager}", replacements.manager);
  } else {
    result = result.replaceAll("{manager}", "el míster");
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

export type LoanAcceptance = {
  shouldHangUp: boolean;
  autoAccept: boolean;
  counterWageShareBuyerPct: number | null;
  tensionDelta: number;
  closeness: number;
};

export type DurationAcceptance = {
  accepted: boolean;
  tensionDelta: number;
  counterDuration?: LoanDuration;
};

/**
 * Evalúa si el mánager rival acepta la duración propuesta.
 * - Jugadores clave (OVR >= 85 o rol CLAVE): solo SHORT_TERM
 * - Jugadores importantes (OVR 80-84 o rol IMPORTANTE): SHORT_TERM o ONE_YEAR
 * - Rotación: cualquier duración (sesgo leve contra TWO_YEARS)
 */
export function evaluateLoanDuration(
  proposedDuration: LoanDuration,
  playerOverall: number,
  playerRole: string | null,
): DurationAcceptance {
  if (playerRole === "CLAVE" || playerOverall >= 85) {
    if (proposedDuration === "SHORT_TERM") {
      return { accepted: true, tensionDelta: 0 };
    }
    return {
      accepted: false,
      tensionDelta: 20,
      counterDuration: "SHORT_TERM",
    };
  }
  if (playerRole === "IMPORTANTE" || playerOverall >= 80) {
    if (proposedDuration === "TWO_YEARS") {
      return {
        accepted: false,
        tensionDelta: 15,
        counterDuration: "ONE_YEAR",
      };
    }
    return { accepted: true, tensionDelta: 0 };
  }
  if (proposedDuration === "TWO_YEARS" && Math.random() > 0.6) {
    return {
      accepted: false,
      tensionDelta: 10,
      counterDuration: "ONE_YEAR",
    };
  }
  return { accepted: true, tensionDelta: 0 };
}

export type BuyOptionDecisionAcceptance = {
  accepted: boolean;
  tensionDelta: number;
  managerPreference: boolean;
};

/**
 * Evalúa si el mánager acepta incluir/excluir opción de compra.
 * - Jugadores clave: NUNCA opción de compra
 * - Jóvenes promesas (potencial >= 85 y edad <= 22): pueden rechazar opción para no perderlos
 */
export function evaluateBuyOptionDecision(
  proposedHasBuyOption: boolean,
  playerOverall: number,
  playerPotential: number,
  playerAge: number,
  playerRole: string | null,
): BuyOptionDecisionAcceptance {
  if (playerRole === "CLAVE" || playerOverall >= 85) {
    if (proposedHasBuyOption) {
      return { accepted: false, tensionDelta: 20, managerPreference: false };
    }
    return { accepted: true, tensionDelta: 0, managerPreference: false };
  }
  if (playerPotential >= 85 && playerAge <= 22 && proposedHasBuyOption) {
    if (Math.random() > 0.5) {
      return { accepted: false, tensionDelta: 15, managerPreference: false };
    }
  }
  return { accepted: true, tensionDelta: 0, managerPreference: proposedHasBuyOption };
}

export type BuyOptionPriceAcceptance = {
  accepted: boolean;
  tensionDelta: number;
  isLowball: boolean;
  counterPrice?: number;
};

/**
 * Evalúa si el precio de opción de compra propuesto es aceptable.
 */
export function evaluateBuyOptionPrice(
  proposedPrice: number,
  params: LoanNegotiationParams,
): BuyOptionPriceAcceptance {
  if (proposedPrice < params.lowballBuyOptionThreshold) {
    return { accepted: false, tensionDelta: 100, isLowball: true };
  }
  if (proposedPrice >= params.targetBuyOptionPrice) {
    return { accepted: true, tensionDelta: 0, isLowball: false };
  }
  const counter = Math.max(
    params.lowballBuyOptionThreshold,
    Math.round((proposedPrice + params.targetBuyOptionPrice) / 2),
  );
  const gap = (params.targetBuyOptionPrice - proposedPrice) / params.targetBuyOptionPrice;
  const tensionDelta = Math.round(gap * 25);
  return { accepted: false, tensionDelta, isLowball: false, counterPrice: counter };
}

export function evaluateLoanWageOffer(
  proposedPct: number,
  params: LoanNegotiationParams,
): LoanAcceptance {
  const safeProposed = Math.max(0, Math.min(100, Math.round(proposedPct)));
  const desired = Math.max(0, Math.min(100, params.desiredWageShareBuyerPct));
  const lowball = Math.max(0, Math.min(100, params.lowballWageThreshold));

  if (safeProposed < lowball) {
    return {
      shouldHangUp: true,
      autoAccept: false,
      counterWageShareBuyerPct: null,
      tensionDelta: 100,
      closeness: 0,
    };
  }

  if (safeProposed >= desired) {
    return {
      shouldHangUp: false,
      autoAccept: true,
      counterWageShareBuyerPct: null,
      tensionDelta: -100,
      closeness: 1,
    };
  }

  const span = Math.max(1, desired - lowball);
  const closeness = Math.max(0, Math.min(1, (safeProposed - lowball) / span));
  const tensionDelta = Math.round(15 * (1 - closeness));
  const counter = Math.min(desired, Math.max(lowball + 1, safeProposed + 5));
  return {
    shouldHangUp: false,
    autoAccept: false,
    counterWageShareBuyerPct: counter,
    tensionDelta,
    closeness,
  };
}

export function computeLoanNegotiationParams(
  input: ComputeLoanParamsInput,
): LoanNegotiationParams {
  const seed = input.randomSeed ?? Math.random();
  const noise = (seed % 1) * 20 - 10;
  const youthFactor = input.playerAge <= 23 ? 5 : 0;
  const budgetFactor =
    input.sellerTeamBudget > input.buyerTeamBudget * 1.5
      ? -5
      : input.sellerTeamBudget < input.buyerTeamBudget * 0.7
        ? 5
        : 0;
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

export function resolveSellerManagerName(
  sellerTeam: {
    name?: string | null;
    manager?: { name?: string | null; image?: string | null } | null;
    managerProfile?: { name?: string | null; avatarUrl?: string | null } | null;
  } | null | undefined,
): string | null {
  if (!sellerTeam) return null;
  if (sellerTeam.manager?.name && sellerTeam.manager.name.trim().length > 0) {
    return sellerTeam.manager.name.trim();
  }
  if (sellerTeam.managerProfile?.name && sellerTeam.managerProfile.name.trim().length > 0) {
    return sellerTeam.managerProfile.name.trim();
  }
  if (sellerTeam.name) {
    return `DT de ${sellerTeam.name}`;
  }
  return null;
}
