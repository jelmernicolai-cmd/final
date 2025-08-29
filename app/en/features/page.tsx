export const metadata = {
  title: 'Features',
  description: 'GTN waterfall, consistency analysis, parallel pressure and more—for pharma.',
};

export default function FeaturesEn() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 space-y-10">
      <header>
        <h1 className="text-3xl font-semibold">Features</h1>
        <p className="text-gray-700 mt-2 max-w-3xl">
          Insights from your own data, automatically validated and translated into GTN steering.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div>
          <h2 className="font-semibold text-xl">GTN Waterfall</h2>
          <p className="text-gray-700 mt-2">From list price to net realization including discounts, bonuses and fees.</p>
          <img src="/images/waterfall.svg" alt="GTN waterfall" className="mt-4 rounded border" />
        </div>
        <div>
          <h2 className="font-semibold text-xl">Consistency Analysis</h2>
          <p className="text-gray-700 mt-2">Discount% vs. purchase value; detect outliers and harmonize policy.</p>
          <img src="/images/consistency-scatter.svg" alt="Consistency scatter" className="mt-4 rounded border" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div>
          <h2 className="font-semibold text-xl">Parallel Pressure</h2>
          <p className="text-gray-700 mt-2">Heatmap of portfolio cannibalization; steer discounts per product/account.</p>
          <img src="/images/heatmap.svg" alt="Parallel pressure heatmap" className="mt-4 rounded border" />
        </div>
        <div>
          <h2 className="font-semibold text-xl">Data Workflow</h2>
          <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-1">
            <li>Standard templates (CSV/XLSX) + validation</li>
            <li>Privacy by design (no PII required)</li>
            <li>Export to dashboard/report</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
