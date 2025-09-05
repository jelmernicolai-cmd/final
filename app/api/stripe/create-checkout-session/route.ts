// app/api/stripe/create-checkout-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { stripe } from "@/lib/stripe";

// Stripe Node SDK vereist Node.js runtime
export const runtime = "nodejs";
// voorkom static optimization/caching
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Bepaal basis-URL (valt terug op request-origin als env ontbreekt)
  const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;

  // 1) Auth check: we hebben e-mail nodig voor Stripe customer
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.redirect(new URL("/login", base), { status: 303 });
  }

  // 2) Env validatie
  const priceId = process.env.STRIPE_PRICE_ID;
  const successUrl = process.env.STRIPE_SUCCESS_URL || `${base}/app`;
  const cancelUrl = process.env.STRIPE_CANCEL_URL || `${base}/billing`;

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Server misconfig: STRIPE_SECRET_KEY ontbreekt." },
      { status: 500 }
    );
  }
  if (!priceId) {
    return NextResponse.json(
      { error: "Server misconfig: STRIPE_PRICE_ID ontbreekt." },
      { status: 500 }
    );
  }

  // 3) Stripe customer vinden of maken
  const customers = await stripe.customers.list({ email, limit: 1 });
  const customer = customers.data[0] ?? (await stripe.customers.create({ email }));

  // 4) Checkout sessie aanmaken (subscription)
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl, // moeten absolute URLs zijn
    cancel_url: cancelUrl,   // idem
    allow_promotion_codes: true,
  });

  // 5) Redirect naar Stripe-hosted checkout
  return NextResponse.redirect(checkout.url!, { status: 303 });
}
