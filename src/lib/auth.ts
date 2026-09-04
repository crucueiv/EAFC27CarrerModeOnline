// auth.ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

const PROTECTED_ROUTES = [
  "/dashboard",
  "/squad",
  "/calendar",
  "/lineup",
  "/transfers",
  "/competitions",
] as const;

function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        })

        if (existingUser) {
          if (!existingUser.googleId) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { googleId: account.providerAccountId },
            })
          }
        }
      }
      return true
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.avatarUrl = user.avatarUrl ?? (user as { image?: string | null }).image ?? null
        token.clubTeamId = user.clubTeamId
        token.nationalTeamId = user.nationalTeamId
      }
      if (trigger === "update" && session) {
        if (session.username !== undefined) token.username = session.username
        if (session.avatarUrl !== undefined) token.avatarUrl = session.avatarUrl
        if (session.clubTeamId !== undefined) token.clubTeamId = session.clubTeamId
        if (session.nationalTeamId !== undefined) token.nationalTeamId = session.nationalTeamId
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.username = token.username as string | undefined
        session.user.avatarUrl = token.avatarUrl as string | undefined
        session.user.clubTeamId = token.clubTeamId as string | undefined
        session.user.nationalTeamId = token.nationalTeamId as string | undefined
      }
      return session
    },
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      if (isProtectedRoute(pathname)) {
        return !!auth?.user?.id;
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      try {
        const urlObj = new URL(url)
        if (urlObj.origin === baseUrl) return url
      } catch {}
      return baseUrl
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
})

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      username?: string | null
      avatarUrl?: string | null
      clubTeamId?: string | null
      nationalTeamId?: string | null
    }
  }
  
  interface User {
    username?: string | null
    avatarUrl?: string | null
    clubTeamId?: string | null
    nationalTeamId?: string | null
  }
}

declare module "next-auth" {
  interface User {
    id: string
    username?: string | null
    avatarUrl?: string | null
    clubTeamId?: string | null
    nationalTeamId?: string | null
  }
}