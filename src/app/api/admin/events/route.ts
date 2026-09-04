import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

type Event = {
  at: string;
  type: "transfer" | "match" | "email" | "season" | "calendar";
  severity: "info" | "warn" | "success";
  message: string;
  meta?: Record<string, unknown>;
};

export async function GET(req: Request) {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;
  if (!prisma) return NextResponse.json({ error: "Prisma no disponible" }, { status: 500 });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 60), 200);

  const [transfers, matches, emails, seasons, calendars] = await Promise.all([
    prisma.transfer.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { player: { select: { name: true } } },
    }),
    prisma.match.findMany({
      orderBy: { scheduledAt: "desc" },
      take: 30,
      where: { OR: [{ status: "COMPLETED" }, { status: "SIMULATED" }] },
      include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
    }),
    prisma.emailMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.season.findMany({
      orderBy: { startDate: "desc" },
      take: 10,
    }),
    prisma.teamCalendarState.findMany({
      orderBy: { lastAdvanceAt: "desc" },
      take: 20,
      include: { team: { select: { name: true } }, season: { select: { name: true } } },
    }),
  ]);

  const events: Event[] = [];

  for (const t of transfers) {
    events.push({
      at: t.createdAt.toISOString(),
      type: "transfer",
      severity: t.status === "COMPLETED" ? "success" : t.status === "CANCELLED" || t.status === "REJECTED" ? "warn" : "info",
      message: `Transfer: ${t.player.name} → ${t.status}`,
      meta: { id: t.id, status: t.status, fee: t.fee },
    });
  }

  for (const m of matches) {
    events.push({
      at: m.scheduledAt.toISOString(),
      type: "match",
      severity: "info",
      message: `Match: ${m.homeTeam.name} ${m.homeScore ?? 0}–${m.awayScore ?? 0} ${m.awayTeam.name}`,
      meta: { id: m.id, status: m.status },
    });
  }

  for (const e of emails) {
    events.push({
      at: e.createdAt.toISOString(),
      type: "email",
      severity: e.read ? "info" : "warn",
      message: `Email: ${e.subject ?? "(sin asunto)"}`,
      meta: { id: e.id, read: e.read, from: e.from, userId: e.userId },
    });
  }

  for (const s of seasons) {
    events.push({
      at: s.startDate.toISOString(),
      type: "season",
      severity: s.status === "ACTIVE" ? "success" : s.status === "COMPLETED" ? "info" : "warn",
      message: `Season: ${s.name} → ${s.status}`,
      meta: { id: s.id, status: s.status },
    });
  }

  for (const c of calendars) {
    events.push({
      at: c.lastAdvanceAt.toISOString(),
      type: "calendar",
      severity: c.isLocked ? "warn" : "info",
      message: `Calendar advance: ${c.team.name} (${c.season.name}) → ${c.currentDate.toISOString().slice(0, 10)}`,
      meta: { id: c.id, isLocked: c.isLocked, lockReason: c.lockReason, version: c.version },
    });
  }

  events.sort((a, b) => b.at.localeCompare(a.at));
  return NextResponse.json({ events: events.slice(0, limit) });
}
