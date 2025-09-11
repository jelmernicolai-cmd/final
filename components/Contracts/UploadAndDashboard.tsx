"use client";

import { useState } from "react";
import ContractDashboard from "./ContractDashboard";
import type { ContractLevel, Row, AggRow, TotalRow } from "../../lib/contract-analysis";

type Result = { agg: AggRow[]; totals: TotalRow[]; latest: AggRow[] };

export default function UploadAndDashboard() {
  const [level, setLevel] = useState<ContractLevel>("klant_sku");
  const [result, setResult] = useState<Result|null>(null);
  const [raw, setRaw] = useState<Row[]|null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string|null>(null);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    fd.set("level", level);
    setBusy(true);
    try {
      const res = await fetch("/api/contracts/analyze", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || "Analyse mislukt");
      setResult(json.result);

      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const header = lines.shift()!;
      const cols = header.split(/[;,]/).map(s=>s.trim().toLowerCase());
      const idx = (n:string)=>cols.indexOf(n);
      const out: Row[] = lines.map(line=>{
        const c = line.split(/[;,]/);
        return {
          klant: c[idx("klant")]||"", sku: c[idx("sku")]||"",
          aantal_units: Number((c[idx("aantal_units")]||"0").replace(",", "."))||0,
          claimbedrag: Number((c[idx("claimbedrag")]||"0").replace(",", "."))||0,
          omzet: Number((c[idx("omzet")]||"0").replace(",", "."))||0,
          periode: (c[idx("periode")]||"").trim(),
        }
      });
      setRaw(out);
    } catch (err:any) {
      setError(err?.message || "Upload mislukt");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function onExport() {
    if (!result || !raw) return;
    const res = await fetch("/api/contracts/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw, ...result }),
    });
    if (!res.ok) { alert("Export mislukt"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "contract_performance.xlsx"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div>
          <label className="block text-sm text-gray-600">Niveau</label>
          <select className="mt-1 w-48 rounded-md border px-3 py-2" value={level} onChange={(e)=>setLevel(e.target.value as ContractLevel)}>
            <option value="klant_sku">Klant + SKU</option>
            <option value="klant">Klant</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600">Upload CSV</label>
          <input type="file" accept=".csv,text/csv" onChange={onUpload} className="mt-1 block w-64 rounded-md border px-3 py-2"/>
          <p className="mt-1 text-xs text-gray-500">Kolommen: klant, sku, aantal_units, claimbedrag, omzet, periode (YYYY-MM)</p>
        </div>
        <div className="grow" />
        <button type="button" onClick={onExport} disabled={!result || !raw} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
          Exporteer naar Excel
        </button>
      </div>

      {busy && <div className="text-sm text-gray-600">Bezig met analyseren…</div>}
      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      {result ? <ContractDashboard dataOverride={result}/> : <div className="text-sm text-gray-500">Upload een CSV om het dashboard te vullen.</div>}
    </div>
  );
}
