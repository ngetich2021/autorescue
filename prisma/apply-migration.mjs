import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

process.loadEnvFile(".env");

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const file = process.argv[2] ?? "prisma/migration.sql";
const sql = readFileSync(file, "utf8");

await client.executeMultiple(sql);
console.log("Migration applied to Turso.");

const tables = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",
);
console.log(tables.rows.map((r) => r.name));

client.close();
