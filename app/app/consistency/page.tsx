'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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

type CustAgg = {
  cust: string;
  gross: number;
  discounts: number;
  rebates: number;
  discRatePct: number; // discounts/gross *100
  gtnRatePct: number;  // (discounts+rebates)/gross *100
  sharePct: number;    // gross / totalGross *100
  residualPP: number;  // afwijking t.o.v. verwachte discount% (trend)
};

export default function ConsistencyHubPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [pg, setPg] = useState('All');
  const [includeRebates, setIncludeRebates] = useState(false);
  const [minShare, setMinShare] = useState(0.2); // negeer mini-klanten <0.2% omzet

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(WF_STORE_KEY) || localStorage.getItem(WF_STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { rows: Row[] };
        setRows(parsed.rows || []);
      }
    } catch {}
  }, []);

  if (!rows.length) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Consistency</h1>
              <p className="text-sm text-gray-600">
                Upload een Excel om de Consistency-analyses te openen.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/app/consistency/upload" className="rounded-lg bg-sky-600 px-3 py-2 text-white text-sm hover:bg-sky-700">
                Upload Excel
              </Link>
              <Link href="/app" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                Terug naar dashboard
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6">
          <div className="font-medium mb-2">Zo werkt het</div>
          <ol className="list-decimal ml-5 text-sm text-gray-700 space-y-1">
            <li>Ga naar <code>/app/consistency/upload</code> en kies je Excel (eerste tabblad wordt gelezen).</li>
            <li>Na parsing wordt de dataset lokaal opgeslagen in je browser (geen serverupload).</li>
            <li>Keer terug naar deze pagina voor KPI’s & outliers, of open direct de Customers-analyse.</li>
          </ol>
        </div>
      </div>
    );
  }

  // filter op productgroep
  const pgs = useMemo(() => Array.from(new Set(rows.map(r => r.pg))).sort(), [rows]);
  const scoped = rows.filter(r => (pg === 'All' || r.pg === pg));

  // totalen
  const totalGross = sum(scoped, 'gross');
  const totalDisc  = sum(scoped, 'd_channel') + sum(scoped, 'd_customer') + sum(scoped, 'd_product')
                   + sum(scoped, 'd_volume') + sum(scoped, 'd_value') + sum(scoped, 'd_other_sales')
                   + sum(scoped, 'd_mandatory') + sum(scoped, 'd_local');
  const totalReb   = sum(scoped, 'r_direct') + sum(scoped, 'r_prompt') + sum(scoped, 'r_indirect')
                   + sum(scoped, 'r_mandatory') + sum(scoped, 'r_local');
  const gtnPctAll  = totalGross ? ((totalDisc + (includeRebates ? totalReb : 0)) / totalGross) * 100 : 0;

  // aggregatie per klant
  const map = new Map<string, CustAgg>();
  for (const r of scoped) {
    const dsum = r.d_channel + r.d_customer + r.d_product + r.d_volume + r.d_value + r.d_other_sales + r.d_mandatory + r.d_local;
    const rsum = r.r_direct + r.r_prompt + r.r_indirect + r.r_mandatory + r.r_local;
    const it = map.get(r.cust) || { cust: r.cust, gross: 0, discounts: 0, rebates: 0, discRatePct: 0, gtnRatePct: 0, sharePct: 0, residualPP: 0 };
    it.gross += r.gross;
    it.discounts += dsum;
    it.rebates += rsum;
    map.set(r.cust, it);
  }

  let aggs = Array.from(map.values()).map(a => {
    const discRatePct = a.gross ? (100 * a.discounts / a.gross) : 0;
    const gtnRatePct  = a.gross ? (100 * (a.discounts + a.rebates) / a.gross) : 0;
    const sharePct    = totalGross ? (100 * a.gross / totalGross) : 0;
    return { ...a, discRatePct, gtnRatePct, sharePct };
  });

  // min-share filter
  aggs = aggs.filter(a => a.sharePct >= minShare);

  // eenvoudige trend (least squares) van % t.o.v. share --> residu (p.p.)
  const pts = aggs.map(a => ({ x: a.sharePct, y: includeRebates ? a.gtnRatePct : a.discRatePct }));
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
    const y = includeRebates ? a.gtnRatePct : a.discRatePct;
    const yhat = A + B * a.sharePct;
    return { ...a, residualPP: y - yhat };
  });

  // Spearman rang-correlatie (size vs %)
  const rho = (() => {
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

  // Outliers: > +2.0 p.p. boven verwachting
  const OUTLIER_PP = 2.0;
  const highOutliers = aggs
    .filter(a => a.residualPP > OUTLIER_PP)
    .sort((a,b)=>b.residualPP-a.residualPP)
    .slice(0,5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Consistency</h1>
            <p className="text-sm text-gray-600">
              Check per klant hoe <strong>discount% t.o.v. omzet</strong> zich verhoudt tot peers en of kleine klanten niet relatief het meest krijgen.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/app/consistency/upload" className="rounded-lg bg-sky-600 px-3 py-2 text-white text-sm hover:bg-sky-700">
              Upload/Replace Excel
            </Link>
            <Link href="/app" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
              Terug naar dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* KPI’s */}
      <div className="grid md:grid-cols-4 gap-4">
        <Kpi label="Scope omzet" value={eur(totalGross)} />
        <Kpi label={includeRebates ? 'Gem. GtN% (scope)' : 'Gem. Discount% (scope)'} value={`${(totalGross ? ((totalDisc + (includeRebates? totalReb : 0)) / totalGross) * 100 : 0).toFixed(1).replace('.', ',')}%`} />
        <Kpi label="Rang-correlatie (size vs %)" value={rho.toFixed(2)} hint=">0: kleinere klanten relatief meer korting" />
        <Kpi label="Outliers (>+2,0 p.p.)" value={String(highOutliers.length)} />
      </div>

      {/* Filterbalk */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="grid md:grid-cols-4 gap-2">
          <select value={pg} onChange={e=>setPg(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
            <option value="All">Alle productgroepen</option>
            {pgs.map(v => <option key={v} value={v}>{v}</option>)}
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
        </div>
      </div>

      {/* Outliers – korte lijst met acties */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="font-medium mb-2">Top afwijkers (boven verwachting)</div>
        {highOutliers.length ? (
          <ul className="space-y-2 text-sm">
            {highOutliers.map((a, i) => (
              <li key={i} className="rounded-lg border px-3 py-2 leading-relaxed">
                <div className="font-medium">{a.cust}</div>
                <div className="text-gray-700">
                  Aandeel {a.sharePct.toFixed(1).replace('.', ',')}% — Discount {a.discRatePct.toFixed(1).replace('.', ',')}%
                  {includeRebates && <> · GtN {a.gtnRatePct.toFixed(1).replace('.', ',')}%</>} — 
                  +{a.residualPP.toFixed(1).replace('.', ',')} p.p. t.o.v. verwacht.
                </div>
                <div className="text-gray-800 mt-1">
                  Actie: verlaag basis-discount naar corridor (± trend), migreer rest naar performance-rebates (tiered/retro, KPI’s & DSO), en borg claim-eisen.
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-500">Geen duidelijke outliers binnen de huidige scope.</div>
        )}
      </div>

      {/* CTA-kaarten */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card
          title="Customers — Scatter & acties"
          desc="Discount% vs omzet-aandeel per klant, met trendlijn, outliers en concrete suggesties."
          href="/app/consistency/customers"
          cta="Open Customers-analyse"
        />
        <Card
          title="Trend & Heatmap (SKU/Klant)"
          desc="Stabiliteit van GtN% over tijd en heatmap per SKU/klant en periode."
          href="/app/consistency/trend"
          cta="Open Trend & Heatmap"
        />
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

function Card({ title, desc, href, cta }: { title: string; desc: string; href: string; cta: string }) {
  return (
    <div className="rounded-2xl border bg-white p-6 flex flex-col">
      <div className="font-semibold">{title}</div>
      <p className="text-sm text-gray-600 mt-1 flex-1">{desc}</p>
      <Link href={href} className="mt-4 inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700">
        {cta}
      </Link>
    </div>
  );
}
