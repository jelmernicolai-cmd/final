// app/app/consistency/page.tsx
"use client";

import UploadAndAnalyze from "@/components/UploadAndAnalyze";

export default function ConsistencyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-8">
      <header>
        <h1 className="text-xl md:text-2xl font-bold">Consistency analysis</h1>
        <p className="text-xs text-gray-500 mt-1">
          Vertrouwelijk. Upload de CSV-template voor top-15 klanten en % incentives.
        </p>
      </header>

      <UploadAndAnalyze mode="consistency" />

      {/* Grafiek placeholder */}
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Sales & price evolution</h2>
        <div className="mt-4 h-72 border rounded grid place-items-center text-sm text-gray-500">
          Scatter/line chart (optioneel) verschijnt hier na upload.
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="font-semibold">Benodigde inputvelden</h3>
        <p className="text-sm text-gray-600 mt-2">
          Zie de CSV-template (downloadlink in de uploader) voor exacte kolomnamen.
        </p>
      </section>
    </div>
  );
}
