"use client";

import { useEffect, useMemo, useState } from "react";

/* ========== Types ========== */
type ProductRow = {
  sku: string;
  product: string;
  size: string;
  regnr: string;
  zi: string;
  aip: number;
  minOrder: number;
  casePack: number;
  custom?: Record<string, string | number>;
};

/* ========== XLSX Loader ========== */
async function loadXLSX() {
  const XLSX = await import("xlsx");
  return XLSX;
}

/* ========== LocalStorage helpers ========== */
const STORAGE_KEY = "pricing_aip_rows";

function saveLocal(rows: ProductRow[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function loadLocal(): ProductRow[] {
  try {
    const txt = localStorage.getItem(STORAGE_KEY);
    return txt ? (JSON.parse(txt) as ProductRow[]) : [];
  } catch {
    return [];
  }
}

/* ========== API helpers ========== */
async function tryFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(input, { ...init, cache: "no-store" });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function loadProducts(): Promise<ProductRow[]> {
  const data = await tryFetch<ProductRow[]>("/api/pricing/products");
  return data ?? loadLocal();
}

async function saveProducts(rows: ProductRow[]) {
  try {
    await fetch("/api/pricing/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rows),
    });
  } catch {
    // fallback to localStorage
    saveLocal(rows);
  }
}

/* ========== Import / Export ========== */
async function importFile(file: File): Promise<ProductRow[]> {
  if (/\.(csv)$/i.test(file.name)) {
    const text = await file.text();
    const [headerLine, ...lines] = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    const headers = headerLine.split(/[;,]/).map((h) => h.trim().toLowerCase());
    return lines.map((line) => {
      const c = line.split(/[;,]/);
      return {
        sku: c[headers.indexOf("sku")] || "",
        product: c[headers.indexOf("product")] || "",
        size: c[headers.indexOf("standaard verpakk. grootte")] || "",
        regnr: c[headers.indexOf("registratienummer")] || "",
        zi: c[headers.indexOf("zi-nummer")] || "",
        aip: Number(c[headers.indexOf("aip")] || 0),
        minOrder: Number(c[headers.indexOf("minimale bestelgrootte")] || 0),
        casePack: Number(c[headers.indexOf("doosverpakking")] || 0),
        custom: {},
      };
    });
  } else if (/\.(xlsx|xls)$/i.test(file.name)) {
    const XLSX = await loadXLSX();
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
    return json.map((r: any) => ({
      sku: r["SKU nummer"] || "",
      product: r["Product naam"] || "",
      size: r["Standaard Verpakk. Grootte"] || "",
      regnr: r["Registratienummer"] || "",
      zi: r["ZI-nummer"] || "",
      aip: Number(r["AIP"]) || 0,
      minOrder: Number(r["Minimale bestelgrootte"]) || 0,
      casePack: Number(r["Doosverpakking"]) || 0,
      custom: {},
    }));
  }
  throw new Error("Bestandsformaat niet ondersteund (.csv, .xlsx, .xls)");
}

async function exportExcel(rows: ProductRow[]) {
  if (!rows.length) {
    alert("Geen rijen om te exporteren.");
    return;
  }
  const XLSX = await loadXLSX();
  const data = [
    [
      "SKU nummer",
      "Product naam",
      "Standaard Verpakk. Grootte",
      "Registratienummer",
      "ZI-nummer",
      "AIP",
      "Minimale bestelgrootte",
      "Doosverpakking",
    ],
    ...rows.map((r) => [
      r.sku,
      r.product,
      r.size,
      r.regnr,
      r.zi,
      r.aip,
      r.minOrder,
      r.casePack,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "AIP");
  const blob = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const url = URL.createObjectURL(new Blob([blob]));
  const a = document.createElement("a");
  a.href = url;
  a.download = "AIP_prijslijst.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

/* ========== Page ========== */
export default function AipPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uiError, setUiError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await loadProducts();
        setRows(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setUiError(e?.message || "Fout bij laden.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const imported = await importFile(f);
      if (!Array.isArray(imported)) throw new Error("Bestand niet herkend.");
      setRows(imported);
    } catch (err: any) {
      setUiError(err?.message || "Import mislukt.");
    }
  }

  async function handleExport() {
    try {
      await exportExcel(rows);
    } catch (e: any) {
      setUiError(e?.message || "Export mislukt.");
    }
  }

  async function persist() {
    setBusy(true);
    setUiError(null);
    try {
      await saveProducts(rows);
    } catch (e: any) {
      setUiError(e?.message || "Opslaan mislukt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">AIP Prijsbeheer</h1>
        <p className="text-sm text-gray-600">
          Upload of bewerk de lijstprijzen. Exporteer of bewaar veilig in de portal.
        </p>
      </header>

      {uiError && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {uiError}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <label className="rounded-md border px-3 py-2 text-sm cursor-pointer bg-white hover:bg-gray-50">
          Upload CSV/XLSX
          <input
            type="file"
            className="hidden"
            accept=".csv,.xlsx,.xls"
            onChange={handleUpload}
          />
        </label>
        <button
          onClick={handleExport}
          className="rounded-md border px-3 py-2 text-sm bg-white hover:bg-gray-50"
        >
          Exporteer Excel
        </button>
        <button
          onClick={persist}
          disabled={busy}
          className="rounded-md border px-3 py-2 text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          {busy ? "Opslaan…" : "Opslaan"}
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Laden…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">SKU</th>
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2">AIP (€)</th>
                <th className="px-3 py-2">Min. order</th>
                <th className="px-3 py-2">Doos</th>
                <th className="px-3 py-2">ZI-nummer</th>
                <th className="px-3 py-2">Reg.nr</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{r.sku}</td>
                  <td className="px-3 py-2">{r.product}</td>
                  <td className="px-3 py-2 text-right">{r.aip.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{r.minOrder}</td>
                  <td className="px-3 py-2 text-right">{r.casePack}</td>
                  <td className="px-3 py-2">{r.zi}</td>
                  <td className="px-3 py-2">{r.regnr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
