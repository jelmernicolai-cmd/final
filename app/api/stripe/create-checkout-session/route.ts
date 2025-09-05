// app/api/stripe/create-checkout-session/route.ts
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
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: "STRIPE_PRICE_ID ontbreekt." }, { status: 500 });
  }

  const successUrl = process.env.STRIPE_SUCCESS_URL || `${base}/app`;
  const cancelUrl = process.env.STRIPE_CANCEL_URL || `${base}/billing`;

  const found = await stripe.customers.list({ email, limit: 1 });
  const customer = found.data[0] ?? (await stripe.customers.create({ email }));

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  });

  return NextResponse.redirect(checkout.url!, { status: 303 });
}
