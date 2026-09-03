import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// The remote libsql HTTP client has no usable connect/request timeout of its
// own (its `timeout` config field is documented as local file:-only), so a
// DNS/network blip to Turso otherwise hangs every query for however long
// Node's own socket timeout happens to be (60-100s+ observed). Since
// NextAuth uses the database session strategy, that hang blocks *every*
// authenticated page/API call, not just admin ones — this bounds it.
const DB_FETCH_TIMEOUT_MS = 8000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, signal: AbortSignal.timeout(DB_FETCH_TIMEOUT_MS) });
}

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
  fetch: fetchWithTimeout,
});

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
