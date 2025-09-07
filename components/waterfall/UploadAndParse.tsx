// components/waterfall/UploadAndParse.tsx
"use client";

import Link from "next/link";

export default function UploadAndParse() {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="text-sm">
          <b>Upload verhuisd</b> — Je kunt je masterbestand nu centraal uploaden via <code>/app/upload</code>.
        </div>
        <div className="sm:ml-auto">
          <Link
            href="/app/upload"
            className="inline-flex items-center rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Ga naar Upload →
          </Link>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Waterfall en Consistency gebruiken automatisch dezelfde dataset na upload.
      </p>
    </div>
  );
}
