"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

/* ---------- Types (gealigneerd met lib/pricing/db.ts) ---------- */
type Product = {
  sku: string;
  productName: string;
  packSize: string;
  registration: string;
  zi: string;
  aip: number;
  minOrder: number;
  casePack: string;
  custom?: Record<string, string | number | boolean | null>;
};

type Customer = {
  id: string;
  name: string;
  discountPct: number;
};

/* ---------- Helpers ---------- */
const eur = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n || 0);

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseNumber(v: any) {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/* ---------- CSV/XLSX import ---------- */
async function parseFileProducts(file: File): Promise<Product[]> {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "csv") {
    const text = await file.text();
    const wb = XLSX.read(text, { type: "string" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
    return normalizeProducts(rows);
  } else {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
    return normalizeProducts(rows);
  }
}

function normalizeProducts(rows: any[]): Product[] {
  const lower = (o: any) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [String(k).toLowerCase().trim(), v]));
  const need = ["sku", "product naam", "standaard verpakk. grootte", "registratienummer", "zi-nummer", "aip (eur)", "minimale bestelgrootte", "doosverpakking"];

  const out: Product[] = rows.map((r0) => {
    const r = lower(r0);
    const miss = need.filter((n) => !(n in r));
    if (miss.length) {
      throw new Error(
        `Ontbrekende kolommen: ${miss.join(", ")}. Vereist: ${need.join(", ")}`
      );
    }
    return {
      sku: String(r["sku"]).trim(),
      productName: String(r["product naam"]).trim(),
      packSize: String(r["standaard verpakk. grootte"]).trim(),
      registration: String(r["registratienummer"]).trim(),
      zi: String(r["zi-nummer"]).trim(),
      aip: parseNumber(r["aip (eur)"]),
      minOrder: parseNumber(r["minimale bestelgrootte"]),
      casePack: String(r["doosverpakking"]).trim(),
    };
  });
  return out;
}

async function parseFileCustomers(file: File): Promise<Customer[]> {
  const ext = file.name.toLowerCase().split(".").pop();
  let rows: any[] = [];
  if (ext === "csv") {
    const text = await file.text();
    const wb = XLSX.read(text, { type: "string" });
    rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
  } else {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
  }

  const lower = (o: any) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [String(k).toLowerCase().trim(), v]));
  const need = ["klant", "korting %"];
  const out: Customer[] = rows.map((r0, i) => {
    const r = lower(r0);
    const miss = need.filter((n) => !(n in r));
    if (miss.length) {
      throw new Error(`Ontbrekende kolommen: ${miss.join(", ")}. Vereist: ${need.join(", ")}`);
    }
    return {
      id: "c" + (i + 1),
      name: String(r["klant"]).trim(),
      discountPct: parseNumber(r["korting %"]),
    };
  });
  return out;
}

/* ---------- REST calls ---------- */
async function apiGetProducts(): Promise<Product[]> {
  const res = await fetch("/api/pricing/products", { cache: "no-store" });
  const j = await res.json();
  if (!j?.ok) throw new Error(j?.error || "Products ophalen mislukt");
  return j.rows || [];
}
async function apiSaveProducts(rows: Product[]) {
  const res = await fetch("/api/pricing/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
  const j = await res.json();
  if (!j?.ok) throw new Error(j?.error || "Products opslaan mislukt");
  return j;
}

async function apiGetCustomers(): Promise<Customer[]> {
  const res = await fetch("/api/pricing/customers", { cache: "no-store" });
  const j = await res.json();
  if (!j?.ok) throw new Error(j?.error || "Klanten ophalen mislukt");
  return j.rows || [];
}
async function apiSaveCustomers(rows: Customer[]) {
  const res = await fetch("/api/pricing/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
  const j = await res.json();
  if (!j?.ok) throw new Error(j?.error || "Klanten opslaan mislukt");
  return j;
}

async function apiExportGIP(payload?: { includeMasterTab?: boolean }) {
  const res = await fetch("/api/pricing/gip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new Error(j?.error || "GIP export mislukt");
  }
  const blob = await res.blob();
  downloadBlob(blob, "GIP_lists.xlsx");
}

/* ---------- UI ---------- */
function Toolbar({
  tab,
  setTab,
  onImport,
  onSave,
  onExport,
  busy,
}: {
  tab: "products" | "customers";
  setTab: (t: "products" | "customers") => void;
  onImport: (file: File) => void;
  onSave: () => void;
  onExport: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border overflow-hidden">
        <button
          onClick={() => setTab("products")}
          className={`px-3 py-2 text-sm ${tab === "products" ? "bg-sky-50 text-sky-800" : "bg-white text-gray-700 hover:bg-gray-50"}`}
        >
          Producten (AIP)
        </button>
        <button
          onClick={() => setTab("customers")}
          className={`px-3 py-2 text-sm border-l ${tab === "customers" ? "bg-sky-50 text-sky-800" : "bg-white text-gray-700 hover:bg-gray-50"}`}
        >
          Klanten (korting)
        </button>
      </div>

      <label className="ml-1 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
        Importeer CSV/XLSX
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.currentTarget.value = "";
          }}
          disabled={busy}
        />
      </label>

      <button
        onClick={onSave}
        disabled={busy}
        className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
      >
        Opslaan
      </button>

      <div className="ml-auto" />

      <button
        onClick={onExport}
        className="rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2 text-sm text-white hover:opacity-95"
      >
        Exporteer GIP Excel
      </button>
    </div>
  );
}

function ProductsTable({
  rows,
  setRows,
}: {
  rows: Product[];
  setRows: (rows: Product[]) => void;
}) {
  function update(idx: number, key: keyof Product, val: any) {
    const next = [...rows];
    (next[idx] as any)[key] = key === "aip" || key === "minOrder" ? parseNumber(val) : val;
    setRows(next);
  }
  function addRow() {
    setRows([
      ...rows,
      {
        sku: "",
        productName: "",
        packSize: "",
        registration: "",
        zi: "",
        aip: 0,
        minOrder: 0,
        casePack: "",
      },
    ]);
  }
  function delRow(i: number) {
    const next = rows.slice();
    next.splice(i, 1);
    setRows(next);
  }

  return (
    <div className="overflow-auto rounded-xl border bg-white">
      <table className="min-w-[900px] w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="border-b">
            {["SKU", "Product", "Verp.grootte", "Registrnr.", "ZI-nummer", "AIP (EUR)", "Min. bestel", "Doosverpakking", ""].map((h) => (
              <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-slate-50/60">
              <td className="px-3 py-1.5"><input className="w-full border rounded px-2 py-1" value={r.sku} onChange={(e) => update(i, "sku", e.target.value)} /></td>
              <td className="px-3 py-1.5"><input className="w-full border rounded px-2 py-1" value={r.productName} onChange={(e) => update(i, "productName", e.target.value)} /></td>
              <td className="px-3 py-1.5"><input className="w-full border rounded px-2 py-1" value={r.packSize} onChange={(e) => update(i, "packSize", e.target.value)} /></td>
              <td className="px-3 py-1.5"><input className="w-full border rounded px-2 py-1" value={r.registration} onChange={(e) => update(i, "registration", e.target.value)} /></td>
              <td className="px-3 py-1.5"><input className="w-full border rounded px-2 py-1" value={r.zi} onChange={(e) => update(i, "zi", e.target.value)} /></td>
              <td className="px-3 py-1.5">
                <input type="number" step="0.01" className="w-full border rounded px-2 py-1" value={r.aip} onChange={(e) => update(i, "aip", e.target.value)} />
              </td>
              <td className="px-3 py-1.5">
                <input type="number" step="1" className="w-full border rounded px-2 py-1" value={r.minOrder} onChange={(e) => update(i, "minOrder", e.target.value)} />
              </td>
              <td className="px-3 py-1.5"><input className="w-full border rounded px-2 py-1" value={r.casePack} onChange={(e) => update(i, "casePack", e.target.value)} /></td>
              <td className="px-3 py-1.5 text-right">
                <button onClick={() => delRow(i)} className="text-xs rounded border px-2 py-1 hover:bg-gray-50">Verwijder</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-3 border-t bg-white">
        <button onClick={addRow} className="text-sm rounded border px-3 py-1.5 hover:bg-gray-50">+ Rij toevoegen</button>
      </div>
    </div>
  );
}

function CustomersTable({
  rows,
  setRows,
}: {
  rows: Customer[];
  setRows: (rows: Customer[]) => void;
}) {
  function update(idx: number, key: keyof Customer, val: any) {
    const next = [...rows];
    (next[idx] as any)[key] = key === "discountPct" ? parseNumber(val) : val;
    setRows(next);
  }
  function addRow() {
    setRows([
      ...rows,
      {
        id: "c" + (rows.length + 1),
        name: "",
        discountPct: 0,
      },
    ]);
  }
  function delRow(i: number) {
    const next = rows.slice();
    next.splice(i, 1);
    setRows(next);
  }

  return (
    <div className="overflow-auto rounded-xl border bg-white">
      <table className="min-w-[520px] w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="border-b">
            {["ID", "Klant", "Korting %", ""].map((h) => (
              <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-slate-50/60">
              <td className="px-3 py-1.5">
                <input className="w-full border rounded px-2 py-1" value={r.id} onChange={(e) => update(i, "id", e.target.value)} />
              </td>
              <td className="px-3 py-1.5">
                <input className="w-full border rounded px-2 py-1" value={r.name} onChange={(e) => update(i, "name", e.target.value)} />
              </td>
              <td className="px-3 py-1.5">
                <input type="number" step="0.1" className="w-full border rounded px-2 py-1" value={r.discountPct} onChange={(e) => update(i, "discountPct", e.target.value)} />
              </td>
              <td className="px-3 py-1.5 text-right">
                <button onClick={() => delRow(i)} className="text-xs rounded border px-2 py-1 hover:bg-gray-50">Verwijder</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-3 border-t bg-white">
        <button onClick={addRow} className="text-sm rounded border px-3 py-1.5 hover:bg-gray-50">+ Rij toevoegen</button>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function PricingPage() {
  const [tab, setTab] = useState<"products" | "customers">("products");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // initial fetch
  useEffect(() => {
    (async () => {
      try {
        setBusy(true);
        const [p, c] = await Promise.all([apiGetProducts(), apiGetCustomers()]);
        setProducts(p);
        setCustomers(c);
      } catch (e: any) {
        setMsg(e?.message || "Initialisatie mislukt");
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  const onImport = async (file: File) => {
    try {
      setBusy(true);
      setMsg(null);
      if (tab === "products") {
        const rows = await parseFileProducts(file);
        setProducts(rows);
        setMsg(`Geïmporteerd: ${rows.length} producten`);
      } else {
        const rows = await parseFileCustomers(file);
        setCustomers(rows);
        setMsg(`Geïmporteerd: ${rows.length} klanten`);
      }
    } catch (e: any) {
      setMsg(e?.message || "Import mislukt");
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    try {
      setBusy(true);
      setMsg(null);
      if (tab === "products") {
        await apiSaveProducts(products);
        setMsg(`Opgeslagen: ${products.length} producten`);
      } else {
        await apiSaveCustomers(customers);
        setMsg(`Opgeslagen: ${customers.length} klanten`);
      }
    } catch (e: any) {
      setMsg(e?.message || "Opslaan mislukt");
    } finally {
      setBusy(false);
    }
  };

  const onExport = async () => {
    try {
      setBusy(true);
      setMsg(null);
      await apiExportGIP({ includeMasterTab: true });
      setMsg("GIP Excel geëxporteerd");
    } catch (e: any) {
      setMsg(e?.message || "Export mislukt");
    } finally {
      setBusy(false);
    }
  };

  // Snelle KPI’s (zicht op effect kort
