"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";

/** ---------------- Types ---------------- */
type AIPRow = {
  sku: string;
  name: string;
  pack: string;
  reg: string;
  zi: string;
  aip: number;
  moq: number;
  caseQty: number;
  custom?: Record<string, string | number>;
};

type Customer = {
  id: string;
  name: string;
  distPct: number;   // distributievergoeding (0–1)
  extraPct: number;  // extra korting (0–1)
  enable: boolean;
};

type ImportRow = Record<string, any>;

/** ---------------- Helpers ---------------- */
const eur = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(isFinite(n) ? n : 0);

function coerceNum(v: any, def = 0) {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return isFinite(n) ? n : def;
}
function trimStr(v: any) {
  return String(v ?? "").trim();
}

function normHeaders(o: Record<string, any>) {
  const map = new Map<string, any>();
  Object.entries(o).forEach(([k, v]) => map.set(k.toLowerCase().trim(), v));
  const pick = (...keys: string[]) => {
    for (const k of keys) if (map.has(k)) return map.get(k);
    return undefined;
  };
  return {
    sku: pick("sku", "sku nummer", "sku_nummer", "productcode"),
    name: pick("product naam", "productnaam", "naam"),
    pack: pick("standaard verpakk. grootte", "verpakking", "pack", "standaard verpakking", "standaard verpakkingsgrootte"),
    reg: pick("registratienummer", "rvg", "rvgnr", "registratie"),
    zi: pick("zi-nummer", "zi", "zinummer"),
    aip: pick("aip", "apotheekinkoopprijs", "lijstprijs"),
    moq: pick("minimale bestelgrootte", "min order", "moq"),
    caseQty: pick("doosverpakking", "case", "doos", "caseqty", "case_qty"),
    rest: Object.fromEntries(
      [...map.entries()].filter(([k]) =>
        ![
          "sku","sku nummer","sku_nummer","productcode",
          "product naam","productnaam","naam",
          "standaard verpakk. grootte","verpakking","pack","standaard verpakking","standaard verpakkingsgrootte",
          "registratienummer","rvg","rvgnr","registratie",
          "zi-nummer","zi","zinummer",
          "aip","apotheekinkoopprijs","lijstprijs",
          "minimale bestelgrootte","min order","moq",
          "doosverpakking","case","doos","caseqty","case_qty",
        ].includes(k)
      )
    ),
  };
}

function toAipRow(r: Record<string, any>): AIPRow {
  const n = normHeaders(r);
  const aip = coerceNum(n.aip, NaN);
  return {
    sku: trimStr(n.sku),
    name: trimStr(n.name),
    pack: trimStr(n.pack),
    reg: trimStr(n.reg),
    zi: trimStr(n.zi),
    aip: isFinite(aip) ? parseFloat(aip.toFixed(4)) : NaN,
    moq: Math.max(0, Math.round(coerceNum(n.moq, 0))),
    caseQty: Math.max(0, Math.round(coerceNum(n.caseQty, 0))),
    custom: Object.fromEntries(Object.entries(n.rest).map(([k, v]) => [k, typeof v === "number" ? v : trimStr(v)])),
  };
}

async function parseXlsxOrCsv(file: File): Promise<ImportRow[]> {
  const buf = await file.arrayBuffer();
  if (/\.(xlsx|xls)$/i.test(file.name)) {
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: "" });
  }
  if (/\.(csv)$/i.test(file.name)) {
    const text = new TextDecoder().decode(buf);
    // Probeer via XLSX csv reader:
    try {
      const wb = XLSX.read(text, { type: "string" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json(ws, { defval: "" });
    } catch {
      // fallback basic parser
      const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
      if (!lines.length) return [];
      const delim = lines[0].includes(";") ? ";" : ",";
      const headers = lines.shift()!.split(delim).map((s) => s.trim());
      return lines.map((l) => {
        const cols = l.split(delim);
        const o: any = {};
        headers.forEach((h, i) => (o[h] = cols[i] ?? ""));
        return o;
      });
    }
  }
  throw new Error("Ondersteund: .xlsx, .xls of .csv");
}

/** ---------------- Page ---------------- */
export default function GIPPage() {
  const [aipRows, setAipRows] = useState<AIPRow[]>([]);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);

  // Klanten (max 10)
  const [customers, setCustomers] = useState<Customer[]>(
    Array.from({ length: 5 }).map((_, i) => ({
      id: `C${i + 1}`,
      name: `Groothandel ${String.fromCharCode(65 + i)}`,
      distPct: i === 0 ? 0.08 : 0.1, // voorbeeld
      extraPct: i === 0 ? 0.02 : 0.01,
      enable: true,
    }))
  );

  // Ronde & minima
  const [roundCents, setRoundCents] = useState(true); // afronden op 2 decimalen
  const [floorToMOQ, setFloorToMOQ] = useState(false); // optioneel: niets doen met units, hier alleen prijsberekening
  const [activeTab, setActiveTab] = useState(0); // klant-tab

  // Init: haal optioneel AIP uit sessionStorage (als AIP page deze daar heeft gezet)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pharmgtn:aip_rows");
      if (raw) {
        const arr = JSON.parse(raw) as AIPRow[];
        if (Array.isArray(arr)) setAipRows(arr);
      }
    } catch {/* ignore */}
  }, []);

  async function onUploadAIP(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const rows = await parseXlsxOrCsv(file);
      const parsed = rows.map(toAipRow).filter((r) => r.sku && isFinite(r.aip));
      setAipRows(parsed);
      // optioneel in session opslaan
      try { sessionStorage.setItem("pharmgtn:aip_rows", JSON.stringify(parsed)); } catch {}
    } catch (err: any) {
      alert(err?.message || "Upload mislukt");
    } finally {
      setBusy(false);
      e.currentTarget.value = "";
    }
  }

  // Filter (sku, naam, reg, zi)
  const visibleAip = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return aipRows;
    return aipRows.filter((r) =>
      [r.sku, r.name, r.reg, r.zi].some((s) => (s || "").toLowerCase().includes(q))
    );
  }, [aipRows, filter]);

  // GIP berekening per klant
  function calcGIP(aip: number, distPct: number, extraPct: number) {
    const raw = aip * (1 - Math.max(0, distPct)) * (1 - Math.max(0, extraPct));
    const v = roundCents ? Math.round(raw * 100) / 100 : raw;
    return Math.max(0, v);
  }

  const tabs = customers.filter(c => c.enable).slice(0, 10);

  // KPI’s
  const kpis = useMemo(() => {
    const n = visibleAip.length;
    const avgAIP = n ? visibleAip.reduce((s, r) => s + (r.aip || 0), 0) / n : 0;
    const any = tabs[activeTab];
    const avgGIP = any ? (n ? visibleAip.reduce((s, r) => s + calcGIP(r.aip || 0, any.distPct, any.extraPct), 0) / n : 0) : 0;
    return { n, avgAIP, avgGIP };
  }, [visibleAip, tabs, activeTab, roundCents]);

  function setCustomer(idx: number, next: Partial<Customer>) {
    setCustomers((cur) => cur.map((c, i) => (i === idx ? { ...c, ...next } : c)));
  }

  function exportExcel() {
    if (!aipRows.length) {
      alert("Geen AIP-gegevens om te exporteren.");
      return;
    }
    const wb = XLSX.utils.book_new();

    for (const c of tabs) {
      const rows = aipRows.map((r) => ({
        SKU: r.sku,
        Product: r.name,
        Verpakking: r.pack,
        Registratie: r.reg,
        "ZI-nummer": r.zi,
        AIP: r.aip,
        "Dist. fee %": c.distPct,
        "Extra korting %": c.extraPct,
        GIP: calcGIP(r.aip || 0, c.distPct, c.extraPct),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, (c.name || c.id).slice(0, 31));
    }

    // optioneel: referentie-tab met bron AIP
    const ref = aipRows.map((r) => ({
      SKU: r.sku,
      Product: r.name,
      Verpakking: r.pack,
      Registratie: r.reg,
      "ZI-nummer": r.zi,
      AIP: r.aip,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ref), "AIP_ref");

    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "GIP_lijsten.xlsx";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 space-y-6">
      {/* HERO */}
      <header className="rounded-2xl border bg-white p-4 sm:p-5">
        <h1 className="text-xl sm:text-2xl font-semibold">GIP-lijsten – op basis van AIP</h1>
        <p className="text-sm text-gray-700 mt-1">
          Genereer <b>Groothandel Inkoop Prijs</b> per klant op basis van je AIP-lijst en twee kortingstypen:
          <b> distributievergoeding</b> en <b>extra korting</b>.
          <br />
          Formule: <code>GIP = AIP × (1 − dist%) × (1 − extra%)</code>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="inline-flex items-center gap-2 rounded-lg bg-sky-600 text-white text-sm px-4 py-2 hover:opacity-95 cursor-pointer">
            AIP uploaden (.xlsx/.csv)
            <input type="file" accept=".xlsx,.xls,.csv" onChange={onUploadAIP} className="hidden" />
          </label>
          <button onClick={exportExcel} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
            Exporteer GIP (Excel)
          </button>
          <div className="ml-auto flex items-center gap-2">
            <input
              placeholder="Zoek sku/naam/ZI/RVG…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm w-48 sm:w-64"
            />
          </div>
        </div>
        {busy && <div className="mt-2 text-sm text-gray-600">Bestand verwerken…</div>}
      </header>

      {/* KPI’s */}
      <section className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <Kpi title="# SKUs" value={String(kpis.n)} />
        <Kpi title="Gem. AIP" value={eur(kpis.avgAIP)} />
        <Kpi title="Gem. GIP (actieve klant)" value={eur(kpis.avgGIP)} />
        <Kpi title="Actieve klanten" value={String(tabs.length)} help="Max 10 klanten" />
      </section>

      {/* Klant-config */}
      <section className="rounded-2xl border bg-white p-3 sm:p-4">
        <h3 className="text-sm font-semibold mb-2">Klanten & kortingen</h3>
        <div className="overflow-auto">
          <table className="min-w-[720px] w-full text-sm border-collapse">
            <thead className="bg-slate-50 border-b">
              <tr>
                <Th>Active</Th>
                <Th>Klantnaam</Th>
                <Th className="text-right">Distributievergoeding %</Th>
                <Th className="text-right">Extra korting %</Th>
                <Th>Tab</Th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map((c, i) => (
                <tr key={c.id}>
                  <Td>
                    <input
                      type="checkbox"
                      checked={c.enable}
                      onChange={(e) => setCustomer(i, { enable: e.target.checked })}
                    />
                  </Td>
                  <Td>
                    <input
                      value={c.name}
                      onChange={(e) => setCustomer(i, { name: e.target.value })}
                      className="w-full rounded-md border px-2 py-1.5"
                      placeholder={`Klant ${c.id}`}
                    />
                  </Td>
                  <Td className="text-right">
                    <PctInput value={c.distPct} onChange={(v) => setCustomer(i, { distPct: clampPct(v) })} />
                  </Td>
                  <Td className="text-right">
                    <PctInput value={c.extraPct} onChange={(v) => setCustomer(i, { extraPct: clampPct(v) })} />
                  </Td>
                  <Td>
                    <button
                      onClick={() => setActiveTab(Math.max(0, tabs.findIndex(t => t.id === c.id)))}
                      className={"rounded border px-2 py-1 text-xs " + (tabs[activeTab]?.id === c.id ? "bg-sky-50" : "hover:bg-gray-50")}
                      disabled={!c.enable}
                    >
                      Open
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={roundCents} onChange={(e) => setRoundCents(e.target.checked)} />
            <span>Afronden op centen (2 dec.)</span>
          </label>
          <label className="inline-flex items-center gap-2 opacity-60">
            <input type="checkbox" checked={floorToMOQ} onChange={(e) => setFloorToMOQ(e.target.checked)} />
            <span>MOQ-/dooslogica (n.v.t. op prijs, alleen units)</span>
          </label>
        </div>
      </section>

      {/* Tabs + Tabel */}
      <section className="rounded-2xl border bg-white p-0">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1 border-b p-2">
          {tabs.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setActiveTab(i)}
              className={
                "rounded-lg px-3 py-1.5 text-sm " +
                (i === activeTab ? "bg-sky-600 text-white" : "border hover:bg-gray-50")
              }
            >
              {c.name || c.id}
            </button>
          ))}
          {!tabs.length && <div className="text-sm text-gray-500 px-2 py-1.5">Geen actieve klanten geselecteerd.</div>}
        </div>

        {/* Table */}
        {tabs[activeTab] && (
          <div className="p-3 sm:p-4">
            <div className="text-sm text-gray-600 mb-2">
              <b>Klant:</b> {tabs[activeTab].name} &middot; Dist: {(tabs[activeTab].distPct*100).toFixed(1)}% &middot; Extra: {(tabs[activeTab].extraPct*100).toFixed(1)}%
            </div>
            <div className="overflow-auto">
              <table className="min-w-[920px] w-full text-sm border-collapse">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <Th>SKU</Th>
                    <Th>Product</Th>
                    <Th>Verpakking</Th>
                    <Th>Registratie</Th>
                    <Th>ZI</Th>
                    <Th className="text-right">AIP</Th>
                    <Th className="text-right">GIP</Th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {visibleAip.map((r) => {
                    const c = tabs[activeTab];
                    const gip = calcGIP(r.aip || 0, c.distPct, c.extraPct);
                    return (
                      <tr key={r.sku + c.id}>
                        <Td>{r.sku}</Td>
                        <Td className="whitespace-nowrap">{r.name}</Td>
                        <Td>{r.pack}</Td>
                        <Td>{r.reg}</Td>
                        <Td>{r.zi}</Td>
                        <Td className="text-right">{eur(r.aip || 0)}</Td>
                        <Td className="text-right font-medium">{eur(gip)}</Td>
                      </tr>
                    );
                  })}
                  {!visibleAip.length && (
                    <tr><td colSpan={7} className="text-center text-gray-500 py-6">Geen AIP-data zichtbaar. Upload een AIP of verwijder je filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              GIP = AIP × (1 − dist%) × (1 − extra%). Rekenregel zonder compounding-afwijkingen; afronding optioneel op 2 decimalen.
            </div>
          </div>
        )}
      </section>

      {/* Footer note */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="text-xs text-gray-600">
          Deze pagina draait volledig <b>client-side</b> (geen serveropslag). Voor enterprise-gebruik kan dezelfde logica op een beveiligde database/API
          worden aangesloten met logging & versiebeheer. Meer weten? <Link href="/contact" className="underline">Neem contact op</Link>.
        </div>
      </section>
    </div>
  );
}

/** ---------------- Small UI bits ---------------- */
function Kpi({ title, value, help }: { title: string; value: string; help?: string }) {
  return (
    <div className="rounded-2xl border bg-white p-3 sm:p-4">
      <div className="text-[12px] text-gray-600">{title}</div>
      <div className="text-lg sm:text-xl font-semibold mt-1">{value}</div>
      {help ? <div className="text-[11px] sm:text-xs text-gray-500 mt-1">{help}</div> : null}
    </div>
  );
}
function Th(props: React.HTMLAttributes<HTMLTableCellElement>) {
  return <th {...props} className={"text-left px-2 py-2 " + (props.className || "")} />;
}
function Td(props: React.HTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} className={"align-top px-2 py-1 " + (props.className || "")} />;
}
function clampPct(v: number) {
  if (!isFinite(v)) return 0;
  return Math.max(0, Math.min(0.9, v)); // cap 90% om fouten te voorkomen
}
function PctInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [raw, setRaw] = useState<string>(String((value || 0) * 100));
  useEffect(() => setRaw(String((value || 0) * 100)), [value]);
  return (
    <div className="flex items-center justify-end gap-2">
      <input
        inputMode="decimal"
        className="w-24 text-right rounded-md border px-2 py-1.5"
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          const pct = coerceNum(e.target.value, 0) / 100;
          onChange(pct);
        }}
      />
      <span className="text-gray-500">%</span>
    </div>
  );
}
