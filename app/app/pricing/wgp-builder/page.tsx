"use client";

import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";

/** ================= Types ================= */
type AipRow = {
  sku: string;
  name: string;
  pack: number;   // stuks per standaardverpakking
  reg: string;    // REGNR / RVG (genormaliseerd)
  zi: string;
  aip?: number;   // bestaande AIP (optioneel)
  moq?: number;   // minimale bestelgrootte
  caseQty?: number; // doosverpakking
};

type ScUnitRow = {
  reg: string;             // REGNR / RVG (genormaliseerd)
  unit_price_eur: number;  // eenheidsprijs uit Staatscourant
  valid_from?: string;
};

type Joined = {
  reg: string;
  sku: string;
  name: string;
  zi: string;
  pack: number | null;
  unit_price_eur: number | null;
  aip_calc: number | null; // unit × pack
  valid_from?: string;
  status: "OK" | "ONVOLLEDIG";
  note?: string;
};

/** ================= Helpers ================= */
function normReg(v: any) {
  return String(v ?? "")
    .toUpperCase()
    .replace(/[.\s]/g, "")
    .trim();
}
function toNumEU(v: any, fallback = NaN) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v ?? "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "")
    .trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}
function downloadXlsx(filename: string, rows: any[], sheet = "Sheet1") {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith(".xlsx") ? filename : filename + ".xlsx";
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Flexibele mapper voor AIP-master */
function toAipRow(o: Record<string, any>): AipRow {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (o[k] !== undefined && o[k] !== null && String(o[k]).trim() !== "") return o[k];
      const kk = Object.keys(o).find(
        (x) => x.toLowerCase().replace(/\s|\./g, "") === k.toLowerCase().replace(/\s|\./g, "")
      );
      if (kk) return o[kk];
    }
    return "";
  };
  const str = (v: any) => String(v ?? "").trim();
  const num = (v: any, fb = NaN) => toNumEU(v, fb);

  return {
    sku: str(pick("sku", "productcode")),
    name: str(pick("product", "productnaam", "product naam", "naam")),
    pack: Math.max(0, Math.round(num(pick("pack", "verpakking", "standaard verpakk. grootte", "standaard verpakking"), 0))),
    reg: normReg(pick("reg", "registratienummer", "rvg", "rvg nr", "rvg_nr", "regnr", "reg.nr")),
    zi: str(pick("zi", "zi-nummer", "zinummer")),
    aip: num(pick("aip", "lijstprijs", "apotheekinkoopprijs"), NaN),
    moq: Math.max(0, Math.round(num(pick("moq", "minimale bestelgrootte"), 0))),
    caseQty: Math.max(0, Math.round(num(pick("caseqty", "doosverpakking"), 0))),
  };
}

/** Flexibele mapper voor Staatscourant eenheidsprijzen */
function toScUnitRow(o: Record<string, any>): ScUnitRow {
  const lower: Record<string, any> = {};
  for (const [k, v] of Object.entries(o)) lower[k.toLowerCase()] = v;

  const reg =
    lower["reg"] ??
    lower["regnr"] ??
    lower["registratienummer"] ??
    lower["rvg"] ??
    lower["rvg_nr"] ??
    lower["rvg nr"] ??
    "";
  const unit =
    lower["unit_price_eur"] ??
    lower["eenheidsprijs"] ??
    lower["unitprice"] ??
    lower["prijs_per_eenheid"] ??
    lower["eenheidsprijs(€)"] ??
    "";

  const valid_from = String(
    lower["valid_from"] ?? lower["geldig_vanaf"] ?? lower["ingangsdatum"] ?? ""
  ).trim();

  return {
    reg: normReg(reg),
    unit_price_eur: toNumEU(unit, NaN),
    valid_from,
  };
}

async function parseSheetToJson(file: File): Promise<any[]> {
  const ext = file.name.toLowerCase().split(".").pop() || "";
  if (ext === "xlsx" || ext === "xls") {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: "" });
  } else if (ext === "csv") {
    const txt = await file.text();
    const wb = XLSX.read(txt, { type: "string" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: "" });
  }
  throw new Error("Ondersteund: .xlsx, .xls, .csv");
}

/** ================= Page ================= */
export default function WgpBuilderPage() {
  const [aipMaster, setAipMaster] = useState<AipRow[]>([]);
  const [scUnits, setScUnits] = useState<ScUnitRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [onlyUnmatched, setOnlyUnmatched] = useState(false);

  async function onUploadAip(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!f) return;
    setErr(null);
    setBusy(true);
    try {
      const json = await parseSheetToJson(f);
      const rows = json.map(toAipRow).filter((r) => r.reg);
      setAipMaster(rows);
    } catch (e: any) {
      setErr(e?.message || "AIP-master kon niet worden gelezen.");
    } finally {
      setBusy(false);
    }
  }

  async function onUploadSc(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!f) return;
    setErr(null);
    setBusy(true);
    try {
      const ext = f.name.toLowerCase().split(".").pop() || "";

      if (ext === "pdf") {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch("/api/wgp/parse-pdf", { method: "POST", body: fd });
        const js = await res.json();
        if (!res.ok) throw new Error(js?.error || "PDF niet verwerkt.");
        setScUnits(js.rows as ScUnitRow[]);
      } else {
        const json = await parseSheetToJson(f);
        const rows = json.map(toScUnitRow).filter((r) => r.reg && Number.isFinite(r.unit_price_eur));
        setScUnits(rows);
      }
    } catch (e: any) {
      setErr(e?.message || "Staatscourant-eenheidsprijzen konden niet worden gelezen.");
    } finally {
      setBusy(false);
    }
  }

  const joined: Joined[] = useMemo(() => {
    if (!scUnits.length) return [];
    const byReg = new Map(aipMaster.map((r) => [r.reg, r]));
    return scUnits.map((s) => {
      const m = byReg.get(s.reg);
      const pack = m?.pack ?? null;
      const unit = Number.isFinite(s.unit_price_eur) ? s.unit_price_eur : null;
      const aip_calc =
        unit !== null && pack !== null && pack > 0 ? +(unit * pack).toFixed(2) : null;
      const ok = unit !== null && pack !== null && pack > 0;

      return {
        reg: s.reg,
        sku: m?.sku ?? "",
        name: m?.name ?? "",
        zi: m?.zi ?? "",
        pack,
        unit_price_eur: unit,
        aip_calc,
        valid_from: s.valid_from,
        status: ok ? "OK" : "ONVOLLEDIG",
        note: !m
          ? "Geen match in AIP-master"
          : pack === null || !(pack > 0)
          ? "Pack ontbreekt/ongeldig"
          : undefined,
      };
    });
  }, [aipMaster, scUnits]);

  const rowsToShow = onlyUnmatched ? joined.filter((r) => r.status !== "OK") : joined;

  function exportResult() {
    if (!joined.length) return;
    downloadXlsx("wgp_aip_berekening.xlsx", joined, "WgpAIP");
  }

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 lg:px-6 py-6 space-y-6">
      {/* Header */}
      <header className="rounded-2xl border bg-white p-4 sm:p-5">
        <h1 className="text-xl sm:text-2xl font-semibold">Wgp Builder — AIP uit eenheidsprijzen</h1>
        <p className="text-sm text-gray-700 mt-1">
          Upload je <b>AIP-master</b> (REGNR + pack) en een <b>Staatscourant-bestand</b> met
          eenheidsprijzen (PDF of Excel/CSV). We berekenen <b>AIP = eenheidsprijs × pack</b> en tonen matches/hiaten.
        </p>
      </header>

      {/* Uploads */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm block">
            <div className="font-medium">1) AIP-master (.xlsx/.csv)</div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onUploadAip}
              className="mt-1 block w-full rounded-md border px-3 py-2"
            />
            <p className="mt-1 text-xs text-gray-500">
              Verwacht kolommen: <code>reg / regnr / rvg</code> en <code>pack</code>. Optioneel: SKU, naam, zi, AIP, MOQ, caseQty.
            </p>
          </label>
          <label className="text-sm block">
            <div className="font-medium">2) Staatscourant eenheidsprijzen (.pdf/.xlsx/.csv)</div>
            <input
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={onUploadSc}
              className="mt-1 block w-full rounded-md border px-3 py-2"
            />
            <p className="mt-1 text-xs text-gray-500">
              PDF gaat via serverextractie; Excel/CSV wordt client-side gelezen. Verwacht kolommen: <code>reg</code>, <code>unit_price_eur</code>, optioneel <code>valid_from</code>.
            </p>
          </label>
        </div>
        {busy && <div className="mt-3 text-sm text-gray-600">Bezig…</div>}
        {err && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {err}
          </div>
        )}
      </section>

      {/* Resultaten */}
      <section className="rounded-2xl border bg-white p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="text-sm font-medium">
            Resultaat ({rowsToShow.length}/{joined.length})
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={onlyUnmatched}
                onChange={(e) => setOnlyUnmatched(e.target.checked)}
              />
              Toon alleen onvolledig / geen match
            </label>
            <button
              onClick={exportResult}
              disabled={!joined.length}
              className="text-sm rounded-lg border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              Exporteer naar Excel
            </button>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-2 py-2 text-left">REGNR</th>
                <th className="px-2 py-2 text-left">SKU</th>
                <th className="px-2 py-2 text-left">Product</th>
                <th className="px-2 py-2 text-left">ZI</th>
                <th className="px-2 py-2 text-right">Pack</th>
                <th className="px-2 py-2 text-right">Unit (€)</th>
                <th className="px-2 py-2 text-right">AIP (= unit × pack)</th>
                <th className="px-2 py-2 text-left">Geldig vanaf</th>
                <th className="px-2 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rowsToShow.map((r) => (
                <tr key={`${r.reg}-${r.zi}-${r.valid_from ?? ""}`}>
                  <td className="px-2 py-1">{r.reg}</td>
                  <td className="px-2 py-1">{r.sku}</td>
                  <td className="px-2 py-1">{r.name}</td>
                  <td className="px-2 py-1">{r.zi}</td>
                  <td className="px-2 py-1 text-right">
                    {r.pack !== null ? r.pack : "-"}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {r.unit_price_eur !== null ? r.unit_price_eur.toFixed(4) : "-"}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {r.aip_calc !== null ? r.aip_calc.toFixed(2) : "-"}
                  </td>
                  <td className="px-2 py-1">{r.valid_from || "-"}</td>
                  <td className="px-2 py-1">
                    {r.status === "OK" ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">
                        OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 ring-1 ring-amber-200">
                        {r.note || "Onvolledig"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!rowsToShow.length && (
                <tr>
                  <td colSpan={9} className="px-2 py-6 text-center text-gray-500">
                    Nog geen rijen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Tip: controleer altijd een steekproef. Pas eventueel regex/mapping aan je Staatscourant-opmaak aan.
        </p>
      </section>
    </div>
  );
}
