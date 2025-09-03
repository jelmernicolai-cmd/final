// app/app/waterfall/page.tsx
"use client";
import UploadAndAnalyze from "@/components/UploadAndAnalyze";

export default function Page() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">GtN Waterfall</h1>
        <p className="text-xs text-gray-500 mt-1">
          Upload je template en krijg direct een samenvatting van kortingen en rebates.
        </p>
      </header>
      <UploadAndAnalyze mode="waterfall" />
    </div>
  );
}
