"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";

/** ================= Types ================= */
type AIPRow = {
  sku: string;
  name: string;
  pack: string;    // vrije tekst, we proberen units te parsen
  reg: string;     // RVG-nummer (registratienummer)
  zi: string;
  aip: number;     // huidige (oude) AIP in EUR
  moq?: number;
  caseQty?: number;
};

type ScUnitRow = {
  rvg: string;              // RVG nummer (zonder spaties/punten)
  unit_price_eur: number;   // eenheidsprijs (incl. valuta in EUR)
  valid_from?: string;      // optioneel: YYYY-MM-DD
  source?: string;          // optioneel: publicatie #
};

type Joined = {
  sku: string;
  name: string;
  reg: string;
  zi: string;
  pack: string;
  packUnits: number | null;
  currentAIP: number | null;
  unitPrice: number | null;
  wgpAIP: number | null;
  deltaAbs: number | null;
  deltaPct: number | null;
  validFrom?: string;
  issues: string[];
};

type ImportRow = Record<string, any>;

/** ================= Helpers ================= */
const eur = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(isFinite(n) ? n : 0);
const num = (v: any, def = 0) => {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return isFinite(n) ? n : def;
};
const str = (v: any) => String(v ?? "").trim();

/** Probeer aantal stuks uit pack-string te halen (bv. "30 st", "3 x 10", "10 tabletten") */
function parsePackUnits(s: string): number | null {
  const a = (s || "").toLowerCase().replace(/,/g, ".").replace(/\s+/g, " ").trim();
  if (!a) return null;

  // patronen: "3 x 10", "3x10", "2 * 28", "30 st", "30", "28 tabletten"
  const mult = /(\d+(?:\.\d+)?)\s*[x\*]\s*(\d+(?:\.\d+)?)/.exec(a);
  if (mult) {
    const u = Math.round(parseFloat(mult[1]) * parseFloat(mult[2]));
    return isFinite(u) && u > 0 ? u : null;
  }
  const single = /(^|\s)(\d+(?:\.\d+)?)(\s*(st|tabs?|tabletten|caps?|pcs|pieces)?)\b/.exec(a);
  if (single) {
    const u = Math.round(parseFloat(single[2]));
    return isFinite(u) && u > 0 ? u : null;
  }
  // laatste redmiddel: enkel getal uit string
  const any = a.match(/\d+/g);
  if (any && any.length) {
    const u = Math.round(parseFloat(any[any.length - 1]));
    return isFinite(u) && u > 0 ? u : null;
  }
  return null;
}

/** normaliseer RVG (verwijder spaties/punten; uppercase) */
function normRVG(v: string) {
  return String(v ?? "").trim().replace(/[\s.]/g, "").toUpperCase();
}

/** CSV/XLSX parser (Staatscourant of AIP) */
async function parseXlsxOrCsv(file: File): Promise<ImportRow[]> {
  const buf = await file.arrayBuffer();
  if (/\.(xlsx|xls)$/i.test(file.name)) {
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: "" });
  }
  if (/\.(csv)$/i.test(file.name)) {
    const text = new TextDecoder().decode(buf);
    try {
      const wb = XLSX.read(text, { type: "string" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json(ws, { defval: "" });
    } catch {
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

function toAipRow(o: Record<string, any>): AIPRow {
  const m = new Map(Object.entries(o).map(([k, v]) => [k.toLowerCase().trim(), v]));
  const pick = (...keys: string[]) => { for (const k of keys) if (m.has(k)) return m.get(k); return ""; };

  return {
    sku: String(pick("sku", "productcode")).trim(),
    name: String(pick("product", "productnaam", "product naam", "naam")).trim(),
    pack: String(pick("pack", "verpakking", "standaard verpakk. grootte", "standaard verpakking")).trim(),
    // 🔁 regnr toegevoegd als alias
    reg: String(pick("reg", "registratienummer", "rvg", "rvg nr", "rvg_nr", "regnr", "regnr.")).trim(),
    zi: String(pick("zi", "zi-nummer", "zinummer")).trim(),
    aip: (() => {
      const v = pick("aip", "lijstprijs", "apotheekinkoopprijs");
      const s = String(v ?? "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
      const n = parseFloat(s); return Number.isFinite(n) ? n : NaN;
    })(),
    moq: Math.max(0, Math.round(Number(pick("moq", "minimale bestelgrootte")) || 0)),
    caseQty: Math.max(0, Math.round(Number(pick("caseqty", "doosverpakking")) || 0)),
  };
}

  return {
    sku: str(pick("sku", "productcode")),
    name: str(pick("product", "productnaam", "product naam", "naam")),
    pack: str(pick("pack", "verpakking", "standaard verpakk. grootte", "standaard verpakking")),
    reg: str(pick("reg", "registratienummer", "rvg", "rvg nr", "rvg_nr")),
    zi: str(pick("zi", "zi-nummer", "zinummer")),
    aip: num(pick("aip", "lijstprijs", "apotheekinkoopprijs"), NaN),
    moq: Math.max(0, Math.round(num(pick("moq", "minimale bestelgrootte"), 0))),
    caseQty: Math.max(0, Math.round(num(pick("caseqty", "doosverpakking"), 0))),
  };
}

function toScUnitRow(o: Record<string, any>): ScUnitRow {
  // verwacht headers (flexibel): rvg, unit_price_eur, valid_from
  const m = new Map(Object.entries(o).map(([k, v]) => [k.toLowerCase().trim(), v]));
  const pick = (...keys: string[]) => {
    for (const k of keys) if (m.has(k)) return m.get(k);
    return "";
  };
  return {
    rvg: normRVG(pick("rvg", "registratienummer", "rvgnummer")),
    unit_price_eur: num(pick("unit_price_eur", "eenheidsprijs", "eenheidsprijs_eur", "unit"), NaN),
    valid_from: str(pick("valid_from", "ingangsdatum", "vanaf")),
    source: str(pick("source", "publicatie")),
  };
}

/** ================= Page ================= */
export default function WgpBuilderPage() {
  const [aipRows, setAipRows] = useState<AIPRow[]>([]);
  const [scRows, setScRows] = useState<ScUnitRow[]>([]);
  const [filter, setFilter] = useState("");

  const [roundCents, setRoundCents] = useState(true);
  const [warnThresholdPct, setWarnThresholdPct] = useState(0.25); // >25% delta = issue

  // Init: lees AIP uit sessionStorage indien aanwezig
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pharmgtn:aip_rows");
      if (raw) {
        const arr = JSON.parse(raw) as AIPRow[];
        if (Array.isArray(arr)) setAipRows(arr);
      }
    } catch { /* ignore */ }
  }, []);

  async function onUploadAIP(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const rows = await parseXlsxOrCsv(f);
      const parsed = rows.map(toAipRow).filter(r => r.reg || r.sku);
      setAipRows(parsed);
      // optioneel opslaan
      try { sessionStorage.setItem("pharmgtn:aip_rows", JSON.stringify(parsed)); } catch {}
    } catch (err:any) {
      alert(err?.message || "AIP upload mislukt");
    } finally {
      e.currentTarget.value = "";
    }
  }
  async function onUploadSC(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const rows = await parseXlsxOrCsv(f);
      const parsed = rows.map(toScUnitRow).filter(r => r.rvg && isFinite(r.unit_price_eur));
      setScRows(parsed);
    } catch (err:any) {
      alert(err?.message || "Staatscourant upload mislukt");
    } finally {
      e.currentTarget.value = "";
    }
  }

  // JOIN op RVG
  const joined = useMemo<Joined[]>(() => {
    if (!scRows.length) return [];
    const byRVG = new Map<string, AIPRow[]>();
    for (const r of aipRows) {
      const key = normRVG(r.reg);
      if (!key) continue;
      const arr = byRVG.get(key) || [];
      arr.push(r);
      byRVG.set(key, arr);
    }

    const out: Joined[] = [];
    for (const sc of scRows) {
      const candidates = byRVG.get(normRVG(sc.rvg)) || [];
      if (!candidates.length) {
        out.push({
          sku: "", name: "", reg: sc.rvg, zi: "", pack: "", packUnits: null,
          currentAIP: null, unitPrice: sc.unit_price_eur, wgpAIP: null,
          deltaAbs: null, deltaPct: null, validFrom: sc.valid_from, issues: ["RVG niet gevonden in AIP-master"],
        });
        continue;
      }
      for (const a of candidates) {
        const units = parsePackUnits(a.pack);
        const issues: string[] = [];
        if (!isFinite(sc.unit_price_eur) || sc.unit_price_eur <= 0) issues.push("Ongeldige eenheidsprijs");
        if (!units || units <= 0) issues.push("Pack-units onbekend of 0");
        const wgpRaw = isFinite(sc.unit_price_eur) && units ? sc.unit_price_eur * units : NaN;
        const wgp = isFinite(wgpRaw) ? (roundCents ? Math.round(wgpRaw * 100) / 100 : wgpRaw) : NaN;

        const cur = isFinite(a.aip) ? a.aip : null;
        const dAbs = isFinite(wgp) && cur != null ? wgp - cur : null;
        const dPct = isFinite(wgp) && cur && cur > 0 ? (wgp - cur) / cur : null;
        if (dPct != null && Math.abs(dPct) > warnThresholdPct) issues.push(`Delta groter dan ${Math.round(warnThresholdPct*100)}% t.o.v. huidige AIP`);
        if (!a.reg) issues.push("AIP-reg ontbreekt");
        if (a.aip == null || !isFinite(a.aip)) issues.push("Huidige AIP ontbreekt of ongeldig");

        out.push({
          sku: a.sku, name: a.name, reg: a.reg, zi: a.zi, pack: a.pack, packUnits: units ?? null,
          currentAIP: cur, unitPrice: sc.unit_price_eur, wgpAIP: isFinite(wgp) ? wgp : null,
          deltaAbs: dAbs, deltaPct: dPct, validFrom: sc.valid_from, issues,
        });
      }
    }
    // eenvoudige sortering
    out.sort((a,b) => str(a.sku).localeCompare(str(b.sku)) || str(a.reg).localeCompare(str(b.reg)));
    return out;
  }, [aipRows, scRows, roundCents, warnThresholdPct]);

  // Filter op sku/naam/reg/zi
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return joined;
    return joined.filter(r =>
      [r.sku, r.name, r.reg, r.zi].some(v => (v || "").toLowerCase().includes(q))
    );
  }, [joined, filter]);

  // KPI’s
  const kpi = useMemo(() => {
    const n = visible.length;
    const withNew = visible.filter(r => r.wgpAIP != null);
    const avgNew = withNew.length ? withNew.reduce((s,r)=> s + (r.wgpAIP || 0), 0) / withNew.length : 0;
    const avgDeltaPct = withNew.length
      ? withNew.reduce((s,r)=> s + (r.deltaPct ?? 0), 0) / withNew.length
      : 0;
    const issues = visible.reduce((s,r)=> s + (r.issues?.length || 0), 0);
    return { n, withNew: withNew.length, avgNew, avgDeltaPct, issues };
  }, [visible]);

  function exportExcel() {
    if (!visible.length) {
      alert("Geen regels om te exporteren.");
      return;
    }
    const wb = XLSX.utils.book_new();

    const rows = visible.map(r => ({
      SKU: r.sku,
      Product: r.name,
      RVG: r.reg,
      ZI: r.zi,
      Verpakking: r.pack,
      Pack_units: r.packUnits ?? "",
      Unit_EUR: r.unitPrice ?? "",
      "Huidig AIP": r.currentAIP ?? "",
      "Wgp AIP (nieuw)": r.wgpAIP ?? "",
      "Δ abs": r.deltaAbs ?? "",
      "Δ %": r.deltaPct != null ? +(r.deltaPct*100).toFixed(2) : "",
      "Valid from": r.validFrom ?? "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Proposed_WGP");

    const issueRows = visible
      .filter(r => r.issues?.length)
      .flatMap(r => r.issues.map(msg => ({
        SKU: r.sku, RVG: r.reg, ZI: r.zi, Issue: msg
      })));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(issueRows), "Issues");

    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "WGP_berekening.xlsx";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 space-y-6">
      {/* HERO */}
      <header className="rounded-2xl border bg-white p-4 sm:p-5">
        <h1 className="text-xl sm:text-2xl font-semibold">Wgp-lijstprijzen uit Staatscourant-<i>eenheidsprijzen</i></h1>
        <p className="text-sm text-gray-700 mt-1">
          Koppel Staatscourant-<b>eenheidsprijzen</b> aan je AIP-master via <b>RVG</b>, vermenigvuldig met de standaard <b>pack-units</b> en
          bereken zo de voorgestelde <b>Wgp-AIP</b>. Inclusief validaties & Excel-export.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="inline-flex items-center gap-2 rounded-lg bg-sky-600 text-white text-sm px-4 py-2 hover:opacity-95 cursor-pointer">
            Upload Staatscourant (.xlsx/.csv)
            <input type="file" accept=".xlsx,.xls,.csv" onChange={onUploadSC} className="hidden" />
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border text-sm px-4 py-2 hover:bg-gray-50 cursor-pointer">
            AIP uploaden (optioneel)
            <input type="file" accept=".xlsx,.xls,.csv" onChange={onUploadAIP} className="hidden" />
          </label>
          <button onClick={exportExcel} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Exporteer Excel</button>
          <div className="ml-auto flex items-center gap-2">
            <input
              placeholder="Zoek sku/naam/RVG/ZI…"
              value={filter}
              onChange={(e)=>setFilter(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm w-48 sm:w-64"
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-600">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={roundCents} onChange={(e)=>setRoundCents(e.target.checked)} />
            <span>Afronden op 2 decimalen</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <span>Waarschuw bij |Δ| &gt;=</span>
            <input
              type="number"
              min={0} max={100} step={1}
              value={Math.round(warnThresholdPct*100)}
              onChange={(e)=>setWarnThresholdPct(Math.max(0, Math.min(100, Number(e.target.value)||0))/100)}
              className="w-16 rounded border px-2 py-1"
            />
            <span>%</span>
          </label>
          <span className="text-gray-500">Bron-AIP: uit upload of sessionStorage van AIP-pagina.</span>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <Kpi title="Rijen zichtbaar" value={String(kpi.n)} />
        <Kpi title="Met Wgp-voorstel" value={String(kpi.withNew)} />
        <Kpi title="Gem. Wgp-AIP" value={eur(kpi.avgNew)} />
        <Kpi title="Gem. Δ%" value={`${(kpi.avgDeltaPct*100).toFixed(1)}%`} />
        <Kpi title="Issues" value={String(kpi.issues)} help="Klik per rij om issues te zien." />
      </section>

      {/* Tabel */}
      <section className="rounded-2xl border bg-white p-3 sm:p-4">
        <div className="overflow-auto">
          <table className="min-w-[1040px] w-full text-sm border-collapse">
            <thead className="bg-slate-50 border-b">
              <tr>
                <Th>SKU</Th>
                <Th>Product</Th>
                <Th>RVG</Th>
                <Th>ZI</Th>
                <Th>Verpakking</Th>
                <Th className="text-right">Pack units</Th>
                <Th className="text-right">Unit €</Th>
                <Th className="text-right">Huidig AIP</Th>
                <Th className="text-right">Wgp-AIP</Th>
                <Th className="text-right">Δ abs</Th>
                <Th className="text-right">Δ %</Th>
                <Th>Valid from</Th>
                <Th>Issues</Th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map((r, i) => (
                <tr key={i} className={r.issues.length ? "bg-amber-50/40" : ""}>
                  <Td className="whitespace-nowrap">{r.sku}</Td>
                  <Td className="whitespace-nowrap">{r.name}</Td>
                  <Td>{r.reg}</Td>
                  <Td>{r.zi}</Td>
                  <Td className="whitespace-nowrap">{r.pack}</Td>
                  <Td className="text-right">{r.packUnits ?? ""}</Td>
                  <Td className="text-right">{r.unitPrice != null ? eur(r.unitPrice) : ""}</Td>
                  <Td className="text-right">{r.currentAIP != null ? eur(r.currentAIP) : ""}</Td>
                  <Td className="text-right font-medium">{r.wgpAIP != null ? eur(r.wgpAIP) : ""}</Td>
                  <Td className="text-right">{r.deltaAbs != null ? eur(r.deltaAbs) : ""}</Td>
                  <Td className="text-right">{r.deltaPct != null ? (r.deltaPct*100).toFixed(1)+"%" : ""}</Td>
                  <Td className="whitespace-nowrap">{r.validFrom || ""}</Td>
                  <Td>
                    {r.issues.length ? (
                      <ul className="list-disc pl-4 text-amber-800">
                        {r.issues.map((m, j) => <li key={j}>{m}</li>)}
                      </ul>
                    ) : <span className="text-emerald-700">OK</span>}
                  </Td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan={13} className="text-center text-gray-500 py-6">
                    Geen regels. Upload Staatscourant-bestand en zorg dat AIP-master met RVG aanwezig is (via upload of AIP-pagina).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Opmerking: pack-units worden automatisch uit de verpakkingsbeschrijving gehaald. Twijfelgevallen worden als issue gemarkeerd.
        </p>
      </section>

      {/* Footer */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="text-xs text-gray-600">
          Deze berekening draait <b>client-side</b>. Voor productie kun je koppelen op een beveiligde database en de Staatscourant-feed parsen
          (met logging, versies en 4-ogenvalidatie). <Link href="/contact" className="underline">Meer weten?</Link>
        </div>
      </section>
    </div>
  );
}

/** ================= UI Bits ================= */
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
