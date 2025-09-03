import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));
  }

  // Zoek (of maak) Stripe customer op basis van e-mail
  const customers = await stripe.customers.list({ email: session.user.email, limit: 1 });
  const customer = customers.data[0] ?? await stripe.customers.create({ email: session.user.email });

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: process.env.STRIPE_SUCCESS_URL!,
    cancel_url: process.env.STRIPE_CANCEL_URL!,
    allow_promotion_codes: true,
  });

  return NextResponse.redirect(checkout.url!, { status: 303 });
}
