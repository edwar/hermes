import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // La página /primer-cliente lee docs/primer-cliente.md en tiempo de ejecución: sin esto, Vercel no incluye el archivo.
  outputFileTracingIncludes: {
    "/primer-cliente": ["./docs/primer-cliente.md"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
}

export default nextConfig
