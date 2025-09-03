// app/app/consistency/page.tsx
"use client";

import UploadAndAnalyze from "@/components/UploadAndAnalyze";

export default function Page() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">Consistency analysis</h1>
        <p className="text-xs text-gray-500 mt-1">
          Let op: dit rapport kan vertrouwelijke informatie bevatten.
        </p>
      </header>
      <UploadAndAnalyze mode="consistency" />
    </div>
  );
}
