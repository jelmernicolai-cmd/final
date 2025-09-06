'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import LineChartSVG from '@/components/consistency/LineChartSVG.client';
import { WF_STORE_KEY } from '@/components/waterfall/UploadAndParse';

type Row = {
  pg: string; sku: string; cust: string; period: string;
  gross: number;
  d_channel: number; d_customer: number; d_product: number; d_volume: number; d_value: number; d_other_sales: number; d_mandatory: number; d_local: number;
  invoiced: number;
  r_direct: number; r_prompt: number; r_indirect: number; r_mandatory: number; r_local: number;
  inc_royalty: number; inc_other: number;
  net: number;
};

function sum<T extends Record<string, any>>(rows: T[], key: keyof T) {
  return rows.reduce((a, r) => a + (Number(r[key]) || 0), 0);
}
function eur(n: number) {
  return n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}
function pct(n: number, d: number, digits = 1) {
  if (!d) return '—';
  return (100 * n / d).toFixed(digits).replace('.', ',') + '%';
}
function pctNum(n: number, d: number) {
  return d ? (100 * n) / d : 0;
}

function parseStore(): { meta: any; rows: Row[] } | null {
  if (typeof window === 'undefined') return null;
  try {
    const s = sessionStorage.getItem(WF_STORE_KEY) || localStorage.getItem(WF_STORE_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export default function ConsistencyPage() {
  const [data, setData] = useState<{ meta: any; rows: Row[] } | null>(null);
  const [pg, setPg] = useState('All');
  const [sku, setSku] = useState('All');
  const [cust, setCust] = useState('All');
  const [viewBy, setViewBy] = useState<'SKU' | 'Customer'>('SKU'); // matrix dimensie

  useEffect(() => {
    const d = parseStore();
    if (d) setData(d);
  }, []);

  const rows = data?.rows || [];
  if (!rows.length) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-xl font-semibold">Consistency analyse</h1>
        <p className="text-sm text-gray-600 mt-1">Er is nog geen dataset geladen. Ga terug naar het dashboard om een Excel te uploaden.</p>
        <Link className="inline-block mt-4 rounded-lg border px-4 py-2 hover:bg-gray-50" href="/app">Terug naar dashboard</Link>
      </div>
    );
  }

  // Opties voor filters
  const pgs  = useMemo(() => Array.from(new Set(rows.map(r => r.pg))).sort(), [rows]);
  const skus = useMemo(() => Array.from(new Set(rows.filter(r => pg === 'All' || r.pg === pg).map(r => r.sku))).sort(), [rows, pg]);
  const custs= useMemo(() => Array.from(new Set(rows.map(r => r.cust))).sort(), [rows]);
  const periods = useMemo(() => {
    const set = new Set(rows.map(r => r.period));
    // sorteer YYYY-MM
    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  }, [rows]);

  // Filter data
  const filtered = rows.filter(r =>
    (pg === 'All'  || r.pg === pg) &&
    (sku === 'All' || r.sku === sku) &&
    (cust === 'All'|| r.cust === cust)
  );

  // Aggregates per periode (trend)
  const byPeriod = periods.map(p => {
    const X = filtered.filter(r => r.period === p);
    const gross = sum(X, 'gross');
    const disc  = sum(X, 'd_channel') + sum(X, 'd_customer') + sum(X, 'd_product') + sum(X, 'd_volume') + sum(X, 'd_value') + sum(X, 'd_other_sales') + sum(X, 'd_mandatory') + sum(X, 'd_local');
    const reb   = sum(X, 'r_direct') + sum(X, 'r_prompt') + sum(X, 'r_indirect') + sum(X, 'r_mandatory') + sum(X, 'r_local');
    const gtnPct= pctNum(disc + reb, gross);
    const netPct= pctNum(sum(X, 'net'), gross);
    return { period: p, gross, disc, reb, gtnPct, netPct };
  });

  // KPI’s (variatie en max delta)
  const gtnSeries = byPeriod.map(x => x.gtnPct).filter(x => Number.isFinite(x));
  const mean = gtnSeries.reduce((a,b)=>a+b,0) / (gtnSeries.length || 1);
  const std  = Math.sqrt(gtnSeries.reduce((a,b)=>a + Math.pow(b-mean,2),0) / Math.max(1, gtnSeries.length-1));
  const cov  = mean ? (std/mean)*100 : 0; // Coefficient of Variation %

  let maxDelta = 0;
  for (let i=1;i<gtnSeries.length;i++){
    const d = Math.abs(gtnSeries[i]-gtnSeries[i-1]);
    if (d > maxDelta) maxDelta = d;
  }

  // Matrix: rijen = SKU of Customer, kolommen = period, waarde = GtN% (disc+reb)/gross
  const dimValues = useMemo(() => {
    const set = new Set(filtered.map(r => viewBy === 'SKU' ? r.sku : r.cust));
    return Array.from(set).sort();
  }, [filtered, viewBy]);

  type Cell = { key: string; period: string; gross: number; gtnPct: number };
  const matrix: Record<string, Cell[]> = {};
  for (const key of dimValues) {
    matrix[key] = periods.map(period => {
      const X = filtered.filter(r =>
        r.period === period && (viewBy === 'SKU' ? r.sku === key : r.cust === key)
      );
      const gross = sum(X, 'gross');
      const disc  = sum(X, 'd_channel') + sum(X, 'd_customer') + sum(X, 'd_product') + sum(X, 'd_volume') + sum(X, 'd_value') + sum(X, 'd_other_sales') + sum(X, 'd_mandatory') + sum(X, 'd_local');
      const reb   = sum(X, 'r_direct') + sum(X, 'r_prompt') + sum(X, 'r_indirect') + sum(X, 'r_mandatory') + sum(X, 'r_local');
      const gtnPct= pctNum(disc + reb, gross);
      return { key, period, gross, gtnPct };
    });
  }

  // Heatmap schaling
  const allPcts = Object.values(matrix).flat().map(c => c.gtnPct).filter(Number.isFinite);
  const minPct = Math.min(...allPcts, 0);
  const maxPct = Math.max(...allPcts, 10);
  const colorFor = (v: number) => {
    if (!Number.isFinite(v)) return 'transparent';
    const t = (v - minPct) / Math.max(0.0001, (maxPct - minPct)); // 0..1
    // groen (lage GtN) -> rood (hoge GtN)
    const hue = 140 - 140 * t; // 140 (groen) .. 0 (rood)
    return `hsl(${hue} 70% 85%)`;
  };

  // Anomalies: grootste MoM sprongen per key
  type Anom = { key: string; from: string; to: string; delta: number; toPct: number };
  const anomalies: Anom[] = [];
  for (const key of dimValues) {
    const series = matrix[key];
    for (let i=1; i<series.length; i++){
      const d = series[i].gtnPct - series[i-1].gtnPct;
      if (Number.isFinite(d)) {
        anomalies.push({ key, from: series[i-1].period, to: series[i].period, delta: d, toPct: series[i].gtnPct });
      }
    }
  }
  anomalies.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
  const topAnoms = anomalies.slice(0, 8);

  const trendPoints = byPeriod.map(p => ({ x: p.period, y: Number(p.gtnPct.toFixed(2)) }));

  return (
    <div className="space-y-6">
      {/* Titel + uitleg */}
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Consistency analyse</h1>
            <p className="text-sm text-gray-600">
              Controleer stabiliteit van GtN% over perioden en detecteer uitschieters per {viewBy}.
            </p>
          </div>
          <Link href="/app" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Terug naar dashboard</Link>
        </div>
      </div>

      {/* KPI’s */}
      <div className="grid md:grid-cols-4 gap-4">
        <KpiBox label="Gem. GtN%" value={`${(mean).toFixed(1).replace('.', ',')}%`} />
        <KpiBox label="Std. dev (p.p.)" value={`${(std).toFixed(1).replace('.', ',')}`} />
        <KpiBox label="CoV (%)" value={`${(cov).toFixed(1).replace('.', ',')}`} />
        <KpiBox label="Max MoM Δ (p.p.)" value={`${(maxDelta).toFixed(1).replace('.', ',')}`} />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="grid lg:grid-cols-5 gap-2">
          <select value={viewBy} onChange={e=>setViewBy(e.target.value as 'SKU'|'Customer')} className="rounded-lg border px-3 py-2 text-sm">
            <option value="SKU">View by: SKU</option>
            <option value="Customer">View by: Customer</option>
          </select>
          <select value={pg} onChange={e=>{ setPg(e.target.value); setSku('All'); }} className="rounded-lg border px-3 py-2 text-sm">
            <option value="All">Alle productgroepen</option>
            {pgs.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={sku} onChange={e=>setSku(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
            <option value="All">Alle SKU’s</option>
            {skus.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={cust} onChange={e=>setCust(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
            <option value="All">Alle klanten</option>
            {custs.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <div className="text-sm text-gray-500 self-center px-1">Periode: {periods[0]} → {periods[periods.length-1]}</div>
        </div>
      </div>

      {/* Trend (GtN% over tijd) */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="font-medium mb-2">GtN% trend (gefilterde scope)</div>
        <LineChartSVG points={trendPoints} ySuffix="%" decimals={1} />
      </div>

      {/* Matrix */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="font-medium mb-3">Consistency matrix – {viewBy}</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 sticky left-0 bg-white z-10"> {viewBy} </th>
                {periods.map(p => (
                  <th key={p} className="text-right px-3 py-2">{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dimValues.map(key => (
                <tr key={key} className="border-t">
                  <td className="px-3 py-2 sticky left-0 bg-white z-10 font-medium">{key}</td>
                  {matrix[key].map(cell => {
                    const val = Number.isFinite(cell.gtnPct) ? cell.gtnPct : NaN;
                    const bg = colorFor(val);
                    return (
                      <td key={cell.period} className="px-3 py-2 text-right tabular-nums" style={{ background: bg }}>
                        {Number.isFinite(val) ? `${val.toFixed(1).replace('.', ',')}%` : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Kleurenschaal: groen = lagere GtN% (consistenter/efficiënter), rood = hogere GtN%.
        </div>
      </div>

      {/* Anomalies */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="font-medium mb-2">Grootste maand-op-maand veranderingen</div>
        {topAnoms.length ? (
          <ul className="space-y-2 text-sm">
            {topAnoms.map((a, i) => (
              <li key={i} className="rounded-lg border px-3 py-2 flex items-center justify-between">
                <div className="truncate">
                  <span className="font-medium">{a.key}</span> — {a.from} → {a.to}
                </div>
                <div className="tabular-nums">
                  Δ {a.delta >= 0 ? '+' : ''}{a.delta.toFixed(1).replace('.', ',')} p.p. &nbsp;
                  (naar {a.toPct.toFixed(1).replace('.', ',')}%)
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-500">Geen opvallende veranderingen gevonden.</div>
        )}
      </div>
    </div>
  );
}

function KpiBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
