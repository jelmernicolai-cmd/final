"use client";

import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";
// @ts-expect-error types optional
import * as pdfjsLib from "pdfjs-dist";
// @ts-expect-error worker path (pdfjs 4.x)
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

type AipRow = {
  sku?: string;
  name?: string;
  zi?: string;
  reg: string;     // genormaliseerd REGNR
  pack: number;    // integer > 0
  aip?: number;    // huidige AIP
};

type ScUnitRow = {
  reg: string;           // genormaliseerd REGNR
  unit_price_eur: number;
  valid_from?: string;
};

type DiffRow = {
  reg: string;
  sku?: string;
  name?: string;
  zi?: string;
  pack: number | null;
  aip_current: number | null;
  unit_price_eur: number | null;
  aip_suggested: number | null;
  diff_eur: number | null;
  diff_pct: number | null;
  update: boolean;
  note?: string;
};

function normReg(v: any) {
  return String(v ?? "").toUpperCase().replace(/[.\s]/g, "").trim();
}
function toNumEU(v: any, fallback = NaN) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v ?? "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "")
    .trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}

function toAipRow(o: Record<string, any>): AipRow {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (o[k] !== undefined && o[k] !== null && String(o[k]).trim() !== "") return o[k];
      const kk = Object.keys(o).find(
        (x) => x.toLowerCase().replace(/\s|\./g, "") === k.toLowerCase().replace(/\s|\./g, "")
      );
      if (kk) return o[kk];
    }
    return "";
  };
  const str = (v: any) => String(v ?? "").trim();
  const num = (v: any, fb = NaN) => toNumEU(v, fb);
  return {
    sku: str(pick("sku", "productcode")),
    name: str(pick("product", "productnaam", "product naam", "naam")),
    zi: str(pick("zi", "zi-nummer", "zinummer")),
    reg: normReg(pick("reg", "registratienummer", "rvg", "rvgnr", "regnr", "reg.nr", "rvg nr", "rvg_nr")),
    pack: Math.max(0, Math.round(num(pick("pack", "verpakking", "standaard verpakk. grootte", "standaard verpakking"), 0))),
    aip: num(pick("aip", "lijstprijs", "apotheekinkoopprijs"), NaN),
  };
}
function toScUnitRow(o: Record<string, any>): ScUnitRow {
  const lower: Record<string, any> = {};
  for (const [k, v] of Object.entries(o)) lower[String(k).toLowerCase()] = v;
  const reg =
    lower["reg"] ?? lower["regnr"] ?? lower["registratienummer"] ?? lower["rvg"] ?? lower["rvg_nr"] ?? lower["rvg nr"] ?? "";
  const unit =
    lower["unit_price_eur"] ??
    lower["eenheidsprijs"] ??
    lower["unitprice"] ??
    lower["prijs_per_eenheid"] ??
    lower["eenheidsprijs(€)"] ??
    lower["eenheidsprijs (€)"] ??
    lower["eenheidsprijs eur"] ??
    "";
  const valid_from = String(lower["valid_from"] ?? lower["geldig_vanaf"] ?? lower["ingangsdatum"] ?? "").trim();
  return {
    reg: normReg(reg),
    unit_price_eur: toNumEU(unit, NaN),
    valid_from,
  };
}

async function readSheetToJson(file: File): Promise<any[]> {
  const ext = (file.name.toLowerCase().split(".").pop() || "").trim();
  if (ext === "xlsx" || ext === "xls") {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: "" });
  }
  if (ext === "csv") {
    const txt = await file.text();
    const wb = XLSX.read(txt, { type: "string" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: "" });
  }
  throw new Error("Ondersteund: .xlsx, .xls, .csv");
}

/** ---- PDF parsing in de browser (pdfjs-dist) ---- */
async function extractTextFromPdf(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buf });
  const pdf = await loadingTask.promise;
  let out = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const text = content.items.map((it: any) => it.str || "").join(" ");
    out += text + "\n";
  }
  return out;
}

// Minimalistische SC-parser: pak per productgroep de prijsregel en koppel aan REGNR’s in die groep
function parseScUnitsFromText(text: string): ScUnitRow[] {
  const blocks = text.split(/Productgroep Maximumprijs/i);
  const priceLineRe = /([\d.,]+)\s*per\s+([A-Za-z]+)/i;
  const regLineRe = /\b([A-Z0-9/\.]+(?:\/\/[A-Z0-9/\.]+)?)\b/g;

  const rows: ScUnitRow[] = [];
  for (const raw of blocks) {
    const lines = raw.split(/\n| {2,}/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    // prijs in de kop zoeken (eerste ~10 regels)
    let price: number | null = null;
    for (const ln of lines.slice(0, 15)) {
      const m = priceLineRe.exec(ln);
      if (m) {
        const val = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
        if (Number.isFinite(val)) { price = val; break; }
      }
    }
    if (!Number.isFinite(price as number)) continue;

    // registraties zoeken: alles wat lijkt op REGNR tokens
    for (const ln of lines) {
      if (/Registratienummer\s+Artikelnaam/i.test(ln)) continue;
      let m;
      while ((m = regLineRe.exec(ln)) !== null) {
        const reg = normReg(m[1]);
        if (reg) rows.push({ reg, unit_price_eur: price! });
      }
    }
  }
  // de PDF kan duplicaten opleveren → de laatste wint
  const dedup = new Map<string, ScUnitRow>();
  for (const r of rows) dedup.set(r.reg, r);
  return [...dedup.values()];
}

function downloadXlsx(filename: string, rows: any[], sheet = "Sheet1") {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith(".xlsx") ? filename : filename + ".xlsx";
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function WgpCompareLite() {
  const [aip, setAip] = useState<AipRow[]>([]);
  const [scRows, setScRows] = useState<ScUnitRow[]>([]);
  const [diffs, setDiffs] = useState<DiffRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [thresholdPct, setThresholdPct] = useState<number>(0.001); // 0.1%

  async function onUploadAip(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.currentTarget.value = "";
    if (!f) return;
    setErr(null); setBusy(true);
    try {
      const json = await readSheetToJson(f);
      const rows = json.map(toAipRow).filter(r => r.reg && r.pack > 0);
      setAip(rows);
    } catch (e:any) {
      setErr(e?.message || "AIP kon niet worden gelezen.");
    } finally {
      setBusy(false);
    }
  }

  async function onUploadScExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.currentTarget.value = "";
    if (!f) return;
    setErr(null); setBusy(true);
    try {
      const json = await readSheetToJson(f);
      const rows = json.map(toScUnitRow).filter(r => r.reg && Number.isFinite(r.unit_price_eur));
      setScRows(rows);
    } catch (e:any) {
      setErr(e?.message || "SC (Excel/CSV) kon niet worden gelezen.");
    } finally {
      setBusy(false);
    }
  }

  async function onUploadScPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.currentTarget.value = "";
    if (!f) return;
    setErr(null); setBusy(true);
    try {
      const text = await extractTextFromPdf(f);
      const rows = parseScUnitsFromText(text);
      setScRows(rows);
    } catch (e:any) {
      setErr(e?.message || "SC (PDF) kon niet worden gelezen.");
    } finally {
      setBusy(false);
    }
  }

  function runCompare() {
    const map = new Map(scRows.map(r => [r.reg, r.unit_price_eur]));
    const out: DiffRow[] = aip.map(r => {
      const unit = map.get(r.reg) ?? null;
      const pack = Number.isFinite(r.pack) && r.pack > 0 ? r.pack : null;
      const current = Number.isFinite(r.aip as number) ? (r.aip as number) : null;
      const suggested = unit !== null && pack !== null ? +(unit * pack).toFixed(4) : null;

      let diff_eur: number | null = null;
      let diff_pct: number | null = null;
      let update = false;
      let note: string | undefined;

      if (current !== null && suggested !== null) {
        diff_eur = +(suggested - current).toFixed(4);
        if (current !== 0) {
          diff_pct = +(diff_eur / current).toFixed(6);
          update = Math.abs(diff_pct) >= thresholdPct;
        } else {
          diff_pct = null; update = true;
        }
      } else {
        if (unit === null) note = "Geen eenheidsprijs (SC)";
        if (pack === null) note = note ? `${note}; pack ontbreekt/ongeldig` : "Pack ontbreekt/ongeldig";
        if (current === null) note = note ? `${note}; AIP ontbreekt` : "AIP ontbreekt";
      }

      return {
        reg: r.reg,
        sku: r.sku,
        name: r.name,
        zi: r.zi,
        pack,
        aip_current: current,
        unit_price_eur: unit,
        aip_suggested: suggested,
        diff_eur,
        diff_pct,
        update,
        note,
      };
    });
    setDiffs(out);
  }

  function exportDiffs() {
    if (!diffs.length) return;
    const rows = diffs.map(r => ({
      REGNR: r.reg,
      SKU: r.sku ?? "",
      Product: r.name ?? "",
      ZI: r.zi ?? "",
      Pack: r.pack ?? "",
      AIP_huidig: r.aip_current ?? "",
      Eenheidsprijs: r.unit_price_eur ?? "",
      AIP_voorgesteld: r.aip_suggested ?? "",
      Verschil_EUR: r.diff_eur ?? "",
      Verschil_pct: r.diff_pct !== null && r.diff_pct !== undefined ? +(r.diff_pct * 100).toFixed(3) : "",
      Bijwerken: r.update ? "JA" : "NEE",
      Opmerking: r.note ?? "",
    }));
    downloadXlsx("wgp_aip_diffs.xlsx", rows, "Diffs");
  }

  const nMatched = useMemo(() => diffs.filter(d => d.unit_price_eur !== null).length, [diffs]);
  const nUpdate = useMemo(() => diffs.filter(d => d.update).length, [diffs]);

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 lg:px-6 py-6 space-y-6">
      {/* Header */}
      <header className="rounded-2xl border bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-semibold">Wgp Compare — super simpel (client-only)</h1>
          <span className="ml-auto">
            <Link href="/app/pricing" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
              ← Terug naar Pricing-dashboard
            </Link>
          </span>
        </div>
        <p className="text-sm text-gray-700 mt-1">
          Vergelijk je <b>AIP-master</b> met <b>Staatscourant</b> zonder server-API’s.
          Upload AIP (Excel/CSV) + SC (Excel/CSV of PDF). We rekenen AIP = eenheidsprijs × pack en tonen Δ.
        </p>
      </header>

      {/* Uploads */}
      <section className="rounded-2xl border bg-white p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm block">
            <div className="font-medium">AIP-master (.xlsx/.csv)</div>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={onUploadAip} className="mt-1 block w-full rounded-md border px-3 py-2" />
            <p className="mt-1 text-xs text-gray-500">Minimaal kolommen: REGNR (reg/regnr/rvg) en pack. Optioneel: SKU, product, ZI, AIP.</p>
          </label>

          <div className="grid gap-2">
            <label className="text-sm block">
              <div className="font-medium">Staatscourant — Excel/CSV</div>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={onUploadScExcel} className="mt-1 block w-full rounded-md border px-3 py-2" />
              <p className="mt-1 text-xs text-gray-500">Kolommen: REGNR en eenheidsprijs.</p>
            </label>
            <label className="text-sm block">
              <div className="font-medium">Staatscourant — PDF (upload)</div>
              <input type="file" accept=".pdf" onChange={onUploadScPdf} className="mt-1 block w-full rounded-md border px-3 py-2" />
              <p className="mt-1 text-xs text-gray-500">Wordt client-side geparsed met pdfjs (geen server nodig).</p>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs inline-flex items-center gap-2">
            Drempel Δ%:
            <input
              type="number"
              step="0.001"
              value={+(thresholdPct * 100).toFixed(3)}
              onChange={(e) => setThresholdPct(Math.max(0, Number(e.target.value) / 100))}
              className="w-24 rounded-md border px-2 py-1.5 text-sm text-right"
            />
            %
          </label>
          <button onClick={runCompare} disabled={!aip.length || !scRows.length} className="rounded-md bg-emerald-600 text-white px-3 py-2 text-sm hover:opacity-95 disabled:opacity-50">
            Vergelijk
          </button>
          <button onClick={exportDiffs} disabled={!diffs.length} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
            Exporteer diffs (Excel)
          </button>
          {busy && <span className="text-sm text-gray-600">Bezig…</span>}
          {err && <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{err}</span>}
        </div>
      </section>

      {/* Result */}
      <section className="rounded-2xl border bg-white p-3 sm:p-4">
        <div className="text-sm font-medium">Resultaat: {diffs.length ? `${nMatched}/${diffs.length} matched • ${nUpdate} bijwerken` : "nog geen vergelijking"}</div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-2 py-2 text-left">REGNR</th>
                <th className="px-2 py-2 text-left">SKU</th>
                <th className="px-2 py-2 text-left">Product</th>
                <th className="px-2 py-2 text-left">ZI</th>
                <th className="px-2 py-2 text-right">Pack</th>
                <th className="px-2 py-2 text-right">AIP huidig (€)</th>
                <th className="px-2 py-2 text-right">Unit (€)</th>
                <th className="px-2 py-2 text-right">AIP voorgesteld (€)</th>
                <th className="px-2 py-2 text-right">Δ €</th>
                <th className="px-2 py-2 text-right">Δ %</th>
                <th className="px-2 py-2 text-left">Bijwerken?</th>
                <th className="px-2 py-2 text-left">Opmerking</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {diffs.map((r) => (
                <tr key={r.reg}>
                  <td className="px-2 py-1">{r.reg}</td>
                  <td className="px-2 py-1">{r.sku ?? ""}</td>
                  <td className="px-2 py-1">{r.name ?? ""}</td>
                  <td className="px-2 py-1">{r.zi ?? ""}</td>
                  <td className="px-2 py-1 text-right">{r.pack ?? "-"}</td>
                  <td className="px-2 py-1 text-right">{r.aip_current ?? "-"}</td>
                  <td className="px-2 py-1 text-right">{r.unit_price_eur ?? "-"}</td>
                  <td className="px-2 py-1 text-right">{r.aip_suggested ?? "-"}</td>
                  <td className="px-2 py-1 text-right">{r.diff_eur ?? "-"}</td>
                  <td className="px-2 py-1 text-right">
                    {r.diff_pct !== null && r.diff_pct !== undefined ? `${+(r.diff_pct * 100).toFixed(3)}%` : "-"}
                  </td>
                  <td className="px-2 py-1">
                    {r.update ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">JA</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-gray-700 ring-1 ring-gray-200">NEE</span>
                    )}
                  </td>
                  <td className="px-2 py-1">{r.note ?? ""}</td>
                </tr>
              ))}
              {!diffs.length && (
                <tr><td colSpan={12} className="px-2 py-6 text-center text-gray-500">Upload AIP + SC (Excel/CSV of PDF) en klik “Vergelijk”.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
