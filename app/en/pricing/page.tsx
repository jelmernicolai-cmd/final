import Link from 'next/link';

export const metadata = {
  title: 'Pricing',
  description: 'Simple license model: €2,500 per year per tenant.',
};

export default function PricingEn() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Pricing</h1>
      <p className="text-gray-700 mt-2 max-w-3xl">
        One transparent annual fee. Includes updates, support and access to all analyses.
      </p>

      <div className="mt-8 grid md:grid-cols-3 gap-6">
        <div className="rounded border p-6">
          <h3 className="font-semibold text-xl">PharmaGtN License</h3>
          <p className="text-gray-700 mt-2">€2,500 / year</p>
          <ul className="text-sm mt-4 space-y-1 list-disc pl-5">
            <li>GTN Waterfall</li>
            <li>Consistency Analysis</li>
            <li>Parallel Pressure Heatmap</li>
            <li>Template upload + validation</li>
          </ul>
          <Link href="/en/contact" className="inline-block mt-6 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Request demo
          </Link>
        </div>
      </div>
    </section>
  );
}
