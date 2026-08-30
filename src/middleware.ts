import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicPaths = ["/", "/api/auth", "/api/onboarding/profile"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isPublicPath = publicPaths.some((path) => nextUrl.pathname.startsWith(path));
  const isOnboardingPath = nextUrl.pathname.startsWith("/onboarding");
  const isDashboardPath = nextUrl.pathname.startsWith("/dashboard");

  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (isLoggedIn && req.auth?.user) {
    const user = req.auth.user;
    const hasProfile = !!user.username;
    const hasClubTeam = !!user.clubTeamId;
    const isComplete = hasProfile && hasClubTeam;

    if (isOnboardingPath) {
      if (isComplete) return NextResponse.redirect(new URL("/dashboard", nextUrl));

      if (nextUrl.pathname === "/onboarding/profile") {
        if (!hasProfile) return NextResponse.next();
        return NextResponse.redirect(new URL("/onboarding/league-selection", nextUrl));
      }
      if (nextUrl.pathname === "/onboarding/league-selection" || nextUrl.pathname === "/onboarding/team-selection") {
        if (!hasProfile) return NextResponse.redirect(new URL("/onboarding/profile", nextUrl));
        if (!hasClubTeam) return NextResponse.next();
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
      }
    }

    if (nextUrl.pathname === "/") {
      if (isComplete) return NextResponse.redirect(new URL("/dashboard", nextUrl));
      if (!hasProfile) return NextResponse.redirect(new URL("/onboarding/profile", nextUrl));
      if (!hasClubTeam) return NextResponse.redirect(new URL("/onboarding/league-selection", nextUrl));
    }

    if (isDashboardPath && !isComplete) {
      if (!hasProfile) return NextResponse.redirect(new URL("/onboarding/profile", nextUrl));
      if (!hasClubTeam) return NextResponse.redirect(new URL("/onboarding/league-selection", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
