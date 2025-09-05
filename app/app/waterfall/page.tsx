// app/app/waterfall/page.tsx
"use client";
import UploadAndAnalyze from "@/components/UploadAndAnalyze";

export default function WaterfallLanding() {
  return (
    <div className="rounded-2xl border bg-white p-6">
      <h1 className="text-xl font-semibold">Waterfall</h1>
      <p className="text-sm text-gray-600 mt-1">Trickle-down, kanaalbijdragen en impact per component.</p>
      <div className="mt-6 rounded-lg border-dashed border-2 p-8 text-center text-sm text-gray-500">
        Upload een dataset via het dashboard om je eerste Waterfall te draaien.
      </div>
    </div>
  );
}
