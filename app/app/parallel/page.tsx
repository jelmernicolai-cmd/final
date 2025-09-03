"use client";

import UploadAndAnalyze from "@/components/UploadAndAnalyze";

export default function ParallelPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">Parallel Pressure Analyse</h1>
        <p className="text-xs text-gray-500 mt-1">
          Upload je parallel-template en krijg direct een samenvatting. (Placeholder — breiden we later uit.)
        </p>
      </header>

      <UploadAndAnalyze mode="parallel" />

      <section className="rounded border p-4 bg-gray-50">
        <h2 className="font-semibold">Benodigde kolommen (voorbeeld)</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
          <li>Product Group Name</li>
          <li>SKU Name</li>
          <li>Country / Market</li>
          <li>Sum of Net Sales</li>
          <li>Sum of Invoiced Sales</li>
          <li>Avg Net Price</li>
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          Tip: zorg dat de header-namen exact overeenkomen (wij trimmen wel spaties).
        </p>
      </section>
    </div>
  );
}
