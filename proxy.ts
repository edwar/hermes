import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

function resolveBaseUrl(req: Request): string {
  const configured =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.AUTH_URL
  if (configured) {
    return configured.startsWith("http") ? configured : `https://${configured}`
  }
  const forwardedHost = req.headers.get("x-forwarded-host")
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https"
  const host = forwardedHost ?? req.headers.get("host")
  if (host) return `${forwardedProto}://${host}`
  return new URL(req.url).origin
}

export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", resolveBaseUrl(req)))
  }
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api/|login|register|print|robots.txt|sitemap.xml|_next/static|_next/image|icon.svg|landing).*)",],
}
