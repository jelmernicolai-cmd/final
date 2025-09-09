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
      const ext = (file.name.toLowerCase().split(".").pop() || "").trim();
      let rows: any[] = [];

      if (ext === "xlsx" || ext === "xls") {
        const XLSX: any = await import("xlsx");
        if (!XLSX?.read || !XLSX?.utils) {
          throw new Error("Excel parser kon niet worden geladen (xlsx).");
        }
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      } else if (ext === "csv") {
        const text = await file.text();
        rows = csvToJson(text);
      } else {
        throw new Error("Ondersteunde formaten: .xlsx, .xls of .csv");
      }

      const report = normalizeRows(rows);
      setResult({ report, all: report.preview });
      if (!report.ok) {
        setErr("Bestand verwerkt maar er ontbreken kernkolommen of alle rijen zijn ongeldig. Zie details hieronder.");
      }
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Upload mislukt");
    } finally {
      setBusy(false);
    }
  }

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
      return row as Row;
    });
  }

  function onSave() {
    if (!result?.report.ok) return;
    const rows = toRowShape(result.report.preview);
    saveWaterfallRows(rows);
    alert("Dataset opgeslagen. Open Waterfall of Consistency om de analyses te bekijken.");
  }

  function onReset() {
    setResult(null);
    setErr(null);
    setBusy(false);
    setDragOver(false);
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
            Deze masterfile voedt zowel de <b>Waterfall</b> als de <b>Consistency</b>-analyse. Eén dataset = consistente inzichten.
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

      {/* Dropzone */}
      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={[
          "rounded-2xl border-2 border-dashed p-6 bg-white text-center transition",
          dragOver ? "border-sky-500 bg-sky-50/50" : "border-gray-200",
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
        {err && (
          <div className="mt-3 inline-block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {err}
          </div>
        )}
      </section>

      {/* Nieuw: werkafspraak-tip */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-base font-semibold">Aanbevolen: samenstellen met Finance/Controller</h2>
        <ul className="list-disc pl-5 text-sm text-gray-700 mt-2 space-y-1">
          <li>
            Stem definities af: <i>Gross</i>, afzonderlijke <i>Discounts</i>, <i>Rebates</i>, en <i>Net</i> (formule: net = invoiced − rebates +
            incomes).
          </li>
          <li>Controleer periodes (YYYY-MM) en dat elk record één (SKU, klant, periode) is.</li>
          <li>Gebruik dezelfde bron als je P&L/BI om discussies te voorkomen.</li>
          <li>Laat ontbrekende velden op 0; de uploader rekent ontbrekende “Invoiced/Net” desnoods afgeleid uit.</li>
        </ul>
      </section>

      {/* Rapport */}
      {result && (
        <section className="rounded-2xl border bg-white p-4 space-y-3">
          <h2 className="text-lg font-semibold">Resultaat validatie</h2>
          <div className="rounded-lg border p-3 text-sm">
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

          {result.report.missing.length > 0 && (
            <div className="rounded-lg border p-3 text-sm text-amber-800 bg-amber-50 border-amber-200">
              Ontbrekende velden die we niet konden mappen: {result.report.missing.join(", ")}
            </div>
          )}

          {result.report.issues.length > 0 && (
            <div className="rounded-lg border p-3 text-sm text-amber-800 bg-amber-50 border-amber-200">
              <div className="font-medium">Geconstateerde issues (max 50)</div>
              <ul className="list-disc pl-5">
                {result.report.issues.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              className={`rounded-lg px-4 py-2 text-sm border ${
                result.report.ok ? "bg-sky-600 text-white hover:bg-sky-700" : "opacity-50 cursor-not-allowed"
              }`}
              disabled={!result.report.ok}
              onClick={onSave}
            >
              Opslaan als dataset
            </button>
            <button type="button" onClick={onReset} className="rounded-lg px-4 py-2 text-sm border hover:bg-gray-50">
              Reset
            </button>
          </div>
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
