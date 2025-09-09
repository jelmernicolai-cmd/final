"use client";

import React, { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import type { NormalizedRow } from "@/lib/upload-schema";
import { normalizeRows } from "@/lib/upload-schema";
import { saveWaterfallRows, eur0 } from "@/lib/waterfall-storage";
import type { Row } from "@/lib/waterfall-types";

/** ====================== Kleine helpers ====================== */
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const fmtPct = (p: number, d = 1) => `${(p * 100).toFixed(d)}%`;

/** ====================== CSV helpers (robuust) ====================== */
function csvDetectDelimiter(sample: string): string {
  const c = sample.slice(0, 5000);
  const counts: Record<string, number> = {
    ";": (c.match(/;/g) || []).length,
    ",": (c.match(/,/g) || []).length,
    "\t": (c.match(/\t/g) || []).length,
  };
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : ",";
}
function csvToJson(text: string): any[] {
  const delim = csvDetectDelimiter(text);
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length > 0);
  if (!lines.length) return [];
  const headers = splitCSVLine(lines[0], delim);
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], delim);
    const obj: any = {};
    headers.forEach((h, idx) => (obj[h] = cols[idx] ?? ""));
    rows.push(obj);
  }
  return rows;
}
function splitCSVLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"'; i++;
      } else inQ = !inQ;
    } else if (ch === delim && !inQ) {
      out.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** ====================== Nummer normalisatie ====================== */
/** "1.234,56" → 1234.56, "(123)" → -123, "  " → 0 */
function parseSmartNumber(v: any): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  let s = String(v).trim();
  if (!s) return 0;
  let neg = false;
  if (s.startsWith("(") && s.endsWith(")")) { neg = true; s = s.slice(1, -1); }
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    // NL-stijl: punten als duizendtal, komma als decimaal
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    // EN-stijl: komma duizendtal, punt decimaal
    s = s.replace(/,/g, "");
  }
  s = s.replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return neg ? -n : n;
}

/** ====================== Validatie / Reparatie ====================== */
type Severity = "error" | "warning" | "info";
type Issue = {
  idx: number;                 // rij-index in preview
  severity: Severity;
  code: string;
  message: string;
  field?: keyof NormalizedRow | string;
  src?: number;                // bronwaarde (optioneel)
  calc?: number;               // berekend (optioneel)
};

type RepairConfig = {
  autoRepair: boolean;         // schakelaar
  tolerance: number;           // euro tolerantie per rij
  precedence: "prefer-calculated" | "prefer-source"; // wat leidend bij mismatch
};

function sumDiscounts(r: NormalizedRow): number {
  return (
    (r.d_channel || 0) +
    (r.d_customer || 0) +
    (r.d_product || 0) +
    (r.d_volume || 0) +
    (r.d_other_sales || 0) +
    (r.d_mandatory || 0) +
    (r.d_local || 0)
  );
}
function sumRebates(r: NormalizedRow): number {
  return (
    (r.r_direct || 0) +
    (r.r_prompt || 0) +
    (r.r_indirect || 0) +
    (r.r_mandatory || 0) +
    (r.r_local || 0)
  );
}

/** Post-normalisatie: numeriek forceren, identiteiten herstellen, credits labelen */
function repairRows(input: NormalizedRow[], cfg: RepairConfig) {
  const rows: NormalizedRow[] = [];
  const issues: Issue[] = [];

  input.forEach((src, idx) => {
    const r: NormalizedRow = { ...src };

    // 1) forceer alle numerieke velden + tekenconventies
    const numFields: (keyof NormalizedRow)[] = [
      "gross",
      "d_channel", "d_customer", "d_product", "d_volume", "d_other_sales", "d_mandatory", "d_local",
      "invoiced",
      "r_direct", "r_prompt", "r_indirect", "r_mandatory", "r_local",
      "net",
    ];
    numFields.forEach((k) => {
      const raw = (r as any)[k];
      const n = parseSmartNumber(raw);
      if (Number.isNaN(n)) {
        issues.push({ idx, severity: "warning", code: "NaN", message: `Niet-numeriek in ${String(k)} → 0`, field: k });
        (r as any)[k] = 0;
      } else {
        // Kortingen/rebates altijd als positieve magnitude opslaan
        if (String(k).startsWith("d_") || String(k).startsWith("r_")) {
          (r as any)[k] = Math.abs(n);
          if (n < 0) {
            issues.push({
              idx, severity: "info", code: "NEG_TO_POS",
              message: `Negatieve ${String(k)} omgezet naar positief (conventie)`, field: k, src: n, calc: Math.abs(n),
            });
          }
        } else {
          (r as any)[k] = n;
        }
      }
    });

    // 2) Credits/retours labelen i.p.v. blokkeren
    if ((r.gross || 0) < 0) {
      issues.push({
        idx, severity: "info", code: "CREDIT_CANDIDATE",
        message: "Negatieve gross gedetecteerd (credit/retour)", field: "gross", src: r.gross,
      });
      // (optioneel) als qty/doc_type beschikbaar zijn, kun je hier extra signaallogica toevoegen
    }

    // 3) Identiteiten controleren en evt. herstellen
    const disc = sumDiscounts(r);
    const reb = sumRebates(r);
    const invoicedCalc = (r.gross || 0) - disc;
    const netCalc = (r.invoiced ?? invoicedCalc) - reb;
    const tol = cfg.tolerance;

    // a) Invoiced
    if (!Number.isFinite(r.invoiced) || Math.abs((r.invoiced || 0) - invoicedCalc) > tol) {
      issues.push({
        idx, severity: "warning", code: "INV_MISMATCH",
        message: `Invoiced ≠ Gross − ΣDiscounts (Δ ${eur0((r.invoiced || 0) - invoicedCalc)})`,
        field: "invoiced", src: r.invoiced || 0, calc: invoicedCalc,
      });
      if (cfg.autoRepair && cfg.precedence === "prefer-calculated")) {
        r.invoiced = invoicedCalc;
        issues.push({
          idx, severity: "info", code: "INV_FIXED",
          message: "Invoiced herberekend uit Gross − ΣDiscounts", field: "invoiced", calc: invoicedCalc,
        });
      }
    }

    // b) Net
    if (!Number.isFinite(r.net) || Math.abs((r.net || 0) - netCalc) > tol) {
      // error tenzij we direct herstellen
      const sev: Severity = cfg.autoRepair && cfg.precedence === "prefer-calculated" ? "warning" : "error";
      issues.push({
        idx, severity: sev, code: "NET_MISMATCH",
        message: `Net ≠ Invoiced − ΣRebates (Δ ${eur0((r.net || 0) - netCalc)})`,
        field: "net", src: r.net || 0, calc: netCalc,
      });
      if (cfg.autoRepair && cfg.precedence === "prefer-calculated") {
        r.net = netCalc;
        issues.push({
          idx, severity: "info", code: "NET_FIXED",
          message: "Net herberekend uit Invoiced − ΣRebates", field: "net", calc: netCalc,
        });
      }
    }

    // 4) Sleutelvelden / periode
    if (!r.period || !/^\d{4}-\d{2}$/.test(String(r.period))) {
      issues.push({ idx, severity: "error", code: "PERIOD_FMT", message: "Period verwacht als YYYY-MM", field: "period" });
    }
    if (!r.cust || !r.sku) {
      issues.push({ idx, severity: "warning", code: "KEY_MISSING", message: "Ontbrekende cust of sku" });
    }

    rows.push(r);
  });

  // Dubbele sleutel detectie
  const seen = new Map<string, number>();
  rows.forEach((r, idx) => {
    const key = `${r.period}::${r.cust}::${r.sku}`;
    if (seen.has(key)) {
      issues.push({
        idx, severity: "warning", code: "DUP_KEY",
        message: "Dubbele sleutel (period,cust,sku) – totalen kunnen dubbel tellen",
      });
    } else {
      seen.set(key, idx);
    }
  });

  // Tellingen
  const creditsCount = rows.filter((r) => (r.gross || 0) < 0).length;

  const summary = {
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    infos: issues.filter((i) => i.severity === "info").length,
    credits: creditsCount,
  };

  return { rows, issues, summary };
}

/** ====================== Totalen (reconciliatie) ====================== */
function buildTotals(rows: NormalizedRow[]) {
  let gross = 0, absGross = 0,
      disc = 0, reb = 0,
      invoicedSrc = 0, netSrc = 0;

  for (const x of rows) {
    const g = x.gross || 0;
    gross += g;
    absGross += Math.abs(g);
    disc += sumDiscounts(x);
    reb += sumRebates(x);
    invoicedSrc += x.invoiced || 0;
    netSrc += x.net || 0;
  }
  const invoicedCalc = gross - disc;
  const netCalc = invoicedCalc - reb;

  return {
    gross,
    absGross,
    discounts: disc,
    rebates: reb,
    invoicedSrc,
    netSrc,
    invoicedCalc,
    netCalc,
    diffInvoiced: (invoicedSrc || 0) - invoicedCalc,
    diffNet: (netSrc || 0) - netCalc,
    // percentages op |gross| of |invoicedCalc| voor stabiliteit
    discPct: absGross ? disc / absGross : 0,
    rebPct: Math.abs(invoicedCalc) ? reb / Math.abs(invoicedCalc) : 0,
  };
}

/** ====================== Storage-shape ====================== */
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

/** ====================== Issues CSV Export ====================== */
function issuesToCSV(issues: Issue[]) {
  const rows = [
    ["row_index", "severity", "code", "field", "message", "src", "calc"],
    ...issues.map((i) => [
      i.idx,
      i.severity,
      i.code,
      i.field ?? "",
      String(i.message).replace(/\n/g, " "),
      i.src ?? "",
      i.calc ?? "",
    ]),
  ];
  const csv = rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "upload_issues.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

/** ====================== Types voor paginaresultaat ====================== */
type ParseResult = {
  report: ReturnType<typeof normalizeRows>;                // uit schema-normalisatie
  normalized: NormalizedRow[];                             // na onze reparaties
  issues: Issue[];                                         // gecombineerde issues
  summary: { errors: number; warnings: number; infos: number; credits: number };
  totals: ReturnType<typeof buildTotals>;
};

/** ====================== Component ====================== */
export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Ingest-instellingen
  const [autoRepair, setAutoRepair] = useState(true);
  const [precedence, setPrecedence] = useState<RepairConfig["precedence"]>("prefer-calculated");
  const [tolerance, setTolerance] = useState(0.5); // 50 cent per rij

  const [result, setResult] = useState<ParseResult | null>(null);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  }, []);

  const handleBrowse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
    e.currentTarget.value = ""; // opnieuw hetzelfde bestand selecteerbaar
  };

  async function handleFile(file: File) {
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const ext = (file.name.toLowerCase().split(".").pop() || "").trim();
      let rows: any[] = [];

      if (ext === "xlsx" || ext === "xls") {
        const XLSX: any = await import("xlsx");
        if (!XLSX?.read || !XLSX?.utils) throw new Error("Excel parser kon niet worden geladen (xlsx).");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        if (!wb.SheetNames?.length) throw new Error("Excel bevat geen werkbladen.");
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      } else if (ext === "csv") {
        const text = await file.text();
        rows = csvToJson(text);
      } else {
        throw new Error("Ondersteunde formaten: .xlsx, .xls of .csv");
      }

      // 1) Normaliseer volgens je schema (mappen header-synoniemen etc.)
      const base = normalizeRows(rows);

      // 2) Extra validatie en reparaties
      const cfg: RepairConfig = { autoRepair, tolerance, precedence };
      const repaired = repairRows(base.preview, cfg);

      // 3) Totale reconciliatie
      const totals = buildTotals(repaired.rows);

      // 4) Verzamel issues (schema-issues + onze issues)
      const combinedIssues: Issue[] = [
        // neem schema-issues op als warnings (of error, afhankelijk van jouw implementatie)
        ...base.issues.map((m, i) => ({ idx: -1, severity: "warning" as Severity, code: "SCHEMA", message: m })),
        ...repaired.issues,
      ];

      // 5) Bouw resultaat
      const pr: ParseResult = {
        report: base,
        normalized: repaired.rows,
        issues: combinedIssues,
        summary: repaired.summary,
        totals,
      };
      setResult(pr);

      // 6) Topline melding
      if (!base.ok) {
        setErr("Bestand verwerkt, maar kernkolommen ontbreken of veel ongeldige rijen. Zie validatie hieronder.");
      } else if (repaired.summary.errors > 0 && !autoRepair) {
        setErr("Er zijn valideringsfouten (errors). Zet ‘Auto-repair’ aan of corrigeer de bron en upload opnieuw.");
      }
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Upload mislukt");
    } finally {
      setBusy(false);
    }
  }

  function onSave() {
    if (!result) return;
    if (!result.report.ok) {
      alert("Dataset is niet OK volgens schema. Corrigeer eerst de bron.");
      return;
    }
    if (result.summary.errors > 0) {
      alert("Er zijn nog errors. Zet Auto-repair aan of corrigeer de bron en upload opnieuw.");
      return;
    }
    const rows = toRowShape(result.normalized);
    saveWaterfallRows(rows);
    alert("Dataset opgeslagen. Open Waterfall of Consistency om de analyses te bekijken.");
  }

  function onReset() {
    setResult(null);
    setErr(null);
    setBusy(false);
    setDragOver(false);
  }

  const totalsBox = useMemo(() => {
    if (!result) return null;
    const t = result.totals;
    return (
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <div className="rounded-lg border p-3 text-sm">
          <div className="text-gray-500">Gross (∑)</div>
          <div className="font-semibold">{eur0(t.gross)}</div>
          <div className="text-xs text-gray-500">abs: {eur0(t.absGross)}</div>
        </div>
        <div className="rounded-lg border p-3 text-sm">
          <div className="text-gray-500">Σ Discounts</div>
          <div className="font-semibold">
            {eur0(t.discounts)} <span className="text-gray-500">({fmtPct(t.discPct)})</span>
          </div>
        </div>
        <div className="rounded-lg border p-3 text-sm">
          <div className="text-gray-500">Invoiced (bron) vs calc</div>
          <div className="font-semibold">
            {eur0(t.invoicedSrc)} <span className="text-gray-500">vs</span> {eur0(t.invoicedCalc)}
          </div>
          <div className={`text-xs mt-1 ${Math.abs(t.diffInvoiced) > tolerance ? "text-amber-700" : "text-gray-500"}`}>
            Δ {eur0(t.diffInvoiced)}
          </div>
        </div>
        <div className="rounded-lg border p-3 text-sm">
          <div className="text-gray-500">Σ Rebates</div>
          <div className="font-semibold">
            {eur0(t.rebates)} <span className="text-gray-500">({fmtPct(t.rebPct)})</span>
          </div>
        </div>
        <div className="rounded-lg border p-3 text-sm">
          <div className="text-gray-500">Net (bron) vs calc</div>
          <div className="font-semibold">
            {eur0(t.netSrc)} <span className="text-gray-500">vs</span> {eur0(t.netCalc)}
          </div>
          <div className={`text-xs mt-1 ${Math.abs(t.diffNet) > tolerance ? "text-amber-700" : "text-gray-500"}`}>
            Δ {eur0(t.diffNet)}
          </div>
        </div>
      </div>
    );
  }, [result, tolerance]);

  const canSave = !!result?.report.ok && (result?.summary.errors ?? 0) === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Upload – Masterdataset</h1>
          <p className="text-gray-600 text-sm">
            Deze masterfile voedt zowel de <b>Waterfall</b> als de <b>Consistency</b>-analyse. Eén dataset = consistente inzichten.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/waterfall" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Naar Waterfall</Link>
          <Link href="/app/consistency" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Naar Consistency</Link>
        </div>
      </header>

      {/* Ingest-instellingen */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] items-end">
          <label className="text-sm inline-flex items-center gap-2">
            <input type="checkbox" checked={autoRepair} onChange={(e) => setAutoRepair(e.target.checked)} />
            <span>Auto-repair inconsistenties</span>
          </label>
          <label className="text-sm">
            <div className="font-medium">Tolerantie (€/rij)</div>
            <input
              type="number"
              step={0.1}
              min={0}
              value={tolerance}
              onChange={(e) => setTolerance(clamp(parseFloat(e.target.value) || 0, 0, 100))}
              className="mt-1 w-32 rounded-lg border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <div className="font-medium">Voorrang bij mismatch</div>
            <select
              value={precedence}
              onChange={(e) => setPrecedence(e.target.value as any)}
              className="mt-1 rounded-lg border px-3 py-2 w-56"
            >
              <option value="prefer-calculated">Herberekende waarden laten winnen</option>
              <option value="prefer-source">Bronwaarden laten winnen (alleen signaleren)</option>
            </select>
          </label>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          We corrigeren o.a. decimalen/tekens, negatieve d_/r_ naar positief (conventie), en herberekenen <i>invoiced</i>/<i>net</i> vanuit de identiteiten.
          Credits/retours (gross &lt; 0) zijn toegestaan en worden gelabeld.
        </p>
      </section>

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
          Headers mogen variëren; we herkennen synoniemen (schema), en repareren decimalen/negatieven automatisch.
        </p>
        {busy && <div className="mt-2 text-sm text-gray-600">Bezig met verwerken…</div>}
        {err && <div className="mt-3 inline-block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{err}</div>}
      </section>

      {/* Validatieresultaat */}
      {result && (
        <section className="rounded-2xl border bg-white p-4 space-y-4">
          <h2 className="text-lg font-semibold">Validatie & reparaties</h2>

          {/* Samenvatting */}
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            <div className="rounded-lg border p-3 text-sm">
              <div className="text-gray-500">Rijen na normalisatie</div>
              <div className="font-semibold">{result.report.rows}</div>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <div className="text-gray-500">Errors / Warnings / Info</div>
              <div className="font-semibold">
                {result.summary.errors} / {result.summary.warnings} / {result.summary.infos}
              </div>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <div className="text-gray-500">Schema status</div>
              <div className="font-semibold">{result.report.ok ? "OK" : "Niet OK"}</div>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <div className="text-gray-500">Credit/retour rijen</div>
              <div className="font-semibold">{result.summary.credits}</div>
            </div>
          </div>

          {/* Reconciliatie */}
          <div>
            <div className="text-sm font-medium mb-2">Reconciliatie (totalen)</div>
            {totalsBox}
            <p className="text-xs text-gray-600 mt-2">
              We verwachten <b>Invoiced ≈ Gross − ΣDiscounts</b> en <b>Net ≈ Invoiced − ΣRebates</b>. Percentages op basis van <b>|Gross|</b> voor stabiliteit bij credits.
            </p>
          </div>

          {/* Schema-meldingen */}
          {result.report.missing.length > 0 && (
            <div className="rounded-lg border p-3 text-sm text-amber-800 bg-amber-50 border-amber-200">
              Ontbrekende velden die we niet konden mappen: {result.report.missing.join(", ")}
            </div>
          )}
          {result.report.issues.length > 0 && (
            <div className="rounded-lg border p-3 text-sm text-amber-800 bg-amber-50 border-amber-200">
              <div className="font-medium">Schema-issues (max 50)</div>
              <ul className="list-disc pl-5">
                {result.report.issues.slice(0, 50).map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}

          {/* Issues (top 200) + export */}
          <div>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Issues (eerste 200)</div>
              <div className="flex gap-2">
                <button className="text-sm rounded border px-3 py-1.5 hover:bg-gray-50" onClick={() => issuesToCSV(result.issues)}>
                  Exporteer issues (CSV)
                </button>
              </div>
            </div>
            <div className="mt-2 w-full overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-2">#</th>
                    <th className="text-left py-2 px-2">Severity</th>
                    <th className="text-left py-2 px-2">Code</th>
                    <th className="text-left py-2 px-2">Field</th>
                    <th className="text-left py-2 px-2">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {result.issues.slice(0, 200).map((i, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-1 px-2">{i.idx >= 0 ? i.idx : "-"}</td>
                      <td className="py-1 px-2">{i.severity}</td>
                      <td className="py-1 px-2">{i.code}</td>
                      <td className="py-1 px-2">{i.field ?? ""}</td>
                      <td className="py-1 px-2">{i.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Acties */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              className={`rounded-lg px-4 py-2 text-sm border ${canSave ? "bg-sky-600 text-white hover:bg-sky-700" : "opacity-50 cursor-not-allowed"}`}
              disabled={!canSave}
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
