'use client';

import { useMemo, useState } from 'react';
import { loadWaterfallRows, eur0 } from '@/lib/waterfall-storage';
import type { Row } from '@/lib/waterfall-types';
import ConsistencyNav from '@/components/consistency/ConsistencyNav';
import Sparkline from '@/components/charts/Sparkline';
import MiniBar from '@/components/charts/MiniBar';
import Badge from '@/components/ui/Badge';
import InfoBlock from '@/components/ui/InfoBlock';
import { FieldRow, Label } from '@/components/ui/Field';

type GroupBy = 'pg' | 'sku';

export default function TrendConsistency() {
  const rows: Row[] = loadWaterfallRows();
  const [by, setBy] = useState<GroupBy>('pg');
  const [minorPP, setMinorPP] = useState(2);
  const [majorPP, setMajorPP] = useState(5);

  if (!rows.length) {
    return (
      <div>
        <ConsistencyNav />
        <h1 className="text-xl font-semibold mt-4">Trend & Lekkages</h1>
        <p className="text-gray-600">Geen dataset gevonden. Upload eerst een Excel in de Waterfall-module.</p>
      </div>
    );
  }

  const discOf = (r: Row) =>
    (r.d_channel||0)+(r.d_customer||0)+(r.d_product||0)+(r.d_volume||0)+(r.d_other_sales||0)+(r.d_mandatory||0)+(r.d_local||0);

  const { periods, medianDiscPct } = useMemo(()=>{
    const map = new Map<string,{gross:number,disc:number}>();
    for(const r of rows){
      const p = r.period||'—';
      const cur = map.get(p)||{gross:0,disc:0};
      cur.gross += r.gross||0; cur.disc += discOf(r);
      map.set(p, cur);
    }
    const arr = [...map.entries()].map(([period,v])=>({
      period, gross:v.gross, discPct: v.gross ? (v.disc/v.gross)*100 : 0
    })).sort((a,b)=>a.period.localeCompare(b.period));

    const list = arr.map(x=>x.discPct).sort((a,b)=>a-b);
    const mid = Math.floor(list.length/2);
    const medianDiscPct = list.length ? (list.length%2?list[mid]:(list[mid-1]+list[mid])/2) : 0;

    return { periods: arr, medianDiscPct };
  },[rows]);

  const periodTable = useMemo(()=>periods.map(p=>{
    const deviation = p.discPct - medianDiscPct;
    const potential = deviation>0 ? (deviation/100)*p.gross : 0;
    let severity: 'ok'|'minor'|'major' = 'ok';
    if (deviation>majorPP) severity='major'; else if (deviation>minorPP) severity='minor';
    return {...p, deviation, potential, severity};
  }).sort((a,b)=>b.potential-a.potential),[periods, medianDiscPct, minorPP, majorPP]);

  const lineSeries = periods.map(p=>p.discPct);
  const totalPeriodPotential = periodTable.reduce((s,p)=>s+p.potential,0);

  const byKey = useMemo(()=>{
    const map = new Map<string,{gross:number,disc:number}>();
    for(const r of rows){
      const key = (r[by] as string) || '—';
      const cur = map.get(key)||{gross:0,disc:0};
      cur.gross += r.gross||0; cur.disc += discOf(r);
      map.set(key, cur);
    }
    const overallGross = [...map.values()].reduce((s,v)=>s+v.gross,0)||1;
    const overallDisc = [...map.values()].reduce((s,v)=>s+v.disc,0);
    const overallPct = (overallDisc/overallGross)*100;

    const arr = [...map.entries()].map(([key,v])=>{
      const discPct = v.gross ? (v.disc/v.gross)*100 : 0;
      const deviation = discPct - overallPct;
      const potential = deviation>0 ? (deviation/100)*v.gross : 0;
      let severity: 'ok'|'minor'|'major' = 'ok';
      if (deviation>majorPP) severity='major'; else if (deviation>minorPP) severity='minor';
      return {key, gross:v.gross, discPct, deviation, potential, overallPct, severity};
    }).sort((a,b)=>b.potential-a.potential).slice(0,15);

    return { arr, overallPct };
  },[rows, by, minorPP, majorPP]);

  const totalKeyPotential = byKey.arr.reduce((s,it)=>s+it.potential,0);

  return (
    <div className="space-y-6">
      <ConsistencyNav />

      <div className="flex items-start gap-3 mt-4">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Trend & Lekkages</h1>
          <p className="text-gray-600">Normaliseer periodes en corrigeer productgroep/SKU lekkages.</p>
          <div className="mt-2"><Badge>Benchmark: mediane periode (tijd) & overall (PG/SKU)</Badge></div>
        </div>

        <div className="rounded-xl border bg-white p-3 w-full sm:w-[360px]">
          <div className="text-sm font-medium mb-2">Instellingen</div>
          <FieldRow>
            <Label>Groeperen op</Label>
            <select value={by} onChange={(e)=>setBy(e.target.value as GroupBy)} className="text-sm border rounded px-2 py-1 w-full">
              <option value="pg">Productgroep</option>
              <option value="sku">SKU</option>
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

      <InfoBlock summary="Hoe werken periode- en PG/SKU-benchmarks?">
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Periode</b>: benchmark = mediane korting% over alle perioden (robuust tegen uitschieters).</li>
          <li><b>PG/SKU</b>: benchmark = overall gewogen korting% (eerlijk per mix).</li>
          <li><b>Potentieel</b> = max(0, afwijking) × omzet (per periode of per PG/SKU).</li>
        </ul>
      </InfoBlock>

      {/* KPI + charts */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Korting% over tijd</div>
          <Sparkline data={periods.map(p=>p.discPct)} />
          <div className="text-xs text-gray-600 mt-1">Median: {medianDiscPct.toFixed(1)}%</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Potentieel (perioden)</div>
          <div className="text-lg font-semibold mt-1">{eur0(totalPeriodPotential)}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Lekkages {by==='pg'?'PG':'SKU'} (afwijking)</div>
          <MiniBar
            values={byKey.arr.slice(0,10).map(x=>x.deviation)}
            labels={byKey.arr.slice(0,10).map(x=>x.key)}
            valueFmt={(v)=>v.toFixed(1)+'pp'}
            tooltip={(_,v,l)=>`${l}: ${v.toFixed(1)} pp`}
          />
        </div>
      </div>

      {/* Desktop tables */}
      <section className="hidden md:block rounded-2xl border bg-white p-4 overflow-x-auto">
        <h2 className="font-semibold mb-3">Perioden met hoogste besparingspotentieel (naar median)</h2>
        <table className="min-w-[800px] w-full text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left p-2">Periode</th>
              <th className="text-right p-2">Omzet</th>
              <th className="text-right p-2">Korting%</th>
              <th className="text-right p-2">Afwijking t.o.v. median</th>
              <th className="text-right p-2">Potentieel</th>
            </tr>
          </thead>
          <tbody>
            {periodTable.slice(0,20).map(p=>(
              <tr key={p.period} className="border-t">
                <td className="p-2 font-medium">{p.period}</td>
                <td className="p-2 text-right">{eur0(p.gross)}</td>
                <td className="p-2 text-right">{p.discPct.toFixed(1)}%</td>
                <td className={`p-2 text-right ${p.deviation>majorPP?'text-red-600':p.deviation>minorPP?'text-amber-700':''}`}>{p.deviation.toFixed(1)}%</td>
                <td className="p-2 text-right">{p.potential>0?eur0(p.potential):'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="hidden md:block rounded-2xl border bg-white p-4 overflow-x-auto">
        <h2 className="font-semibold mb-3">Top {by==='pg'?'productgroepen':'SKU’s'} met hoogste korting% (t.o.v. overall)</h2>
        <table className="min-w-[900px] w-full text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left p-2">{by==='pg'?'Productgroep':'SKU'}</th>
              <th className="text-right p-2">Omzet</th>
              <th className="text-right p-2">Korting%</th>
              <th className="text-right p-2">Benchmark%</th>
              <th className="text-right p-2">Afwijking (pp)</th>
              <th className="text-right p-2">Potentieel</th>
            </tr>
          </thead>
          <tbody>
            {byKey.arr.map(it=>(
              <tr key={it.key} className="border-t">
                <td className="p-2 font-medium">{it.key}</td>
                <td className="p-2 text-right">{eur0(it.gross)}</td>
                <td className="p-2 text-right">{it.discPct.toFixed(1)}%</td>
                <td className="p-2 text-right">{it.overallPct.toFixed(1)}%</td>
                <td className={`p-2 text-right ${it.deviation>majorPP?'text-red-600':it.deviation>minorPP?'text-amber-700':''}`}>{it.deviation.toFixed(1)}%</td>
                <td className="p-2 text-right">{it.potential>0?eur0(it.potential):'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Mobile cards: Perioden */}
      <section className="md:hidden space-y-3">
        <h2 className="font-semibold">Perioden – top potentieel</h2>
        {periodTable.slice(0,10).map(p=>(
          <div key={p.period} className="rounded-2xl border bg-white p-4">
            <div className="flex items-center">
              <div className="font-medium">{p.period}</div>
              <div className="ml-auto text-xs px-2 py-0.5 rounded-full border">{p.deviation.toFixed(1)}pp</div>
            </div>
            <div className="mt-1 text-sm text-gray-600">Omzet: {eur0(p.gross)}</div>
            <div className="mt-1 text-sm">Korting: <b>{p.discPct.toFixed(1)}%</b> • Median: {medianDiscPct.toFixed(1)}%</div>
            <div className="mt-1 text-sm">Potentieel: <b>{p.potential>0?eur0(p.potential):'—'}</b></div>
            <MiniBar values={[p.deviation]} labels={['afw.']} width={260} height={60} valueFmt={(v)=>v.toFixed(1)+'pp'} />
          </div>
        ))}
      </section>

      {/* Mobile cards: Lekkages */}
      <section className="md:hidden space-y-3">
        <h2 className="font-semibold">Top {by==='pg'?'PG':'SKU'} lekkages</h2>
        {byKey.arr.slice(0,10).map(it=>(
          <div key={it.key} className="rounded-2xl border bg-white p-4">
            <div className="flex items-center">
              <div className="font-medium">{it.key}</div>
              <div className="ml-auto text-xs px-2 py-0.5 rounded-full border">{it.deviation.toFixed(1)}pp</div>
            </div>
            <div className="mt-1 text-sm text-gray-600">Omzet: {eur0(it.gross)}</div>
            <div className="mt-1 text-sm">Korting: <b>{it.discPct.toFixed(1)}%</b> • Benchmark: {it.overallPct.toFixed(1)}%</div>
            <div className="mt-1 text-sm">Potentieel: <b>{it.potential>0?eur0(it.potential):'—'}</b></div>
            <MiniBar values={[it.deviation]} labels={['afw.']} width={260} height={60} valueFmt={(v)=>v.toFixed(1)+'pp'} />
          </div>
        ))}
      </section>

      {/* Samenvatting in gewone taal */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold mb-2">Samenvatting</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          {periodTable.slice(0,2).map(p=>(
            <li key={p.period}>
              Periode <b>{p.period}</b> zit {p.deviation>=0?'+':''}{p.deviation.toFixed(1)}pp t.o.v. median →
              {p.potential>0 ? <> normaliseren levert ca. <b>{eur0(p.potential)}</b> op.</> : ' onder median, geen direct potentieel.'}
            </li>
          ))}
          {byKey.arr.slice(0,1).map(it=>(
            <li key={it.key}>
              {by==='pg'?'PG':'SKU'} <b>{it.key}</b> wijkt {it.deviation>=0?'+':''}{it.deviation.toFixed(1)}pp af t.o.v. overall →
              {it.potential>0 ? <> heronderhandelen/staffelherziening kan ca. <b>{eur0(it.potential)}</b> opleveren.</> : ' onder benchmark (retentiecheck).'}
            </li>
          ))}
        </ul>
      </section>

      {/* Aanbevolen acties */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold mb-3">Aanbevolen acties</h2>
        <ul className="space-y-3">
          {periodTable.slice(0,5).map(p=>{
            if (p.deviation>minorPP) return (
              <li key={p.period} className="flex items-start gap-3">
                <span className="text-amber-600 font-bold">→</span>
                <div>
                  <p><b>{p.period}</b>: periode-korting {p.deviation.toFixed(1)}pp boven median. Zet tijdelijke acties uit of pas condities aan.</p>
                  {p.potential>0 && <p className="text-sm text-gray-600">Potentieel: <b>{eur0(p.potential)}</b></p>}
                </div>
              </li>
            );
            return null;
          })}
          {byKey.arr.slice(0,5).map(it=>{
            if (it.deviation>minorPP) return (
              <li key={it.key} className="flex items-start gap-3">
                <span className="text-red-600 font-bold">↑</span>
                <div>
                  <p><b>{by==='
