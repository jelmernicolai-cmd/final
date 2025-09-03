// components/UploadAndAnalyze.tsx
"use client";

import { useState } from "react";
import { parse } from "csv-parse/browser/esm/sync";
import * as XLSX from "xlsx";

export type Mode = "waterfall" | "consistency";

function fmtEUR(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
}

export default function UploadAndAnalyze({ mode }: { mode: Mode }) {
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(f: File) {
    setError(null);
    setSummary(null);
    setFileName(f.name);
    setLoading(true);
    try {
      const buf = await f.arrayBuffer();
      let rows: any[] = [];

      if (f.name.endsWith(".csv")) {
        const text = new TextDecoder().decode(new Uint8Array(buf));
        rows = parse(text, { columns: true, skip_empty_lines: true });
      } else {
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws);
      }

      // mini “analyse” placeholders
      if (mode === "waterfall") {
        const gross = rows.reduce((a, r) => a + (Number(r[" Sum of Gross Sales "]) || 0), 0);
        const disc =
          (Number(
            rows.reduce(
              (a, r) =>
                a +
                (Number(r[" Sum of Channel Discounts "]) || 0) +
                (Number(r[" Sum of Value Discounts "]) || 0) +
                (Number(r[" Sum of Customer Discounts "]) || 0) +
                (Number(r[" Sum of Product Discounts "]) || 0) +
                (Number(r[" Sum of Volume Discounts "]) || 0) +
                (Number(r[" Sum of Other Sales Discounts "]) || 0) +
                (Number(r[" Sum of Mandatory Discounts "]) || 0) +
                (Number(r[" Sum of Discount Local "]) || 0),
              0
            )
          ) || 0);
        const rebates =
          (Number(
            rows.reduce(
              (a, r) =>
                a +
                (Number(r[" Sum of Direct Rebates "]) || 0) +
                (Number(r[" Sum of Prompt Payment Rebates "]) || 0) +
                (Number(r[" Sum of Indirect Rebates "]) || 0) +
                (Number(r[" Sum of Mandatory Rebates "]) || 0) +
                (Number(r[" Sum of Rebate Local "]) || 0),
              0
            )
          ) || 0);

        setSummary({
          title: "Gross-to-Net Waterfall (samenvatting)",
          metrics: [
            `Total Gross Sales: ${fmtEUR(gross)}`,
            `Total Discounts: ${fmtEUR(disc)}`,
            `Total Rebates: ${fmtEUR(rebates)}`
          ]
        });
      } else {
        const gross = rows.reduce((a, r) => a + (Number(r[" Sum of Gross Sales "]) || 0), 0);
        const gtn = rows.reduce((a, r) => a + (Number(r[" Sum of Total GtN Spend "]) || 0), 0);
        const pct = gross ? (gtn / gross) * 100 : 0;
        setSummary({
          title: "Consistency (samenvatting)",
          metrics: [
            `Total Gross Sales: ${fmtEUR(gross)}`,
            `Total GTN Spend: ${fmtEUR(gtn)} (${pct.toFixed(1)}%)`
          ]
        });
      }
    } catch (e: any) {
      setError(e?.message || "Kon bestand niet verwerken");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm text-gray-700">
          Upload {mode === "waterfall" ? "Waterfall-template" : "Consistency-template"} (.xlsx of .csv)
        </span>
        <input
          type="file"
          accept=".xlsx,.csv"
          className="mt-1 block w-full rounded border p-2"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </label>

      {fileName && <p className="text-xs text-gray-500">Bestand: {fileName}</p>}
      {loading && <p className="text-sm">Bezig met verwerken…</p>}
      {error && <p className="text-sm text-red-600">Fout: {error}</p>}

      {summary && (
        <div className="rounded border p-4 bg-gray-50">
          <h3 className="font-semibold">{summary.title}</h3>
          <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
            {summary.metrics.map((m: string) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
