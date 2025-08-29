import Link from 'next/link';

export const metadata = {
  title: 'Pricing',
  description: 'Simple license model: €2,500 per year per tenant.',
};

const plans = [
  { name: 'Starter', price: '€2,500/yr', features: ['GTN Waterfall', 'Consistency Analysis', 'Parallel Pressure Heatmap', 'Template upload + validation'] },
  { name: 'Pro', price: '€4,500/yr', features: ['Everything in Starter', 'Scenarios & simulations', 'Export (CSV/XLSX)', 'Email support SLA'] },
  { name: 'Enterprise', price: 'Contact us', features: ['SSO / IdP integration', 'Isolated data domain', 'Datalake export', 'Dedicated support'] },
];

export default function PricingEn() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Pricing</h1>
      <p className="text-gray-700 mt-2 max-w-3xl">
        One transparent annual fee. Includes updates, support and access to all analyses.
      </p>

      <div className="mt-8 grid md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div key={p.name} className="rounded border p-6">
            <div className="text-sm text-gray-500">{p.name}</div>
            <div className="text-2xl font-semibold mt-1">{p.price}</div>
            <ul className="text-sm mt-4 space-y-1 list-disc pl-5">
              {p.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <Link href="/en/contact" className="inline-block mt-6 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Request demo
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
