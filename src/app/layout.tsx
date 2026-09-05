import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import HeaderNav from "@/components/nav/HeaderNav";
import Sidebar from "@/components/nav/Sidebar";
import Providers from "@/components/providers/Providers";
import ThemeProvider from "@/components/theme/ThemeProvider";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveThemeSeed } from "@/lib/theme/clubTheme";
import "./globals.css";

const fontDisplay = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const fontBody = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EAFC27 Modo Carrera Online",
  description: "Modo carrera online para EA FC",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
    <html lang="es" className={`${fontDisplay.variable} ${fontBody.variable} dark`}>
      <body className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] antialiased">
        <ThemeProvider initialTheme={initialTheme}>
          <Providers>
            <div className="aurora-bg" aria-hidden>
              <span className="aurora-orb" />
            </div>
            <Sidebar />
            <div className="relative z-10 flex min-h-screen flex-col md:pl-[72px]">
              <HeaderNav />
              <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 pb-24 md:pb-10">
                {children}
              </main>
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
