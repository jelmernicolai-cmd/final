"use client";

import { useState } from "react";

/** Modus van de tool */
export type Mode = "gtn" | "consistency";

type Props = {
  /** Kies de analysemodus: "gtn" of "consistency" */
  mode: Mode;
  /** Kop boven het uploadpaneel */
  title: string;
  /** Korte uitleg/ondertekst */
  helperText?: string;
  /** Optioneel: strictere validatie als default */
  defaultStrict?: boolean;
};

export default function UploadAndAnalyze({
  mode,
  title,
  helperText,
  defaultStrict = true,
}: Props) {
  const [strict, setStrict] = useState<boolean>(defaultStrict);

  return (
    <section className="p-6 md:p-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
        {helperText && <p className="text-sm text-gray-600">{helperText}</p>}
      </header>

      <div className="rounded-xl border p-4 md:p-5 bg-white space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={strict}
              onChange={(e) => setStrict(e.target.checked)}
              className="rounded border-gray-300"
            />
            Strikte kolom-validatie
          </label>

          <span className="ml-auto inline-flex items-center rounded-full border px-2 py-1 text-xs text-gray-600">
            Mode: {mode === "gtn" ? "GtN Waterfall" : "Consistency"}
          </span>
        </div>

        {/* ▼ Vervang dit blok later met jouw echte uploader & parser ▼ */}
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-gray-700">
            Upload hier je Excel/CSV volgens de template voor{" "}
            <strong>{mode === "gtn" ? "GtN Waterfall" : "Consistency"}</strong>.
          </p>
          <div className="mt-3">
            <input type="file" className="text-sm" />
          </div>
        </div>
        {/* ▲ Placeholder einde */}
      </div>
    </section>
  );
}
