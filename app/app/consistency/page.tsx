// app/app/consistency/page.tsx
"use client";

export default function ConsistencyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-8">
      <header>
        <h1 className="text-xl md:text-2xl font-bold">Consistency analysis</h1>
        <p className="text-xs text-gray-500 mt-1">
          Please mind that this report contains confidential information.
        </p>
      </header>

      {/* KPI’s */}
      <section className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">TOTAL GROSS SALES</div>
          <div className="text-lg font-semibold">14.597.253</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">TOTAL INCENTIVES (€)</div>
          <div className="text-lg font-semibold">1.260.794</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">TOTAL INCENTIVES (%)</div>
          <div className="text-lg font-semibold">8,6%</div>
        </div>
      </section>

      {/* Tabel + grafiek placeholder */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-5 overflow-auto">
          <h2 className="font-semibold">
            CONSISTENCY OVERVIEW TABLE — top 15 customers (Total Incentive)
          </h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-3">Customer Name</th>
                <th className="py-2 pr-3">Gross Sales (€)</th>
                <th className="py-2">Total Incentive (€)</th>
                <th className="py-2">Total Incentive (%)</th>
              </tr>
            </thead>
            <tbody className="[&_td]:py-1">
              {[
                ["Customer A", "5.990.867", "520.003", "8,7%"],
                ["Customer B", "5.343.581", "441.176", "8,3%"],
                ["Customer C", "1.779.851", "156.548", "8,8%"],
                ["Customer D", "1.253.384", "101.998", "8,1%"],
                ["Customer E", "306.996", "25.432", "8,3%"],
                ["Customer F", "219.354", "13.156", "6,0%"],
              ].map((r) => (
                <tr key={r[0]} className="border-b last:border-0">
                  <td className="pr-3">{r[0]}</td>
                  <td className="pr-3">{r[1]}</td>
                  <td className="pr-3">{r[2]}</td>
                  <td>{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-xs text-gray-500 mt-3">
            TOTAL — 14.597.253 | 1.260.794 | 8,6%
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Sales & price evolution</h2>
          <div className="mt-4 h-72 border rounded grid place-items-center text-sm text-gray-500">
            Scatter/line chart verschijnt hier na upload.
          </div>
        </div>
      </section>

      {/* Inputvelden */}
      <section className="rounded-xl border bg-white p-5">
        <h3 className="font-semibold">Benodigde inputvelden</h3>
        <p className="text-sm text-gray-600 mt-2">
          Product Group Name, Customer Name (Sold-to), Fiscal year/period, SKU Name, 
          Sum of Gross Sales, Sum of Invoiced Sales, Sum of Net Sales, Sum of Total GtN Spend.
        </p>
      </section>

      {/* Suggesties */}
      <section className="rounded-xl border bg-emerald-50 p-5">
        <h3 className="font-semibold">Optimalisatiesuggesties</h3>
        <ul className="mt-3 list-disc pl-5 text-sm text-emerald-900 space-y-1">
          <li>Breng outliers (hoog % incentive) terug naar peer-bandbreedte.</li>
          <li>Introduceer staffels: incentive % daalt bij volumestijging.</li>
          <li>Combineer productmix en nettoprijs om margedoelen te borgen.</li>
        </ul>
      </section>
    </div>
  );
}
