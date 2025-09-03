import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import { stripe } from "@/lib/stripe";

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_ID && process.env.GOOGLE_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_ID!,
          clientSecret: process.env.GOOGLE_SECRET!,
        })]
      : []),
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [GithubProvider({
          clientId: process.env.GITHUB_ID!,
          clientSecret: process.env.GITHUB_SECRET!,
        })]
      : []),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Bij eerste sign-in of provider wissel: koppel Stripe-gegevens op basis van e-mail
      if ((account || profile) && token?.email) {
        try {
          const customers = await stripe.customers.list({
            email: token.email as string,
            limit: 1,
          });
          const cust = customers.data[0];
          (token as any).stripeCustomerId = cust?.id;

          if (cust?.id) {
            const subs = await stripe.subscriptions.list({
              customer: cust.id,
              status: "active",
              limit: 1,
            });
            (token as any).hasActiveSub = subs.data.length > 0;
          } else {
            (token as any).hasActiveSub = false;
          }
        } catch {
          (token as any).hasActiveSub = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).stripeCustomerId = (token as any).stripeCustomerId;
        (session.user as any).hasActiveSub = (token as any).hasActiveSub;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
};
