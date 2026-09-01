import type { Adapter, AdapterUser, AdapterAccount } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { PrismaClient } from "@prisma/client";
import { generateId } from "@/lib/id";

// The stock PrismaAdapter deliberately drops any id it's handed and leans on
// Prisma's schema-level @default(cuid()) to generate one (see its
// createUser: comment about Mongo compatibility). Every @id column in
// prisma/schema.prisma has no default though — ids are always generateId()
// — so these three methods (the only ones that insert a brand-new row
// without an id already decided) are reimplemented here. Auth.js also
// pre-fills `user.id` with a UUID before calling createUser, so the
// override has to come after the spread to actually win.
export function CustomPrismaAdapter(db: PrismaClient): Adapter {
  const base = PrismaAdapter(db);
  return {
    ...base,
    // Prisma's generated types reflect this schema's nullable User.email
    // (auth.js's AdapterUser requires it non-null, and AdapterAccount isn't
    // exactly the shape Prisma's Account model produces either) — the cast
    // is only bridging that type gap, not changing behavior; the stock
    // PrismaAdapter has the identical gap, just hidden behind its own .d.ts.
    createUser: (user) =>
      db.user.create({
        data: { ...user, id: generateId() },
      }) as unknown as Promise<AdapterUser>,
    linkAccount: (account) =>
      db.account.create({
        data: { ...account, id: generateId() },
      }) as unknown as Promise<AdapterAccount>,
    createSession: (session) =>
      db.session.create({ data: { ...session, id: generateId() } }),
  };
}
