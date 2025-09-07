'use client';

import { useMemo } from 'react';
import { loadWaterfallRows, eur0, pct1 } from '@/lib/waterfall-storage';
import type { Row } from '@/lib/waterfall-types';
import ConsistencyNav from '@/components/consistency/ConsistencyNav';
import Sparkline from '@/components/charts/Sparkline';
import MiniBar from '@/components/charts/MiniBar';
import Donut from '@/components/charts/Donut';

export default function ConsistencyHub() {
  const rows: Row[] = loadWaterfallRows();
  if (!rows.length) {
    return (
      <div className="max-w-3xl space-y-4">
        <ConsistencyNav />
        <h1 className="text-xl font-semibold mt-4">Consistency</h1>
        <p className="text-gray-600">Geen dataset gevonden. Upload eerst een Excel in de Waterfall-module.</p>
      </div>
    );
  }

  const discOf = (r: Row) =>
    (r.d_channel||0)+(r.d_customer||0)+(r.d_product||0)+(r.d_volume||0)+(r.d_other_sales||0)+(r.d_mandatory||0)+(r.d_local||0);

  const { grossTotal, avgDiscountPct, topDeviation, periodPctSeries } = useMemo(() => {
    let grossTotal = 0, discTotal = 0;
    const byCust = new Map<string,{gross:number,disc:number}>();
    const byPeriod = new Map<string,{gross:number,disc:number}>();

    for (const r of rows) {
      const g = r.gross||0, d = discOf(r);
      grossTotal += g; discTotal += d;

      const cc = byCust.get(r.cust) || {gross:0,disc:0};
      cc.gross += g; cc.disc += d; byCust.set(r.cust, cc);

      const pp = r.period || '—';
      const cp = byPeriod.get(pp) || {gross:0,disc:0};
      cp.gross += g; cp.disc += d; byPeriod.set(pp, cp);
    }

    const avgDiscountPct = grossTotal ? (discTotal / grossTotal) * 100 : 0;

    const custArr = [...byCust.entries()].map(([cust,v])=>{
      const pct = v.gross ? (v.disc/v.gross)*100 : 0;
      const deviation = pct - avgDiscountPct;
      const potential = deviation>0 ? (deviation/100)*v.gross : 0;
      return {cust, gross:v.gross, pct, deviation, potential};
    }).sort((a,b)=>Math.abs(b.deviation)-Math.abs(a.deviation)).slice(0,10);

    const periods = [...byPeriod.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
    const periodPctSeries = periods.map(([_,v])=> v.gross ? (v.disc/v.gross)*100 : 0);

    return { grossTotal, avgDiscountPct, topDeviation: custArr, periodPctSeries };
  }, [rows]);

  const potentialSum = topDeviation.reduce((s,c)=>s+c.potential,0);

  return (
    <div className="space-y-6">
      <ConsistencyNav />

      <header className="mt-4">
        <h1 className="text-xl font-semibold">Consistency Analyse</h1>
        <p className="text-gray-600">Benchmarks, afwijkingen en direct besparingspotentieel.</p>
      </header>

      {/* KPIs + Charts */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Totaal Gross</div>
            <div className="text-lg font-semibold mt-1">{eur0(grossTotal)}</div>
          </div>
          <Donut value={avgDiscountPct} label="Gem. korting" />
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Korting% over tijd</div>
          <Sparkline data={periodPctSeries} />
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Potentieel (Top 10 klanten)</div>
          <div className="text-lg font-semibold mt-1">{eur0(potentialSum)}</div>
          <div className="mt-2">
            <MiniBar
              values={topDeviation.map(x=>x.deviation)}
              labels={topDeviation.map(x=>x.cust)}
              valueFmt={(v)=>v.toFixed(1)+"pp"}
              tooltip={(_,v,l)=>`${l}: ${v.toFixed(1)} pp`}
            />
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl border bg-white p-4 overflow-x-auto">
        <table className="min-w-[800px] w-full text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left p-2">Klant</th>
              <th className="text-right p-2">Omzet</th>
              <th className="text-right p-2">Korting%</th>
              <th className="text-right p-2">Afwijking tov benchmark</th>
              <th className="text-right p-2">Potentieel</th>
            </tr>
          </thead>
          <tbody>
            {topDeviation.map((c)=>(
              <tr key={c.cust} className="border-t">
                <td className="p-2 font-medium">{c.cust}</td>
                <td className="p-2 text-right">{eur0(c.gross)}</td>
                <td className="p-2 text-right">{c.pct.toFixed(1)}%</td>
                <td className={`p-2 text-right ${c.deviation>0?'text-red-600':c.deviation<0?'text-amber-700':''}`}>
                  {c.deviation.toFixed(1)}%
                </td>
                <td className="p-2 text-right">{c.potential>0?eur0(c.potential):'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {topDeviation.map((c)=>(
          <div key={c.cust} className="rounded-2xl border bg-white p-4">
            <div className="flex items-center">
              <div className="font-medium">{c.cust}</div>
              <div className="ml-auto text-xs px-2 py-0.5 rounded-full border">
                {c.deviation.toFixed(1)}%
              </div>
            </div>
            <div className="mt-1 text-sm text-gray-600">Omzet: {eur0(c.gross)}</div>
            <div className="mt-1 text-sm">Korting: <b>{c.pct.toFixed(1)}%</b></div>
            <div className="mt-1 text-sm">Potentieel: <b>{c.potential>0?eur0(c.potential):'—'}</b></div>
            <div className="mt-2">
              <MiniBar values={[c.deviation]} labels={['afw.']} width={260} height={60} valueFmt={(v)=>v.toFixed(1)+'pp'} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
