// app/en/features/page.tsx
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Features | PharmaGtN",
  description:
    "PharmaGtN tools for manufacturers: GTN waterfall, discount consistency, parallel pressure and self-service uploads with validation.",
};

export default function FeaturesEN() {
  return (
    <>
      <section className="bg-gradient-to-b from-sky-50 to-white border-b">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold">Features</h1>
            <p className="mt-4 text-gray-700">
              The <strong>GtN Portal</strong> consolidates pricing & discounts across channels.
              Upload our Excel templates, get instant dashboards and export decision-ready decks.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/pricing" className="bg-sky-600 text-white px-5 py-3 rounded-lg hover:bg-sky-700">
                View licence (€2,500/yr)
              </Link>
              <Link href="/app" className="px-5 py-3 rounded-lg border hover:bg-gray-50">
                Open GtN Portal
              </Link>
            </div>
          </div>
          <div>
            <Image
              src="/images/feature-hero.png"
              alt="GtN Portal overview"
              width={1200}
              height={800}
              className="w-full rounded-xl border shadow-sm"
              priority
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-bold">Core tools</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {[
            { t: "GTN waterfall", d: "Brutto to netto per channel and segment. Reveal margin leakage and renegotiate with facts.", img: "/images/feat-waterfall.png" },
            { t: "Consistency analysis", d: "Plot discount% vs. purchase value. Remove outliers and avoid precedent issues.", img: "/images/feat-scatter.png" },
            { t: "Parallel pressure", d: "Spot SKUs with cross-country pressure and rebalance the discount mix.", img: "/images/feat-heatmap.png" },
          ].map((c) => (
            <div key={c.t} className="rounded-xl border p-5 hover:shadow-sm transition">
              <Image src={c.img} alt={c.t} width={800} height={500} className="w-full rounded-lg border" />
              <h3 className="mt-4 font-semibold">{c.t}</h3>
              <p className="mt-2 text-sm text-gray-600">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 border-y">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold">Workflow</h2>
          <div className="mt-8 grid md:grid-cols-4 gap-6">
            {[
              { n: "1", h: "Upload", p: "Use our Excel templates: product, customer, volume, gross/net price, discount/bonus/fees, period." },
              { n: "2", h: "Validate", p: "Schema checks, missing fields, duplicates and outliers." },
              { n: "3", h: "Analyse", p: "Dashboards, KPIs and what-if scenarios on discount mix and net price." },
              { n: "4", h: "Act", p: "Export slides and decision rules. Optional BI/ERP integration." },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border bg-white p-5">
                <div className="text-sm text-gray-500">Step {s.n}</div>
                <h3 className="mt-2 font-semibold">{s.h}</h3>
                <p className="mt-2 text-sm text-gray-700">{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <div className="rounded-2xl border bg-white p-8 md:p-10">
          <h2 className="text-2xl md:text-3xl font-bold">Start with the GtN Portal</h2>
          <p className="mt-3 text-gray-700">
            Self-service, measurable ROI and a consistent, governable discount policy.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link href="/pricing" className="bg-sky-600 text-white px-5 py-3 rounded-lg hover:bg-sky-700">
              Buy licence
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
