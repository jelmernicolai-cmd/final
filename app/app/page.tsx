// app/app/page.tsx
"use client";

import Link from "next/link";

export default function PortalDashboard() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-xl md:text-2xl font-bold">GtN Portal — Overzicht</h1>
        <p className="text-sm text-gray-600">
          Upload je data, bekijk analyses en krijg directe optimalisatiesuggesties.
        </p>
      </header>

      {/* KPI placeholders (vullen na upload) */}
      <section className="grid sm:grid-cols-3 gap-4">
        {[
          { k: "TOTAL GROSS SALES", v: "—" },
          { k: "TOTAL GtN SPEND (€)", v: "—" },
          { k: "TOTAL GtN SPEND (%)", v: "—" },
        ].map((x) => (
          <div key={x.k} className="rounded-xl border bg-white p-5">
            <div className="text-xs text-gray-500">{x.k}</div>
            <div className="text-lg font-semibold">{x.v}</div>
          </div>
        ))}
      </section>

      {/* Kaarten naar analyses */}
      <section>
        <h2 className="text-base font-semibold mb-3">Analyses</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-white p-5">
            <h3 className="font-semibold">GtN Waterfall</h3>
            <p className="text-sm text-gray-600 mt-1">
              Van bruto naar netto: discounts, rebates en andere componenten inzichtelijk per kanaal en klanttype.
            </p>
            <div className="mt-4">
              <Link href="/app/waterfall" className="text-sm px-3 py-2 border rounded hover:bg-gray-50 inline-block">
                Open Waterfall
              </Link>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <h3 className="font-semibold">Consistency Tool</h3>
            <p className="text-sm text-gray-600 mt-1">
              Benchmark klant-incentives: identificeer outliers en stel beleid bij binnen bandbreedtes.
            </p>
            <div className="mt-4">
              <Link href="/app/consistency" className="text-sm px-3 py-2 border rounded hover:bg-gray-50 inline-block">
                Open Consistency
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Acties */}
      <section>
        <h2 className="text-base font-semibold mb-3">Acties</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/templates" className="px-3 py-2 border rounded text-sm hover:bg-gray-50">
            Download Excel-templates
          </Link>
          <Link href="/contact" className="px-3 py-2 border rounded text-sm hover:bg-gray-50">
            Plan een demo
          </Link>
        </div>
      </section>

      {/* Suggesties (placeholder) */}
      <section className="rounded-xl border bg-emerald-50 p-5">
        <h3 className="font-semibold">Automatische optimalisatiesuggesties</h3>
        <ul className="mt-3 list-disc pl-5 text-sm text-emerald-900 space-y-1">
          <li>Prioriteer SKU’s/klanten met hoogste GtN spend impact (p90+).</li>
          <li>Stel bandbreedtes voor kortingen per productgroep (min/max %) vast.</li>
          <li>Detecteer paralleldruk en pas land-specifieke prijzen/discounts gericht aan.</li>
        </ul>
      </section>
    </div>
  );
}
