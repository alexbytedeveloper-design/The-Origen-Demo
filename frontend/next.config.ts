import type { NextConfig } from "next";

/**
 * Destino de las reescrituras de `/backend/*`.
 *
 * Se lee en el servidor: `API_INTERNAL_URL` permite apuntar al servicio interno
 * (`http://api:8000` en docker-compose) y `NEXT_PUBLIC_API_URL` al backend
 * público (`https://the-origen-backend.vercel.app` en producción).
 */
const apiOrigin = (
  process.env.API_INTERNAL_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  "http://localhost:8000"
).replace(/\/+$/, "");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  devIndicators: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920],
  },
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)",
        headers: securityHeaders,
      },
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // El navegador solo habla con Next: cookies de sesión y CSRF quedan en
      // el mismo origen y el backend no necesita exponerse al navegador.
      { source: "/backend/:path*", destination: `${apiOrigin}/:path*` },
    ];
  },
  async redirects() {
    return [{ source: "/", destination: "/es", permanent: false }];
  },
};

export default nextConfig;
