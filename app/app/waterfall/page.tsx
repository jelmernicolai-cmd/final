// app/app/waterfall/page.tsx
"use client";

export default function WaterfallPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-8">
      <header>
        <h1 className="text-xl md:text-2xl font-bold">GtN Waterfall</h1>
        <p className="text-xs text-gray-500 mt-1">
          Overzicht bruto → netto per component. Vul data via de templates voor live visualisaties.
        </p>
      </header>

      {/* KPI’s */}
      <section className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">TOTAL GtN SPEND (€)</div>
          <div className="text-lg font-semibold">12.802.615</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">TOTAL GtN SPEND (%)</div>
          <div className="text-lg font-semibold">9,4%</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">TOTAL DISCOUNT (€)</div>
          <div className="text-lg font-semibold">9.482.502</div>
        </div>
      </section>

      {/* Layout: tabel + waterfall placeholder */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-5 overflow-auto">
          <h2 className="font-semibold">GROSS-TO-NET SPEND TABLE</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-3">GtN</th>
                <th className="py-2 pr-3">Level (€)</th>
                <th className="py-2">%</th>
              </tr>
            </thead>
            <tbody className="[&_td]:py-1">
              {[
                ["Gross Sales", "136.503.609", "100%"],
                ["Channel Discounts", "-2.243.087", "-1,6%"],
                ["Customer Discounts", "0", "0,0%"],
                ["Product Discounts", "0", "0,0%"],
                ["Volume Discounts", "0", "0,0%"],
                ["Value Discounts", "-7.239.415", "-5,3%"],
                ["Other Sales Discounts", "0", "0,0%"],
                ["Mandatory Discounts", "0", "0,0%"],
                ["Local Discount", "0", "0,0%"],
                ["Invoiced Sales", "127.021.107", "93,1%"],
                ["Direct Rebates", "-3.100.860", "-2,3%"],
                ["Prompt Payment Rebates", "0", "0,0%"],
                ["Indirect Rebates", "-219.253", "-0,2%"],
                ["Mandatory Rebates", "0", "0,0%"],
                ["Local Rebate", "0", ""],
                ["Royalty Income*", "0", "0,0%"],
                ["Other Income*", "0", "0,0%"],
                ["Net Sales", "123.700.994", "90,6%"],
              ].map((r) => (
                <tr key={r[0]} className="border-b last:border-0">
                  <td className="pr-3">{r[0]}</td>
                  <td className="pr-3">{r[1]}</td>
                  <td>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">GROSS-TO-NET WATERFALL OVERVIEW</h2>
          <div className="mt-4 h-72 border rounded grid place-items-center text-sm text-gray-500">
            Waterfall chart verschijnt hier na upload (Gross → Net).
          </div>

          <div className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border p-3">
              <div className="font-semibold mb-2">Customer — Highest 3</div>
              <div>Customer 1 — 5.262.914 (9,1%)</div>
              <div>Customer 2 — 3.713.988 (8,2%)</div>
              <div>Customer 3 — 2.221.958 (10,2%)</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="font-semibold mb-2">SKU — Highest 3</div>
              <div>Product 1 — 1.623.795 (8,8%)</div>
              <div>Product 2 — 1.305.108 (5,7%)</div>
              <div>Product 3 — 1.167.670 (5,3%)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Inputvelden info */}
      <section className="rounded-xl border bg-white p-5">
        <h3 className="font-semibold">Benodigde inputvelden</h3>
        <p className="text-sm text-gray-600 mt-2">
          Product Group Name, SKU Name, Customer Name (Sold-to), Fiscal year/period, 
          Sum of Gross Sales, Channel/Customer/Product/Volume/Value/Other/Mandatory/Local Discounts, 
          Sum of Invoiced Sales, Direct/Prompt/Indirect/Mandatory/Local Rebates, 
          Royalty/Other Income, Sum of Net Sales.
        </p>
      </section>

      {/* Suggesties */}
      <section className="rounded-xl border bg-emerald-50 p-5">
        <h3 className="font-semibold">Optimalisatiesuggesties</h3>
        <ul className="mt-3 list-disc pl-5 text-sm text-emerald-900 space-y-1">
          <li>Richt kortingen op kanalen waar waarde-lekkage het grootst is.</li>
          <li>Herijk “Value Discounts” met bandbreedtes per productgroep.</li>
          <li>Onderzoek rebates-strategie bij klanten met hoge GtN-impact.</li>
        </ul>
      </section>
    </div>
  );
}
