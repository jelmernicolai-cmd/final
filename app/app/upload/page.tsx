"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { NormalizedRow } from "@/lib/upload-schema";
import { normalizeRows } from "@/lib/upload-schema";
import { saveWaterfallRows, eur0 } from "@/lib/waterfall-storage";
import type { Row } from "@/lib/waterfall-types";

type ParseResult = { report: ReturnType<typeof normalizeRows>; all: NormalizedRow[] };

export default function UploadPage() {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const ext = file.name.toLowerCase().split(".").pop();
      let rows: any[] = [];

      if (ext === "xlsx" || ext === "xls") {
        const XLSX = (await import("xlsx")).default;
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      } else if (ext === "csv") {
        const text = await file.text();
        rows = csvToJson(text);
      } else {
        throw new Error("Ondersteunde formaten: .xlsx of .csv");
      }

      const report = normalizeRows(rows);
      setResult({ report, all: report.preview });
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Upload mislukt");
    } finally {
      setBusy(false);
    }
  }

  /** Converteer NormalizedRow[] naar Row[] zonder aannames over extra velden */
  function toRowShape(input: NormalizedRow[]): Row[] {
    return input.map((r) => {
      const base = {
        period: r.period,
        cust: r.cust,
        pg: r.pg,
        sku: r.sku,
        gross: r.gross,
        d_channel: r.d_channel,
        d_customer: r.d_customer,
        d_product: r.d_product,
        d_volume: r.d_volume,
        d_other_sales: r.d_other_sales,
        d_mandatory: r.d_mandatory,
        d_local: r.d_local,
      } as any; // we forceren alleen de velden die je analyses gebruiken
      return base as Row;
    });
  }

  function onSave() {
    if (!result?.report.ok) return;
    const rows = toRowShape(result.report.preview);
    saveWaterfallRows(rows);
    alert("Dataset opgeslagen. Open Waterfall of Consistency om de analyses te bekijken.");
  }

  const totals = useMemo(() => {
    if (!result?.report.ok) return null;
    const r = result.report.preview;
    let gross = 0,
      disc = 0;
    for (const x of r) {
      gross += x.gross || 0;
      disc +=
        (x.d_channel || 0) +
        (x.d_customer || 0) +
        (x.d_product || 0) +
        (x.d_volume || 0) +
        (x.d_other_sales || 0) +
        (x.d_mandatory || 0) +
        (x.d_local || 0);
    }
    return { gross, disc, pct: gross ? (disc / gross) * 100 : 0 };
  }, [result]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Upload – Masterdataset</h1>
          <p className="text-gray-600 text-sm">
            Één bestand voedt Waterfall & Consistency. Ondersteund: Excel (.xlsx) of CSV.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/waterfall" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">
            Naar Waterfall
          </Link>
          <Link href="/app/consistency" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">
            Naar Consistency
          </Link>
        </div>
      </header>

      <section className="rounded-2xl border bg-white p-4">
        <label className="block text-sm font-medium">Kies bestand</label>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="mt-2 block w-full rounded border p-2 text-sm"
          onChange={(e) => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
          disabled={busy}
        />
        {busy && <div className="mt-2 text-sm text-gray-600">Bezig met verwerken…</div>}
        {err && <div className="mt-2 text-sm text-red-600">{err}</div>}
        <p className="mt-2 text-xs text-gray-500">
          Kolommen mogen andere benamingen hebben: we mappen synoniemen en repareren getalnotaties & periodes automatisch.
        </p>
      </section>

      {result && (
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Validatie & normalisatie</h2>

          <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border p-3">
              <div className="font-medium">Header-mapping</div>
              <ul className="mt-1 text-gray-700">
                {Object.entries(result.report.fixedHeaders).map(([orig, used]) => (
                  <li key={orig}>
                    <code className="text-xs">{orig}</code> → <b>{used}</b>
                  </li>
                ))}
              </ul>
              {result.report.missing.length > 0 && (
                <div className="mt-2 text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded">
                  Ontbrekend: {result.report.missing.join(", ")}
                </div>
              )}
            </div>

            <div className="rounded-xl border p-3">
              <div className="font-medium">Samenvatting</div>
              <div className="mt-1 text-gray-700">
                Rijen na normalisatie: <b>{result.report.rows}</b>
                <br />
                {totals && (
                  <>
                    Totaal Gross: <b>{eur0(totals.gross)}</b>
                    <br />
                    Totaal Discounts: <b>{eur0(totals.disc)}</b> ({totals.pct.toFixed(1)}%)
                  </>
                )}
              </div>
            </div>
          </div>

          {result.report.issues.length > 0 && (
            <div className="mt-3 rounded-xl border p-3 text-sm text-amber-800 bg-amber-50 border-amber-200">
              <div className="font-medium">Geconstateerde issues (eerste {result.report.issues.length})</div>
              <ul className="list-disc pl-5">
                {result.report.issues.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              className={`rounded-lg px-4 py-2 text-sm border ${
                result.report.ok ? "bg-sky-600 text-white hover:bg-sky-700" : "opacity-50 cursor-not-allowed"
              }`}
              disabled={!result.report.ok}
              onClick={onSave}
            >
              Opslaan als dataset
            </button>
            <Link href="/app/consistency" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">
              Naar Consistency
            </Link>
          </div>
        </section>
      )}

      {result?.report.ok && (
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Preview (eerste 10 rijen)</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-[720px] w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  {[
                    "period",
                    "cust",
                    "pg",
                    "sku",
                    "gross",
                    "d_channel",
                    "d_customer",
                    "d_product",
                    "d_volume",
                    "d_other_sales",
                    "d_mandatory",
                    "d_local",
                  ].map((h) => (
                    <th key={h} className="text-left p-1">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.report.preview.slice(0, 10).map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-1">{r.period}</td>
                    <td className="p-1">{r.cust}</td>
                    <td className="p-1">{r.pg}</td>
                    <td className="p-1">{r.sku}</td>
                    <td className="p-1">{Math.round(r.gross)}</td>
                    <td className="p-1">{Math.round(r.d_channel)}</td>
                    <td className="p-1">{Math.round(r.d_customer)}</td>
                    <td className="p-1">{Math.round(r.d_product)}</td>
                    <td className="p-1">{Math.round(r.d_volume)}</td>
                    <td className="p-1">{Math.round(r.d_other_sales)}</td>
                    <td className="p-1">{Math.round(r.d_mandatory)}</td>
                    <td className="p-1">{Math.round(r.d_local)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            “Value Discounts” worden samengevoegd met “Other Sales Discounts” in <code>d_other_sales</code>.
          </p>
        </section>
      )}
    </div>
  );
}

/** CSV helpers */
function csvToJson(text: string): any[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length > 0);
  if (!lines.length) return [];
  const headers = splitCSVLine(lines[0]);
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const obj: any = {};
    headers.forEach((h, idx) => (obj[h] = cols[idx] ?? ""));
    rows.push(obj);
  }
  return rows;
}
function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "",
    inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
