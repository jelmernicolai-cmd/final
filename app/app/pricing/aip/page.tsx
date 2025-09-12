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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {}
}

function loadLocal(): ProductRow[] {
  try {
    const txt = localStorage.getItem(STORAGE_KEY);
    return txt ? (JSON.parse(txt) as ProductRow[]) : [];
  } catch {
    return [];
  }
}

/* ========== API helpers (defensief) ========== */
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
    saveLocal(rows); // fallback
  }
}

/* ========== Import / Export ========== */
async function importFile(file: File): Promise<ProductRow[]> {
  if (/\.(csv)$/i.test(file.name)) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (!lines.length) return [];
    const headers = lines[0].split(/[;,]/).map((h) => h.trim().toLowerCase());
    const idx = (k: string) => headers.indexOf(k);
    const out: ProductRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i].split(/[;,]/);
      out.push({
        sku: c[idx("sku")] || "",
        product: c[idx("product")] || "",
        size: c[idx("standaard verpakk. grootte")] || c[idx("standaard verpakk. grootte".toLowerCase())] || "",
        regnr: c[idx("registratienummer")] || "",
        zi: c[idx("zi-nummer")] || "",
        aip: Number((c[idx("aip")] || "0").replace(",", ".")) || 0,
        minOrder: Number((c[idx("minimale bestelgrootte")] || "0").replace(",", ".")) || 0,
        casePack: Number((c[idx("doosverpakking")] || "0").replace(",", ".")) || 0,
        custom: {},
      });
    }
    return out;
  } else if (/\.(xlsx|xls)$/i.test(file.name)) {
    const XLSX = await loadXLSX();
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
    return json.map((r: any) => ({
      sku: r["SKU nummer"] ?? r["sku"] ?? "",
      product: r["Product naam"] ?? r["product"] ?? "",
      size: r["Standaard Verpakk. Grootte"] ?? r["size"] ?? "",
      regnr: r["Registratienummer"] ?? r["regnr"] ?? "",
      zi: r["ZI-nummer"] ?? r["zi"] ?? "",
      aip: Number(String(r["AIP"] ?? r["aip"] ?? 0).replace(",", ".")) || 0,
      minOrder: Number(String(r["Minimale bestelgrootte"] ?? r["minOrder"] ?? 0).replace(",", ".")) || 0,
      casePack: Number(String(r["Doosverpakking"] ?? r["casePack"] ?? 0).replace(",", ".")) || 0,
      custom: Object.fromEntries(
        Object.entries(r)
          .filter(([k]) =>
            !["SKU nummer","sku","Product naam","product","Standaard Verpakk. Grootte","size","Registratienummer","regnr","ZI-nummer","zi","AIP","aip","Minimale bestelgrootte","minOrder","Doosverpakking","casePack"].includes(k)
          )
          .map(([k, v]) => [k, v as any])
      ),
    }));
  }
  throw new Error("Bestandsformaat niet ondersteund (.csv, .xlsx, .xls)");
}

async function exportExcel(rows: ProductRow[], customCols: string[]) {
  if (!rows.length) {
    alert("Geen rijen om te exporteren.");
    return;
  }
  const XLSX = await loadXLSX();
  const header = [
    "SKU nummer",
    "Product naam",
    "Standaard Verpakk. Grootte",
    "Registratienummer",
    "ZI-nummer",
    "AIP",
    "Minimale bestelgrootte",
    "Doosverpakking",
    ...customCols,
  ];
  const data = [
    header,
    ...rows.map((r) => [
      r.sku,
      r.product,
      r.size,
      r.regnr,
      r.zi,
      r.aip,
      r.minOrder,
      r.casePack,
      ...customCols.map((c) => r.custom?.[c] ?? ""),
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

/* ========== Small helpers ========== */
const eur = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0);

function isNumberLike(v: any) {
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "string") return !isNaN(Number(v.replace(",", ".")));
  return false;
}

/* ========== Component ========== */
export default function AipPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");

  // dynamische custom kolommen (union van alle r.custom keys)
  const customCols = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => Object.keys(r.custom || {}).forEach((k) => set.add(k)));
    return Array.from(set);
  }, [rows]);

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

  function updateRow(i: number, patch: Partial<ProductRow>) {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
    setDirty(true);
  }

  function updateCustom(i: number, key: string, val: string | number) {
    setRows((prev) => {
      const next = [...prev];
      const c = { ...(next[i].custom || {}) };
      c[key] = val;
      next[i] = { ...next[i], custom: c };
      return next;
    });
    setDirty(true);
  }

  function addRow() {
    setRows((prev) => [
      {
        sku: "",
        product: "",
        size: "",
        regnr: "",
        zi: "",
        aip: 0,
        minOrder: 0,
        casePack: 0,
        custom: {},
      },
      ...prev,
    ]);
    setDirty(true);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
    setDirty(true);
  }

  function addCustomColumn() {
    const key = prompt("Naam van extra kolom (custom):");
    if (!key) return;
    setRows((prev) =>
      prev.map((r) => ({ ...r, custom: { ...(r.custom || {}), [key]: r.custom?.[key] ?? "" } }))
    );
    setDirty(true);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const imported = await importFile(f);
      setRows(imported);
      setDirty(true);
      setUiError(null);
    } catch (err: any) {
      setUiError(err?.message || "Import mislukt.");
    } finally {
      e.currentTarget.value = "";
    }
  }

  async function handleExport() {
    try {
      await exportExcel(rows, customCols);
    } catch (e: any) {
      setUiError(e?.message || "Export mislukt.");
    }
  }

  async function persist() {
    setBusy(true);
    setUiError(null);
    try {
      await saveProducts(rows);
      saveLocal(rows); // altijd ook lokaal
      setDirty(false);
    } catch (e: any) {
      setUiError(e?.message || "Opslaan mislukt.");
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.sku.toLowerCase().includes(q) ||
        r.product.toLowerCase().includes(q) ||
        r.zi.toLowerCase().includes(q) ||
        r.regnr.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">AIP Prijsbeheer</h1>
          <p className="text-sm text-gray-600">
            Bewerk je lijstprijzen inline. Upload CSV/XLSX, exporteer naar Excel. Gegevens worden veilig opgeslagen (API of lokaal).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="rounded-md border px-3 py-2 text-sm cursor-pointer bg-white hover:bg-gray-50">
            Upload CSV/XLSX
            <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleUpload} />
          </label>
          <button onClick={handleExport} className="rounded-md border px-3 py-2 text-sm bg-white hover:bg-gray-50">
            Exporteer Excel
          </button>
          <button
            onClick={persist}
            disabled={busy || !dirty}
            className="rounded-md border px-3 py-2 text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {busy ? "Opslaan…" : dirty ? "Opslaan" : "Opgeslagen"}
          </button>
        </div>
      </header>

      {uiError && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{uiError}</div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op SKU / product / ZI / regnr…"
          className="w-full sm:w-80 rounded-md border px-3 py-2 text-sm"
        />
        <div className="ml-auto flex gap-2">
          <button className="rounded-md border px-3 py-2 text-sm bg-white hover:bg-gray-50" onClick={addRow}>
            + Rij
          </button>
          <button className="rounded-md border px-3 py-2 text-sm bg-white hover:bg-gray-50" onClick={addCustomColumn}>
            + Kolom
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Laden…</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <Th>SKU</Th>
                  <Th>Product</Th>
                  <Th>Grootte</Th>
                  <Th>Reg.nr</Th>
                  <Th>ZI-nummer</Th>
                  <Th className="text-right">AIP (€)</Th>
                  <Th className="text-right">Min. order</Th>
                  <Th className="text-right">Doos</Th>
                  {customCols.map((c) => (
                    <Th key={c}>{c}</Th>
                  ))}
                  <Th></Th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <Td>
                      <input
                        value={r.sku}
                        onChange={(e) => updateRow(i, { sku: e.target.value })}
                        className="w-full rounded border px-2 py-1"
                      />
                    </Td>
                    <Td>
                      <input
                        value={r.product}
                        onChange={(e) => updateRow(i, { product: e.target.value })}
                        className="w-full rounded border px-2 py-1"
                      />
                    </Td>
                    <Td>
                      <input
                        value={r.size}
                        onChange={(e) => updateRow(i, { size: e.target.value })}
                        className="w-full rounded border px-2 py-1"
                      />
                    </Td>
                    <Td>
                      <input
                        value={r.regnr}
                        onChange={(e) => updateRow(i, { regnr: e.target.value })}
                        className="w-full rounded border px-2 py-1"
                      />
                    </Td>
                    <Td>
                      <input
                        value={r.zi}
                        onChange={(e) => updateRow(i, { zi: e.target.value })}
                        className="w-full rounded border px-2 py-1"
                      />
                    </Td>
                    <Td className="text-right">
                      <input
                        inputMode="decimal"
                        value={String(r.aip)}
                        onChange={(e) =>
                          updateRow(i, { aip: isNumberLike(e.target.value) ? Number(e.target.value.replace(",", ".")) : r.aip })
                        }
                        className="w-28 rounded border px-2 py-1 text-right"
                      />
                      <div className="text-[10px] text-gray-500">{eur(r.aip)}</div>
                    </Td>
                    <Td className="text-right">
                      <input
                        inputMode="numeric"
                        value={String(r.minOrder)}
                        onChange={(e) =>
                          updateRow(i, { minOrder: isNumberLike(e.target.value) ? Number(e.target.value.replace(",", ".")) : r.minOrder })
                        }
                        className="w-20 rounded border px-2 py-1 text-right"
                      />
                    </Td>
                    <Td className="text-right">
                      <input
                        inputMode="numeric"
                        value={String(r.casePack)}
                        onChange={(e) =>
                          updateRow(i, { casePack: isNumberLike(e.target.value) ? Number(e.target.value.replace(",", ".")) : r.casePack })
                        }
                        className="w-20 rounded border px-2 py-1 text-right"
                      />
                    </Td>
                    {customCols.map((c) => (
                      <Td key={c}>
                        <input
                          value={String(r.custom?.[c] ?? "")}
                          onChange={(e) => updateCustom(i, c, e.target.value)}
                          className="w-full rounded border px-2 py-1"
                        />
                      </Td>
                    ))}
                    <Td className="text-right">
                      <button className="text-xs rounded border px-2 py-1 hover:bg-white/50" onClick={() => removeRow(i)}>
                        Verwijder
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((r, i) => (
              <div key={i} className="rounded-lg border p-3 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <b>{r.product || "(naamloos)"}</b>
                  <button className="text-xs rounded border px-2 py-1 hover:bg-gray-50" onClick={() => removeRow(i)}>
                    Verwijder
                  </button>
                </div>
                <Grid2>
                  <Field label="SKU">
                    <input value={r.sku} onChange={(e) => updateRow(i, { sku: e.target.value })} className="w-full rounded border px-2 py-1" />
                  </Field>
                  <Field label="ZI-nummer">
                    <input value={r.zi} onChange={(e) => updateRow(i, { zi: e.target.value })} className="w-full rounded border px-2 py-1" />
                  </Field>
                  <Field label="Reg.nr">
                    <input value={r.regnr} onChange={(e) => updateRow(i, { regnr: e.target.value })} className="w-full rounded border px-2 py-1" />
                  </Field>
                  <Field label="Grootte">
                    <input value={r.size} onChange={(e) => updateRow(i, { size: e.target.value })} className="w-full rounded border px-2 py-1" />
                  </Field>
                  <Field label="AIP (€)">
                    <input
                      inputMode="decimal"
                      value={String(r.aip)}
                      onChange={(e) =>
                        updateRow(i, { aip: isNumberLike(e.target.value) ? Number(e.target.value.replace(",", ".")) : r.aip })
                      }
                      className="w-full rounded border px-2 py-1 text-right"
                    />
                  </Field>
                  <Field label="Min. order">
                    <input
                      inputMode="numeric"
                      value={String(r.minOrder)}
                      onChange={(e) =>
                        updateRow(i, { minOrder: isNumberLike(e.target.value) ? Number(e.target.value.replace(",", ".")) : r.minOrder })
                      }
                      className="w-full rounded border px-2 py-1 text-right"
                    />
                  </Field>
                  <Field label="Doos">
                    <input
                      inputMode="numeric"
                      value={String(r.casePack)}
                      onChange={(e) =>
                        updateRow(i, { casePack: isNumberLike(e.target.value) ? Number(e.target.value.replace(",", ".")) : r.casePack })
                      }
                      className="w-full rounded border px-2 py-1 text-right"
                    />
                  </Field>
                </Grid2>
                {customCols.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="text-xs font-medium mb-1">Extra kolommen</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {customCols.map((c) => (
                        <Field key={c} label={c}>
                          <input
                            value={String(r.custom?.[c] ?? "")}
                            onChange={(e) => updateCustom(i, c, e.target.value)}
                            className="w-full rounded border px-2 py-1"
                          />
                        </Field>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ========== Small presentational components ========== */
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-left text-[12px] font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm">
      <div className="text-xs text-gray-600">{label}</div>
      {children}
    </label>
  );
}
function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{children}</div>;
}
