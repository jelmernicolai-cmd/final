// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sig = headers().get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    console.error("[webhook] Missing signature or STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  // Lees raw body voor signature-verificatie
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    console.error("[webhook] Signature verification failed:", err?.message);
    return NextResponse.json({ error: `Webhook Error: ${err?.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string | null;
        const subscriptionId = session.subscription as string | null;
        if (customerId) {
          await setCustomerMeta(customerId, {
            has_active_sub: subscriptionId ? "true" : "false",
            last_checkout: String(Date.now()),
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const active = sub.status === "active";
        const priceId = sub.items.data[0]?.price?.id ?? "";
        await setCustomerMeta(String(sub.customer), {
          has_active_sub: active ? "true" : "false",
          price_id: priceId,
          current_period_end: String(sub.current_period_end || ""),
          cancel_at_period_end: sub.cancel_at_period_end ? "true" : "false",
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await setCustomerMeta(String(sub.customer), {
          has_active_sub: "false",
          canceled_at: String(sub.canceled_at || Date.now()),
        });
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.customer) {
          await setCustomerMeta(String(inv.customer), { last_payment_failed: "true" });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.customer) {
          await setCustomerMeta(String(inv.customer), { last_payment_failed: "false" });
        }
        break;
      }

      default:
        // Niet-kritieke events negeren
        break;
    }
  } catch (err) {
    console.error("[webhook] handler error:", err);
    // We antwoorden toch 200 zodat Stripe niet blijft retrien als jouw bewerking faalt
    return NextResponse.json({ received: true, handled: false });
  }

  return NextResponse.json({ received: true });
}

async function setCustomerMeta(customerId: string, meta: Record<string, string>) {
  if (!customerId) return;
  // Stripe merge't metadata per key, dus dit overschrijft alleen de meegegeven keys
  await stripe.customers.update(customerId, { metadata: meta });
}
