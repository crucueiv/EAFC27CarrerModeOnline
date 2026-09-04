import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const ADMIN_EMAIL = "crucescuetoivan@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email) && email === ADMIN_EMAIL;
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { session: null, response: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }
  if (!isAdminEmail(session.user.email)) {
    return { session: null, response: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  }
  return { session, response: null as NextResponse | null };
}
