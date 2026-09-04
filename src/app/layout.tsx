import type { Metadata } from "next";
import HeaderNav from "@/components/nav/HeaderNav";
import Providers from "@/components/providers/Providers";
import ThemeProvider from "@/components/theme/ThemeProvider";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveThemeSeed } from "@/lib/theme/clubTheme";
import "./globals.css";

export const metadata: Metadata = {
  title: "EAFC27 Modo Carrera Online",
  description: "Modo carrera online para EA FC"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  let dbUser = null;
  if (session?.user?.id) {
    dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { clubTeamId: true },
    });
  }
  const effectiveClubTeamId = dbUser?.clubTeamId ?? session?.user?.clubTeamId ?? null;

  const themeSeed = effectiveClubTeamId
    ? await prisma.team.findUnique({
        where: { id: effectiveClubTeamId },
        include: { league: true },
      })
    : null;

  const initialTheme = resolveThemeSeed({
    primaryColor: themeSeed?.primaryColor ?? undefined,
    secondaryColor: themeSeed?.secondaryColor ?? undefined,
    leaguePrimaryColor: themeSeed?.league?.primaryColor ?? undefined,
    leagueSecondaryColor: themeSeed?.league?.secondaryColor ?? undefined,
  });

  return (
    <html lang="es">
      <body className="min-h-screen bg-[var(--theme-background)] text-[var(--theme-foreground)] antialiased">
        <ThemeProvider initialTheme={initialTheme}>
          <Providers>
            <HeaderNav />
            <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
