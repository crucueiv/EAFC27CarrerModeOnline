export type EmailMessage = {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  read: boolean;
  playerName: string;
  playerAvatar?: string | null;
  releaseClause: number;
  body: string;
  playerId: string;
};

const SENDER_AGENCIES = [
  "firststep-sports.com",
  "pro-football-agency.org",
  "global-players-rep.net",
  "elite-transfer-consulting.com",
  "prime-football-mgmt.es"
];

function generateSenderEmail(playerName: string): string {
  const sanitized = playerName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, ".");
  const charCodeSum = playerName.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const domain = SENDER_AGENCIES[charCodeSum % SENDER_AGENCIES.length];
  return `agente.${sanitized}@${domain}`;
}

const STORAGE_KEY = "eafc27_career_inbox_emails";
const USER_EMAIL = "manager@northbridge-fc.com";

const INITIAL_EMAILS: EmailMessage[] = [
  {
    id: "welcome-email-1",
    from: "direccion.deportiva@liga-oficial.es",
    to: USER_EMAIL,
    subject: "Bienvenido a la temporada de transferencias",
    date: new Date(Date.now() - 86400000).toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "short"
    }),
    read: true,
    playerName: "Sistema",
    releaseClause: 0,
    body: "Estimado mánager,\n\nTe damos la bienvenida al panel oficial de dirección deportiva. Desde aquí podrás explorar el mercado, monitorear el ojeo de tus futbolistas y gestionar las ofertas de traspaso y cláusulas de rescisión.\n\nAtentamente,\nDirección Deportiva",
    playerId: "system"
  }
];

export function getInboxMessages(): EmailMessage[] {
  if (typeof window === "undefined") return INITIAL_EMAILS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EMAILS));
      return INITIAL_EMAILS;
    }
    return JSON.parse(raw) as EmailMessage[];
  } catch {
    return INITIAL_EMAILS;
  }
}

export function saveInboxMessages(messages: EmailMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    window.dispatchEvent(new CustomEvent("inbox-updated"));
  } catch (err) {
    console.error("Failed to save inbox messages:", err);
  }
}

export function addClauseBuyoutEmail(player: {
  id: string;
  name: string;
  avatarUrl?: string | null;
  releaseClause: number;
  currentTeamName?: string;
}): EmailMessage {
  const current = getInboxMessages();
  const dateFormatted = new Date().toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short"
  });

  const sender = generateSenderEmail(player.name);
  const formattedClause = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(player.releaseClause);

  const newEmail: EmailMessage = {
    id: `buyout-${player.id}-${Date.now()}`,
    from: sender,
    to: USER_EMAIL,
    subject: `Acuerdo de cláusula alcanzado: Negociación de contrato con ${player.name}`,
    date: dateFormatted,
    read: false,
    playerName: player.name,
    playerAvatar: player.avatarUrl,
    releaseClause: player.releaseClause,
    playerId: player.id,
    body: `Estimado D. Mánager de Northbridge FC,\n\nLe escribo en representación del jugador ${player.name}. Le confirmamos que la Liga nos ha notificado el depósito formal de la cláusula de rescisión por un valor total de ${formattedClause}.\n\nHabiendo quedado libre de las obligaciones contractuales con su club anterior (${player.currentTeamName || "su club previo"}), nos complace convocarle para acordar los términos personales del nuevo contrato (duración, salario semanal y primas por rendimiento).\n\nQuedamos a su entera disposición para iniciar la reunión de negociación.\n\nUn cordial saludo,\nRepresentación Deportiva de ${player.name}\n${sender}`
  };

  const updated = [newEmail, ...current];
  saveInboxMessages(updated);
  return newEmail;
}

export function markEmailAsRead(id: string) {
  const current = getInboxMessages();
  const updated = current.map((msg) => (msg.id === id ? { ...msg, read: true } : msg));
  saveInboxMessages(updated);
}

export function getUnreadCount(): number {
  return getInboxMessages().filter((msg) => !msg.read).length;
}
