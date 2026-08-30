// auth.ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

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
        token.avatarUrl = user.avatarUrl
        token.clubTeamId = user.clubTeamId
        token.nationalTeamId = user.nationalTeamId
      }
      if (trigger === "update" && session) {
        token.username = session.username ?? token.username
        token.avatarUrl = session.avatarUrl ?? token.avatarUrl
        token.clubTeamId = session.clubTeamId ?? token.clubTeamId
        token.nationalTeamId = session.nationalTeamId ?? token.nationalTeamId
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