'use client';

import { useMemo, useState } from 'react';
import { loadWaterfallRows, eur0 } from '@/lib/waterfall-storage';
import type { Row } from '@/lib/waterfall-types';
import ConsistencyNav from '@/components/consistency/ConsistencyNav';
import MiniBar from '@/components/charts/MiniBar';
import Badge from '@/components/ui/Badge';
import InfoBlock from '@/components/ui/InfoBlock';
import { FieldRow, Label } from '@/components/ui/Field';

type BenchMode = 'quintile' | 'overall';

export default function CustomersConsistency() {
  const rows: Row[] = loadWaterfallRows();
  const [mode, setMode] = useState<BenchMode>('quintile');
  const [minorPP, setMinorPP] = useState(2);
  const [majorPP, setMajorPP] = useState(5);

  if (!rows.length) {
    return (
      <div>
        <ConsistencyNav />
        <h1 className="text-xl font-semibold mt-4">Customers – Analyse</h1>
        <p className="text-gray-600">Geen dataset gevonden. Upload eerst een Excel in de Waterfall-module.</p>
      </div>
    );
  }

  const discOf = (r: Row) =>
    (r.d_channel||0)+(r.d_customer||0)+(r.d_product||0)+(r.d_volume||0)+(r.d_other_sales||0)+(r.d_mandatory||0)+(r.d_local||0);

  const perCust = useMemo(() => {
    const map = new Map<string,{gross:number,disc:number}>();
    for (const r of rows) {
      const gross = r.gross||0, disc = discOf(r);
      const cur = map.get(r.cust) || {gross:0,disc:0};
      cur.gross += gross; cur.disc += disc; map.set(r.cust, cur);
    }
    return [...map.entries()].map(([cust,v])=>({cust, gross:v.gross, discPct: v.gross ? (v.disc/v.gross)*100 : 0}));
  }, [rows]);

  const { overallPct, customersWithBench } = useMemo(() => {
    const overallGross = perCust.reduce((s,c)=>s+c.gross,0)||1;
    const overallDisc = perCust.reduce((s,c)=>s+(c.discPct/100)*c.gross,0);
    const overallPct = (overallDisc/overallGross)*100;

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
      let severity: 'ok'|'minor'|'major' = 'ok';
      if (deviation>majorPP) severity='major'; else if (deviation>minorPP) severity='minor';
      const suggestion =
        deviation > majorPP ? 'Heronderhandel (significant boven peers).' :
        deviation > minorPP ? 'Harmoniseer kortingen/bonussen.' :
        deviation < -majorPP ? 'Onder benchmark: check retentie en waardepropositie.' :
        deviation < -minorPP ? 'Overweeg loyaliteitsvoordeel i.p.v. korting.' : '';
      return {...c, benchPct: bench, deviation, potential, severity, suggestion};
    }).sort((a,b)=>b.potential-a.potential);
    return { top: arr.slice(0,25), all: arr };
  }, [customersWithBench, overallPct, mode, minorPP, majorPP]);

  const totalPotential = table.top.reduce((s,c)=>s+c.potential,0);

  function exportCSV() {
    const rows = [["Customer","Gross","Discount%","Benchmark%","Deviation(pp)","Potential"]];
    for (const c of table.all) {
      rows.push([c.cust, String(Math.round(c.gross)), c.discPct.toFixed(2), c.benchPct.toFixed(2), c.deviation.toFixed(2), String(Math.round(c.potential))]);
    }
    const csv = rows.map(r=>r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8;"}));
    const a = document.createElement("a"); a.href=url; a.download="customers_benchmark.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <ConsistencyNav />

      <div className="flex items-start gap-3 mt-4">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Klantanalyse (korting t.o.v. benchmark)</h1>
          <p className="text-gray-600">Eerlijke peer-vergelijking op basis van omzet (quintiles) of overall gemiddelde.</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge>{mode==='quintile' ? 'Benchmark: Quintile peers' : 'Benchmark: Overall'}</Badge>
            <button onClick={exportCSV} className="text-xs rounded border px-2 py-1 hover:bg-gray-50">CSV export</button>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-3 w-full sm:w-[340px]">
          <div className="text-sm font-medium mb-2">Instellingen</div>
          <FieldRow>
            <Label>Benchmark</Label>
            <select value={mode} onChange={(e)=>setMode(e.target.value as BenchMode)} className="text-sm border rounded px-2 py-1 w-full">
              <option value="quintile">Quintile peers (op omzet)</option>
              <option value="overall">Overall (gewogen gemiddelde)</option>
            </select>
          </FieldRow>
          <div className="mt-3 grid gap-3">
            <FieldRow>
              <Label>“Licht te hoog”</Label>
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={10} step={0.5} value={minorPP} onChange={(e)=>setMinorPP(Number(e.target.value))} className="w-full"/>
                <span className="text-sm w-10 text-right">{minorPP}pp</span>
              </div>
            </FieldRow>
            <FieldRow>
              <Label>“Significant te hoog”</Label>
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={15} step={0.5} value={majorPP} onChange={(e)=>setMajorPP(Number(e.target.value))} className="w-full"/>
                <span className="text-sm w-10 text-right">{majorPP}pp</span>
              </div>
            </FieldRow>
          </div>
        </div>
      </div>

      <InfoBlock summary="Hoe werkt deze klantbenchmark?">
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Discount%</b> klant = (som kortingen) ÷ Gross × 100.</li>
          <li><b>Benchmark</b> = {mode==='quintile' ? 'gem. van de omzet-quintile (peers).' : 'overall gewogen gemiddelde.'}</li>
          <li><b>Afwijking</b> = Discount% − Benchmark% (pp). <b>Potentieel</b> = max(0, Afwijking) × Gross.</li>
        </ul>
      </InfoBlock>

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
                <td className={`p-2 text-right ${c.deviation>majorPP?'text-red-600':c.deviation>minorPP?'text-amber-700':''}`}>{c.deviation.toFixed(1)}%</td>
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
              <div className="ml-auto text-xs px-2 py-0.5 rounded-full border">{c.deviation.toFixed(1)}pp</div>
            </div>
            <div className="mt-1 text-sm text-gray-600">Omzet: {eur0(c.gross)}</div>
            <div className="mt-1 text-sm">Korting: <b>{c.discPct.toFixed(1)}%</b> • Benchmark: {c.benchPct.toFixed(1)}%</div>
            <div className="mt-1 text-sm">Potentieel: <b>{c.potential>0?eur0(c.potential):'—'}</b></div>
            <div className="mt-2"><MiniBar values={[c.deviation]} labels={['afw.']} width={260} height={60} valueFmt={(v)=>v.toFixed(1)+'pp'} /></div>
            {c.suggestion && <div className="mt-2 text-sm text-gray-700">{c.suggestion}</div>}
            {c.deviation>majorPP ? <div className="mt-2"><Badge tone="warn">Significant boven benchmark</Badge></div> : c.deviation>minorPP ? <div className="mt-2"><Badge tone="info">Boven benchmark</Badge></div> : null}
          </div>
        ))}
      </div>

      {/* Samenvatting (in gewone taal) */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold mb-2">Samenvatting</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          {table.all.slice(0,3).map(c=>(
            <li key={c.cust}>
              <b>{c.cust}</b> wijkt {c.deviation>=0?'+':''}{c.deviation.toFixed(1)}pp af t.o.v. benchmark bij {eur0(c.gross)} omzet
              {c.potential>0 ? <> → potentieel: <b>{eur0(c.potential)}</b>.</> : <> → onder benchmark: retentie-actie overwegen.</>}
            </li>
          ))}
        </ul>
      </section>

      {/* Aanbevolen acties */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold mb-3">Aanbevolen acties</h2>
        <ul className="space-y-3">
          {table.all.slice(0,8).map(c=>{
            if (c.deviation>majorPP) return (
              <li key={c.cust} className="flex items-start gap-3">
                <span className="text-red-600 font-bold">↑</span>
                <div><p><b>{c.cust}</b>: heronderhandel (afwijking {c.deviation.toFixed(1)}pp).</p><p className="text-sm text-gray-600">Potentieel: <b>{eur0(c.potential)}</b></p></div>
              </li>
            );
            if (c.deviation>minorPP) return (
              <li key={c.cust} className="flex items-start gap-3">
                <span className="text-amber-600 font-bold">→</span>
                <div><p><b>{c.cust}</b>: harmoniseer korting/bonussen (afwijking {c.deviation.toFixed(1)}pp).</p><p className="text-sm text-gray-600">Potentieel: <b>{eur0(c.potential)}</b></p></div>
              </li>
            );
            if (c.deviation<-minorPP) return (
              <li key={c.cust} className="flex items-start gap-3">
                <span className="text-sky-600 font-bold">⚠</span>
                <div><p><b>{c.cust}</b>: onder benchmark → risico op churn. Bied loyaliteit i.p.v. korting.</p></div>
              </li>
            );
            return null;
          })}
        </ul>
      </section>
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
