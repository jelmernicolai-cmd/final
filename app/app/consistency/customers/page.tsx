'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ScatterChartSVG from '@/components/consistency/ScatterChartSVG.client';

type Row = {
  pg: string; sku: string; cust: string; period: string;
  gross: number;
  d_channel: number; d_customer: number; d_product: number; d_volume: number; d_value: number; d_other_sales: number; d_mandatory: number; d_local: number;
  invoiced: number;
  r_direct: number; r_prompt: number; r_indirect: number; r_mandatory: number; r_local: number;
  inc_royalty: number; inc_other: number;
  net: number;
};

function parseStore(): { meta: any; rows: Row[] } | null {
  if (typeof window === 'undefined') return null;
  try {
    const k = 'pharmagtn_wf_session'; // WF_STORE_KEY fallback
    const s = sessionStorage.getItem(k) || localStorage.getItem(k);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}
function sum<T extends Record<string, any>>(rows: T[], key: keyof T) {
  return rows.reduce((a, r) => a + (Number(r[key]) || 0), 0);
}
function pct(n: number, d: number, digits = 1) {
  if (!d) return '—';
  return (100 * n / d).toFixed(digits).replace('.', ',') + '%';
}
function fmtEUR(n: number) { return n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }); }

type CustAgg = {
  cust: string;
  gross: number;
  discounts: number;
  rebates: number;
  discRatePct: number;     // discounts/gross *100
  gtnRatePct: number;      // (discounts+rebates)/gross *100
  sharePct: number;        // gross / totalGross *100
  expectedDiscPct: number; // trendline yhat op basis van sharePct
  residualPP: number;      // discRatePct - expectedDiscPct (percentagepunten)
};

export default function ConsistencyCustomersPage() {
  const [data, setData] = useState<{ meta: any; rows: Row[] } | null>(null);
  const [pg, setPg] = useState('All');
  const [period, setPeriod] = useState<'ALL' | 'LATEST'>('ALL');
  const [includeRebates, setIncludeRebates] = useState(false);
  const [minShare, setMinShare] = useState(0.2); // negeer hele kleine klanten <0.2% omzet

  useEffect(() => { const d = parseStore(); if (d) setData(d); }, []);
  const rows = data?.rows || [];
  if (!rows.length) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-xl font-semibold">Consistency — Customers</h1>
        <p className="text-sm text-gray-600 mt-1">Geen dataset gevonden. Upload een Excel via het dashboard.</p>
        <Link href="/app" className="inline-block mt-4 rounded-lg border px-4 py-2 hover:bg-gray-50">Terug naar dashboard</Link>
      </div>
    );
  }

  // periodeselectie
  const periods = useMemo(() => Array.from(new Set(rows.map(r => r.period))).sort(), [rows]);
  const latest = periods[periods.length - 1];

  // filters
  const pgs = useMemo(() => Array.from(new Set(rows.map(r => r.pg))).sort(), [rows]);

  const scoped = rows.filter(r =>
    (pg === 'All' || r.pg === pg) &&
    (period === 'ALL' || r.period === latest)
  );

  const totalGross = sum(scoped, 'gross');

  // aggregatie per klant
  const map = new Map<string, CustAgg>();
  for (const r of scoped) {
    const dsum = r.d_channel + r.d_customer + r.d_product + r.d_volume + r.d_value + r.d_other_sales + r.d_mandatory + r.d_local;
    const rsum = r.r_direct + r.r_prompt + r.r_indirect + r.r_mandatory + r.r_local;
    const it = map.get(r.cust) || {
      cust: r.cust, gross: 0, discounts: 0, rebates: 0,
      discRatePct: 0, gtnRatePct: 0, sharePct: 0, expectedDiscPct: 0, residualPP: 0
    };
    it.gross += r.gross;
    it.discounts += dsum;
    it.rebates += rsum;
    map.set(r.cust, it);
  }

  let aggs = Array.from(map.values());
  aggs = aggs.map(a => {
    const discRatePct = a.gross ? (100 * a.discounts / a.gross) : 0;
    const gtnRatePct  = a.gross ? (100 * (a.discounts + a.rebates) / a.gross) : 0;
    const sharePct    = totalGross ? (100 * a.gross / totalGross) : 0;
    return { ...a, discRatePct, gtnRatePct, sharePct };
  });

  // pas minShare filter toe
  aggs = aggs.filter(a => a.sharePct >= minShare);

  // regressie vs share (verwachte discount%)
  const pts = aggs.map(a => ({ x: a.sharePct, y: includeRebates ? a.gtnRatePct : a.discRatePct, label: a.cust, size: Math.sqrt(a.sharePct/100) }));
  const { a: A, b: B } = (() => {
    const n = pts.length || 1;
    let sx=0, sy=0, sxx=0, sxy=0;
    for (const p of pts) { sx+=p.x; sy+=p.y; sxx+=p.x*p.x; sxy+=p.x*p.y; }
    const denom = n*sxx - sx*sx || 1;
    const b = (n*sxy - sx*sy)/denom;
    const a = (sy - b*sx)/n;
    return { a, b };
  })();

  aggs = aggs.map(a => {
    const yhat = A + B * a.sharePct;
    const y    = includeRebates ? a.gtnRatePct : a.discRatePct;
    return { ...a, expectedDiscPct: yhat, residualPP: y - yhat };
  });

  // KPI's
  const rho = (() => {
    // Spearman rang-correlatie tussen grootte (share) en discount%
    const xs = [...aggs].sort((a,b)=>b.sharePct - a.sharePct).map((a,i)=>({ cust:a.cust, rx:i+1 }));
    const ys = [...aggs].sort((a,b)=>(includeRebates? b.gtnRatePct - a.gtnRatePct : b.discRatePct - a.discRatePct)).map((a,i)=>({ cust:a.cust, ry:i+1 }));
    const rank = new Map<string, {rx:number, ry:number}>();
    xs.forEach(r => rank.set(r.cust, { rx: r.rx, ry: 0 }));
    ys.forEach(r => { const o = rank.get(r.cust)!; o.ry = r.ry; rank.set(r.cust, o); });
    const n = aggs.length;
    if (n < 2) return 0;
    let s = 0;
    rank.forEach(v => { const d=v.rx - v.ry; s += d*d; });
    return 1 - (6*s)/(n*(n*n-1));
  })();

  // outliers: boven verwachting (klein maar hoge discount) & onder verwachting
  const worstAbove = [...aggs].sort((a,b)=>b.residualPP - a.residualPP).slice(0,5);
  const worstBelow = [...aggs].sort((a,b)=>a.residualPP - b.residualPP).slice(0,5);

  // scatter points
  const points = pts;

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Consistency — Customers</h1>
            <p className="text-sm text-gray-600">
              Vergelijk <strong>discount% t.o.v. omzet</strong> per klant. Doel: voorkom dat <em>kleine</em> klanten relatief het meest krijgen.
            </p>
          </div>
          <Link href="/app" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Terug naar dashboard</Link>
        </div>
      </div>

      {/* KPI's */}
      <div className="grid md:grid-cols-4 gap-4">
        <Kpi label="Klanten (>= min share)" value={String(aggs.length)} />
        <Kpi label="Totale omzet (scope)" value={fmtEUR(totalGross)} />
        <Kpi label="Rang-correlatie (size vs %)" value={rho.toFixed(2)} hint=">0: kleine klanten relatief meer; <0: grote klanten relatief meer" />
        <Kpi label="Model" value={includeRebates ? 'Discounts + Rebates' : 'Alleen Discounts'} />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="grid md:grid-cols-5 gap-2">
          <select value={pg} onChange={e=>setPg(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
            <option value="All">Alle productgroepen</option>
            {pgs.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={period} onChange={e=>setPeriod(e.target.value as any)} className="rounded-lg border px-3 py-2 text-sm">
            <option value="ALL">Alle perioden (geaggregeerd)</option>
            <option value="LATEST">Laatste periode ({latest})</option>
          </select>
          <label className="flex items-center gap-2 text-sm px-2">
            <input type="checkbox" checked={includeRebates} onChange={e=>setIncludeRebates(e.target.checked)} />
            Neem rebates mee in % (GtN)
          </label>
          <label className="flex items-center gap-2 text-sm px-2">
            Min. omzet-aandeel:
            <input
              type="number" min={0} step={0.1} value={minShare}
              onChange={e=>setMinShare(Math.max(0, Number(e.target.value)))}
              className="w-20 rounded border px-2 py-1"
            /> %
          </label>
          <div className="self-center text-xs text-gray-500 px-1">Periode-range: {periods[0]} → {periods[periods.length-1]}</div>
        </div>
      </div>

      {/* Scatter */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="font-medium mb-2">Discount% vs Omzet-aandeel per klant</div>
        <ScatterChartSVG
          points={points}
          xLabel="Omzet-aandeel klant (%)"
          yLabel={includeRebates ? 'Discount+Rebate / Gross (%)' : 'Discount / Gross (%)'}
          decimals={1}
        />
        <div className="mt-2 text-xs text-gray-500">
          Cirkelgrootte ~ omzet-aandeel. Blauwe lijn = verwachte discount% (trend). Punten ver daarboven: mogelijke over-incentivatie.
        </div>
      </div>

      {/* Outliers + acties */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ActionList title="Te hoog t.o.v. peers (verlagen of herstructureren)" rows={worstAbove} positive />
        <ActionList title="Te laag t.o.v. peers (onderhandelkans / mix-ruil)" rows={worstBelow} />
      </div>

      {/* Tabel */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="font-medium mb-2">Overzicht per klant</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Klant</th>
                <th className="text-right px-3 py-2">Omzet</th>
                <th className="text-right px-3 py-2">Aandeel</th>
                <th className="text-right px-3 py-2">Discount%</th>
                {includeRebates && <th className="text-right px-3 py-2">GtN%</th>}
                <th className="text-right px-3 py-2">Verwacht %</th>
                <th className="text-right px-3 py-2">Afwijking (p.p.)</th>
              </tr>
            </thead>
            <tbody>
              {[...aggs].sort((a,b)=>b.residualPP-a.residualPP).map(a => (
                <tr key={a.cust} className="border-t">
                  <td className="px-3 py-2">{a.cust}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtEUR(a.gross)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{a.sharePct.toFixed(1).replace('.', ',')}%</td>
                  <td className="px-3 py-2 text-right tabular-nums">{a.discRatePct.toFixed(1).replace('.', ',')}%</td>
                  {includeRebates && (
                    <td className="px-3 py-2 text-right tabular-nums">{a.gtnRatePct.toFixed(1).replace('.', ',')}%</td>
                  )}
                  <td className="px-3 py-2 text-right tabular-nums">{a.expectedDiscPct.toFixed(1).replace('.', ',')}%</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${a.residualPP>0?'text-rose-600':'text-emerald-600'}`}>
                    {a.residualPP>=0?'+':''}{a.residualPP.toFixed(1).replace('.', ',')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
    </div>
  );
}

function ActionList({ title, rows, positive }: { title: string; rows: CustAgg[]; positive?: boolean }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="font-medium mb-2">{title}</div>
      {rows.length ? (
        <ul className="space-y-2 text-sm">
          {rows.map((a, i) => {
            const nowPct = a.discRatePct;
            const expPct = a.expectedDiscPct;
            const delta  = a.residualPP;
            const more   = positive ? 'Verlaag basisdiscount naar corridor (± ' + expPct.toFixed(1).replace('.', ',') + '%) en zet rest om in performance-rebates (tiered/retroactief, KPI’s).'
                                    : 'Onderhandel ruimte: breng incentives onder in KPI-gebonden rebates en borg claim/DSO; benut volume-mix om net-floor te bewaken.';
            return (
              <li key={i} className="rounded-lg border px-3 py-2 leading-relaxed">
                <div className="font-medium">{a.cust}</div>
                <div className="text-gray-700">
                  Aandeel {a.sharePct.toFixed(1).replace('.', ',')}% — Discount {nowPct.toFixed(1).replace('.', ',')}% vs verwacht {expPct.toFixed(1).replace('.', ',')}% ({delta>=0?'+':''}{delta.toFixed(1).replace('.', ',')} p.p.).
                </div>
                <div className="text-gray-800 mt-1">Actie: {more}</div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-sm text-gray-500">Geen afwijkingen gevonden.</div>
      )}
    </div>
  );
}
