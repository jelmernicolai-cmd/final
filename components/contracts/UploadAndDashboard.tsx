// components/contracts/UploadAndDashboard.tsx
"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import ContractDashboard from "./ContractDashboard";
import {
  analyze,
  type ContractLevel,
  type Row,
  type AnalyzeResult,
} from "../../lib/contract-analysis";

function parseCsvToRows(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!lines.length) return [];
  const header = lines
    .shift()!
    .split(/[;,]/)
    .map((s) => s.trim().toLowerCase());
  const idx = (n: string) => header.indexOf(n);
  const need = ["klant", "sku", "aantal_units", "claimbedrag", "omzet", "periode"];
  const miss = need.filter((n) => idx(n) < 0);
  if (miss.length) throw new Error(`Ontbrekende kolommen: ${miss.join(", ")}`);

  return lines.map((line) => {
    const c = line.split(/[;,]/);
    return {
      klant: c[idx("klant")] || "",
      sku: c[idx("sku")] || "",
      aantal_units: Number((c[idx("aantal_units")] || "0").replace(",", ".")) || 0,
      claimbedrag: Number((c[idx("claimbedrag")] || "0").replace(",", ".")) || 0,
      omzet: Number((c[idx("omzet")] || "0").replace(",", ".")) || 0,
      periode: (c[idx("periode")] || "").trim(),
    } satisfies Row;
  });
}

function parseXlsxToRows(buffer: ArrayBuffer): Row[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
  const need = ["klant", "sku", "aantal_units", "claimbedrag", "omzet", "periode"];
  const lower = (o: any) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [String(k).toLowerCase(), v]));

  return json.map((r0: any) => {
    const r = lower(r0);
    const miss = need.filter((n) => !(n in r));
    if (miss.length) {
      throw new Error(
        `Ontbrekende kolommen in Excel: ${miss.join(
          ", ",
        )} — gebruik headers: ${need.join(", ")}`
      );
    }
    return {
      klant: r["klant"] || "",
      sku: r["sku"] || "",
      aantal_units: Number(String(r["aantal_units"]).replace(",", ".")) || 0,
      claimbedrag: Number(String(r["claimbedrag"]).replace(",", ".")) || 0,
      omzet: Number(String(r["omzet"]).replace(",", ".")) || 0,
      periode: String(r["periode"]).trim(),
    } as Row;
  });
}

export default function UploadAndDashboard() {
  const [level, setLevel] = useState<ContractLevel>("klant_sku");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [raw, setRaw] = useState<Row[] | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    try {
      let rows: Row[] = [];
      if (/\.(csv)$/i.test(file.name)) {
        const text = await file.text();
        rows = parseCsvToRows(text);
      } else if (/\.(xlsx)$/i.test(file.name)) {
        const buffer = await file.arrayBuffer();
        rows = parseXlsxToRows(buffer);
      } else {
        throw new Error("Bestandsformaat niet ondersteund (upload .csv of .xlsx).");
      }

      const analyzed = analyze(rows, level);
      setResult(analyzed);
      setRaw(rows);
      setIssues([]); // reset issues als alles lukt
    } catch (err: any) {
      setError(err?.message || "Upload/Analyse mislukt");
      setResult(null);
      setRaw(null);
    } finally {
      setBusy(false);
      e.target.value = "";
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
          <p className="mt-1 text-xs text-gray-400">
            Bepaalt aggregatie van contracten (client-side analyse).
          </p>
        </div>

        <div>
          <label className="block text-sm text-gray-600">Upload bestand</label>
          <input
            type="file"
            accept=".csv, .xlsx, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={onUpload}
            className="mt-1 block w-72 rounded-md border px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            Vereiste kolommen: <code>klant, sku, aantal_units, claimbedrag, omzet, periode (YYYY-MM of YYYY-Qx)</code>
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

      {busy && <div className="text-sm text-gray-600">Bezig met analyseren…</div>}
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      {issues.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {issues.length} meldingen bij upload
        </div>
      )}
      {result ? (
        <ContractDashboard dataOverride={result} />
      ) : (
        <div className="text-sm text-gray-500">Upload een CSV of Excel om het dashboard te vullen.</div>
      )}
    </div>
  );
}
