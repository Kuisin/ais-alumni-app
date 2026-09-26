import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // The CLI (migrate) uses the direct/session connection; the app uses the
    // pooled DATABASE_URL via the pg adapter (src/lib/db.ts). Not using env()
    // so `prisma generate` works without a database configured.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
