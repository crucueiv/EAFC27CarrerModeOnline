export type EmailMessage = {
  id: string;
  from: string;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
  metadata: {
    type?: string;
    playerName?: string;
    playerOverall?: number;
    releaseClause?: number;
    buyingClubName?: string;
    buyingManagerName?: string;
    agentName?: string;
    agentAgency?: string;
    sellerTeamName?: string;
  } | null;
};

async function readJsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function getInboxMessages(): Promise<EmailMessage[]> {
  if (typeof window === "undefined") return [];
  const res = await fetch("/api/emails", { cache: "no-store" });
  return readJsonOrThrow<EmailMessage[]>(res);
}

export async function markEmailAsRead(id: string): Promise<void> {
  if (typeof window === "undefined") return;
  await fetch("/api/emails", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailId: id }),
  });
}

export async function getUnreadCount(): Promise<number> {
  const emails = await getInboxMessages();
  return emails.filter((msg) => !msg.read).length;
}
