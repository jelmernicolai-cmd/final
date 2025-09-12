// components/contracts/UploadAndDashboard.tsx
"use client";

import { useState } from "react";
import ContractDashboard from "./ContractDashboard";
import {
  analyze,
  type ContractLevel,
  type Row,
  type AggRow,
  type TotalRow,
} from "../../lib/contract-analysis";

/* ================== Types voor intern gebruik ================== */
type Result = { agg: AggRow[]; totals: TotalRow[]; latest: AggRow[] };
type ParseOutcome = { rows: Row[]; issues: string[] };

/* ================== Header-aliases (tolerant NL/EN) ================== */
/** We mappen alles eerst naar canonieke keys en vervolgens terug naar jouw NL Row-shape */
const HEADER_ALIASES: Record<string, string[]> = {
  customer: ["customer", "klant", "client", "account", "buyer"],
  sku: ["sku", "product", "productcode", "artikel", "artikelcode", "code"],
  units: ["units", "qty", "quantity", "aantal", "aantal_units", "stuks"],
  claim_amount: ["claim_amount", "claimbedrag", "discount", "rebate", "uitbetaling", "uitbetaalde_korting"],
  revenue: ["revenue", "omzet", "sales", "turnover", "amount", "netto_omzet"],
  period: ["period", "periode", "month", "maand"],
};

const REQUIRED_CANON = ["customer", "sku", "units", "claim_amount", "revenue", "period"] as const;

/* ================== Kleine helpers ================== */
const norm = (s: any) => String(s ?? "").trim();

function toNum(v: any) {
  if (typeof v === "number") return v;
  const s = String(v ?? "")
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

function normalizePeriod(raw: string): { ok: boolean; value: string } {
  const s = norm(raw);
  const m1 = /^(\d{2})-(\d{4})$/.exec(s); // MM-YYYY
  const m2 = /^(\d{4})-(\d{2})$/.exec(s); // YYYY-MM
  if (m1) return { ok: true, value: `${m1[1]}-${m1[2]}` };
  if (m2) return { ok: true, value: `${m2[2]}-${m2[1]}` };
  return { ok: false, value: s };
}

/* ================== CSV parsing (autodelim) ================== */
function detectDelim(firstLine: string) {
  const counts = {
    ";": (firstLine.match(/;/g) || []).length,
    ",": (firstLine.match(/,/g) || []).length,
    "\t": (firstLine.match(/\t/g) || []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}
function splitCSVLine(line: string, delim: string) {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === delim && !inQ) {
      out.push(cur); cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/* ================== Header mapping ================== */
function buildHeaderMap(headers: string[]) {
  // return map: canonical -> actual header in file (case-insensitive)
  const lc = headers.map((h) => norm(h).toLowerCase());
  const map: Record<string, string> = {};
  for (const canon of Object.keys(HEADER_ALIASES)) {
    const aliases = HEADER_ALIASES[canon];
    // exacte canonical match of één van de aliases
    let idx = lc.findIndex((h) => h === canon);
    if (idx === -1) {
      idx = lc.findIndex((h) => aliases.includes(h));
    }
    if (idx !== -1) map[canon] = headers[idx];
  }
  return map;
}

/* ================== CSV → Row[] (tolerant) ================== */
function parseCsvToRowsTolerant(text: string): ParseOutcome {
  const issues: string[] = [];
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length > 0);
  if (!lines.length) return { rows: [], issues: ["Bestand bevat geen rijen."] };

  const delim = detectDelim(lines[0]);
  const headers = splitCSVLine(lines[0], delim);
  const headerMap = buildHeaderMap(headers);

  for (const req of REQUIRED_CANON) {
    if (!headerMap[req]) issues.push(`Ontbrekende kolom: "${req}" (synoniemen toegestaan).`);
  }

  const out: Row[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], delim);
    const get = (canon: string) => {
      const h = headerMap[canon];
      if (!h) return "";
      const idx = headers.indexOf(h);
      return cols[idx] ?? "";
    };

    // Canonieke velden
    const customer = norm(get("customer"));
    const sku = norm(get("sku"));
    const units = toNum(get("units"));
    const claim = toNum(get("claim_amount"));
    const rev = toNum(get("revenue"));
    const pRaw = norm(get("period"));

    if (!customer || !sku) {
      issues.push(`Rij ${i + 1}: lege customer/sku — rij overgeslagen.`);
      continue;
    }

    const p = normalizePeriod(pRaw);
    if (!p.ok) {
      issues.push(`Rij ${i + 1}: ongeldige periode "${pRaw}" — verwacht MM-YYYY of YYYY-MM.`);
      continue;
    }
    if (!Number.isFinite(units) || !Number.isFinite(claim) || !Number.isFinite(rev)) {
      issues.push(`Rij ${i + 1}: numerieke waarden ongeldig (units/claim_amount/revenue).`);
      continue;
    }

    const key = `${customer}::${sku}::${p.value}`;
    if (seen.has(key)) issues.push(`Rij ${i + 1}: dubbele combinatie (customer, sku, period) — laatste telt.`);
    seen.add(key);

    // Terug naar jouw NL Row shape
    out.push({
      klant: customer,
      sku,
      aantal_units: Math.round(units),
      claimbedrag: Math.round(claim),
      omzet: Math.round(rev),
      periode: p.value, // MM-YYYY
    });
  }

  if (!out.length && !issues.length) issues.push("Geen geldige rijen gevonden.");
  return { rows: out, issues };
}

/* ================== XLSX → Row[] (tolerant) ================== */
async function parseXlsxToRowsTolerant(buffer: ArrayBuffer): Promise<ParseOutcome> {
  const XLSX = await import("xlsx"); // dynamic import om bundle kleiner te houden
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const issues: string[] = [];
  if (!json.length) return { rows: [], issues: ["Bestand bevat geen rijen."] };

  const headers = Object.keys(json[0] ?? {});
  const headerMap = buildHeaderMap(headers);

  for (const req of REQUIRED_CANON) {
    if (!headerMap[req]) issues.push(`Ontbrekende kolom: "${req}" (synoniemen toegestaan).`);
  }

  const out: Row[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < json.length; i++) {
    const r = json[i];
    const get = (canon: string) => r[headerMap[canon] ?? ""];

    const customer = norm(get("customer"));
    const sku = norm(get("sku"));
    const units = toNum(get("units"));
    const claim = toNum(get("claim_amount"));
    const rev = toNum(get("revenue"));
    const pRaw = norm(get("period"));

    if (!customer || !sku) {
      issues.push(`Rij ${i + 2}: lege customer/sku — rij overgeslagen.`);
      continue;
    }

    const p = normalizePeriod(pRaw);
    if (!p.ok) {
      issues.push(`Rij ${i + 2}: ongeldige periode "${pRaw}" — verwacht MM-YYYY of YYYY-MM.`);
      continue;
    }
    if (!Number.isFinite(units) || !Number.isFinite(claim) || !Number.isFinite(rev)) {
      issues.push(`Rij ${i + 2}: numerieke waarden ongeldig (units/claim_amount/revenue).`);
      continue;
    }

    const key = `${customer}::${sku}::${p.value}`;
    if (seen.has(key)) issues.push(`Rij ${i + 2}: dubbele combinatie (customer, sku, period) — laatste telt.`);
    seen.add(key);

    out.push({
      klant: customer,
      sku,
      aantal_units: Math.round(units),
      claimbedrag: Math.round(claim),
      omzet: Math.round(rev),
      periode: p.value,
    });
  }

  if (!out.length && !issues.length) issues.push("Geen geldige rijen gevonden.");
  return { rows: out, issues };
}

/* ================== Component ================== */
export default function UploadAndDashboard() {
  const [level, setLevel] = useState<ContractLevel>("klant_sku");
  const [result, setResult] = useState<Result | null>(null);
  const [raw, setRaw] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setIssues([]);
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      let parsed: ParseOutcome = { rows: [], issues: [] };

      if (/\.(csv)$/i.test(file.name)) {
        const text = await file.text();
        parsed = parseCsvToRowsTolerant(text);
      } else if (/\.(xlsx|xls)$/i.test(file.name)) {
        const buffer = await file.arrayBuffer();
        parsed = await parseXlsxToRowsTolerant(buffer);
      } else {
        throw new Error("Bestandsformaat niet ondersteund (upload .csv, .xlsx of .xls).");
      }

      if (!parsed.rows.length) {
        throw new Error(parsed.issues[0] || "Geen geldige rijen gevonden.");
      }

      const analyzed = analyze(parsed.rows, level);
      setResult(analyzed);
      setRaw(parsed.rows);
      setIssues(parsed.issues); // waarschuwingen tonen zonder de flow te blokkeren
    } catch (err: any) {
      setError(err?.message || "Upload/Analyse mislukt");
      setResult(null);
      setRaw(null);
    } finally {
      setBusy(false);
      e.target.value = ""; // reset input
    }
  }

  async function onExport() {
    if (!result || !raw) return;
    try {
      const res = await fetch("/api/contracts/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw, ...result }),
      });
      if (!res.ok) throw new Error("Export mislukt");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "contract_performance.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || "Export mislukt");
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div>
          <label className="block text-sm text-gray-600">Niveau</label>
          <select
            className="mt-1 w-48 rounded-md border px-3 py-2"
            value={level}
            onChange={(e) => setLevel(e.target.value as ContractLevel)}
          >
            <option value="klant_sku">Klant + SKU</option>
            <option value="klant">Klant</option>
          </select>
          <p className="mt-1 text-xs text-gray-400">Bepaalt aggregatie van contracten (client-side analyse).</p>
        </div>

        <div>
          <label className="block text-sm text-gray-600">Upload bestand</label>
          <input
            type="file"
            accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={onUpload}
            className="mt-1 block w-72 rounded-md border px-3 py-2"
          />
            <p className="mt-1 text-xs text-gray-500">
              Ondersteund: CSV (`,`/`;`/tab`) &amp; Excel. Headers in NL of EN toegestaan.
              Periode: <code>MM-YYYY</code>, <code>YYYY-MM</code>, <code>Qn-YYYY</code> of <code>YYYY-Qn</code>.
              Mix van maanden/kwartalen wordt automatisch geconsolideerd naar kwartalen.
            </p>
        </div>

        <div className="grow" />
        <button
          type="button"
          onClick={onExport}
          disabled={!result || !raw}
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Exporteer naar Excel
        </button>
      </div>

      {/* Status */}
      {busy && <div className="text-sm text-gray-600">Bezig met analyseren…</div>}
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Issues (niet-blokkerend) */}
      {issues.length > 0 && !error && (
        <div className="rounded-lg border bg-white px-3 py-2 text-sm">
          <div className="font-medium">Meldingen ({issues.length})</div>
          <ul className="list-disc pl-5 mt-1 space-y-0.5 max-h-40 overflow-auto">
            {issues.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Dashboard */}
      {result ? (
        <ContractDashboard dataOverride={result} />
      ) : (
        <div className="text-sm text-gray-500">Upload een CSV of Excel om het dashboard te vullen.</div>
      )}
    </div>
  );
}
