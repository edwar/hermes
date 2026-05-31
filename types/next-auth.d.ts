import "next-auth"

declare module "next-auth" {
  interface User {
    role?: string
    companyId?: string
  }

  interface Session {
    user: {
      id: string
      role: string
      companyId?: string
      email: string
      name: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    companyId?: string
  }
}
