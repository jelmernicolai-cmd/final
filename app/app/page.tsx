import Link from 'next/link';

export const metadata = {
  title: 'Portal',
  description: 'PharmaGtN Portal dashboard',
};

export default async function AppHome() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Welkom in de GtN Portal</h1>
            <p className="text-sm text-gray-600">
              Upload je Excel en open je analyses. Data blijft lokaal in de browser (client-side parsing).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/app/consistency/upload" className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 text-sm">
              Upload/Replace Excel
            </Link>
            <Link href="/app/consistency" className="rounded-lg border px-4 py-2 hover:bg-gray-50 text-sm">
              Naar Consistency Hub
            </Link>
          </div>
        </div>
      </div>

      {/* Kaarten */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Waterfall */}
        <div className="rounded-2xl border bg-white p-6 flex flex-col">
          <div className="font-semibold">Waterfall</div>
          <p className="text-sm text-gray-600 mt-1 flex-1">
            Bekijk Gross→Net, totale kortingen & rebates, en top-drivers per klant/SKU. Inclusief KPI’s en waterfall-grafiek.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/app/waterfall/analyze"
              className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
            >
              Open Waterfall
            </Link>
            <Link
              href="/app/consistency/upload"
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2 hover:bg-gray-50 text-sm"
            >
              Upload/Replace Excel
            </Link>
          </div>
        </div>

        {/* Consistency */}
        <div className="rounded-2xl border bg-white p-6 flex flex-col">
          <div className="font-semibold">Consistency</div>
          <p className="text-sm text-gray-600 mt-1 flex-1">
            Toets per klant of discount% in lijn is met omzet-aandeel. Vind outliers, zie trend & heatmap, en krijg concrete acties.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/app/consistency"
              className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
            >
              Open Consistency Hub
            </Link>
            <Link
              href="/app/consistency/customers"
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2 hover:bg-gray-50 text-sm"
            >
              Customers-analyse
            </Link>
            <Link
              href="/app/consistency/trend"
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2 hover:bg-gray-50 text-sm"
            >
              Trend & Heatmap
            </Link>
          </div>
        </div>
      </div>

      {/* Info blok */}
      <div className="rounded-2xl border bg-white p-6">
        <div className="font-medium mb-1">Template & privacy</div>
        <p className="text-sm text-gray-600">
          Gebruik de standaard Excel-template (eerste tabblad). Parsing gebeurt volledig in je browser; er wordt niets naar de server geüpload.
        </p>
      </div>
    </div>
  );
}
