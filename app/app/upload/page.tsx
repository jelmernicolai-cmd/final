"use client";

import React, { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import type { NormalizedRow } from "@/lib/upload-schema";
import { normalizeRows } from "@/lib/upload-schema";
import { saveWaterfallRows, eur0 } from "@/lib/waterfall-storage";
import type { Row } from "@/lib/waterfall-types";

type ParseResult = { report: ReturnType<typeof normalizeRows>; all: NormalizedRow[] };

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  }, []);

  const handleBrowse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
  };

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
      if (!report.ok) setErr("Bestand verwerkt maar er ontbreken kernkolommen of alle rijen zijn ongeldig. Zie details hieronder.");
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Upload mislukt");
    } finally {
      setBusy(false);
    }
  }

  // Zet NormalizedRow → Row (alle velden die in jouw Row-type voorkomen)
  function toRowShape(input: NormalizedRow[]): Row[] {
    return input.map((r) => {
      const row: any = {
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
        invoiced: r.invoiced,
        r_direct: r.r_direct,
        r_prompt: r.r_prompt,
        r_indirect: r.r_indirect,
        r_mandatory: r.r_mandatory,
        r_local: r.r_local,
        net: r.net,
      };
      // Royalties/Other income niet meegeven als Row-type die velden niet kent
      return row as Row;
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
    let gross = 0, disc = 0;
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
          <p className="text-gray-600 text-sm">Één bestand voedt Waterfall & Consistency. Ondersteund: Excel (.xlsx) of CSV.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/waterfall" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Naar Waterfall</Link>
          <Link href="/app/consistency" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Naar Consistency</Link>
        </div>
      </header>

      {/* Dropzone */}
      <section
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={[
          "rounded-2xl border-2 border-dashed p-6 bg-white text-center transition",
          dragOver ? "border-sky-500 bg-sky-50/50" : "border-gray-200"
        ].join(" ")}
      >
        <div className="text-sm text-gray-700">Sleep je Excel/CSV hierheen of</div>
        <label className="mt-2 inline-flex items-center gap-2 rounded-lg bg-sky-600 text-white text-sm px-4 py-2 hover:bg-sky-700 cursor-pointer">
          Bestand kiezen
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleBrowse} disabled={busy} />
        </label>
        <p className="mt-2 text-xs text-gray-500">
          Headers mogen variëren; we herkennen synoniemen en repareren decimale komma’s en periodes automatisch.
        </p>
        {busy && <div className="mt-2 text-sm text-gray-600">Bezig met verwerken…</div>}
        {err && <div className="mt-3 inline-block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{err}</div>}
      </section>

      {/* Rapport */}
      {result && (
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Validatie & normalisatie</h2>

          <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border p-3">
              <div className="font-medium">Header-mapping</div>
              <ul className="mt-1 text-gray-700 space-y-1">
                {Object.entries(result.report.fixedHeaders).map(([orig, used]) => (
                  <li key={orig}><code className="text-xs">{orig}</code> → <b>{used}</b></li>
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
                Rijen na normalisatie: <b>{result.report.rows}</b><br/>
                {totals && (
                  <>
                    Totaal Gross: <b>{eur0(totals.gross)}</b><br/>
                    Totaal Discounts: <b>{eur0(totals.disc)}</b> ({totals.pct.toFixed(1)}%)
                  </>
                )}
              </div>
            </div>
          </div>

          {result.report.issues.length > 0 && (
            <div className="mt-3 rounded-xl border p-3 text-sm text-amber-800 bg-amber-50 border-amber-200">
              <div className="font-medium">Geconstateerde issues (max 50 getoond)</div>
              <ul className="list-disc pl-5">
                {result.report.issues.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              className={`rounded-lg px-4 py-2 text-sm border ${result.report.ok ? "bg-sky-600 text-white hover:bg-sky-700" : "opacity-50 cursor-not-allowed"}`}
              disabled={!result.report.ok}
              onClick={onSave}
            >
              Opslaan als dataset
            </button>
            <Link href="/app/consistency" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Naar Consistency</Link>
          </div>
        </section>
      )}

      {/* Preview */}
      {result?.report.ok && (
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Preview (eerste 10 rijen)</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-[920px] w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  {["period","cust","pg","sku","gross","invoiced","net","d_channel","d_customer","d_product","d_volume","d_other_sales","d_mandatory","d_local","r_direct","r_prompt","r_indirect","r_mandatory","r_local"]
                    .map(h => <th key={h} className="text-left p-1">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {result.report.preview.slice(0,10).map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-1">{r.period}</td>
                    <td className="p-1">{r.cust}</td>
                    <td className="p-1">{r.pg}</td>
                    <td className="p-1">{r.sku}</td>
                    <td className="p-1">{Math.round(r.gross)}</td>
                    <td className="p-1">{Math.round(r.invoiced)}</td>
                    <td className="p-1">{Math.round(r.net)}</td>
                    <td className="p-1">{Math.round(r.d_channel)}</td>
                    <td className="p-1">{Math.round(r.d_customer)}</td>
                    <td className="p-1">{Math.round(r.d_product)}</td>
                    <td className="p-1">{Math.round(r.d_volume)}</td>
                    <td className="p-1">{Math.round(r.d_other_sales)}</td>
                    <td className="p-1">{Math.round(r.d_mandatory)}</td>
                    <td className="p-1">{Math.round(r.d_local)}</td>
                    <td className="p-1">{Math.round(r.r_direct)}</td>
                    <td className="p-1">{Math.round(r.r_prompt)}</td>
                    <td className="p-1">{Math.round(r.r_indirect)}</td>
                    <td className="p-1">{Math.round(r.r_mandatory)}</td>
                    <td className="p-1">{Math.round(r.r_local)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Ontbreekt “Invoiced” of “Net” in je bron? We berekenen: <code>invoiced = gross − discounts</code>, <code>net = invoiced − rebates + incomes</code>.
          </p>
        </section>
      )}
    </div>
  );
}

/** CSV helpers */
function csvToJson(text: string): any[] {
  const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim().length > 0);
  if (!lines.length) return [];
  const headers = splitCSVLine(lines[0]);
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const obj: any = {};
    headers.forEach((h, idx) => obj[h] = cols[idx] ?? "");
    rows.push(obj);
  }
  return rows;
}
function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i+1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      out.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
