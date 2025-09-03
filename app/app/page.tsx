// app/app/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

export default function Portal() {
  const [active, setActive] = useState<"waterfall" | "consistency">("waterfall");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-12 gap-6">
      {/* Left task pane */}
      <aside className="col-span-12 md:col-span-3">
        <div className="sticky top-20 space-y-4">
          <div className="rounded-xl border bg-white">
            <div className="border-b px-4 py-3 font-semibold">Analyses</div>
            <nav className="p-2">
              <button
                onClick={() => setActive("waterfall")}
                className={`w-full text-left px-3 py-2 rounded hover:bg-gray-50 ${active === "waterfall" ? "bg-sky-50 text-sky-700" : ""}`}
              >
                GtN Waterfall
              </button>
              <button
                onClick={() => setActive("consistency")}
                className={`w-full text-left px-3 py-2 rounded hover:bg-gray-50 ${active === "consistency" ? "bg-sky-50 text-sky-700" : ""}`}
              >
                Consistency Tool
              </button>
            </nav>
          </div>

          <div className="rounded-xl border bg-white">
            <div className="border-b px-4 py-3 font-semibold">Acties</div>
            <div className="p-3 space-y-2 text-sm">
              <Link href="/templates" className="block px-3 py-2 rounded border hover:bg-gray-50">Download Excel-templates</Link>
              <Link href="/contact" className="block px-3 py-2 rounded border hover:bg-gray-50">Plan optimalisatiesessie</Link>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <section className="col-span-12 md:col-span-9 space-y-6">
        {active === "waterfall" ? <WaterfallPanel /> : <ConsistencyPanel />}
      </section>
    </div>
  );
}

function WaterfallPanel() {
  return (
    <div className="rounded-2xl border bg-white p-6">
      <h1 className="text-xl md:text-2xl font-bold">GtN Waterfall</h1>
      <p className="mt-2 text-gray-600">
        Upload je waterfall-dataset (Gross Sales → Net Sales) en krijg direct GtN-spend, verdeling per type incentive en top-klanten/SKU’s.
      </p>

      {/* KPIs */}
      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        {[
          { k: "TOTAL GtN SPEND (€)", v: "–" },
          { k: "TOTAL GtN SPEND (%)", v: "–" },
          { k: "TOTAL DISCOUNT / REBATE", v: "– / –" },
        ].map((x) => (
          <div key={x.k} className="rounded-xl border p-4">
            <div className="text-xs text-gray-500">{x.k}</div>
            <div className="text-lg font-semibold">{x.v}</div>
          </div>
        ))}
      </div>

      {/* Visual placeholder */}
      <div className="mt-6 rounded-xl border p-6 text-sm text-gray-500">
        Waterfall grafiek komt hier na upload. (Koppel aan jouw UploadAndAnalyze component zodra je data-pijplijn klaar is.)
      </div>

      {/* Suggesties */}
      <div className="mt-6 rounded-xl border bg-sky-50 p-5">
        <h3 className="font-semibold">Automatische optimalisatiesuggesties</h3>
        <ul className="mt-3 list-disc pl-5 text-sm text-sky-900">
          <li>Identificeer kanalen met negatieve marge-bijdrage & herzie kortingen.</li>
          <li>Stel drempelwaarden in voor volumekortingen per SKU.</li>
          <li>Zet alerts op voor afwijkingen t.o.v. beleid (> 1 p.p.).</li>
        </ul>
      </div>
    </div>
  );
}

function ConsistencyPanel() {
  return (
    <div className="rounded-2xl border bg-white p-6">
      <h1 className="text-xl md:text-2xl font-bold">Consistency Tool</h1>
      <p className="mt-2 text-gray-600">
        Benchmark totale incentives (%) per klant t.o.v. vergelijkbare klanten/SKU’s en voorkom ongewenste precedentwerking.
      </p>

      {/* KPIs */}
      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        {[
          { k: "TOTAL GROSS SALES", v: "–" },
          { k: "TOTAL INCENTIVES (€)", v: "–" },
          { k: "TOTAL INCENTIVES (%)", v: "–" },
        ].map((x) => (
          <div key={x.k} className="rounded-xl border p-4">
            <div className="text-xs text-gray-500">{x.k}</div>
            <div className="text-lg font-semibold">{x.v}</div>
          </div>
        ))}
      </div>

      {/* Visual placeholder */}
      <div className="mt-6 rounded-xl border p-6 text-sm text-gray-500">
        Consistency scatter/heatmap komt hier na upload. (Koppel aan jouw UploadAndAnalyze.)
      </div>

      {/* Suggesties */}
      <div className="mt-6 rounded-xl border bg-emerald-50 p-5">
        <h3 className="font-semibold">Automatische optimalisatiesuggesties</h3>
        <ul className="mt-3 list-disc pl-5 text-sm text-emerald-900">
          <li>Herijk incentives bij klanten > p95 van peers.</li>
          <li>Introduceer bandbreedtes per productgroep (min/max %).</li>
          <li>Detecteer paralleldruk en pas land-specifieke kortingen aan.</li>
        </ul>
      </div>
    </div>
  );
}
