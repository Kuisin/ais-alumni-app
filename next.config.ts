import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactCompiler: true,
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
