import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { triggerBuyOption } from "@/lib/transfers/loanActivation";

type Body = { loanId: string };

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "no-db" }, { status: 503 });

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || !body.loanId) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const loan = await prisma.loan.findUnique({ where: { id: body.loanId } });
  if (!loan) return NextResponse.json({ error: "not-found" }, { status: 404 });
  if (loan.buyerId !== userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const result = await triggerBuyOption(body.loanId);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason ?? "unknown" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
