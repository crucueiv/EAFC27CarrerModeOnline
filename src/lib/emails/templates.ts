export type EmailTemplate = {
  subject: string;
  body: string;
};

export type TemplateData = {
  managerName: string;
  clubName: string;
  playerName: string;
  playerOverall: number;
  releaseClause?: number;
  buyingClubName: string;
  buyingManagerName: string;
  years?: number;
  salary?: number;
  signingBonus?: number;
  agentName: string;
  agentEmail: string;
  agentAgency: string;
};

const CLUB_NEGOTIATION_TEMPLATES: EmailTemplate[] = [
  {
    subject: "Propuesta de contrato: {playerName} - Interés de {buyingClub}",
    body: `Estimado {managerName} ({clubName}),

Le escribo en nombre de mi representado, {playerName}. El club {buyingClub} ha mostrado un interés firme en hacerse con sus servicios y, tras conversaciones preliminares con su dirección deportiva, han llegado a un principio de acuerdo para su traspaso sin necesidad de abonar la cláusula de rescisión.

Los términos económicos del traspaso entre clubes ya están cerrados. Ahora queda pendiente acordar las condiciones personales del jugador: duración del contrato, salario semanal, primas por objetivos y cláusulas de salida futura.

Quedo a su entera disposición para concertar una reunión y definir los detalles contractuales.

Un cordial saludo,
{agentName}
{agentEmail}`
  },
  {
    subject: "Oferta contractual para {playerName} - {buyingClub}",
    body: `Estimado {managerName},

Mi cliente {playerName} ha recibido una propuesta del {buyingClub}. Su club actual ha aceptado la oferta de traspaso sin cláusula de rescisión de por medio, facilitando así la operación.

El jugador está ilusionado con el proyecto deportivo que le han presentado. No obstante, antes de dar el paso definitivo, necesitamos cerrar los términos de su nuevo contrato: años de vinculación, ficha salarial, variables por rendimiento y posible cláusula de rescisión futura.

¿Podríamos agendar una llamada esta semana para avanzar?

Atentamente,
{agentName}
{agentEmail}`
  },
  {
    subject: "Negociación de contrato: {playerName} → {buyingClub}",
    body: `Buenos días {managerName},

Le contacto respecto a {playerName}. El {buyingClub} y su club han alcanzado un acuerdo de traspaso sin ejecutar la cláusula de rescisión, lo que agiliza notablemente la operación.

El futbolista valora positivamente la destinación, pero lógicamente quiere garantías contractuales. Buscamos un contrato de {years} años con una ficha acorde a su nivel ({playerOverall} OVR) y primas por: títulos, clasificación europea, partidos jugados y goles/asistencias.

Quedo a la espera de su propuesta para trasladársela al jugador.

Saludos profesionales,
{agentName}
{agentAgency}`
  },
];

const RELEASE_CLAUSE_TEMPLATES: EmailTemplate[] = [
  {
    subject: "Cláusula depositada: {playerName} - Negociación contractual",
    body: `Estimado {managerName} ({clubName}),

Le informo formalmente que el club {buyingClub} ha depositado la cláusula de rescisión de mi representado {playerName} por un importe total de {releaseClauseFormateada}.

Quedando el jugador libre de toda obligación contractual con su entidad, le convocamos para negociar los términos de su nuevo contrato: duración, salario, primas por rendimiento y cláusula de salida.

Disponemos de total disponibilidad para reunirnos a la mayor brevedad.

Un saludo,
{agentName}
{agentEmail}`
  },
  {
    subject: "Ejecutada cláusula de {playerName} - Propuesta de contrato",
    body: `Estimado {managerName},

La Liga nos ha notificado el depósito de la cláusula de rescisión de {playerName} por parte del {buyingClub} ({releaseClauseFormateada}).

El jugador queda, por tanto, en situación de libertad contractual. Mi representado valora positivamente el proyecto del {buyingClub}, pero necesitamos definir su nuevo contrato antes de oficializar nada.

Buscamos: contrato de {years} años, ficha neta de {salary}€/semana, prima de fichaje de {signingBonus}€ y variables estándar.

Quedo a la espera de su contrapropuesta.

Cordialmente,
{agentName}
{agentAgency}`
  },
  {
    subject: "Libre tras cláusula: {playerName} - Oferta del {buyingClub}",
    body: `Sr. {managerName},

Por la presente le comunico que se ha hecho efectivo el pago de la cláusula de rescisión de {playerName} ({releaseClauseFormateada}) por el {buyingClub}.

Ante esta situación, mi cliente queda libre para negociar su futuro. El club comprador ha mostrado un interés decidido y nosotros estamos abiertos a escuchar su propuesta contractual.

Condiciones mínimas que manejamos: {years} años, {salary}€/semana netos, prima de fichaje, prima por objetivos (Champions, Liga, Copa) y cláusula de rescisión razonable.

Quedo a su disposición para cerrar el acuerdo.

Atentamente,
{agentName}
{agentEmail}`
  },
];

type NegotiationType = "CLUB_NEGOTIATION" | "RELEASE_CLAUSE";

function pickRandomTemplate(type: NegotiationType): EmailTemplate {
  const templates = type === "CLUB_NEGOTIATION"
    ? CLUB_NEGOTIATION_TEMPLATES
    : RELEASE_CLAUSE_TEMPLATES;
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateAgentInfo(playerName: string): { name: string; email: string; agency: string } {
  const agencies = [
    "Global Football Management",
    "Elite Sports Agency",
    "Pro Player Representatives",
    "First Choice Football",
    "Prime Soccer Partners",
    "World Class Football Agency",
  ];
  const firstNames = ["Carlos", "Javier", "Miguel", "Antonio", "Fernando", "Roberto", "Alberto", "Pablo"];
  const lastNames = ["García", "Rodríguez", "Martínez", "López", "González", "Sánchez", "Pérez", "Gómez"];

  const hash = playerName.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  const agentName = `${firstNames[hash % firstNames.length]} ${lastNames[hash % lastNames.length]}`;
  const agency = agencies[hash % agencies.length];
  const sanitized = playerName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, ".");
  const email = `agente.${sanitized}@${agency.toLowerCase().replace(/\s+/g, "")}.com`;

  return { name: agentName, email, agency };
}

function renderTemplate(template: EmailTemplate, data: TemplateData): { subject: string; body: string } {
  const formatClause = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(data.releaseClause || 0);

  const replacements: Record<string, string> = {
    "{managerName}": data.managerName,
    "{clubName}": data.clubName,
    "{playerName}": data.playerName,
    "{playerOverall}": String(data.playerOverall),
    "{buyingClub}": data.buyingClubName,
    "{buyingManagerName}": data.buyingManagerName,
    "{releaseClause}": String(data.releaseClause || 0),
    "{releaseClauseFormateada}": formatClause,
    "{years}": String(data.years || 4),
    "{salary}": String(data.salary || 50000),
    "{signingBonus}": String(data.signingBonus || 1000000),
    "{agentName}": data.agentName,
    "{agentEmail}": data.agentEmail,
    "{agentAgency}": data.agentAgency,
  };

  let subject = template.subject;
  let body = template.body;
  for (const [placeholder, value] of Object.entries(replacements)) {
    subject = subject.replaceAll(placeholder, value);
    body = body.replaceAll(placeholder, value);
  }

  return { subject, body };
}

export function generateClubNegotiationEmail(data: Omit<TemplateData, "agentName" | "agentEmail" | "agentAgency">): { subject: string; body: string; agent: ReturnType<typeof generateAgentInfo> } {
  const agent = generateAgentInfo(data.playerName);
  const template = pickRandomTemplate("CLUB_NEGOTIATION");
  const fullData: TemplateData = { ...data, agentName: agent.name, agentEmail: agent.email, agentAgency: agent.agency };
  return { ...renderTemplate(template, fullData), agent };
}

export function generateReleaseClauseEmail(data: Omit<TemplateData, "agentName" | "agentEmail" | "agentAgency">): { subject: string; body: string; agent: ReturnType<typeof generateAgentInfo> } {
  const agent = generateAgentInfo(data.playerName);
  const template = pickRandomTemplate("RELEASE_CLAUSE");
  const fullData: TemplateData = { ...data, agentName: agent.name, agentEmail: agent.email, agentAgency: agent.agency };
  return { ...renderTemplate(template, fullData), agent };
}
