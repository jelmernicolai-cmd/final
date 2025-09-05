import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import OktaProvider from "next-auth/providers/okta";
import CredentialsProvider from "next-auth/providers/credentials"; // optioneel voor lokaal
import { stripe } from "@/lib/stripe";

/**
 * SSO via OIDC (Azure AD & Okta) + optionele Credentials voor lokaal
 * Vereiste env vars:
 *   NEXTAUTH_SECRET=...
 *
 * Azure AD:
 *   AZURE_AD_CLIENT_ID=...
 *   AZURE_AD_CLIENT_SECRET=...
 *   AZURE_AD_TENANT_ID=...       (Tenant ID of 'common' voor multi-tenant, bij voorkeur tenant-id)
 *
 * Okta:
 *   OKTA_ISSUER=https://dev-XXXX.okta.com/oauth2/default
 *   OKTA_CLIENT_ID=...
 *   OKTA_CLIENT_SECRET=...
 *
 * (Optioneel) domein-whitelist (komma-gescheiden):
 *   ALLOWED_SSO_DOMAINS=bedrijf.com,contoso.com
 *
 * (Optioneel) credentials alleen voor development:
 *   ENABLE_CREDENTIALS_DEV=true
 *   NEXTAUTH_CRED_EMAIL=demo@pharmagtn.local
 *   NEXTAUTH_CRED_PASSWORD=demo123
 */

const providers = [
  ...(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID
    ? [
        AzureADProvider({
          clientId: process.env.AZURE_AD_CLIENT_ID!,
          clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
          tenantId: process.env.AZURE_AD_TENANT_ID!, // bv. 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        }),
      ]
    : []),

  ...(process.env.OKTA_ISSUER && process.env.OKTA_CLIENT_ID && process.env.OKTA_CLIENT_SECRET
    ? [
        OktaProvider({
          issuer: process.env.OKTA_ISSUER!,
          clientId: process.env.OKTA_CLIENT_ID!,
          clientSecret: process.env.OKTA_CLIENT_SECRET!,
        }),
      ]
    : []),

  // Alleen aan in development als je dit wilt
  ...(process.env.ENABLE_CREDENTIALS_DEV === "true"
    ? [
        CredentialsProvider({
          name: "Email & Wachtwoord (dev)",
          credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Wachtwoord", type: "password" },
          },
          async authorize(credentials) {
            const email = String(credentials?.email || "").toLowerCase().trim();
            const pass = String(credentials?.password || "");
            const ok =
              email === String(process.env.NEXTAUTH_CRED_EMAIL || "demo@pharmagtn.local").toLowerCase() &&
              pass === String(process.env.NEXTAUTH_CRED_PASSWORD || "demo123");
            return ok ? { id: "dev-user", name: "Dev User", email } : null;
          },
        }),
      ]
    : []),
];

export const authOptions: NextAuthOptions = {
  providers,

  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    // Verplicht domein-check (optioneel maar aanbevolen)
    async signIn({ profile }) {
      const raw = process.env.ALLOWED_SSO_DOMAINS || "";
      const allowed = raw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (!allowed.length) return true; // geen restrictie

      const email = String((profile as any)?.email || "").toLowerCase();
      const domain = email.split("@")[1] || "";
      return !!(domain && allowed.includes(domain));
    },

    async jwt({ token, account, profile }) {
      // Stripe-status om toegang tot /app te bewaken
      const now = Math.floor(Date.now() / 1000);
      const checkedAt = Number((token as any).stripeCheckedAt || 0);
      const shouldRefresh = !!(account || profile) || now - checkedAt > 600;

      if (shouldRefresh && token?.email && process.env.STRIPE_SECRET_KEY) {
        try {
          const customers = await stripe.customers.list({ email: token.email as string, limit: 1 });
          const cust = customers.data[0];
          (token as any).stripeCustomerId = cust?.id || null;

          if (cust?.id) {
            const subs = await stripe.subscriptions.list({ customer: cust.id, status: "active", limit: 1 });
            (token as any).hasActiveSub = subs.data.length > 0;
          } else {
            (token as any).hasActiveSub = false;
          }
        } catch {
          (token as any).hasActiveSub = false;
        }
        (token as any).stripeCheckedAt = now;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).stripeCustomerId = (token as any).stripeCustomerId || null;
        (session.user as any).hasActiveSub = (token as any).hasActiveSub || false;
      }
      return session;
    },
  },
};
