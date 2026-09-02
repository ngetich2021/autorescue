import { defineConfig, env } from "prisma/config";

// prisma.config.ts is evaluated before Prisma's own .env loading, so load it
// ourselves (Node 20.6+ native API) before referencing env() below. No .env
// file exists on Vercel — env vars are injected directly — so skip if absent.
try {
  process.loadEnvFile(".env");
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: `${env("TURSO_DATABASE_URL")}?authToken=${env("TURSO_AUTH_TOKEN")}`,
  },
});
