'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

// Zelfde dataset-structuur als Waterfall
type Row = {
  pg: string; sku: string; cust: string; period: string;
  gross: number;
  d_channel: number; d_customer: number; d_product: number; d_volume: number; d_value: number; d_other_sales: number; d_mandatory: number; d_local: number;
  invoiced: number;
  r_direct: number; r_prompt: number; r_indirect: number; r_mandatory: number; r_local: number;
  inc_royalty: number; inc_other: number;
  net: number;
};

const STORE_KEYS = ['pharmagtn_wf_session'];

function loadRows(): Row[] {
  try {
    for (const k of STORE_KEYS) {
      const raw = sessionStorage.getItem(k) || localStorage.getItem(k);
      if (raw) return (JSON.parse(raw).rows || []) as Row[];
    }
  } catch {}
  return [];
}

function eur(n: number) { return n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }); }
function pct(n: number) { return n.toFixed(1).replace('.', ',') + '%'; }

type Dim = 'CUSTOMER' | 'SKU';

type Cell = { period: string; valuePct: number; gross: number };
type RowAgg = { key: string; label: string; totalGross: number; cells: Cell[] };

function colorFromPct(v: number, min: number, max: number) {
  // 0 = licht, max = donker (blauwgroen)
  if (!isFinite(v)) v = 0;
  const t = max > min ? (v - min) / (max - min) : 0;
  const h = 190; // teal-ish
  const s = 70;
  const l = 95 - 50 * Math.min(1, Math.max(0, t)); // 95% -> 45%
  return `hsl(${h}deg ${s}% ${l}%)`;
}

function Spark({ values }: { values: number[] }) {
  if (!values.length) return null;
  const w = 240, h = 60, pad = 6;
  const xs = values.map((_, i) => i);
  const min = Math.min(...values), max = Math.max(...values);
  const mapX = (i: number) => pad + (i / Math.max(1, values.length - 1)) * (w - 2*pad);
  const mapY = (v: number) => pad + (1 - (v - min) / Math.max(1e-9, max - min || 1)) * (h - 2*pad);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${mapX(i)} ${mapY(v)}`).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0">
      <rect x={0} y={0} width={w} height={h} fill="#ffffff" />
      <path d={d} stroke="#0ea5e9" strokeWidth={2} fill="none" />
      {values.map((v,i)=><circle key={i} cx={mapX(i)} cy={mapY(v)} r={2.5} fill="#10b981" />)}
    </svg>
  );
}

export default function ConsistencyTrendPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [dim, setDim] = useState<Dim>('CUSTOMER');
  const [pg, setPg] = useState<string>('All');
  const [includeRebates, setIncludeRebates] = useState(false);
  const [topN, setTopN] = useState<number>(20);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => { setRows(loadRows()); }, []);
  if (!rows.length) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-xl font-semibold">Consistency — Trend & Heatmap</h1>
        <p className="text-sm text-gray-600 mt-1">Geen dataset gevonden. Upload een Excel via de aparte uploadpagina.</p>
        <div className="mt-3 flex gap-2">
          <Link href="/app/consistency/upload" className="rounded-lg bg-sky-600 px-3 py-2 text-white text-sm hover:bg-sky-700">
            Upload Excel
          </Link>
          <Link href="/app" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Terug naar dashboard</Link>
        </div>
      </div>
    );
  }

  const periods = useMemo(() => Array.from(new Set(rows.map(r => r.period))).sort(), [rows]);
  const pgs     = useMemo(() => Array.from(new Set(rows.map(r => r.pg))).sort(), [rows]);

  const scoped = rows.filter(r => (pg === 'All' || r.pg === pg));

  // Aggregatie per dim & periode
  const keyOf = (r: Row) => (dim === 'CUSTOMER' ? r.cust : r.sku);
  const labelOf = keyOf;

  const grossByKey: Record<string, number> = {};
  const grossByKeyPeriod: Record<string, Record<string, number>> = {};
  const spendPctByKeyPeriod: Record<string, Record<string, number>> = {};

  for (const r of scoped) {
    const k = keyOf(r);
    const p = r.period;
    const discounts = r.d_channel + r.d_customer + r.d_product + r.d_volume + r.d_value + r.d_other_sales + r.d_mandatory + r.d_local;
    const rebates   = r.r_direct + r.r_prompt + r.r_indirect + r.r_mandatory + r.r_local;
    const gspend    = includeRebates ? (discounts + rebates) : discounts;

    grossByKey[k] = (grossByKey[k] || 0) + r.gross;
    grossByKeyPeriod[k] = grossByKeyPeriod[k] || {};
    grossByKeyPeriod[k][p] = (grossByKeyPeriod[k][p] || 0) + r.gross;

    spendPctByKeyPeriod[k] = spendPctByKeyPeriod[k] || {};
    const pctVal = r.gross ? (100 * gspend / r.gross) : 0;
    spendPctByKeyPeriod[k][p] = (spendPctByKeyPeriod[k][p] || 0) + pctVal; // als meerdere records zelfde key/period, sommeren
  }

  // Maak rijen
  let table: RowAgg[] = Object.keys(grossByKey).map(k => {
    const cells: Cell[] = periods.map(p => ({
      period: p,
      valuePct: (spendPctByKeyPeriod[k]?.[p] ?? 0), // al geaggregeerd over rijen
      gross: (grossByKeyPeriod[k]?.[p] ?? 0),
    }));
    return { key: k, label: labelOf({} as any as Row), totalGross: grossByKey[k], cells };
  });

  // sorteer op totale omzet (share) en neem topN
  table.sort((a,b)=>b.totalGross - a.totalGross);
  table = table.slice(0, topN);

  // kleur-schaal voor heatmap
  const allVals = table.flatMap(r => r.cells.map(c => c.valuePct));
  const minV = Math.min(...allVals, 0);
  const maxV = Math.max(...allVals, 0);

  // geselecteerde entity voor sparkline (eerste rij default)
  const selKey = selected ?? (table[0]?.key ?? null);
  const sel = table.find(r => r.key === selKey) || null;
  const series = sel ? sel.cells.map(c => c.valuePct) : [];

  // eenvoudige stabiliteit: coefficient of variation
  const stability = (() => {
    if (!series.length) return { mean: 0, std: 0, cv: 0 };
    const mean = series.reduce((a,b)=>a+b,0) / series.length;
    const std = Math.sqrt(series.reduce((s,v)=>s+(v-mean)*(v-mean),0) / Math.max(1, series.length-1));
    return { mean, std, cv: mean ? std/mean : 0 };
  })();

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Consistency — Trend & Heatmap</h1>
            <p className="text-sm text-gray-600">Bekijk stabiliteit van discount/GtN% per periode en vergelijk top {topN} {dim === 'CUSTOMER' ? 'klanten' : 'SKU’s'}.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/app/consistency/upload" className="rounded-lg bg-sky-600 px-3 py-2 text-white text-sm hover:bg-sky-700">Upload/Replace Excel</Link>
            <Link href="/app" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Terug naar dashboard</Link>
          </div>
        </div>
      </div>

      {/* filters + KPI's */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="grid md:grid-cols-5 gap-2">
          <select value={dim} onChange={e=>{ setDim(e.target.value as Dim); setSelected(null); }} className="rounded-lg border px-3 py-2 text-sm">
            <option value="CUSTOMER">Groepering: Customer</option>
            <option value="SKU">Groepering: SKU</option>
          </select>
          <select value={pg} onChange={e=>{ setPg(e.target.value); setSelected(null); }} className="rounded-lg border px-3 py-2 text-sm">
            <option value="All">Alle productgroepen</option>
            {pgs.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm px-2">
            <input type="checkbox" checked={includeRebates} onChange={e=>{ setIncludeRebates(e.target.checked); setSelected(null); }} />
            Neem rebates mee (GtN%)
          </label>
          <label className="flex items-center gap-2 text-sm px-2">
            Top N:
            <input type="number" min={5} max={100} step={1} value={topN}
              onChange={e=>setTopN(Math.max(5, Math.min(100, Number(e.target.value))))}
              className="w-20 rounded border px-2 py-1"
            />
          </label>
          <div className="self-center text-xs text-gray-500">Periodes: {periods[0]} → {periods[periods.length-1]}</div>
        </div>
      </div>

      {/* heatmap */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="font-medium mb-2">Heatmap (% per periode)</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left sticky left-0 bg-gray-50">{" "}{dim === 'CUSTOMER' ? 'Klant' : 'SKU'}{" "}</th>
                {periods.map(p => (
                  <th key={p} className="px-3 py-2 text-right">{p}</th>
                ))}
                <th className="px-3 py-2 text-right">Omzet (totaal)</th>
              </tr>
            </thead>
            <tbody>
              {table.map(r => (
                <tr key={r.key} className="border-t">
                  <td
                    className={`px-3 py-2 sticky left-0 bg-white cursor-pointer ${r.key===selKey ? 'font-semibol
