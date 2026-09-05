import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CalendarClient from "@/components/calendar/CalendarClient";
import { PageTitle } from "@/components/providers/PageTitleProvider";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  return (
    <PageTitle title="Calendario">
      <CalendarClient />
    </PageTitle>
  );
}
