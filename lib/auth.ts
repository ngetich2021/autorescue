import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { CustomPrismaAdapter } from "@/lib/custom-adapter";
import { db } from "@/lib/db";
import { bootstrapOrReconcileUser } from "@/lib/authz";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: CustomPrismaAdapter(db),
  providers: [Google],
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    // Runs on every sign-in (new or returning). The first person to ever sign
    // in becomes the platform Super Admin; everyone else gets any pending
    // platform/shop invites for their email activated.
    async signIn({ user }) {
      if (user.id) {
        await bootstrapOrReconcileUser(user.id, user.email);
      }
    },
  },
});
