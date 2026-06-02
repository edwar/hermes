import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

function resolveSiteUrl(): string | null {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  if (process.env.AUTH_URL) {
    return process.env.AUTH_URL
  }
  return null
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const { prisma } = await import("./prisma")
        const bcrypt = await import("bcryptjs")

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findFirst({ where: { email } })
        if (!user || !user.isActive) return null

        const isValid = await bcrypt.compare(password, user.passwordHash)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId ?? undefined,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.companyId = user.companyId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.companyId = token.companyId as string | undefined
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      const siteUrl = resolveSiteUrl()
      const target = siteUrl ?? baseUrl
      try {
        const parsed = new URL(url, baseUrl)
        const targetOrigin = new URL(target).origin
        if (parsed.origin === targetOrigin) return parsed.toString()
        return new URL(
          parsed.pathname + parsed.search + parsed.hash,
          target
        ).toString()
      } catch {
        return target
      }
    },
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
})
