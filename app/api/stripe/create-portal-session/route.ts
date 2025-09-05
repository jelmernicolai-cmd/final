// app/api/stripe/create-portal-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.redirect(new URL("/login", base), { status: 303 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY ontbreekt." }, { status: 500 });
  }

  const found = await stripe.customers.list({ email, limit: 1 });
  const customer = found.data[0] ?? (await stripe.customers.create({ email }));

  const portal = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${base}/billing`,
  });

  return NextResponse.redirect(portal.url, { status: 303 });
}
