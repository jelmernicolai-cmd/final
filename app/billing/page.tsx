// app/billing/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Link from "next/link";

export const metadata = {
  title: "Billing & Subscription | PharmaGtN",
  description: "Beheer je PharmaGtN-licentie: abonneren, facturen en instellingen via Stripe Billing.",
};

function Bullet({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-2"><span>•</span><span className="text-sm text-gray-700">{children}</span></li>;
}

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? "";
  const hasActiveSub = Boolean((session?.user as any)?.hasActiveSub);

  const canCheckout = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
  const successUrl = process.env.STRIPE_SUCCESS_URL || `${process.env.NEXTAUTH_URL || ""}/app`;
  const cancelUrl = process.env.STRIPE_CANCEL_URL || `${process.env.NEXTAUTH_URL || ""}/billing`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl md:text-3xl font-bold">Billing & Subscription</h1>

      {!session && (
        <div className="mt-6 rounded-xl border bg-white p-6">
          <p className="text-gray-700">Log eerst in om je abonnement te beheren of te starten.</p>
          <div className="mt-4 flex gap-3">
            <Link href="/login" className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700">Login</Link>
            <Link href="/pricing" className="rounded-lg border px-4 py-2 hover:bg-gray-50">Bekijk prijzen</Link>
          </div>
        </div>
      )}

      {session && (
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl border bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">GtN Portal – Jaarlicentie</h2>
                <p className="mt-1 text-sm text-gray-600">Per juridische entiteit. Inclusief updates & support.</p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  hasActiveSub ? "bg-green-100 text-green-700 border border-green-200" : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
                aria-label={hasActiveSub ? "Abonnement actief" : "Nog geen actief abonnement"}
              >
                {hasActiveSub ? "Actief abonnement" : "Nog niet geactiveerd"}
              </span>
            </div>

            <div className="mt-6 flex items-baseline gap-2">
              <div className="text-4xl font-bold">€2.500</div>
              <div className="text-gray-500">/ jaar / entiteit</div>
            </div>

            <ul className="mt-6 grid gap-2">
              <Bullet>Waterfall, Consistency & Parallel analyses</Bullet>
              <Bullet>Excel-templates + automatische validatie</Bullet>
              <Bullet>KPI-dashboards en export</Bullet>
              <Bullet>Rollen & rechten, audit logging</Bullet>
              <Bullet>EU-hosting optie, encryptie in transit/at rest</Bullet>
              <Bullet>Support & onboarding guidelines</Bullet>
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              {!hasActiveSub ? (
                <form action="/api/stripe/create-checkout-session" method="POST" className="inline">
                  <button type="submit" className="rounded-lg bg-sky-600 px-5 py-3 text-white hover:bg-sky-700 disabled:opacity-50" disabled={!canCheckout} aria-disabled={!canCheckout}>
                    Abonneer (Stripe Checkout)
                  </button>
                </form>
              ) : (
                <>
                  <Link href="/app" className="rounded-lg bg-sky-600 px-5 py-3 text-white hover:bg-sky-700">Naar de Portal</Link>
                  <form action="/api/stripe/create-portal-session" method="POST" className="inline">
                    <button className="rounded-lg border px-5 py-3 hover:bg-gray-50">Beheer abonnement</button>
                  </form>
                </>
              )}

              <Link href="/contact" className="rounded-lg border px-5 py-3 hover:bg-gray-50">Enterprise-opties</Link>
            </div>

            {!canCheckout && (
              <p className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                Zet <code>STRIPE_SECRET_KEY</code> en <code>STRIPE_PRICE_ID</code> in je server-env. (Succes/Cancel: <code>{successUrl || "—"}</code> / <code>{cancelUrl || "—"}</code>)
              </p>
            )}

            <p className="mt-6 text-xs text-gray-500">
              Ingelogd als: <span className="font-medium">{email}</span>. Betalingen via Stripe (PCI-DSS).
            </p>
          </div>

          <aside className="rounded-2xl border bg-white p-6">
            <h3 className="font-semibold">Veelgestelde vragen</h3>
            <div className="mt-3 space-y-3 text-sm text-gray-700">
              <details className="rounded border p-3">
                <summary className="cursor-pointer font-medium">Wat valt onder “entiteit”?</summary>
                <p className="mt-2">Eén juridische entiteit (bijv. landorganisatie). Voor meerdere entiteiten: bundelkorting op aanvraag.</p>
              </details>
              <details className="rounded border p-3">
                <summary className="cursor-pointer font-medium">Zijn er implementatiekosten?</summary>
                <p className="mt-2">Self-service onboarding inbegrepen. Begeleide implementatie & data-ops optioneel.</p>
              </details>
              <details className="rounded border p-3">
                <summary className="cursor-pointer font-medium">Facturen & beheer</summary>
                <p className="mt-2">Gebruik <em>Beheer abonnement</em> voor facturen, betaalmethode en opzegging.</p>
              </details>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
