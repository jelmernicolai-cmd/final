import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email & Wachtwoord",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Wachtwoord", type: "password" },
      },
      async authorize(credentials) {
        const allowedEmail = (process.env.NEXTAUTH_CRED_EMAIL || "demo@pharmagtn.local").toLowerCase();
        const allowedPassword = process.env.NEXTAUTH_CRED_PASSWORD || "demo123";
        const email = String(credentials?.email || "").toLowerCase().trim();
        const password = String(credentials?.password || "");
        if (email === allowedEmail && password === allowedPassword) {
          return { id: "user-" + email, name: email.split("@")[0], email };
        }
        return null;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
};
