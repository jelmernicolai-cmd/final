// app/en/page.tsx
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Optimize Gross-to-Net & discount policy | PharmaGtN",
  description:
    "PharmaGtN helps pharma manufacturers optimize commercial policy: discount insight per channel, consistency control, parallel trade pressure and ROI improvement.",
};

export default function HomeEn() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">
              Make <span className="underline decoration-sky-300">Gross-to-Net</span>{" "}
              transparent. Steer for returns.
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              One portal for pricing & discounts across hospitals, pharmacies and wholesalers.
              Upload your data, get actionable insights instantly and lift ROI.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="bg-sky-600 text-white px-5 py-3 rounded-lg font-medium hover:bg-sky-700"
              >
                Try PharmaGtN
              </Link>
              <Link
                href="/en/features"
                className="px-5 py-3 rounded-lg border hover:bg-gray-50"
              >
                See features
              </Link>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              ROI promise: at least €100,000 additional value from discount policy optimization.
            </p>
          </div>

          <div className="relative">
            <Image
              src="/images/hero-dashboard.png"
              alt="PharmaGtN dashboard overview"
              width={1200}
              height={800}
              className="w-full rounded-xl border shadow-sm"
              priority
            />
          </div>
        </div>
      </section>

      {/* Cred-bar / metrics */}
      <section className="border-y bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl font-semibold">€100k+</div>
            <div className="text-xs text-gray-500">Average yearly ROI</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">3–6 mo</div>
            <div className="text-xs text-gray-500">Typical implementation</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">Self-service</div>
            <div className="text-xs text-gray-500">Upload & analyze instantly</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">ISO-ready</div>
            <div className="text-xs text-gray-500">Privacy & security-first</div>
          </div>
        </div>
      </section>

      {/* Core benefits */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-bold">What you gain immediately</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {[
            {
              t: "Full GTN transparency",
              d: "Waterfall from gross to net per channel and customer type. Spot margin leakage at a glance.",
              img: "/images/benefit-waterfall.png",
            },
            {
              t: "Consistent policy",
              d: "Benchmark discount vs. acquisition value. Avoid inconsistencies and unwanted precedents.",
              img: "/images/benefit-scatter.png",
            },
            {
              t: "Manage parallel pressure",
              d: "Detect SKUs with cross-country price pressure and adjust discounts precisely.",
              img: "/images/benefit-heatmap.png",
            },
          ].map((b) => (
            <div key={b.t} className="rounded-xl border p-5 hover:shadow-sm transition">
              <Image
                src={b.img}
                alt={b.t}
                width={800}
                height={500}
                className="w-full rounded-lg border"
              />
              <h3 className="mt-4 font-semibold">{b.t}</h3>
              <p className="mt-2 text-sm text-gray-600">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases + visuals */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-14 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">
              From insight to action in the <span className="whitespace-nowrap">GtN Portal</span>
            </h2>
            <ul className="mt-6 space-y-3 text-gray-700">
              <li>• Upload standardized Excel templates for fast quality checks.</li>
              <li>• Instant KPIs: gross/net, rebate mix, fees/bonus, channel impact.</li>
              <li>• Scenarios: “what if” for discounts, bonuses, fees and net price.</li>
              <li>• Export management slides and shareable insights.</li>
            </ul>
            <div className="mt-6 flex gap-3">
              <Link href="/app" className="bg-gray-900 text-white px-5 py-3 rounded-lg">
                Go to the GtN Portal
              </Link>
              <Link href="/templates" className="px-5 py-3 rounded-lg border">
                Download templates
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            <Image
              src="/images/screen-waterfall.png"
              alt="GTN Waterfall"
              width={1200}
              height={800}
              className="w-full rounded-xl border"
            />
            <Image
              src="/images/screen-consistency.png"
              alt="Consistency scatter"
              width={1200}
              height={800}
              className="w-full rounded-xl border"
            />
          </div>
        </div>
      </section>

      {/* ROI claim */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="rounded-2xl border bg-white p-8 md:p-10">
          <h2 className="text-2xl md:text-3xl font-bold">ROI guarantee</h2>
          <p className="mt-3 text-gray-700">
            Our promise is clear: <strong>at least €100,000 additional value</strong> by optimizing your commercial policy.
            We help set priorities and ensure decisions are captured.
          </p>
          <div className="mt-6">
            <Link href="/pricing" className="inline-block bg-sky-600 text-white px-5 py-3 rounded-lg hover:bg-sky-700">
              View license (€2,500 / year)
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold">What clients value</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {[
              { q: "Finally one GTN source of truth across channels, without spreadsheet chaos.", a: "Director Market Access" },
              { q: "The consistency analysis gave us a clear framework for discounts.", a: "Head of Commercial" },
              { q: "We detected parallel pressure on top SKUs within weeks — and adjusted fast.", a: "Pricing Manager" },
            ].map((t) => (
              <div key={t.q} className="rounded-xl border p-6 bg-gray-50">
                <p className="italic">“{t.q}”</p>
                <p className="mt-3 text-sm text-gray-600">— {t.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold">FAQ</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">What data do I need?</h3>
              <p className="mt-2 text-sm text-gray-700">
                Minimal set: product, customer, volume, gross/net price, discount/bonus/fees and period.
                Use our Excel templates for quick onboarding.
              </p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">How do you ensure security?</h3>
              <p className="mt-2 text-sm text-gray-700">
                Strict access control, encrypted storage and audit logging. On-prem or EU cloud available.
              </p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">What does it cost?</h3>
              <p className="mt-2 text-sm text-gray-700">
                License €2,500/year per entity. Enterprise options available.
              </p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">How fast can we go live?</h3>
              <p className="mt-2 text-sm text-gray-700">
                Typically within 3–6 months including data standardization and validation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl border bg-white p-8 md:p-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">Ready to optimize?</h2>
          <p className="mt-3 text-gray-700">
            Start with the GtN Portal and make your discount policy visibly more consistent and profitable.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link href="/pricing" className="bg-sky-600 text-white px-5 py-3 rounded-lg hover:bg-sky-700">
              Buy license
            </Link>
            <Link href="/contact" className="px-5 py-3 rounded-lg border hover:bg-gray-50">
              Book a demo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
