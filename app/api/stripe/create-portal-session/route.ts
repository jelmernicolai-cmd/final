import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));
  }

  const customers = await stripe.customers.list({ email: session.user.email, limit: 1 });
  const customer = customers.data[0];
  if (!customer) {
    return NextResponse.redirect(new URL("/billing", process.env.NEXTAUTH_URL));
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${process.env.NEXTAUTH_URL}/app`,
  });

  return NextResponse.redirect(portal.url, { status: 303 });
}
