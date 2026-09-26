import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Not using env() so `prisma generate` works without a database configured.
    url: process.env.DATABASE_URL ?? "",
  },
});
