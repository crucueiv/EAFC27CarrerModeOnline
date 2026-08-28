import type { TransferPlayerResult } from "@/lib/transfers/search";

export type NegotiationQuoteCategory =
  | "greeting"
  | "lowballAnger"
  | "counterOffer"
  | "highTensionWarning"
  | "accepted"
  | "maxTensionHangup";

export const QUOTE_BANKS: Record<NegotiationQuoteCategory, string[]> = {
  greeting: [
    "Dígame. Habla el mánager. Me han comentado que están interesados en negociar por {player}. ¿Cuál es su propuesta inicial?",
    "Hola, estoy ocupado preparando la sesión de entrenamiento, pero los escucho. ¿Cuánto ofrecen formalmente por {player}?",
    "Buenas tardes. Sabemos del valor de {player} en nuestra plantilla. Cuénteme, ¿qué cifra tienen en mente?",
    "Saludos. El interés por {player} es comprensible. Escucho su primera oferta sobre la mesa."
  ],
  lowballAnger: [
    "¿Esto es una broma de mal gusto? No pienso perder ni un segundo más con ofertas tan ridículas. ¡La conversación ha terminado!",
    "¡Insultante! {player} es una pieza fundamental y ustedes ofrecen esa miseria. No vuelvan a llamar. *Clic*",
    "Vuelvan cuando tengan una propuesta seria. No voy a tolerar que nos falten al respeto de esta manera. Adiós.",
    "¿Esa cifra? Me parece una falta de respeto profesional. No hay nada más que hablar aquí. *Cuelga*"
  ],
  counterOffer: [
    "Su propuesta está lejos de nuestras aspiraciones. {player} vale al menos {counter}. Si se acercan a esa cifra podemos avanzar.",
    "Agradezco la intención, pero esa cantidad no compensa su salida. La dejaríamos salir por {counter}, ni un euro menos.",
    "No nos temblará la mano para mantener a {player} si no llegan a {counter}. Es nuestra posición de club.",
    "Estamos dispuestos a ceder un poco, pero no bajaremos de {counter}. ¿Es aceptable para ustedes?"
  ],
  highTensionWarning: [
    "Miren, mi paciencia se está agotando. Si siguen mareando la perdiz con estas cifras, voy a colgar inmediatamente.",
    "La tensión en esta negociación está rozando el límite. O presentan una oferta coherente ya mismo o cerramos la carpeta.",
    "No tengo todo el día para este estira y afloja. Una propuesta más fuera de lugar y daré por concluida la llamada."
  ],
  accepted: [
    "Trato hecho. {counter} me parece una cifra justa para ambas partes. Enviaré la documentación para cerrar el acuerdo de traspaso.",
    "Tenemos acuerdo. Ha sido un estira y afloja duro, pero aceptamos los {counter}. Nos ponemos en contacto con el agente del jugador.",
    "Cerrado. Por {counter} cerramos la operación hoy mismo. Un placer hacer negocios con su club."
  ],
  maxTensionHangup: [
    "Se acabó. He tenido suficiente de este regateo insostenible. No habrá traspaso. ¡Buenas tardes!",
    "Mi paciencia ha llegado al límite. Cancelamos toda conversación formal por {player}. *Cuelga la llamada*",
    "No pienso tolerar más esta pérdida de tiempo. La llamada ha terminado. *Clic*"
  ]
};

export function getRandomQuote(
  category: NegotiationQuoteCategory,
  replacements: { player?: string; counter?: string } = {}
): string {
  const list = QUOTE_BANKS[category];
  const template = list[Math.floor(Math.random() * list.length)];
  let result = template;
  if (replacements.player) {
    result = result.replaceAll("{player}", replacements.player);
  }
  if (replacements.counter) {
    result = result.replaceAll("{counter}", replacements.counter);
  }
  return result;
}

export function generateFakePhoneNumber(): string {
  const prefixes = ["+34 6", "+34 7", "+44 77", "+49 17", "+33 6"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const body = Array.from({ length: 7 }, () => Math.floor(Math.random() * 10)).join("");
  return `${prefix}${body.slice(0, 2)} ${body.slice(2, 5)} ${body.slice(5)}`;
}

export function calculateNegotiationParams(player: TransferPlayerResult) {
  const baseValue = player.price;
  const overallFactor = Math.max(0.9, player.overall / 80);
  // Target price is 5% to 20% above market price
  const targetPrice = Math.round((baseValue * (1.06 + (overallFactor - 0.9) * 0.15)) / 10_000) * 10_000;
  // Minimum acceptable price threshold (below 90-95% market value triggers lowball anger)
  const lowballThreshold = Math.round(baseValue * 0.90);

  return {
    baseValue,
    targetPrice,
    lowballThreshold
  };
}
