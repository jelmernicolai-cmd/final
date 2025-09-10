// app/billing/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Link from "next/link";

export const metadata = {
  title: "Billing & Subscription | PharmaGtN",
  description: "Beheer je PharmaGtN-licentie: abonneren, facturen en instellingen via Stripe Billing.",
  alternates: { canonical: "/billing" },
  openGraph: {
    title: "Billing & Subscription | PharmaGtN",
    description: "Abonneer je op PharmaGtN of beheer je licentie via Stripe Billing.",
    url: "/billing",
    type: "website",
  },
};

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span aria-hidden>•</span>
      <span className="text-sm text-gray-700">{children}</span>
    </li>
  );
}

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? "";
  const hasActiveSub = Boolean((session?.user as any)?.hasActiveSub);

  const secret = process.env.STRIPE_SECRET_KEY || "";
  const canCheckout = Boolean(secret && process.env.STRIPE_PRICE_ID);
  const isStripeTest = secret.startsWith("sk_test_");
  const successUrl = process.env.STRIPE_SUCCESS_URL || `${process.env.NEXTAUTH_URL || ""}/app`;
  const cancelUrl = process.env.STRIPE_CANCEL_URL || `${process.env.NEXTAUTH_URL || ""}/billing`;
  const missingAuthUrl = !process.env.NEXTAUTH_URL;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl md:text-3xl font-bold">Billing & Subscription</h1>
      <p className="mt-2 text-sm text-gray-600">Beheer je licentie, betalingen en facturen via Stripe.</p>

      {/* Config status / banners */}
      <div className="mt-4 space-y-2">
        {isStripeTest && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Stripe draait in <strong>testmodus</strong>. Gebruik testkaarten (bijv. 4242 4242 4242 4242) voor een succesvolle checkout.
          </div>
        )}
        {!canCheckout && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Stripe Checkout staat nog niet volledig ingesteld. Zet <code>STRIPE_SECRET_KEY</code> (sk_live_… of sk_test_…) en <code>STRIPE_PRICE_ID</code> in je server-env.
            <div className="mt-1 text-xs">
              Redirects: <code>success</code> → <code>{successUrl || "—"}</code>, <code>cancel</code> → <code>{cancelUrl || "—"}</code>
            </div>
          </div>
        )}
        {missingAuthUrl && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            <code>NEXTAUTH_URL</code> ontbreekt. Stel deze in voor correcte redirects (bijv. je https-domein).
          </div>
        )}
      </div>

      {/* Niet ingelogd → eerst login */}
      {!session && (
        <section className="mt-6 rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-semibold">Log in om verder te gaan</h2>
          <p className="mt-1 text-gray-700">Log in om je abonnement te starten of te beheren.</p>
          <div className="mt-4 flex gap-3">
            <Link href="/login" className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700">
              Inloggen
            </Link>
            <Link href="/pricing" className="rounded-lg border px-4 py-2 hover:bg-gray-50">
              Bekijk prijzen
            </Link>
          </div>
        </section>
      )}

      {/* Ingelogd → plan + CTA’s */}
      {session && (
        <section className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl border bg-white p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">GtN Portal – Jaarlicentie</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Per juridische entiteit. Inclusief updates & support. (<span className="italic">prijs excl. btw</span>)
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  hasActiveSub
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
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
              <Bullet>Waterfall, Consistency & Parallel-analyses</Bullet>
              <Bullet>Excel-templates + automatische validatie</Bullet>
              <Bullet>KPI-dashboards en export (CSV/PDF)</Bullet>
              <Bullet>Rollen & rechten, audit logging</Bullet>
              <Bullet>EU-hosting optie, encryptie in transit/at rest</Bullet>
              <Bullet>Support & onboarding guidelines</Bullet>
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              {!hasActiveSub ? (
                <form
                  action="/api/stripe/create-checkout-session"
                  method="POST"
                  className="inline"
                >
                  <button
                    type="submit"
                    className="rounded-lg bg-sky-600 px-5 py-3 text-white hover:bg-sky-700 disabled:opacity-50"
                    disabled={!canCheckout}
                    aria-disabled={!canCheckout}
                  >
                    Abonneer (Stripe Checkout)
                  </button>
                </form>
              ) : (
                <>
                  <Link
                    href="/app"
                    className="rounded-lg bg-sky-600 px-5 py-3 text-white hover:bg-sky-700"
                  >
                    Naar de Portal
                  </Link>
                  <form action="/api/stripe/create-portal-session" method="POST" className="inline">
                    <button className="rounded-lg border px-5 py-3 hover:bg-gray-50">
                      Beheer abonnement (Stripe)
                    </button>
                  </form>
                </>
              )}

              <Link href="/contact" className="rounded-lg border px-5 py-3 hover:bg-gray-50">
                Enterprise-opties
              </Link>
            </div>

            <div className="mt-6 grid gap-3 text-xs text-gray-600">
              <div>
                Ingelogd als: <span className="font-medium">{email || "—"}</span>. Betalingen via Stripe (PCI-DSS).
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border px-2 py-1">SEPA/kaarten</span>
                <span className="rounded-full border px-2 py-1">Facturen via Stripe Portal</span>
                <span className="rounded-full border px-2 py-1">Opzeggen via Portal</span>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border bg-white p-6">
            <h3 className="font-semibold">Veelgestelde vragen</h3>
            <div className="mt-3 space-y-3 text-sm text-gray-700">
              <details className="rounded border p-3">
                <summary className="cursor-pointer font-medium">Wat valt onder “entiteit”?</summary>
                <p className="mt-2">
                  Eén juridische entiteit (bijv. landorganisatie). Voor meerdere entiteiten: bundelkorting op aanvraag.
                </p>
              </details>
              <details className="rounded border p-3">
                <summary className="cursor-pointer font-medium">Zijn er implementatiekosten?</summary>
                <p className="mt-2">
                  Self-service onboarding is inbegrepen. Begeleide implementatie & data-ops zijn optioneel.
                </p>
              </details>
              <details className="rounded border p-3">
                <summary className="cursor-pointer font-medium">Facturen & beheer</summary>
                <p className="mt-2">
                  Gebruik <em>Beheer abonnement</em> (Stripe Portal) voor facturen, betaalmethode en opzegging.
                </p>
              </details>
            </div>
          </aside>
        </section>
      )}

      {/* JSON-LD voor SEO: Product + Offer */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "PharmaGtN – GtN Portal (jaarlicentie)",
            description:
              "Gross-to-Net analyses, scenario’s, KPI’s en governance. Inclusief templates, validatie en support.",
            brand: { "@type": "Brand", name: "PharmaGtN" },
            offers: {
              "@type": "Offer",
              price: "2500",
              priceCurrency: "EUR",
              priceValidUntil: "2099-12-31",
              availability: "https://schema.org/InStock",
              url: (process.env.SITE_URL || "https://www.pharmagtn.com") + "/billing",
            },
          }),
        }}
      />
    </main>
  );
}
