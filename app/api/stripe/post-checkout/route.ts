// app/api/stripe/post-checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.redirect(new URL("/billing?error=missing_session_id", base), { status: 303 });
  }

  try {
    const cs = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });

    // Extra veiligheid: alleen door als de sessie echt betaald/complete is
    const paid = cs.payment_status === "paid" || cs.status === "complete";
    const hasSub = !!cs.subscription;

    if (!paid || !hasSub) {
      return NextResponse.redirect(new URL("/billing?error=checkout_not_confirmed", base), { status: 303 });
    }

    // Zet een korte cookie zodat middleware /app direct toelaat (10 minuten)
    const res = NextResponse.redirect(new URL("/app", base), { status: 303 });
    res.cookies.set("recentlyActivated", "1", {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 10, // 10 minuten
      sameSite: "lax",
      secure: true,
    });
    return res;
  } catch (err) {
    console.error("[post-checkout] error:", err);
    return NextResponse.redirect(new URL("/billing?error=checkout_lookup_failed", base), { status: 303 });
  }
}
