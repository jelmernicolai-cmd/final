'use client';

import { useMemo, useState } from 'react';
import { loadWaterfallRows, eur0 } from '@/lib/waterfall-storage';
import type { Row } from '@/lib/waterfall-types';
import ConsistencyNav from '@/components/consistency/ConsistencyNav';
import MiniBar from '@/components/charts/MiniBar';

type BenchMode = 'quintile' | 'overall';

export default function CustomersConsistency() {
  const rows: Row[] = loadWaterfallRows();
  const [mode, setMode] = useState<BenchMode>('quintile');

  if (!rows.length) {
    return (
      <div>
        <ConsistencyNav />
        <h1 className="text-xl font-semibold mt-4">Customers – Analyse</h1>
        <p className="text-gray-600">Geen dataset gevonden. Upload eerst een Excel in de Waterfall-module.</p>
      </div>
    );
  }

  const perCust = useMemo(() => {
    const map = new Map<string,{gross:number,disc:number}>();
    for (const r of rows) {
      const gross = r.gross||0;
      const disc =
        (r.d_channel||0)+(r.d_customer||0)+(r.d_product||0)+(r.d_volume||0)+(r.d_other_sales||0)+(r.d_mandatory||0)+(r.d_local||0);
      const cur = map.get(r.cust) || {gross:0,disc:0};
      cur.gross += gross; cur.disc += disc; map.set(r.cust, cur);
    }
    return [...map.entries()].map(([cust,v])=>({cust, gross:v.gross, discPct: v.gross ? (v.disc/v.gross)*100 : 0}));
  }, [rows]);

  const { overallPct, customersWithBench } = useMemo(() => {
    const overallGross = perCust.reduce((s,c)=>s+c.gross,0)||1;
    const overallDisc = perCust.reduce((s,c)=>s+(c.discPct/100)*c.gross,0);
    const overallPct = (overallDisc/overallGross)*100;

    // quintiles
    const sorted = [...perCust].sort((a,b)=>a.gross-b.gross);
    const qIndex = (q:number)=>Math.min(sorted.length-1,Math.max(0,Math.floor(q*(sorted.length-1))));
    const cuts = [0,qIndex(0.2),qIndex(0.4),qIndex(0.6),qIndex(0.8),sorted.length-1];

    const quintilePctByIdx = new Map<number,number>();
    for(let i=0;i<5;i++){
      const start = i===0?0:cuts[i]+1, end = cuts[i+1];
      let g=0,d=0; for(let k=start;k<=end;k++){ const c=sorted[k]; g+=c.gross; d+=(c.discPct/100)*c.gross; }
      quintilePctByIdx.set(i, g ? (d/g)*100 : overallPct);
    }

    const customersWithBench = perCust.map(c=>{
      let bench = overallPct;
      if(sorted.length>=5){
        const idx = sorted.findIndex(x=>x.cust===c.cust);
        const q = idx<=cuts[1]?0:idx<=cuts[2]?1:idx<=cuts[3]?2:idx<=cuts[4]?3:4;
        bench = quintilePctByIdx.get(q) ?? overallPct;
      }
      return {...c, benchPct: bench};
    });

    return { overallPct, customersWithBench };
  }, [perCust]);

  const table = useMemo(()=>{
    const bm = (c:{benchPct:number}) => (mode==='overall' ? overallPct : c.benchPct);
    const arr = customersWithBench.map(c=>{
      const bench = bm(c);
      const deviation = c.discPct - bench;
      const potential = deviation>0 ? (deviation/100)*c.gross : 0;
      const suggestion =
        deviation > 5 ? 'Heronderhandel (>> peers).' :
        deviation > 2 ? 'Harmoniseer korting/bonussen.' :
        deviation < -5 ? 'Onder benchmark: check retentierisico.' :
        deviation < -2 ? 'Overweeg loyaliteitsvoordeel i.p.v. korting.' : '';
      return {...c, benchPct: bench, deviation, potential, suggestion};
    }).sort((a,b)=>b.potential-a.potential);
    return { top: arr.slice(0,25), all: arr };
  }, [customersWithBench, overallPct, mode]);

  const totalPotential = table.top.reduce((s,c)=>s+c.potential,0);

  return (
    <div className="space-y-4">
      <ConsistencyNav />

      {/* Header + controls */}
      <div className="flex items-center gap-3 mt-4">
        <h1 className="text-xl font-semibold">Klantanalyse (korting t.o.v. omzet-benchmark)</h1>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-gray-600">Benchmark</label>
          <select value={mode} onChange={(e)=>setMode(e.target.value as BenchMode)} className="text-sm border rounded px-2 py-1">
            <option value="quintile">Per omzet-quintile</option>
            <option value="overall">Totaal (overall)</option>
          </select>
        </div>
      </div>

      {/* KPI + bar */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="grid md:grid-cols-[1fr_340px] gap-4 items-center">
          <div className="grid sm:grid-cols-2 gap-4">
            <Kpi title="Totaal besparingspotentieel (Top 25)" value={eur0(totalPotential)} />
            <Kpi title="Klanten geanalyseerd" value={String(perCust.length)} />
          </div>
          <div className="overflow-x-auto">
            <MiniBar
              values={table.top.slice(0,10).map(c=>c.deviation)}
              labels={table.top.slice(0,10).map(c=>c.cust)}
              valueFmt={(v)=>v.toFixed(1)+'pp'}
              tooltip={(_,v,l)=>`${l}: ${v.toFixed(1)} pp`}
            />
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl border bg-white p-4 overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left p-2">Klant</th>
              <th className="text-right p-2">Omzet</th>
              <th className="text-right p-2">Korting%</th>
              <th className="text-right p-2">Benchmark%</th>
              <th className="text-right p-2">Afwijking (pp)</th>
              <th className="text-right p-2">Potentieel</th>
              <th className="text-left p-2">Suggestie</th>
            </tr>
          </thead>
          <tbody>
            {table.top.map(c=>(
              <tr key={c.cust} className="border-t">
                <td className="p-2 font-medium">{c.cust}</td>
                <td className="p-2 text-right">{eur0(c.gross)}</td>
                <td className="p-2 text-right">{c.discPct.toFixed(1)}%</td>
                <td className="p-2 text-right">{c.benchPct.toFixed(1)}%</td>
                <td className={`p-2 text-right ${c.deviation>0?'text-red-600':c.deviation<0?'text-amber-700':''}`}>
                  {c.deviation.toFixed(1)}%
                </td>
                <td className="p-2 text-right">{c.potential>0?eur0(c.potential):'—'}</td>
                <td className="p-2">{c.suggestion || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {table.all.slice(0,25).map(c=>(
          <div key={c.cust} className="rounded-2xl border bg-white p-4">
            <div className="flex items-center">
              <div className="font-medium">{c.cust}</div>
              <div className="ml-auto text-xs px-2 py-0.5 rounded-full border">
                {c.deviation.toFixed(1)}%
              </div>
            </div>
            <div className="mt-1 text-sm text-gray-600">Omzet: {eur0(c.gross)}</div>
            <div className="mt-1 text-sm">Korting: <b>{c.discPct.toFixed(1)}%</b> • Benchmark: {c.benchPct.toFixed(1)}%</div>
            <div className="mt-1 text-sm">Potentieel: <b>{c.potential>0?eur0(c.potential):'—'}</b></div>
            <div className="mt-2">
              <MiniBar values={[c.deviation]} labels={['afw.']} width={260} height={60} valueFmt={(v)=>v.toFixed(1)+'pp'} />
            </div>
            <div className="mt-2 text-sm text-gray-700">{c.suggestion || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
