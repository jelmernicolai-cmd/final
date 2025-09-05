'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import WaterfallChart from '@/components/waterfall/WaterfallChart.client';
import { WF_STORE_KEY } from '@/components/waterfall/UploadAndParse';
import ActionTips from '@/components/waterfall/ActionTips';

type Row = {
  pg: string; sku: string; cust: string; period: string;
  gross: number;
  d_channel: number; d_customer: number; d_product: number; d_volume: number; d_value: number; d_other_sales: number; d_mandatory: number; d_local: number;
  invoiced: number;
  r_direct: number; r_prompt: number; r_indirect: number; r_mandatory: number; r_local: number;
  inc_royalty: number; inc_other: number;
  net: number;
};

function sum(rows: Row[], key: keyof Row) {
  return rows.reduce((a, r) => a + (Number(r[key]) || 0), 0);
}

function pct(num: number, den: number, digits = 1) {
  if (!den) return '—';
  return (100 * num / den).toFixed(digits).replace('.', ',') + '%';
}

function eur(num: number) {
  return num.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

export default function AnalyzePage() {
  const [data, setData] = useState<{ meta: any; rows: Row[] } | null>(null);
  const [pg, setPg]   = useState('All');
  const [sku, setSku] = useState('All');
  const [cust, setCust] = useState('All');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WF_STORE_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {}
  }, []);

  const rows = data?.rows || [];
  const validation = data?.meta?.validation || { warnings: [], corrected: 0 };

  const pgs  = useMemo(() => Array.from(new Set(rows.map(r => r.pg))).sort(), [rows]);
  const skus = useMemo(
    () => Array.from(new Set(rows.filter(r => pg === 'All' || r.pg === pg).map(r => r.sku))).sort(),
    [rows, pg]
  );
  const custs= useMemo(() => Array.from(new Set(rows.map(r => r.cust))).sort(), [rows]);

  const filtered = rows.filter(r =>
    (pg === 'All' || r.pg === pg) &&
    (sku === 'All' || r.sku === sku) &&
    (cust === 'All' || r.cust === cust)
  );

  // Aggregates
  const gross          = sum(filtered, 'gross');
  const d_channel      = sum(filtered, 'd_channel');
  const d_customer     = sum(filtered, 'd_customer');
  const d_product      = sum(filtered, 'd_product');
  const d_volume       = sum(filtered, 'd_volume');
  const d_value        = sum(filtered, 'd_value');
  const d_other_sales  = sum(filtered, 'd_other_sales');
  const d_mandatory    = sum(filtered, 'd_mandatory');
  const d_local        = sum(filtered, 'd_local');
  const invoiced       = sum(filtered, 'invoiced');
  const r_direct       = sum(filtered, 'r_direct');
  const r_prompt       = sum(filtered, 'r_prompt');
  const r_indirect     = sum(filtered, 'r_indirect');
  const r_mandatory    = sum(filtered, 'r_mandatory');
  const r_local        = sum(filtered, 'r_local');
  const inc_royalty    = sum(filtered, 'inc_royalty');
  const inc_other      = sum(filtered, 'inc_other');
  const net            = sum(filtered, 'net');

  const totalDiscounts = d_channel + d_customer + d_product + d_volume + d_value + d_other_sales + d_mandatory + d_local;
  const totalRebates   = r_direct + r_prompt + r_indirect + r_mandatory + r_local;
  const totalIncomes   = inc_royalty + inc_other;

  // "GtN spend" = discounts + rebates
  const gtnSpendEUR = totalDiscounts + totalRebates;
  const gtnSpendPct = pct(gtnSpendEUR, gross);

  const steps = [
    { label: 'Gross Sales', amount: gross, color: '#64748b' }, // slate
    { label: 'Channel Discounts', amount: -d_channel },
    { label: 'Customer Discounts', amount: -d_customer },
    { label: 'Product Discounts', amount: -d_product },
    { label: 'Volume Discounts', amount: -d_volume },
    { label: 'Value Discounts', amount: -d_value },
    { label: 'Other Sales Discounts', amount: -d_other_sales },
    { label: 'Mandatory Discounts', amount: -d_mandatory },
    { label: 'Local Discount', amount: -d_local },
    { label: 'Invoiced Sales', amount: 0, color: '#a855f7' }, // violet marker
    { label: 'Direct Rebates', amount: -r_direct },
    { label: 'Prompt Payment Rebates', amount: -r_prompt },
    { label: 'Indirect Rebates', amount: -r_indirect },
    { label: 'Mandatory Rebates', amount: -r_mandatory },
    { label: 'Local Rebate', amount: -r_local },
    { label: 'Royalty Income*', amount: inc_royalty },
    { label: 'Other Income*', amount: inc_other },
    { label: 'Net Sales', amount: 0, color: '#64748b' },
  ];

  // Top-3 GtN spend per customer / sku
  const byCustomer = new Map<string, number>();
  const bySku = new Map<string, number>();
  for (const r of filtered) {
    const gtn = (r.d_channel + r.d_customer + r.d_product + r.d_volume + r.d_value + r.d_other_sales + r.d_mandatory + r.d_local)
              + (r.r_direct + r.r_prompt + r.r_indirect + r.r_mandatory + r.r_local);
    byCustomer.set(r.cust, (byCustomer.get(r.cust) || 0) + gtn);
    bySku.set(r.sku, (bySku.get(r.sku) || 0) + gtn);
  }
  const top3Cust = Array.from(byCustomer.entries()).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const top3Sku  = Array.from(bySku.entries()).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const gtnTotalForShare = Math.max(1, Array.from(byCustomer.values()).reduce((a,b)=>a+b,0)); // avoid /0

  if (!rows.length) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-xl font-semibold">Waterfall analyse</h1>
        <p className="text-sm text-gray-600 mt-1">Er is nog geen dataset geladen. Ga terug naar het dashboard om een Excel te uploaden.</p>
        <Link className="inline-block mt-4 rounded-lg border px-4 py-2 hover:bg-gray-50" href="/app">Terug naar dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* VALIDATIE-BANNER */}
      {(validation.corrected || (validation.warnings?.length ?? 0) > 0) && (
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm">
            {validation.corrected ? (
              <div className="text-amber-700">
                Auto-correcties toegepast: <strong>{validation.corrected}</strong>.
              </div>
            ) : null}
            {(validation.warnings?.length ?? 0) > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer">{validation.warnings.length} waarschuwing(en) bekijken</summary>
                <ul className="list-disc ml-5 mt-1 max-h-40 overflow-auto text-gray-700">
                  {validation.warnings.map((m: string, i: number) => <li key={i}>{m}</li>)}
                </ul>
              </details>
            )}
          </div>
        </div>
      )}

      {/* HERO STRIP + KPI's */}
      <div className="rounded-2xl border overflow-hidden">
        <div className="bg-slate-800 text-white px-6 py-4 text-sm font-semibold">Gross-to-Net Waterfall</div>
        <div className="bg-gray-100 px-6 py-4">
          <div className="grid md:grid-cols-4 gap-4">
            <KpiBig label="TOTAL GtN SPEND (€)" value={eur(gtnSpendEUR)} />
            <KpiBig label="TOTAL GtN SPEND (%)" value={gtnSpendPct} />
            <KpiBig label="TOTAL DISCOUNT" value={`${eur(totalDiscounts)} · ${pct(totalDiscounts, gross)}`} />
            <KpiBig label="TOTAL REBATE" value={`${eur(totalRebates)} · ${pct(totalRebates, gross)}`} />
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="grid md:grid-cols-3 gap-2">
          <select value={pg} onChange={e=>{setPg(e.target.value); setSku('All');}} className="rounded-lg border px-3 py-2 text-sm">
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
        </div>
      </div>

      {/* TABLE + CHART */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* LEFT: Spend Table */}
        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="px-4 py-3 border-b font-medium">GROSS-TO-NET SPEND TABLE</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">GtN</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Level</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">%</th>
                </tr>
              </thead>
              <tbody>
                <Tr name="Gross Sales" value={gross} base={gross} bold />
                <Tr name="Channel Discounts" value={-d_channel} base={gross} />
                <Tr name="Customer Discounts" value={-d_customer} base={gross} />
                <Tr name="Product Discounts" value={-d_product} base={gross} />
                <Tr name="Volume Discounts" value={-d_volume} base={gross} />
                <Tr name="Value Discounts" value={-d_value} base={gross} />
                <Tr name="Other Sales Discounts" value={-d_other_sales} base={gross} />
                <Tr name="Mandatory Discounts" value={-d_mandatory} base={gross} />
                <Tr name="Local Discount" value={-d_local} base={gross} />
                <Tr name="Invoiced Sales" value={invoiced} base={gross} bold shaded />
                <Tr name="Direct Rebates" value={-r_direct} base={gross} />
                <Tr name="Prompt Payment Rebates" value={-r_prompt} base={gross} />
                <Tr name="Indirect Rebates" value={-r_indirect} base={gross} />
                <Tr name="Mandatory Rebates" value={-r_mandatory} base={gross} />
                <Tr name="Local Rebate" value={-r_local} base={gross} />
                <Tr name="Royalty Income*" value={inc_royalty} base={gross} />
                <Tr name="Other Income*" value={inc_other} base={gross} />
                <Tr name="Net Sales" value={net} base={gross} bold shaded />
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: Waterfall */}
        <div className="rounded-2xl border bg-white p-4">
          <div className="px-1 pb-2 font-medium">GROSS-TO-NET WATERFALL OVERVIEW</div>
          <WaterfallChart steps={steps} />
        </div>
      </div>

      {/* TOP-3 PANELS */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Top3Panel
          title="Customer – Highest 3"
          rows={top3Cust.map(([name, v]) => ({ name, value: v, pct: pct(v, gtnTotalForShare) }))}
        />
        <Top3Panel
          title="SKU – Highest 3"
          rows={top3Sku.map(([name, v]) => ({ name, value: v, pct: pct(v, gtnTotalForShare) }))}
        />
      </div>
    </div>
  );
}

function KpiBig({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function Tr({ name, value, base, bold, shaded }: { name: string; value: number; base: number; bold?: boolean; shaded?: boolean }) {
  const classes = [
    shaded ? 'bg-gray-50' : '',
    bold ? 'font-semibold' : '',
  ].join(' ');
  return (
    <tr className={classes}>
      <td className="px-4 py-2">{name}</td>
      <td className="px-4 py-2 text-right tabular-nums">{eur(Math.round(value))}</td>
      <td className="px-4 py-2 text-right tabular-nums">{pct(value, base)}</td>
    </tr>
  );
}

function Top3Panel({ title, rows }: { title: string; rows: { name: string; value: number; pct: string }[] }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="font-medium mb-2">{title}</div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div className="truncate">{r.name}</div>
            <div className="text-sm tabular-nums">{eur(Math.round(r.value))} <span className="text-gray-500">· {r.pct}</span></div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-gray-500">Geen data voor deze selectie.</div>}
      </div>
    </div>
  );
}
<ActionTips
  gross={gross}
  d_channel={d_channel} d_customer={d_customer} d_product={d_product} d_volume={d_volume} d_value={d_value}
  d_other_sales={d_other_sales} d_mandatory={d_mandatory} d_local={d_local}
  invoiced={invoiced}
  r_direct={r_direct} r_prompt={r_prompt} r_indirect={r_indirect} r_mandatory={r_mandatory} r_local={r_local}
  inc_royalty={inc_royalty} inc_other={inc_other}
  top3Cust={top3Cust.map(([name, v]) => ({ name, gtn: v }))}
  top3Sku={top3Sku.map(([name, v]) => ({ name, gtn: v }))}
 />
}
