// app/en/pricing/page.tsx
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Pricing | PharmaGtN",
  description:
    "Single, transparent licence: €2,500 per legal entity per year. Includes the GtN Portal, templates, validation and dashboards.",
};

export default function PricingEN() {
  return (
    <>
      <section className="bg-gradient-to-b from-white to-gray-50 border-b">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16 text-center">
          <h1 className="text-3xl md:text-5xl font-bold">Pricing</h1>
          <p className="mt-4 text-gray-700">
            One clear licence. No surprises. Scales with enterprise options.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2 rounded-2xl border p-6 md:p-8 bg-white">
            <h2 className="text-xl md:text-2xl font-bold">GtN Portal – Annual licence</h2>
            <p className="mt-2 text-gray-600">Per legal entity. Updates & support included.</p>
            <div className="mt-6 flex items-baseline gap-2">
              <div className="text-4xl font-bold">€2,500</div>
              <div className="text-gray-500">/ year</div>
            </div>
            <ul className="mt-6 grid md:grid-cols-2 gap-3 text-sm text-gray-700">
              <li>• Access to all analyses (waterfall, consistency, parallel pressure)</li>
              <li>• Excel templates & automatic validation</li>
              <li>• KPI overviews and exportable dashboards</li>
              <li>• Roles & permissions, audit logging</li>
              <li>• EU hosting option, encryption in transit/at rest</li>
              <li>• Support & onboarding guidelines</li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/app" className="bg-sky-600 text-white px-5 py-3 rounded-lg hover:bg-sky-700">
                Get started
              </Link>
              <Link href="/contact" className="px-5 py-3 rounded-lg border hover:bg-gray-50">
                Request enterprise
              </Link>
            </div>
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
              ROI promise: at least €100,000 in value through discount mix optimisation.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 border-t">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold">FAQ</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">What counts as an “entity”?</h3>
              <p className="mt-2 text-sm text-gray-700">
                A legal entity (e.g., country organisation). Multiple entities? Contact us for volume pricing.
              </p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">Any implementation fees?</h3>
              <p className="mt-2 text-sm text-gray-700">
                Self-service onboarding is included. Optional guided implementation & data-ops available.
              </p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">How about support?</h3>
              <p className="mt-2 text-sm text-gray-700">
                E-mail support, template updates and best practices are included.
              </p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">Enterprise?</h3>
              <p className="mt-2 text-sm text-gray-700">
                SSO, data-lake connectors and custom dashboards on request.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
