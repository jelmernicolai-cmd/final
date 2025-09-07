'use client';

import { useMemo, useState } from 'react';
import { loadWaterfallRows, eur0 } from '@/lib/waterfall-storage';
import type { Row } from '@/lib/waterfall-types';
import ConsistencyNav from '@/components/consistency/ConsistencyNav';
import Sparkline from '@/components/charts/Sparkline';
import MiniBar from '@/components/charts/MiniBar';
import Donut from '@/components/charts/Donut';
import Badge from '@/components/ui/Badge';
import InfoBlock from '@/components/ui/InfoBlock';
import { FieldRow, Label } from '@/components/ui/Field';

type BenchMode = 'overall' | 'quintile';

export default function ConsistencyHub() {
  const rows: Row[] = loadWaterfallRows();
  const [mode, setMode] = useState<BenchMode>('overall');
  const [minorPP, setMinorPP] = useState(2);   // drempel "licht boven benchmark"
  const [majorPP, setMajorPP] = useState(5);   // drempel "significant boven benchmark"

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

  // 1) Kern-aggregaties
  const { grossTotal, avgDiscountPct, perCustomer, periodPctSeries } = useMemo(() => {
    let grossTotal = 0, discTotal = 0;
    const byCust = new Map<string,{gross:number,disc:number}>();
    const byPeriod = new Map<string,{gross:number,disc:number}>();

    for (const r of rows) {
      const g = r.gross||0, d = discOf(r);
      grossTotal += g; discTotal += d;

      const c = byCust.get(r.cust) || {gross:0,disc:0};
      c.gross += g; c.disc += d; byCust.set(r.cust, c);

      const p = r.period || '—';
      const pp = byPeriod.get(p) || {gross:0,disc:0};
      pp.gross += g; pp.disc += d; byPeriod.set(p, pp);
    }

    const avgDiscountPct = grossTotal ? (discTotal / grossTotal) * 100 : 0;

    const perCustomer = [...byCust.entries()].map(([cust,v])=>{
      const pct = v.gross ? (v.disc/v.gross)*100 : 0;
      return { cust, gross: v.gross, discPct: pct };
    });

    const periods = [...byPeriod.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
    const periodPctSeries = periods.map(([_,v])=> v.gross ? (v.disc/v.gross)*100 : 0);

    return { grossTotal, avgDiscountPct, perCustomer, periodPctSeries };
  }, [rows]);

  // 2) Quintile-benchmarks op basis van omzet (voor eerlijke peer-vergelijking)
  const quintileBench = useMemo(() => {
    const arr = [...perCustomer].sort((a,b)=>a.gross-b.gross);
    if (arr.length < 5) return { map: new Map<string, number>(), fallback: avgDiscountPct };
    const qIndex = (q:number)=>Math.min(arr.length-1,Math.max(0,Math.floor(q*(arr.length-1))));
    const cuts = [0,qIndex(0.2),qIndex(0.4),qIndex(0.6),qIndex(0.8),arr.length-1];
    const qPct = new Map<number,number>();
    for(let i=0;i<5;i++){
      const start = i===0?0:cuts[i]+1, end = cuts[i+1];
      let g=0,d=0;
      for(let k=start;k<=end;k++){ const c=arr[k]; g+=c.gross; d+=(c.discPct/100)*c.gross; }
      qPct.set(i, g ? (d/g)*100 : avgDiscountPct);
    }
    const benchMap = new Map<string,number>();
    for (let idx=0; idx<arr.length; idx++) {
      const c = arr[idx];
      const q = idx<=cuts[1]?0:idx<=cuts[2]?1:idx<=cuts[3]?2:idx<=cuts[4]?3:4;
      benchMap.set(c.cust, qPct.get(q) ?? avgDiscountPct);
    }
    return { map: benchMap, fallback: avgDiscountPct };
  }, [perCustomer, avgDiscountPct]);

  // 3) Afwijkingen t.o.v. gekozen benchmark + potentieel
  const table = useMemo(()=>{
    return perCustomer.map(c=>{
      const bench =
        mode === 'overall'
          ? avgDiscountPct
          : (quintileBench.map.get(c.cust) ?? quintileBench.fallback);
      const deviation = c.discPct - bench; // in percentagepunten
      const potential = deviation > 0 ? (deviation/100)*c.gross : 0;
      let severity: "ok"|"minor"|"major" = "ok";
      if (deviation > majorPP) severity = "major";
      else if (deviation > minorPP) severity = "minor";
      return { ...c, benchPct: bench, deviation, potential, severity };
    })
    .sort((a,b)=> b.potential - a.potential);
  }, [perCustomer, mode, avgDiscountPct, quintileBench, minorPP, majorPP]);

  const top = table.slice(0, 10);
  const potentialSum = top.reduce((s,c)=>s+c.potential,0);

  // CSV export
  function exportCSV() {
    const rows = [["Customer","Gross","Discount%","Benchmark%","Deviation(pp)","Potential"]];
    for (const c of table) {
      rows.push([
        c.cust,
        String(Math.round(c.gross)),
        c.discPct.toFixed(2),
        c.benchPct.toFixed(2),
        c.deviation.toFixed(2),
        String(Math.round(c.potential))
      ]);
    }
    const csv = rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "consistency_customers.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <ConsistencyNav />

      <header className="mt-4 flex items-start gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Consistency Analyse</h1>
          <p className="text-gray-600">
            Vergelijk klantkortingen met de geselecteerde benchmark en zie direct het besparingspotentieel.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge>{mode === 'overall' ? 'Benchmark: Overall (gewogen gemiddelde)' : 'Benchmark: Quintile peers (op omzet)'} </Badge>
            <button
              onClick={exportCSV}
              className="text-xs rounded border px-2 py-1 hover:bg-gray-50"
              aria-label="Exporteer CSV"
            >
              CSV export
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="rounded-xl border bg-white p-3 w-full sm:w-[340px]">
          <div className="text-sm font-medium mb-2">Instellingen</div>

          <FieldRow>
            <Label>Benchmark</Label>
            <select
              value={mode}
              onChange={(e)=>setMode(e.target.value as BenchMode)}
              className="text-sm border rounded px-2 py-1 w-full"
              aria-label="Benchmark selecteren"
            >
              <option value="overall">Overall (gewogen gemiddelde)</option>
              <option value="quintile">Quintile peers (op omzet)</option>
            </select>
          </FieldRow>

          <div className="mt-3 grid gap-3">
            <FieldRow>
              <Label>Drempel “licht te hoog”</Label>
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={10} step={0.5} value={minorPP}
                  onChange={(e)=>setMinorPP(Number(e.target.value))}
                  className="w-full" aria-label="Drempel minor" />
                <span className="text-sm w-10 text-right">{minorPP}pp</span>
              </div>
            </FieldRow>
            <FieldRow>
              <Label>Drempel “significant te hoog”</Label>
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={15} step={0.5} value={majorPP}
                  onChange={(e)=>setMajorPP(Number(e.target.value))}
                  className="w-full" aria-label="Drempel major" />
                <span className="text-sm w-10 text-right">{majorPP}pp</span>
              </div>
            </FieldRow>
          </div>
        </div>
      </header>

      <InfoBlock summary="Hoe berekenen we benchmark, afwijking en besparingspotentieel?">
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Discount%</b> per klant = (som van alle discount-velden) ÷ Gross × 100.</li>
          <li><b>Benchmark</b> = 
            {mode==='overall'
              ? <> gewogen gemiddelde discount% over alle klanten (overall).</>
              : <> discount% van de <i>quintile</i> (omzet-peer groep) waarin de klant valt.</>
            }
          </li>
          <li><b>Afwijking (pp)</b> = Discount% klant − Benchmark% (in percentagepunten).</li>
          <li><b>Potentieel</b> = max(0, Afwijking) × Gross (vereenvoudigd conservatief scenario).</li>
          <li>Drempels bepalen de kleurcodering (minor/major) en prioriteit in de lijst.</li>
        </ul>
      </InfoBlock>

      {/* KPI + Charts */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Totaal Gross</div>
            <div className="text-lg font-semibold mt-1">{eur0(grossTotal)}</div>
          </div>
          <Donut value={avgDiscountPct} label="Gem. korting (overall)" />
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Korting% over tijd</div>
          <Sparkline data={periodPctSeries} />
          <div className="text-xs text-gray-600 mt-1">
            Geeft ritme/volatiliteit weer; uitschieters kunnen op condities/acties duiden.
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Potentieel (Top 10 klanten)</div>
          <div className="text-lg font-semibold mt-1">
            {eur0(top.slice(0,10).reduce((s,c)=>s+c.potential,0))}
          </div>
          <div className="mt-2">
            <MiniBar
              values={top.slice(0,10).map(x=>x.deviation)}
              labels={top.slice(0,10).map(x=>x.cust)}
              valueFmt={(v)=>v.toFixed(1)+"pp"}
              tooltip={(_,v,l)=>`${l}: ${v.toFixed(1)} pp`}
            />
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl border bg-white p-4 overflow-x-auto">
        <table className="min-w-[860px] w-full text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left p-2">Klant</th>
              <th className="text-right p-2">Omzet</th>
              <th className="text-right p-2">Korting%</th>
              <th className="text-right p-2">Benchmark%</th>
              <th className="text-right p-2">Afwijking (pp)</th>
              <th className="text-right p-2">Potentieel</th>
            </tr>
          </thead>
          <tbody>
            {top.map((c)=>(
              <tr key={c.cust} className="border-t">
                <td className="p-2 font-medium">{c.cust}</td>
                <td className="p-2 text-right">{eur0(c.gross)}</td>
                <td className="p-2 text-right">{c.discPct.toFixed(1)}%</td>
                <td className="p-2 text-right">{c.benchPct.toFixed(1)}%</td>
                <td className={`p-2 text-right ${
                  c.deviation>majorPP ? 'text-red-600 font-medium' :
                  c.deviation>minorPP ? 'text-amber-700' : ''
                }`}>
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
        {top.map((c)=>(
          <div key={c.cust} className="rounded-2xl border bg-white p-4">
            <div className="flex items-center gap-2">
              <div className="font-medium">{c.cust}</div>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full border">
                {c.deviation.toFixed(1)}pp
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-600">Omzet: {eur0(c.gross)}</div>
            <div className="mt-1 text-sm">Korting: <b>{c.discPct.toFixed(1)}%</b> | Benchmark: {c.benchPct.toFixed(1)}%</div>
            <div className="mt-1 text-sm">Potentieel: <b>{c.potential>0?eur0(c.potential):'—'}</b></div>
            <div className="mt-2">
              <MiniBar values={[c.deviation]} labels={['afw.']} width={260} height={60} valueFmt={(v)=>v.toFixed(1)+'pp'} />
            </div>
            {c.deviation>majorPP ? (
              <div className="mt-2"><Badge tone="warn">Significant boven benchmark</Badge></div>
            ) : c.deviation>minorPP ? (
              <div className="mt-2"><Badge tone="info">Boven benchmark</Badge></div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
