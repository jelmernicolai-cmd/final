// app/app/consistency/page.tsx
'use client';

export default function ConsistencyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <header>
        <h1 className="text-xl md:text-2xl font-bold">Consistency analysis</h1>
        <p className="text-xs text-gray-500 mt-1">
          Please mind that this report contains confidential information.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { k: 'TOTAL GROSS SALES', v: '–' },
          { k: 'TOTAL INCENTIVES (€)', v: '–' },
          { k: 'TOTAL INCENTIVES (%)', v: '–' },
        ].map((x) => (
          <div key={x.k} className="rounded-xl border p-4 bg-white">
            <div className="text-xs text-gray-500">{x.k}</div>
            <div className="text-lg font-semibold">{x.v}</div>
          </div>
        ))}
      </div>

      {/* Table placeholder */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="font-semibold">Top customers by Total Incentive</h2>
        <p className="text-sm text-gray-600 mt-2">
          Upload data om de tabel te vullen (Customer, Gross Sales, Total Incentive, %).
        </p>
      </div>

      {/* Chart placeholder */}
      <div className="rounded-xl border bg-white p-6 text-sm text-gray-500">
        Scatter/heatmap komt hier na upload. (Koppel straks aan je upload/parse component.)
      </div>

      {/* Suggesties */}
      <div className="rounded-xl border bg-emerald-50 p-5">
        <h3 className="font-semibold">Automatische optimalisatiesuggesties</h3>
        <ul className="mt-3 list-disc pl-5 text-sm text-emerald-900">
          <li>Herijk incentives bij klanten &gt; p95 van peers.</li>
          <li>Introduceer bandbreedtes per productgroep (min/max %).</li>
          <li>Detecteer paralleldruk en pas land-specifieke kortingen aan.</li>
        </ul>
      </div>
    </div>
  );
}
