"use client";

import React, { useCallback, useMemo, useState } from "react";

/** ===================== Types ===================== */
type RawRow = { sku: string; period: string; inmarket_units: number };

type Parsed = {
  rows: RawRow[];
  issues: string[];
  skus: string[];
};

type SkuSeries = {
  sku: string;
  series: { period: string; y: number; d: Date; m: number; y4: number }[]; // ascending by date
};

type ForecastPoint = { period: string; units: number };
type ForecastResult = {
  sku: string;
  nextMonths: ForecastPoint[];
  mape6: number | null;
  lastActual: number | null;
};

type AllocationShare = { customer: string; share: number }; // 0..1

/** ===================== Helpers: numbers / dates ===================== */
const toNum = (v: any): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "")
    .replace(/\./g, "") // duizendtallen
    .replace(",", ".") // NL decimaal
    .replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const last = <T,>(arr: T[]): T | undefined => (Array.isArray(arr) && arr.length ? arr[arr.length - 1] : undefined);

/** STRICT: alleen YYYY-MM toegestaan */
function normalizePeriodStrictYYYYMM(s: string): { ok: boolean; value: string; reason?: string } {
  const a = (s ?? "").toString().trim();
  const m = /^(\d{4})-(\d{2})$/.exec(a); // YYYY-MM
  if (!m) return { ok: false, value: a, reason: "Formaat moet YYYY-MM zijn (bijv. 2025-09)." };
  const yyyy = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (mm < 1 || mm > 12) return { ok: false, value: a, reason: "Maand moet 01..12 zijn." };
  if (yyyy < 2000 || yyyy > 2100) return { ok: false, value: a, reason: "Jaar buiten bereik (2000..2100)." };
  return { ok: true, value: `${yyyy}-${m[2]}` };
}

function periodToDate(per: string): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(per);
  if (!m) return null;
  const yyyy = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (mm < 1 || mm > 12) return null;
  return new Date(yyyy, mm - 1, 1);
}
function addMonths(d: Date, k: number): Date {
  const nd = new Date(d);
  nd.setMonth(nd.getMonth() + k);
  nd.setDate(1);
  return nd;
}
function fmtPeriodYYYYMM(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${yy}-${mm}`;
}

function workingDaysInMonth(y: number, m: number): number {
  // m: 1..12
  const days = new Date(y, m, 0).getDate();
  let wd = 0;
  for (let d = 1; d <= days; d++) {
    const w = new Date(y, m - 1, d).getDay(); // 0=Sun..6=Sat
    if (w >= 1 && w <= 5) wd++;
  }
  return wd;
}
const WD_BASE = 21;

/** ===================== NL3 parser (breed diagonaal, labels = YYYY-MM) ===================== */
/**
 * Verwacht sheet met:
 * - Row 0: header B.. = maanden (YYYY-MM), herhaald K keer (K = # SKU’s)
 * - Col 0: "SKU" in row 0, daaronder (rows 1..K) de SKU-namen (vaste volgorde)
 * - Per maandblok K kolommen; i-de kolom in blok hoort bij i-de SKU-rij (diagonaal)
 */
function groupConsecutiveIndices<T>(arr: T[], getLabel: (x: T) => string) {
  const groups: { label: string; start: number; end: number; indices: number[] }[] = [];
  let lastLabel = "";
  let start = -1;
  for (let i = 0; i < arr.length; i++) {
    const lab = getLabel(arr[i]);
    if (i === 0 || lab !== lastLabel) {
      if (i > 0) groups.push({ label: lastLabel, start, end: i - 1, indices: [] });
      start = i;
      lastLabel = lab;
    }
  }
  if (arr.length) groups.push({ label: lastLabel, start, end: arr.length - 1, indices: [] });
  for (const g of groups) g.indices = Array.from({ length: g.end - g.start + 1 }, (_, k) => g.start + k);
  return groups;
}

function looksLikeNL3YYYY(aoa: any[][], issues: string[]) {
  if (!aoa?.length) return false;
  const a00 = (aoa[0]?.[0] ?? "").toString().trim().toLowerCase();
  if (a00 !== "sku") return false;

  const hdrRow = (aoa[0] || []);
  if (hdrRow.length < 2) {
    issues.push("Headerregel mist maandkolommen (verwacht: B.. met YYYY-MM).");
    return false;
  }
  const hdr = hdrRow.slice(1).map((x: any) => (x ?? "").toString().trim());
  if (!hdr.length) return false;

  // Check dat alle non-empty headers YYYY-MM zijn
  let okCount = 0;
  for (const h of hdr) {
    if (!h) continue;
    const n = normalizePeriodStrictYYYYMM(h);
    if (n.ok) okCount++;
    else issues.push(`Header '${h}' is ongeldig: ${n.reason}`);
  }
  if (okCount < 1) return false;

  // Herhalingen (per maand K kolommen)
  const hasRepeats = hdr.some((h, idx) => h && hdr.indexOf(h) !== idx);
  return hasRepeats;
}

function parseWideNL3YYYY(aoa: any[][]): Parsed {
  const issues: string[] = [];
  if (!Array.isArray(aoa) || !aoa.length) {
    return { rows: [], issues: ["Leeg werkblad of onleesbaar Excel-bestand."], skus: [] };
  }

  if (!looksLikeNL3YYYY(aoa, issues)) {
    if (!issues.length) issues.push("Bestand lijkt geen NL3 (YYYY-MM) format te hebben.");
    return { rows: [], issues, skus: [] };
  }

  // SKU-lijst (col 0, vanaf row 1 tot lege cel)
  const skuList: string[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const sku = (aoa[r]?.[0] ?? "").toString().trim();
    if (!sku) break;
    skuList.push(sku);
  }
  const K = skuList.length;
  if (K === 0) return { rows: [], issues: ["Geen SKU’s gevonden in kolom A."], skus: [] };

  const hdr = (aoa[0] || []).slice(1).map((x: any) => (x ?? "").toString().trim());
  const groups = groupConsecutiveIndices(hdr, (x) => (x ?? "").toString().trim());
  const rows: RawRow[] = [];

  for (const g of groups) {
    if (!g.label) continue;
    const n = normalizePeriodStrictYYYYMM(g.label);
    if (!n.ok) {
      issues.push(`Overgeslagen: ongeldige maandheader '${g.label}' (${n.reason}).`);
      continue;
    }

    if (g.indices.length >= K) {
      // diagonaal
      for (let i = 0; i < K; i++) {
        const colIdx = 1 + g.indices[i];
        const src = aoa[1 + i]?.[colIdx];
        const val = Math.max(0, Math.round(toNum(src)));
        rows.push({ sku: skuList[i], period: n.value, inmarket_units: val });
      }
    } else if (g.indices.length === 1) {
      // Eén kolom voor alle SKUs (fallback)
      const colIdx = 1 + g.indices[0];
      for (let i = 0; i < K; i++) {
        const src = aoa[1 + i]?.[colIdx];
        const val = Math.max(0, Math.round(toNum(src)));
        rows.push({ sku: skuList[i], period: n.value, inmarket_units: val });
      }
      issues.push(`Maand '${g.label}' bevat 1 kolom → toegepast op alle SKU’s (fallback).`);
    } else if (g.indices.length > 1) {
      // gedeeltelijk blok
      for (let i = 0; i < Math.min(K, g.indices.length); i++) {
        const colIdx = 1 + g.indices[i];
        const src = aoa[1 + i]?.[colIdx];
        const val = Math.max(0, Math.round(toNum(src)));
        rows.push({ sku: skuList[i], period: n.value, inmarket_units: val });
      }
      issues.push(`Maand '${g.label}': onvolledig blok (${g.indices.length}/${K}). Gedeeltelijk ingelezen.`);
    }
  }

  if (!rows.length) issues.push("Geen rijen ingelezen uit NL3-sheet.");
  const skus = Array.from(new Set(rows.map((r) => r.sku))).sort();

  // Duplicaten (SKU+period)
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const r of rows) {
    const k = `${r.sku}::${r.period}`;
    if (seen.has(k)) dups.push(k);
    seen.add(k);
  }
  if (dups.length) issues.push(`Duplicaten gevonden (SKU+period), laatste telt mee: ${dups.slice(0, 6).join(" | ")}${dups.length > 6 ? " …" : ""}`);

  return { rows, issues, skus };
}

/** ===================== Upload (Excel only) ===================== */
async function parseExcelNL3YYYY(file: File): Promise<Parsed> {
  const ext = (file.name.toLowerCase().split(".").pop() || "").trim();
  if (ext !== "xlsx" && ext !== "xls") {
    return { rows: [], issues: ["Alleen .xlsx of .xls toegestaan."], skus: [] };
  }
  const XLSX: any = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  if (!wb.SheetNames || !wb.SheetNames.length) {
    return { rows: [], issues: ["Excel bevat geen werkbladen."], skus: [] };
  }
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) {
    return { rows: [], issues: ["Eerste werkblad kon niet worden gelezen."], skus: [] };
  }
  const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
  if (!Array.isArray(aoa) || !aoa.length) {
    return { rows: [], issues: ["Werkblad is leeg."], skus: [] };
  }
  return parseWideNL3YYYY(aoa);
}

/** ===================== Time-series utils ===================== */
function makeSkuSeries(rows: RawRow[]): SkuSeries[] {
  const bySku = new Map<string, RawRow[]>();
  for (const r of rows) {
    if (!bySku.has(r.sku)) bySku.set(r.sku, []);
    bySku.get(r.sku)!.push(r);
  }
  const out: SkuSeries[] = [];
  bySku.forEach((arr, sku) => {
    const ser = arr
      .map((r) => {
        const d = periodToDate(r.period);
        return d
          ? { period: r.period, y: Math.max(0, Math.round(toNum(r.inmarket_units))), d, m: d.getMonth() + 1, y4: d.getFullYear() }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
    ser.sort((a, b) => a.d.getTime() - b.d.getTime());
    out.push({ sku, series: ser });
  });
  out.sort((a, b) => a.sku.localeCompare(b.sku));
  return out;
}

function monthSeasonality(series: { d: Date; y: number }[]): number[] {
  // 1..12 index
  const sums = Array(13).fill(0);
  const cnts = Array(13).fill(0);
  series.forEach((p) => {
    const mm = p.d.getMonth() + 1;
    sums[mm] += p.y;
    cnts[mm] += 1;
  });
  const avgAll = series.length ? series.reduce((a, p) => a + p.y, 0) / series.length : 0;
  const idx = Array(13).fill(1);
  for (let m = 1; m <= 12; m++) {
    const avg = cnts[m] ? sums[m] / cnts[m] : avgAll || 1;
    idx[m] = avgAll ? avg / avgAll : 1;
  }
  const mean = idx.slice(1).reduce((a, x) => a + x, 0) / 12;
  for (let m = 1; m <= 12; m++) idx[m] = idx[m] / (mean || 1);
  return idx;
}

function movingAverage(arr: number[], win: number): number[] {
  const out: number[] = [];
  const w = Math.max(1, Math.floor(win));
  for (let i = 0; i < arr.length; i++) {
    const a = Math.max(0, i - (w - 1));
    const slice = arr.slice(a, i + 1);
    const val = slice.length ? slice.reduce((s, v) => s + v, 0) / slice.length : arr[i] || 0;
    out.push(val);
  }
  return out;
}

function forecastSku(
  ser: SkuSeries,
  horizon: number,
  maWindow: number
): ForecastResult {
  const s = ser.series;
  if (!s.length) return { sku: ser.sku, nextMonths: [], mape6: null, lastActual: null };

  // Seizoensindex & werkdagen-correctie
  const seasIdx = monthSeasonality(s);
  const deseasonal: number[] = s.map((p) => {
    const m = p.d.getMonth() + 1;
    const wd = workingDaysInMonth(p.d.getFullYear(), m) / WD_BASE;
    const denom = (seasIdx[m] || 1) * (wd || 1);
    const v = denom ? p.y / denom : p.y;
    return v;
  });

  // Moving average op gedeseasonaliseerde reeks
  const ma = movingAverage(deseasonal, Math.max(2, maWindow));
  const baseline = ma[ma.length - 1]; // laatste MA als basisniveau

  // Backtest MAPE (laatste 6 maanden, one-step-ahead)
  let mape6: number | null = null;
  if (s.length >= 8) {
    const back = Math.min(6, s.length - 2);
    let absPctSum = 0;
    let cnt = 0;
    for (let i = s.length - back; i < s.length; i++) {
      const p = s[i];
      const m = p.d.getMonth() + 1;
      const wd = workingDaysInMonth(p.d.getFullYear(), m) / WD_BASE;
      const basePrev = i - 1 >= 0 ? ma[i - 1] : ma[i];
      const f = Math.max(0, Math.round(basePrev * (seasIdx[m] || 1) * (wd || 1)));
      if (p.y > 0) {
        absPctSum += Math.abs((p.y - f) / p.y);
        cnt++;
      }
    }
    mape6 = cnt ? absPctSum / cnt : null;
  }

  // Horizon voorspellen
  const lastDate = s[s.length - 1].d;
  const nextMonths: ForecastPoint[] = [];
  for (let k = 1; k <= horizon; k++) {
    const d = addMonths(lastDate, k);
    const m = d.getMonth() + 1;
    const wd = workingDaysInMonth(d.getFullYear(), m) / WD_BASE;
    const f = Math.max(0, Math.round(baseline * (seasIdx[m] || 1) * (wd || 1)));
    nextMonths.push({ period: fmtPeriodYYYYMM(d), units: f });
  }

  return {
    sku: ser.sku,
    nextMonths,
    mape6,
    lastActual: s[s.length - 1]?.y ?? null,
  };
}

/** ===================== UI Helpers ===================== */
const fmtPct = (p: number, d = 1) => `${(p * 100).toFixed(d)}%`;
const compact = (n: number) =>
  new Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);

/** ===================== Component ===================== */
export default function SupplyPageNL3YYYY() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);

  // Forecast instellingen
  const [horizon, setHorizon] = useState(6);     // maanden vooruit
  const [maWindow, setMaWindow] = useState(6);   // moving average venster

  // Allocatie instellingen (10 klanten)
  const [shares, setShares] = useState<AllocationShare[]>(
    Array.from({ length: 10 }, (_, i) => ({ customer: `Groothandel ${i + 1}`, share: 0.1 }))
  );

  // SKU selectie voor allocatie
  const [selectedSku, setSelectedSku] = useState<string>("");

  const handleBrowse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) await handleFile(f);
    e.currentTarget.value = ""; // opnieuw kunnen kiezen
  };

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  }, []);

  async function handleFile(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const res = await parseExcelNL3YYYY(file);
      setParsed(res);
      if (!res.rows.length) {
        setErr(res.issues.join(" | ") || "Geen rijen ingelezen.");
      } else {
        if (!selectedSku && res.skus.length) setSelectedSku(res.skus[0]);
      }
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Upload mislukt.");
    } finally {
      setBusy(false);
    }
  }

  // Series per SKU
  const series = useMemo<SkuSeries[]>(() => (parsed?.rows?.length ? makeSkuSeries(parsed.rows) : []), [parsed]);

  // Forecasts per SKU
  const forecasts = useMemo<ForecastResult[]>(() => {
    return series.map((ser) => forecastSku(ser, horizon, maWindow));
  }, [series, horizon, maWindow]);

  // Overall forecast accuracy (gemiddelde van aanwezige MAPE’s)
  const overallMAPE = useMemo(() => {
    const vals = forecasts.map((f) => f.mape6).filter((x): x is number => x !== null);
    if (!vals.length) return null;
    return vals.reduce((a, x) => a + x, 0) / vals.length;
  }, [forecasts]);

  // Totale forecast komende maand (alle SKUs)
  const nextMonthLabel = useMemo(() => {
    const firstSer = series && series.length ? series[0] : null;
    const lastPoint = firstSer && firstSer.series.length ? firstSer.series[firstSer.series.length - 1] : null;
    const d = lastPoint?.d ?? new Date();
    return fmtPeriodYYYYMM(addMonths(d, 1));
  }, [series]);

  const totalNextMonth = useMemo(() => {
    if (!forecasts.length) return 0;
    const m = nextMonthLabel;
    return forecasts.reduce((sum, f) => {
      const pt = f.nextMonths.find((p) => p.period === m);
      return sum + (pt?.units ?? 0);
    }, 0);
  }, [forecasts, nextMonthLabel]);

  // Allocatie shares normalisatie (bij berekening; UI toont raw percentages)
  function normalizedShares(shs: AllocationShare[]) {
    const s = shs.map((x) => Math.max(0, x.share));
    const total = s.reduce((a, b) => a + b, 0) || 1;
    return s.map((v) => v / total);
  }

  // Allocatie voor geselecteerde SKU (komende maand)
  const allocSelected = useMemo(() => {
    if (!selectedSku || !forecasts.length) return null;
    const f = forecasts.find((x) => x.sku === selectedSku);
    if (!f) return null;
    const pt = f.nextMonths.find((p) => p.period === nextMonthLabel);
    const units = pt?.units ?? 0;
    const ns = normalizedShares(shares);
    const rows = shares.map((row, i) => ({
      customer: row.customer,
      units: Math.round(units * ns[i]),
    }));
    return { period: nextMonthLabel, rows, total: units };
  }, [forecasts, selectedSku, shares, nextMonthLabel]);

  // Allocatie totaal (alle SKUs, komende maand)
  const allocTotal = useMemo(() => {
    if (!forecasts.length) return null;
    const total = totalNextMonth;
    const ns = normalizedShares(shares);
    const rows = shares.map((row, i) => ({
      customer: row.customer,
      units: Math.round(total * ns[i]),
    }));
    return { period: nextMonthLabel, rows, total };
  }, [shares, totalNextMonth, nextMonthLabel, forecasts]);

  return (
    <div className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6 py-4 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Supply Chain Optimization (NL3 – YYYY-MM)</h1>
          <p className="text-sm text-gray-600">
            Upload je NL3-format met maanden als <b>YYYY-MM</b> (bijv. 2025-09). We voorspellen per SKU en verdelen de komende maand over groothandels.
            Werkdagen en seizoenseffecten worden meegenomen; forecasting refit automatisch bij nieuwe data.
          </p>
        </div>
      </header>

      {/* Upload */}
      <section
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="rounded-2xl border-2 border-dashed p-6 bg-white text-center"
      >
        <div className="text-sm text-gray-700">Sleep je Excel (.xlsx/.xls) hierheen of</div>
        <label className="mt-2 inline-flex items-center gap-2 rounded-lg bg-sky-600 text-white text-sm px-4 py-2 hover:bg-sky-700 cursor-pointer">
          Bestand kiezen
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBrowse} disabled={busy} />
        </label>
        <p className="mt-2 text-xs text-gray-500">
          NL3-format: rij 1: <i>SKU</i> in kolom A, maanden <b>(YYYY-MM)</b> in B..N; rij 2..K: SKU-namen in kolom A; per maandblok K kolommen (diagonaal).
        </p>
        {busy && <div className="mt-2 text-sm text-gray-600">Bezig met verwerken…</div>}
        {err && <div className="mt-3 inline-block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{err}</div>}
        {!!parsed?.issues?.length && (
          <div className="mt-3 text-left max-w-3xl mx-auto text-xs text-gray-700">
            <div className="font-medium">Opmerkingen</div>
            <ul className="list-disc pl-5">
              {parsed.issues.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        )}
      </section>

      {/* KPI’s & instellingen */}
      <section className="rounded-2xl border bg-white p-4 space-y-4">
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          <div className="rounded-lg border p-3 text-sm">
            <div className="text-gray-500"># SKU’s</div>
            <div className="font-semibold">{parsed?.skus?.length ?? 0}</div>
          </div>
          <div className="rounded-lg border p-3 text-sm">
            <div className="text-gray-500">Forecast horizon</div>
            <div className="font-semibold">{horizon} mnd</div>
          </div>
          <div className="rounded-lg border p-3 text-sm">
            <div className="text-gray-500">MA-venster</div>
            <div className="font-semibold">{maWindow} mnd</div>
          </div>
          <div className="rounded-lg border p-3 text-sm">
            <div className="text-gray-500">Forecast exactheid (overall MAPE)</div>
            <div className="font-semibold">{overallMAPE !== null ? fmtPct(overallMAPE, 1) : "n.v.t."}</div>
          </div>
          <div className="rounded-lg border p-3 text-sm">
            <div className="text-gray-500">Forecast — komende maand (totaal)</div>
            <div className="font-semibold">{compact(totalNextMonth)} units</div>
            <div className="text-xs text-gray-500">Periode: {nextMonthLabel}</div>
          </div>
        </div>

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] items-end">
          <label className="text-sm">
            <div className="font-medium">Horizon (maanden)</div>
            <input
              type="number" min={1} max={24} step={1} value={horizon}
              onChange={(e) => setHorizon(clamp(parseInt(e.target.value || "0", 10), 1, 24))}
              className="mt-1 w-32 rounded-lg border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <div className="font-medium">Moving average venster</div>
            <input
              type="number" min={2} max={12} step={1} value={maWindow}
              onChange={(e) => setMaWindow(clamp(parseInt(e.target.value || "0", 10), 2, 12))}
              className="mt-1 w-32 rounded-lg border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <div className="font-medium">SKU voor allocatie (komende maand)</div>
            <select
              value={selectedSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="mt-1 rounded-lg border px-3 py-2"
            >
              {(parsed?.skus ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
      </section>

      {/* Forecast tabel per SKU (compact) */}
      {forecasts.length > 0 && forecasts[0].nextMonths && (
        <section className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-3">Forecast per SKU</h3>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-2">SKU</th>
                  <th className="text-left py-2 px-2">Laatste actual</th>
                  <th className="text-left py-2 px-2">MAPE (6m)</th>
                  {forecasts[0].nextMonths.map((p) => (
                    <th key={p.period} className="text-left py-2 px-2">{p.period}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {forecasts.map((f) => (
                  <tr key={f.sku} className="border-b last:border-0">
                    <td className="py-2 px-2 font-medium">{f.sku}</td>
                    <td className="py-2 px-2">{f.lastActual ?? "-"}</td>
                    <td className="py-2 px-2">{f.mape6 !== null ? fmtPct(f.mape6, 1) : "n.v.t."}</td>
                    {f.nextMonths.map((p) => (
                      <td key={p.period} className="py-2 px-2">{p.units}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Allocatie editor */}
      <section className="rounded-2xl border bg-white p-4 space-y-3">
        <h3 className="text-base font-semibold">Allocatie — marktaandelen groothandels</h3>
        <p className="text-xs text-gray-600">Voer ruwe shares in (totaal hoeft hier niet 100% te zijn; we normaliseren bij de berekening).</p>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          {shares.map((row, i) => (
            <div key={i} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={row.customer}
                  onChange={(e) => setShares(s => s.map((r, idx) => idx === i ? { ...r, customer: e.target.value } : r))}
                  className="w-full rounded-lg border px-2 py-1"
                />
              </div>
              <div className="mt-2">
                <input
                  type="number" step={0.1}
                  value={Math.round(row.share * 1000) / 10}
                  onChange={(e) => {
                    const v = Math.max(0, parseFloat(e.target.value || "0") / 100);
                    setShares(s => s.map((r, idx) => idx === i ? { ...r, share: v } : r));
                  }}
                  className="w-28 rounded-lg border px-2 py-1"
                /> <span className="text-gray-600">%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Allocatie — geselecteerde SKU (komende maand) */}
      {allocSelected && (
        <section className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-1">Allocatie — {selectedSku} ({allocSelected.period})</h3>
          <div className="text-xs text-gray-600 mb-2">Totaal forecast: <b>{allocSelected.total}</b> units</div>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[520px]">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-2">Klant</th>
                  <th className="text-left py-2 px-2">Units</th>
                </tr>
              </thead>
              <tbody>
                {allocSelected.rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 px-2">{r.customer}</td>
                    <td className="py-2 px-2">{r.units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Allocatie — totaal (alle SKUs, komende maand) */}
      {allocTotal && (
        <section className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-1">Allocatie — Totaal ({allocTotal.period})</h3>
          <div className="text-xs text-gray-600 mb-2">Totaal forecast (alle SKU’s): <b>{allocTotal.total}</b> units</div>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[520px]">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-2">Klant</th>
                  <th className="text-left py-2 px-2">Units</th>
                </tr>
              </thead>
              <tbody>
                {allocTotal.rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 px-2">{r.customer}</td>
                    <td className="py-2 px-2">{r.units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
