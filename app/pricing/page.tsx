import Link from 'next/link';

export const metadata = {
  title: 'Prijzen',
  description: 'Eenvoudig licentiemodel: €2.500 per jaar per tenant.',
};

const plans = [
  { name: 'Starter', price: '€2.500/jaar', features: ['GTN-waterfall', 'Consistentie-analyse', 'Paralleldruk heatmap', 'Template upload + validatie'] },
  { name: 'Pro', price: '€4.500/jaar', features: ['Alles uit Starter', 'Scenario’s & simulaties', 'Export (CSV/XLSX)', 'E-mail support SLA'] },
  { name: 'Enterprise', price: 'Op aanvraag', features: ['SSO / IdP integratie', 'Eigen datadomein', 'Datalake export', 'Dedicated support'] },
];

export default function Pricing() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Prijzen</h1>
      <p className="text-gray-700 mt-2 max-w-3xl">
        Eén transparant tarief per jaar. Inclusief updates, support en toegang tot alle analyses.
      </p>

      <div className="mt-8 grid md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div key={p.name} className="rounded border p-6">
            <div className="text-sm text-gray-500">{p.name}</div>
            <div className="text-2xl font-semibold mt-1">{p.price}</div>
            <ul className="text-sm mt-4 space-y-1 list-disc pl-5">
              {p.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <Link href="/contact" className="inline-block mt-6 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Vraag demo aan
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
