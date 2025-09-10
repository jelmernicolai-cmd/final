// app/pricing/page.tsx
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Prijzen | PharmaGtN",
  description:
    "Eén heldere licentie: €2.500 per jaar per entiteit. Inclusief GtN Portal, templates, validatie en dashboards.",
};

export default function PricingNL() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-sky-50 to-white border-b">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16 text-center">
          <h1 className="text-3xl md:text-5xl font-bold">Prijzen</h1>
          <p className="mt-4 text-gray-700">
            Eén heldere licentie. Geen verrassingen. Schaalbaar met enterprise-opties.
          </p>
        </div>
      </section>

      {/* Plan */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2 rounded-2xl border p-6 md:p-8 bg-white">
            <h2 className="text-xl md:text-2xl font-bold">GtN Portal – Jaarlicentie</h2>
            <p className="mt-2 text-gray-600">Per juridische entiteit. Inclusief updates & support.</p>
            <div className="mt-6 flex items-baseline gap-2">
              <div className="text-4xl font-bold">€2.500</div>
              <div className="text-gray-500">/ jaar</div>
            </div>
            <ul className="mt-6 grid md:grid-cols-2 gap-3 text-sm text-gray-700">
              <li>• Toegang tot alle analyses (waterfall, consistentie, paralleldruk)</li>
              <li>• Excel-templates & automatische validatie</li>
              <li>• KPI-overzichten en exporteerbare dashboards</li>
              <li>• Beheer van rollen & rechten, audit logging</li>
              <li>• EU-hosting optie, encryptie in transit/at rest</li>
              <li>• Support & onboarding guidelines</li>
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              {/* KNOP NAAR STRIPE CHECKOUT */}
              <form action="/api/stripe/create-checkout-session" method="POST">
                <button
                  type="submit"
                  className="bg-sky-600 text-white px-5 py-3 rounded-lg hover:bg-sky-700"
                >
                  Start nu
                </button>
              </form>

              <Link href="/contact" className="px-5 py-3 rounded-lg border hover:bg-gray-50">
                Vraag enterprise-opties aan
              </Link>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Je wordt doorgestuurd naar een beveiligde Stripe-checkout. Nog geen account?
              Log in na betaling met hetzelfde e-mailadres. (Niet ingelogd? Dan ga je eerst naar /login.)
            </p>
          </div>

          <div className="rounded-2xl border p-6 md:p-8 bg-white">
            <Image
              src="/images/pricing-visual.png"
              alt="Pricing visual"
              width={800}
              height={600}
              className="w-full rounded-lg border"
            />
            <p className="mt-4 text-sm text-gray-600">
              ROI-belofte: minimaal €100.000 aan waarde door optimalisatie van je kortingmix.
            </p>
          </div>
        </div>
      </section>

import PricingFAQ from "@/components/pricing/PricingFAQ";

export default function PricingPage() {
  return (
    <>
      {/* ... jouw pricing hero/kaart ... */}
      {/* Vergelijking met alternatieven */}
      <section className="mx-auto max-w-4xl px-4 py-8">
        <h2 className="text-xl font-semibold mb-4">Waarom niet Excel of maatwerk IT?</h2>
        <ul className="list-disc pl-5 space-y-2 text-slate-700">
          <li>Excel → foutgevoelig, geen audit trail, trage scenario’s</li>
          <li>Maatwerk IT → duur & lange doorlooptijd</li>
          <li>PharmaGtN → direct inzicht, governance & export in 1 tool</li>
        </ul>
      </section>
      <PricingFAQ />
    </>
  );
}

      {/* FAQ */}
      <section className="bg-gray-50 border-t">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold">Veelgestelde vragen</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">Wat valt onder “entiteit”?</h3>
              <p className="mt-2 text-sm text-gray-700">
                Een juridische entiteit (bijv. landorganisatie). Meerdere entiteiten? Neem contact op voor bundelkorting.
              </p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">Zijn er implementatiekosten?</h3>
              <p className="mt-2 text-sm text-gray-700">
                Self-service onboarding is inbegrepen. Optioneel bieden we begeleide implementatie & data-ops.
              </p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">Hoe zit het met support?</h3>
              <p className="mt-2 text-sm text-gray-700">
                E-mail support, template-updates en best practices zijn inbegrepen in de licentie.
              </p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">Enterprise?</h3>
              <p className="mt-2 text-sm text-gray-700">
                SSO, datalake-connectors en maatwerk dashboards op aanvraag.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
