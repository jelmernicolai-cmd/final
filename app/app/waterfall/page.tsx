// app/app/waterfall/page.tsx
"use client";

import UploadAndAnalyze from "@/components/UploadAndAnalyze";

export default function WaterfallPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-8">
      <header>
        <h1 className="text-xl md:text-2xl font-bold">GtN Waterfall</h1>
        <p className="text-xs text-gray-500 mt-1">
          Overzicht bruto → netto per component. Upload de CSV-template voor live KPI’s & tabellen.
        </p>
      </header>

      <UploadAndAnalyze mode="waterfall" />

      {/* Waterfall chart placeholder */}
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">GROSS-TO-NET WATERFALL OVERVIEW</h2>
        <div className="mt-4 h-72 border rounded grid place-items-center text-sm text-gray-500">
          Waterfall chart verschijnt hier na upload (optionele grafiek-implementatie).
        </div>
      </section>

      {/* Inputvelden uitleg */}
      <section className="rounded-xl border bg-white p-5">
        <h3 className="font-semibold">Benodigde inputvelden</h3>
        <p className="text-sm text-gray-600 mt-2">
          Zie de CSV-template (downloadlink in de uploader) voor exacte kolomnamen.
        </p>
      </section>
    </div>
  );
}
