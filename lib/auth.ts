import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

const allowedEmails = (process.env.ADMIN_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // Backup email + password entry, for an admin address that cannot use Google
    // sign-in (e.g. a custom-domain mailbox). The single credential lives ONLY in
    // server env vars (ADMIN_BACKUP_EMAIL / ADMIN_BACKUP_PASSWORD) — never in the
    // code or the client bundle. Disabled automatically if either env is unset.
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        const backupEmail = (process.env.ADMIN_BACKUP_EMAIL ?? "").trim().toLowerCase();
        const backupPassword = process.env.ADMIN_BACKUP_PASSWORD ?? "";
        if (!backupEmail || !backupPassword) return null;
        if (email === backupEmail && password === backupPassword) {
          return { id: "backup-admin", email: backupEmail, name: "Admin" };
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // The backup credential is validated by authorize() above — the password
      // IS the authorisation, so it does not go through the email allowlist.
      if (account?.provider === "credentials") return true;
      const email = user.email?.toLowerCase();
      if (!email) return false;
      if (allowedEmails.length === 0) return false;
      return allowedEmails.includes(email);
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email;
      }
      return session;
    },
  },
});
