// app/app/pricing/aip/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

/** ========= Types ========= */
type Product = {
  sku: string;
  name: string;
  stdPack: string;                 // Standaard verpakkingsgrootte (vrij format: "1x30", "flacon 100ml", etc.)
  regNr: string;                   // Registratienummer
  zi: string;                      // ZI-nummer
  aip: number;                     // Apotheek InkoopPrijs (EUR)
  minOrder: number;                // Minimale bestelgrootte (stuks)
  casePack: number;                // Doosverpakking (stuks)
  custom?: Record<string, string | number>; // vrije kolommen
};

type GridRow = Product & { _id?: string }; // _id uit DB als aanwezig

/** ========= Helpers ========= */
const CURRENCY = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const NUM = (v: any) => {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

const STORAGE_KEY = "pharmgtn:aip-products:v1";

/** Backend helpers — automatisch fallback naar localStorage */
async function tryFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(input, { ...init, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function loadProducts(): Promise<GridRow[]> {
  // Probeer API
  const api = await tryFetch<GridRow[]>("/api/pricing/products");
  if (api) return api;

  // Fallback: localStorage
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  }
  return [];
}

async function saveProducts(rows: GridRow[]): Promise<void> {
  // Probeer bulk-upsert API
  const ok = await tryFetch<{ ok: true }>("/api/pricing/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rows),
  });
  if (ok) return;
  // Fallback
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

/** ========= CSV/Excel import/export ========= */
function normalizeHeader(h: string) {
  const s = h.toLowerCase().trim();
  // veelgebruikte varianten mappen
  if (["sku", "productcode"].includes(s)) return "sku";
  if (["product", "productnaam", "naam"].includes(s)) return "name";
  if (["standaard verpakk. grootte", "std pack", "verpakking", "verpakkingsgrootte"].includes(s)) return "stdPack";
  if (["registratienummer", "regnr", "rvg", "eu nr"].includes(s)) return "regNr";
  if (["zi", "zi-nummer", "zi nummer"].includes(s)) return "zi";
  if (["aip", "lijstprijs", "apotheek inkoopprijs", "listprijs"].includes(s)) return "aip";
  if (["minimale bestelgrootte", "minorder", "min order"].includes(s)) return "minOrder";
  if (["doosverpakking", "case", "casepack", "case pack"].includes(s)) return "casePack";
  return s; // custom headers blijven bestaan
}

function rowFromObj(o: any): GridRow {
  // standaardvelden uithalen
  const std: GridRow = {
    sku: String(o.sku ?? "").trim(),
    name: String(o.name ?? o.product ?? "").trim(),
    stdPack: String(o.stdPack ?? o["standaard verpakk. grootte"] ?? "").trim(),
    regNr: String(o.regNr ?? o.registratienummer ?? "").trim(),
    zi: String(o.zi ?? o["zi-nummer"] ?? "").trim(),
    aip: NUM(o.aip),
    minOrder: Math.max(0, Math.round(NUM(o.minOrder))),
    casePack: Math.max(0, Math.round(NUM(o.casePack))),
    custom: {},
  };
  // custom velden
  Object.keys(o).forEach((k) => {
    if (!["sku","name","stdPack","regNr","zi","aip","minOrder","casePack","_id"].includes(k)) {
      std.custom![k] = o[k];
    }
  });
  return std;
}

async function importFile(file: File): Promise<GridRow[]> {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "xlsx" || ext === "xls") {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
    const mapped = json.map((r) => {
      const lower = Object.fromEntries(
        Object.entries(r).map(([k, v]) => [normalizeHeader(String(k)), v])
      );
      return rowFromObj(lower);
    });
    return mapped;
  }
  if (ext === "csv") {
    const text = await file.text();
    const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
    if (!lines.length) return [];
    const rawHeaders = lines[0].split(/[;,]/).map((h) => normalizeHeader(h));
    const out: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[;,]/);
      const obj: any = {};
      rawHeaders.forEach((h, idx) => (obj[h] = cols[idx] ?? ""));
      out.push(obj);
    }
    return out.map(rowFromObj);
  }
  throw new Error("Ondersteunde formaten: .xlsx, .xls, .csv");
}

function exportExcel(rows: GridRow[]) {
  const allCustomKeys = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r.custom || {})))
  ).sort();

  const data = [
    [
      "SKU",
      "Product naam",
      "Standaard Verpakk. Grootte",
      "Registratienummer",
      "ZI-nummer",
      "AIP (EUR)",
      "Min. bestelgrootte",
      "Doosverpakking",
      ...allCustomKeys,
    ],
    ...rows.map((r) => [
      r.sku,
      r.name,
      r.stdPack,
      r.regNr,
      r.zi,
      r.aip,
      r.minOrder,
      r.casePack,
      ...allCustomKeys.map((k) => (r.custom ? r.custom[k] ?? "" : "")),
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "AIP");
  const blob = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const url = URL.createObjectURL(new Blob([blob], { type: "application/octet-stream" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "aip_prijslijst.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

/** ========= UI building blocks ========= */
function Field({
  value,
  onChange,
  type = "text",
  className,
  placeholder,
  onBlur,
}: {
  value: string | number;
  onChange: (v: string) => void;
  type?: "text" | "number";
  className?: string;
  placeholder?: string;
  onBlur?: () => void;
}) {
  return (
    <input
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      type={type}
      className={
        "w-full rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/40 " +
        (className || "")
      }
      placeholder={placeholder}
    />
  );
}

/** ========= Page ========= */
export default function AipPricingPage() {
  const [rows, setRows] = useState<GridRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<keyof GridRow | "aip_desc">("sku");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await loadProducts();
      setRows(data);
      setLoading(false);
    })();
  }, []);

  // zoeken & sorteren
  const filtered = useMemo(() => {
    const txt = q.trim().toLowerCase();
    let list = !txt
      ? rows
      : rows.filter((r) =>
          [r.sku, r.name, r.regNr, r.zi].some((f) => String(f).toLowerCase().includes(txt))
        );
    list = [...list];
    if (sortKey === "aip_desc") list.sort((a, b) => (b.aip || 0) - (a.aip || 0));
    else list.sort((a, b) => String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? "")));
    return list;
  }, [rows, q, sortKey]);

  function addRow() {
    setRows((r) => [
      {
        sku: "",
        name: "",
        stdPack: "",
        regNr: "",
        zi: "",
        aip: 0,
        minOrder: 0,
        casePack: 0,
        custom: {},
      },
      ...r,
    ]);
  }
  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx));
  }

  async function persist() {
    setBusy(true);
    try {
      await saveProducts(rows);
    } finally {
      setBusy(false);
    }
  }

  function setCell(idx: number, patch: Partial<GridRow>) {
    setRows((r) => {
      const next = [...r];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function setCustom(idx: number, key: string, val: string) {
    setRows((r) => {
      const next = [...r];
      const cur = next[idx];
      const custom = { ...(cur.custom || {}) };
      custom[key] = val;
      next[idx] = { ...cur, custom };
      return next;
    });
  }

  function addCustomColumn(colName: string) {
    const key = normalizeHeader(colName);
    if (!key) return;
    setRows((r) =>
      r.map((row) => ({
        ...row,
        custom: { ...(row.custom || {}), [key]: row.custom?.[key] ?? "" },
      }))
    );
  }

  const allCustomKeys = useMemo(
    () => Array.from(new Set(rows.flatMap((r) => Object.keys(r.custom || {})))).sort(),
    [rows]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AIP — Prijsbeheer</h1>
          <p className="text-sm text-gray-600">
            Beheer standaard lijstprijzen per SKU. Import/Export Excel, voeg custom kolommen toe en synchroniseer met de secure backend.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={addRow}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            + Regel
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Importeren (Excel/CSV)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const imported = await importFile(f);
                // merge op sku (upsert)
                const bySku = new Map<string, GridRow>();
                rows.forEach((r) => bySku.set(r.sku, r));
                imported.forEach((r) => {
                  if (!r.sku) return;
                  const prev = bySku.get(r.sku);
                  bySku.set(r.sku, prev ? { ...prev, ...r, custom: { ...(prev.custom || {}), ...(r.custom || {}) } } : r);
                });
                setRows(Array.from(bySku.values()));
              } catch (err: any) {
                alert(err?.message || "Import mislukt");
              } finally {
                e.currentTarget.value = "";
              }
            }}
            className="hidden"
          />
          <button
            onClick={() => exportExcel(rows)}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Exporteren (Excel)
          </button>
          <button
            onClick={persist}
            disabled={busy}
            className="rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2 text-sm text-white hover:opacity-95 disabled:opacity-60"
          >
            {busy ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      </header>

      {/* Filters */}
      <section className="rounded-2xl border bg-white p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Zoek op SKU / naam / registratienr / ZI…"
            className="w-72 rounded-md border px-3 py-2 text-sm"
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as any)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="sku">Sorteer op SKU</option>
            <option value="name">Sorteer op naam</option>
            <option value="aip_desc">Sorteer op AIP (hoog → laag)</option>
            <option value="regNr">Sorteer op registratienr</option>
            <option value="zi">Sorteer op ZI</option>
          </select>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-500">Custom kolom toevoegen:</span>
            <CustomAdder onAdd={addCustomColumn} />
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="rounded-2xl border bg-white overflow-x-auto">
        <table className="min-w-[900px] w-full border-collapse">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              <Th>Acties</Th>
              <Th>SKU</Th>
              <Th>Product naam</Th>
              <Th>Standaard Verpakk. Grootte</Th>
              <Th>Registratienummer</Th>
              <Th>ZI-nummer</Th>
              <Th className="text-right">AIP</Th>
              <Th className="text-right">Min. bestelgrootte</Th>
              <Th className="text-right">Doosverpakking</Th>
              {allCustomKeys.map((k) => (
                <Th key={k}>{k}</Th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr>
                <td colSpan={9 + allCustomKeys.length} className="px-3 py-4 text-center text-gray-500">
                  Laden…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9 + allCustomKeys.length} className="px-3 py-6 text-center text-gray-500">
                  Geen rijen. Voeg regels toe of importeer vanuit Excel/CSV.
                </td>
              </tr>
            ) : (
              filtered.map((r, idx) => {
                const i = rows.indexOf(r); // index in originele array (voor setCell)
                return (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-2">
                      <button
                        onClick={() => removeRow(i)}
                        className="text-xs rounded border px-2 py-1 hover:bg-gray-50"
                        title="Verwijder regel"
                      >
                        Verwijder
                      </button>
                    </td>
                    <Td>
                      <Field value={r.sku} onChange={(v) => setCell(i, { sku: v })} />
                    </Td>
                    <Td>
                      <Field value={r.name} onChange={(v) => setCell(i, { name: v })} />
                    </Td>
                    <Td>
                      <Field value={r.stdPack} onChange={(v) => setCell(i, { stdPack: v })} placeholder="bv. 1x30" />
                    </Td>
                    <Td>
                      <Field value={r.regNr} onChange={(v) => setCell(i, { regNr: v })} />
                    </Td>
                    <Td>
                      <Field value={r.zi} onChange={(v) => setCell(i, { zi: v })} />
                    </Td>
                    <Td className="text-right">
                      <Field
                        type="number"
                        value={r.aip}
                        onChange={(v) => setCell(i, { aip: NUM(v) })}
                      />
                      <div className="text-[11px] text-gray-500">{CURRENCY.format(r.aip || 0)}</div>
                    </Td>
                    <Td className="text-right">
                      <Field
                        type="number"
                        value={r.minOrder}
                        onChange={(v) => setCell(i, { minOrder: Math.max(0, Math.round(NUM(v))) })}
                      />
                    </Td>
                    <Td className="text-right">
                      <Field
                        type="number"
                        value={r.casePack}
                        onChange={(v) => setCell(i, { casePack: Math.max(0, Math.round(NUM(v))) })}
                      />
                    </Td>
                    {allCustomKeys.map((k) => (
                      <Td key={k}>
                        <Field value={String(r.custom?.[k] ?? "")} onChange={(v) => setCustom(i, k, v)} />
                      </Td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* Hints & volgende stap */}
      <section className="rounded-2xl border bg-white p-4 text-sm text-gray-700">
        <b>Volgende stap</b>: per klant GIP-lijsten genereren op basis van AIP − groothandelskorting.
        Zodra je <code>/api/pricing/customers</code> en <code>/api/pricing/gip</code> toevoegt, kunnen we hier een “Genereer GIP” knop plaatsen.
        <div className="mt-2 text-xs text-gray-500">
          Tip: Bewaar registratienummers zorgvuldig—dan kunnen we later automatisch Wgp-mutaties mappen en een “voorgestelde nieuwe AIP” simuleren.
        </div>
      </section>
    </div>
  );
}

/** ========= Tiny UI elems ========= */
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-left font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}
function CustomAdder({ onAdd }: { onAdd: (name: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex items-center gap-2">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="bv. kortingsgroep"
        className="w-48 rounded-md border px-3 py-2 text-sm"
      />
      <button
        onClick={() => {
          const name = v.trim();
          if (!name) return;
          onAdd(name);
          setV("");
        }}
        className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
      >
        + Kolom
      </button>
    </div>
  );
}
