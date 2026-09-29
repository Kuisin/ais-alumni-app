import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * The app's web build (Kuisin/ais-alumni-v2) calls the mobile API from its
 * own origin. The API takes bearer tokens only, never cookies, so allowing
 * that origin exposes nothing a browser session could be tricked into.
 * Route handlers answer the OPTIONS preflight themselves.
 */
const WEB_APP_ORIGIN = "https://ais-alumni.kai-lab.net";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/api/mobile/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: WEB_APP_ORIGIN },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Authorization, Content-Type, Accept, X-NEXT-INTL-LOCALE",
          },
          { key: "Access-Control-Max-Age", value: "86400" },
          { key: "Vary", value: "Origin" },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      // Only relevant to the local-disk upload fallback. On Vercel, function
      // bodies are capped at 4.5 MB, so evidence goes straight to Blob from
      // the browser (see src/app/api/evidence/upload/route.ts).
      bodySizeLimit: "12mb",
    },
  },
};

export default withNextIntl(nextConfig);
