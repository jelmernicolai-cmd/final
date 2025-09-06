'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

// Dataset (zelfde vorm als Waterfall parsing)
type Row = {
  pg: string; sku: string; cust: string; period: string;
  gross: number;
  d_channel: number; d_customer: number; d_product: number; d_volume: number; d_value: number; d_other_sales: number; d_mandatory: number; d_local: number;
  invoiced: number;
  r_direct: number; r_prompt: number; r_indirect: number; r_mandatory: number; r_local: number;
  inc_royalty: number; inc_other: number;
  net: number;
};

type Dim = 'CUSTOMER' | 'SKU';
type Cell = { period: string; valuePct: number; gross: number };
type RowAgg = { key: string; label: string; totalGross: number; cells: Cell[] };

const LOCAL_KEYS = ['pharmagtn_wf_session']; // bewaart de Waterfall dataset

// ========== helpers ==========
function loadRows(): Row[] {
  try {
    for (const k of LOCAL_KEYS) {
      const raw = sessionStorage.getItem(k) || localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.rows) return parsed.rows as Row[];
      }
    }
  } catch {}
  return [];
}

function eur(n: number) {
  return n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}
function pctStr(n: number, digits = 1) {
  return n.toFixed(digits).replace('.', ',') + '%';
}
function colorFromPct(v: number, min: number, max: number) {
  if (!isFinite(v)) v = 0;
  const t = max > min ? (v - min) / (max - min) : 0;
  const h = 190;           // teal-ish
  const s = 70;
  const l = 95 - 50 * Math.min(1, Math.max(0, t)); // 95% -> 45%
  return `hsl(${h}deg ${s}% ${l}%)`;
}
function computeStats(values: number[]) {
  if (!values.length) return { mean: 0, std: 0, cv: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std  = Math.sqrt(values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / Math.max(1, values.length - 1));
  const cv   = mean ? std / mean : 0;
  return { mean, std, cv };
}

function Spark({ values }: { values: number[] }) {
  if (!values.length) return null;
  const w = 240, h = 60, pad = 6;
  const min = Math.min(...values), max = Math.max(...values);
  const mapX = (i: number) => pad + (i / Math.max(1, values.length - 1)) * (w - 2 * pad);
  const mapY = (v: number) => pad + (1 - (v - min) / Math.max(1e-9, max - min || 1)) * (h - 2 * pad);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${mapX(i)} ${mapY(v)}`).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0">
      <rect x={0} y={0} width={w} height={h} fill="#ffffff" />
      <path d={d} stroke="#0ea5e9" strokeWidth={2} fill="none" />
      {values.map((v, i) => (
        <circle key={i} cx={mapX(i)} cy={mapY(v)} r={2.5} fill="#10b981" />
      ))}
    </svg>
  );
}

function StabilityCard({ values }: { values: number[] }) {
  const { mean, std, cv } = computeStats(values);
  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <div className="rounded-lg border p-3">
        <div className="text-xs text-gray-500">Gemiddelde %</div>
        <div className="mt-1 font-semibold">{pctStr(mean)}</div>
      </div>
      <div className="rounded-lg border p-3">
        <div className="text-xs text-gray-500">Standaarddeviatie</div>
        <div className="mt-1 font-semibold">{pctStr(std)}</div>
      </div>
      <div className="rounded-lg border p-3">
        <div className="text-xs text-gray-500">Stabiliteit (CV)</div>
        <div className="mt-1 font-semibold">{(100 * cv).toFixed(0)}%</div>
      </div>
    </div>
  );
}

// ========== pagina ==========
export default function ConsistencyTrendPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [dim, setDim] = useState<Dim>('CUSTOMER');
  const [pg, setPg] = useState<string>('All');
  const [includeRebates, setIncludeRebates] = useState<boolean>(false);
  const [topN, setTopN] = useState<number>(20);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setRows(loadRows());
  }, []);

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
  const scoped  = useMemo(() => rows.filter(r => (pg === 'All' || r.pg === pg)), [rows, pg]);

  const keyOf = (r: Row) => (dim === 'CUSTOMER' ? r.cust : r.sku);

  // Aggregatie gewogen op omzet (per key/periode)
  const grossByKey: Record<string, number> = {};
  const grossByKeyPeriod: Record<string, Record<string, number>> = {};
  const spendByKeyPeriod: Record<string, Record<string, number>> = {};

  for (const r of scoped) {
    const k = keyOf(r);
    const p = r.period;
    const discounts = r.d_channel + r.d_customer + r.d_product + r.d_volume + r.d_value + r.d_other_sales + r.d_mandatory + r.d_local;
    const rebates   = r.r_direct + r.r_prompt + r.r_indirect + r.r_mandatory + r.r_local;
    const spend    = includeRebates ? (discounts + rebates) : discounts;

    grossByKey[k] = (grossByKey[k] || 0) + r.gross;

    if (!grossByKeyPeriod[k]) grossByKeyPeriod[k] = {};
    grossByKeyPeriod[k][p] = (grossByKeyPeriod[k][p] || 0) + r.gross;

    if (!spendByKeyPeriod[k]) spendByKeyPeriod[k] = {};
    spendByKeyPeriod[k][p] = (spendByKeyPeriod[k][p] || 0) + spend;
  }

  // Maak tabel
  let table: RowAgg[] = Object.keys(grossByKey).map(k => {
    const cells: Cell[] = periods.map(p => {
      const g = grossByKeyPeriod[k]?.[p] ?? 0;
      const s = spendByKeyPeriod[k]?.[p] ?? 0;
      const pct = g ? (100 * s / g) : 0;
      return { period: p, valuePct: pct, gross: g };
    });
    return { key: k, label: k, totalGross: grossByKey[k], cells };
  });

  // Sorteer en beperk tot topN op basis van totale omzet
  table.sort((a, b) => b.totalGross - a.totalGross);
  table = table.slice(0, topN);

  // kleurenschalen
  const allVals = table.flatMap(r => r.cells.map(c => c.valuePct));
  const minV = Math.min(0, ...allVals);
  const maxV = Math.max(0, ...allVals);

  // selectie / sparkline
  const selKey = selected ?? (table[0]?.key ?? null);
  const sel = table.find(r => r.key === selKey) || null;
  const series = sel ? sel.cells.map(c => c.valuePct) : [];

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Consistency — Trend & Heatmap</h1>
            <p className="text-sm text-gray-600">
              Bekijk stabiliteit van {includeRebates ? 'GtN%' : 'discount%'} per periode en vergelijk top {topN} {dim === 'CUSTOMER' ? 'klanten' : 'SKU’s'}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/app/consistency/upload" className="rounded-lg bg-sky-600 px-3 py-2 text-white text-sm hover:bg-sky-700">
              Upload/Replace Excel
            </Link>
            <Link href="/app" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Terug naar dashboard</Link>
          </div>
        </div>
      </div>

      {/* filters */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="grid md:grid-cols-5 gap-2">
          <select
            value={dim}
            onChange={(e) => { setDim(e.target.value as Dim); setSelected(null); }}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="CUSTOMER">Groepering: Customer</option>
            <option value="SKU">Groepering: SKU</option>
          </select>

          <select
            value={pg}
            onChange={(e) => { setPg(e.target.value); setSelected(null); }}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="All">Alle productgroepen</option>
            {pgs.map(v => <option key={v} value={v}>{v}</option>)}
          </select>

          <label className="flex items-center gap-2 text-sm px-2">
            <input
              type="checkbox"
              checked={includeRebates}
              onChange={(e) => { setIncludeRebates(e.target.checked); setSelected(null); }}
            />
            Neem rebates mee (GtN%)
          </label>

          <label className="flex items-center gap-2 text-sm px-2">
            Top N:
            <input
              type="number"
              min={5}
              max={100}
              step={1}
              value={topN}
              onChange={(e) => setTopN(Math.max(5, Math.min(100, Number(e.target.value))))}
              className="w-20 rounded border px-2 py-1"
            />
          </label>

          <div className="self-center text-xs text-gray-500">
            Periodes: {periods[0]} → {periods[periods.length - 1]}
          </div>
        </div>
      </div>

      {/* heatmap */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="font-medium mb-2">Heatmap (% per periode)</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left sticky left-0 bg-gray-50">{dim === 'CUSTOMER' ? 'Klant' : 'SKU'}</th>
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
                    className={`px-3 py-2 sticky left-0 bg-white cursor-pointer ${r.key === selKey ? 'font-semibold' : ''}`}
                    title="Klik voor trend"
                    onClick={() => setSelected(r.key)}
                  >
                    {r.label}
                  </td>
                  {r.cells.map(c => (
                    <td key={c.period} className="px-1 py-1 text-right">
                      <div
                        className="rounded px-2 py-1 inline-block"
                        style={{ backgroundColor: colorFromPct(c.valuePct, minV, maxV) }}
                        title={`${c.period}: ${pctStr(c.valuePct)} · omzet ${eur(c.gross)}`}
                      >
                        {pctStr(c.valuePct)}
                      </div>
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right tabular-nums">{eur(r.totalGross)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!table.length && (
          <div className="text-sm text-gray-500">Geen rijen binnen je selectie.</div>
        )}
      </div>

      {/* detail: sparkline + stabiliteit */}
      {sel && (
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium">
              Trend — {dim === 'CUSTOMER' ? 'Klant' : 'SKU'}: {sel.key}
            </div>
            <div className="text-xs text-gray-500">Klik een naam in de eerste kolom om te wisselen.</div>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <Spark values={sel.cells.map(c => c.valuePct)} />
            <StabilityCard values={sel.cells.map(c => c.valuePct)} />
          </div>
          <div className="mt-2 text-xs text-gray-600">
            CV = std/mean. Hoger = volatieler. Tip: borg periodieke voorwaarden en gebruik KPI-gebonden (retro/tiered) rebates om schommelingen te dempen.
          </div>
        </div>
      )}
    </div>
  );
}
