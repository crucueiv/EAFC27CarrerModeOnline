import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TeamSelectionClient } from "./TeamSelectionClient";

export const dynamic = "force-dynamic";

export default async function TeamSelectionPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (session.user.clubTeamId) redirect("/dashboard");

  return <TeamSelectionClient />;
}
