"use client";

import React, { useCallback, useMemo, useState } from "react";

/** ============== Types ============== */
type RawRow = { sku: string; period: string; inmarket_units: number };
type Parsed = { rows: RawRow[]; issues: string[]; skus: string[] };
type SkuSeries = { sku: string; series: { period: string; y: number; d: Date }[] };
type ForecastPoint = { period: string; units: number };
type ForecastResult = { sku: string; nextMonths: ForecastPoint[]; mape6: number | null; lastActual: number | null };
type AllocationShare = { customer: string; share: number };

/** ============== Helpers ============== */
const toNum = (v: any): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const fmtPct = (p: number, d = 1) => `${(p * 100).toFixed(d)}%`;
const compact = (n: number) => new Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);

function normalizePeriodFlexible(h: string): { ok: boolean; value?: string } {
  const s = (h ?? "").toString().trim();
  let m = /^(\d{4})-(\d{2})$/.exec(s); // YYYY-MM
  if (m) { const yy = +m[1], mm = +m[2]; if (yy>=2000&&yy<=2100&&mm>=1&&mm<=12) return { ok: true, value: `${yy}-${m[2]}` }; }
  m = /^(\d{2})-(\d{4})$/.exec(s);      // MM-YYYY
  if (m) { const mm = +m[1], yy = +m[2]; if (yy>=2000&&yy<=2100&&mm>=1&&mm<=12) return { ok: true, value: `${yy}-${String(mm).padStart(2,"0")}` }; }
  return { ok: false };
}
function periodToDate(per: string): Date | null { const m=/^(\d{4})-(\d{2})$/.exec(per); return m? new Date(+m[1], +m[2]-1, 1): null; }
function addMonths(d: Date, k: number) { const nd=new Date(d); nd.setMonth(nd.getMonth()+k); nd.setDate(1); return nd; }
function fmtPeriodYYYYMM(d: Date) { const mm=String(d.getMonth()+1).padStart(2,"0"); return `${d.getFullYear()}-${mm}`; }
function workingDaysInMonth(y: number, m: number){const days=new Date(y,m,0).getDate();let wd=0;for(let d=1;d<=days;d++){const w=new Date(y,m-1,d).getDay();if(w>=1&&w<=5)wd++;}return wd;}
const WD_BASE=21;

/** ============== Parser: A=SKU, B..=maanden ============== */
async function parseExcelWide(file: File): Promise<Parsed> {
  const ext=(file.name.toLowerCase().split(".").pop()||"").trim();
  if(ext!=="xlsx"&&ext!=="xls") return { rows:[], issues:["Alleen .xlsx/.xls"], skus:[] };
  const XLSX:any = await import("xlsx");
  const wb=XLSX.read(await file.arrayBuffer(),{type:"array"});
  const ws=wb.Sheets[wb.SheetNames[0]];
  if(!ws) return { rows:[], issues:["Eerste werkblad ontbreekt."], skus:[] };
  const aoa:any[][] = XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:""});
  if(!aoa.length || aoa[0].length<2) return { rows:[], issues:["Headerregel incompleet."], skus:[] };

  const issues:string[]=[];
  const hdr=aoa[0].map((x:any)=>(x??"").toString().trim());
  if(!/sku|product/i.test(hdr[0]||"")) issues.push("Kolom A moet 'SKU' bevatten.");

  const colPeriods:(string|null)[] = hdr.map(()=>null);
  for(let c=1;c<hdr.length;c++){ const n=normalizePeriodFlexible(hdr[c]); if(n.ok&&n.value) colPeriods[c]=n.value; }

  const agg=new Map<string,number>(), skusSet=new Set<string>();
  for(let r=1;r<aoa.length;r++){
    const sku=(aoa[r]?.[0]??"").toString().trim(); if(!sku) continue; skusSet.add(sku);
    for(let c=1;c<aoa[r].length;c++){
      const per=colPeriods[c]; if(!per) continue;
      const v=Math.max(0, Math.round(toNum(aoa[r][c])));
      const key=`${sku}::${per}`; agg.set(key,(agg.get(key)||0)+v);
    }
  }
  const rows:RawRow[]=[]; agg.forEach((units,key)=>{const [sku,period]=key.split("::"); rows.push({sku,period,inmarket_units:units});});
  rows.sort((a,b)=> a.sku===b.sku? a.period.localeCompare(b.period): a.sku.localeCompare(b.sku));
  return { rows, issues, skus:Array.from(skusSet).sort() };
}

/** ============== TS & Forecast ============== */
function makeSkuSeries(rows: RawRow[]): SkuSeries[] {
  const bySku=new Map<string,RawRow[]>(); rows.forEach(r=>{ if(!bySku.has(r.sku)) bySku.set(r.sku,[]); bySku.get(r.sku)!.push(r); });
  return Array.from(bySku.entries()).map(([sku,arr])=>{
    const series = arr.map(r=>({period:r.period, y:Math.max(0,Math.round(toNum(r.inmarket_units))), d:periodToDate(r.period)!}))
                     .filter(p=>!!p.d).sort((a,b)=>a.d.getTime()-b.d.getTime());
    return { sku, series };
  }).sort((a,b)=>a.sku.localeCompare(b.sku));
}
function monthSeasonality(series:{d:Date;y:number}[]){
  const sums=Array(13).fill(0), cnts=Array(13).fill(0);
  series.forEach(p=>{const m=p.d.getMonth()+1; sums[m]+=p.y; cnts[m]++;});
  const avgAll=series.length? series.reduce((a,p)=>a+p.y,0)/series.length:0;
  const idx=Array(13).fill(1); for(let m=1;m<=12;m++) idx[m]=(cnts[m]?sums[m]/cnts[m]:avgAll||1)/(avgAll||1);
  const mean=idx.slice(1).reduce((a,x)=>a+x,0)/12; for(let m=1;m<=12;m++) idx[m]/=mean||1; return idx;
}
function movingAverage(arr:number[], win:number){const out:number[]=[];const w=Math.max(2,Math.floor(win)); for(let i=0;i<arr.length;i++){const a=Math.max(0,i-(w-1));const sl=arr.slice(a,i+1);out.push(sl.reduce((s,v)=>s+v,0)/sl.length);} return out;}
function forecastSku(ser: SkuSeries, horizon:number, maWindow:number): ForecastResult {
  const s=ser.series; if(!s.length) return { sku:ser.sku, nextMonths:[], mape6:null, lastActual:null };
  const seas=monthSeasonality(s);
  const deseasonal=s.map(p=>{const m=p.d.getMonth()+1; const wd=workingDaysInMonth(p.d.getFullYear(),m)/WD_BASE; const denom=(seas[m]||1)*(wd||1); return denom? p.y/denom: p.y;});
  const ma=movingAverage(deseasonal, maWindow); const baseline=ma[ma.length-1];

  let mape6:null|number=null;
  if(s.length>=8){ const back=Math.min(6,s.length-2); let sum=0,cnt=0;
    for(let i=s.length-back;i<s.length;i++){ const p=s[i]; const m=p.d.getMonth()+1; const wd=workingDaysInMonth(p.d.getFullYear(),m)/WD_BASE;
      const basePrev=i-1>=0? ma[i-1]: ma[i]; const f=Math.max(0,Math.round(basePrev*(seas[m]||1)*(wd||1)));
      if(p.y>0){ sum+=Math.abs((p.y-f)/p.y); cnt++; }
    }
    mape6=cnt? sum/cnt: null;
  }

  const lastD=s[s.length-1].d; const nextMonths:ForecastPoint[]=[];
  for(let k=1;k<=horizon;k++){ const d=addMonths(lastD,k); const m=d.getMonth()+1; const wd=workingDaysInMonth(d.getFullYear(),m)/WD_BASE;
    const f=Math.max(0,Math.round(baseline*(seas[m]||1)*(wd||1))); nextMonths.push({ period: fmtPeriodYYYYMM(d), units:f });
  }
  return { sku:ser.sku, nextMonths, mape6, lastActual:s[s.length-1]?.y ?? null };
}

/** ============== Mini chart (SVG, responsive) ============== */
function LineChartDual({
  labels, actual, forecast, height=220, nameA="Actuals", nameF="Forecast",
}: { labels: string[]; actual: number[]; forecast: number[]; height?: number; nameA?: string; nameF?: string }) {
  const w=960, h=height, padX=46, padY=28;
  const maxY=Math.max(1, ...actual, ...forecast);
  const x=(i:number)=> padX + (i/Math.max(1,labels.length-1))*(w-2*padX);
  const y=(v:number)=> h - padY - (v/maxY)*(h-2*padY);
  const path = (arr:number[]) => arr.map((v,i)=>`${i===0?"M":"L"} ${x(i)} ${y(v)}`).join(" ");
  const ticks=Array.from({length:5}, (_,i)=>(maxY/4)*i);
  return (
    <svg className="w-full h-auto" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Actuals vs Forecast" preserveAspectRatio="xMidYMid meet">
      <rect x={12} y={12} width={w-24} height={h-24} rx={16} fill="#fff" stroke="#e5e7eb"/>
      {ticks.map((tv,i)=>(
        <g key={i}>
          <line x1={padX} y1={y(tv)} x2={w-padX} y2={y(tv)} stroke="#f3f4f6"/>
          <text x={padX-8} y={y(tv)+4} fontSize="10" textAnchor="end" fill="#6b7280">{compact(tv)}</text>
        </g>
      ))}
      <path d={path(actual)} fill="none" stroke="#0ea5e9" strokeWidth={2}/>
      {actual.map((v,i)=>(<circle key={`a${i}`} cx={x(i)} cy={y(v)} r={2} fill="#0ea5e9"/>))}
      <path d={path(forecast)} fill="none" stroke="#22c55e" strokeWidth={2} strokeDasharray="4 3"/>
      {forecast.map((v,i)=>(<circle key={`f${i}`} cx={x(i)} cy={y(v)} r={2} fill="#22c55e"/>))}
      <g transform={`translate(${w-padX-110},${padY})`}>
        <rect width="110" height="34" rx="6" fill="#fff" stroke="#e5e7eb"/>
        <g transform="translate(8,8)">
          <circle r="4" cx="4" cy="4" fill="#0ea5e9"/><text x="14" y="8" fontSize="10" fill="#334155">{nameA}</text>
          <circle r="4" cx="64" cy="4" fill="#22c55e"/><text x="74" y="8" fontSize="10" fill="#334155">{nameF}</text>
        </g>
      </g>
    </svg>
  );
}

/** ============== Component ============== */
export default function SupplyPage() {
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState<string|null>(null);
  const [parsed,setParsed]=useState<Parsed|null>(null);
  const [horizon,setHorizon]=useState(6);
  const [maWindow,setMaWindow]=useState(6);
  const [shares,setShares]=useState<AllocationShare[]>(
    Array.from({length:10},(_,i)=>({customer:`Groothandel ${i+1}`, share:0.1}))
  );
  const [selectedSku,setSelectedSku]=useState<string>("");

  /** Upload */
  const handleBrowse = async (e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0]; if(!f) return;
    setBusy(true); setErr(null);
    try{
      const res=await parseExcelWide(f); setParsed(res);
      if(!res.rows.length) setErr(res.issues.join(" | ")||"Geen rijen ingelezen.");
      else if(!selectedSku && res.skus.length) setSelectedSku(res.skus[0]);
    }catch(e:any){ setErr(e?.message||"Upload mislukt."); } finally{ setBusy(false); }
    e.currentTarget.value="";
  };
  const handleDrop = useCallback(async (e:React.DragEvent<HTMLDivElement>)=>{
    e.preventDefault(); const f=e.dataTransfer.files?.[0]; if(!f) return;
    setBusy(true); setErr(null);
    try{
      const res=await parseExcelWide(f); setParsed(res);
      if(!res.rows.length) setErr(res.issues.join(" | ")||"Geen rijen ingelezen.");
      else if(!selectedSku && res.skus.length) setSelectedSku(res.skus[0]);
    }catch(e:any){ setErr(e?.message||"Upload mislukt."); } finally{ setBusy(false); }
  },[selectedSku]);

  /** Series & forecasts */
  const series = useMemo<SkuSeries[]>(() => (parsed?.rows?.length ? makeSkuSeries(parsed.rows) : []), [parsed]);
  const forecasts = useMemo<ForecastResult[]>(() => series.map(s=>forecastSku(s,horizon,maWindow)), [series,horizon,maWindow]);

  /** KPI’s */
  const overallMAPE = useMemo(()=>{
    const v=forecasts.map(f=>f.mape6).filter((x):x is number=>x!==null);
    return v.length? v.reduce((a,x)=>a+x,0)/v.length : null;
  },[forecasts]);

  /** Helpers: timeline + chart arrays */
  function buildTimelineAll(): string[] {
    if(!series.length) return [];
    // globale min..max (actuals), plus horizon
    let minD=series[0].series[0]?.d ?? new Date(), maxD=series[0].series[0]?.d ?? new Date();
    series.forEach(s=>{
      if(s.series.length){
        const d0=s.series[0].d; const d1=s.series[s.series.length-1].d;
        if(d0<minD) minD=d0; if(d1>maxD) maxD=d1;
      }
    });
    // toon laatste 18 actuals + horizon (compact & mobielvriendelijk)
    const tailMonths=18;
    const start=addMonths(maxD, -Math.max(0, tailMonths-1));
    const end=addMonths(maxD, horizon);
    const labels:string[]=[]; let cur=new Date(start);
    while(cur<=end){ labels.push(fmtPeriodYYYYMM(cur)); cur=addMonths(cur,1); }
    return labels;
  }
  const labels = useMemo(()=>buildTimelineAll(),[series,horizon]);
function seriesToMap(s: SkuSeries) {
  const m = new Map<string, number>();
  s.series.forEach((p) => m.set(p.period, p.y));
  return m;
}

  function buildChartForSku(sku:string){
    const s=series.find(x=>x.sku===sku); const f=forecasts.find(x=>x.sku===sku);
    if(!s||!f) return { actual: labels.map(()=>0), forecast: labels.map(()=>0) };
    const m=seriesToMap(s); const future=new Map<string,number>(f.nextMonths.map(p=>[p.period,p.units]));
    const actual:number[]=[]; const forecastArr:number[]=[];
    for(const lab of labels){
      const isFuture = future.has(lab);
      actual.push(!isFuture ? (m.get(lab)||0) : (m.get(lab)||0)); // laat actuals staan indien aanwezig
      forecastArr.push(isFuture ? (future.get(lab)||0) : 0);
    }
    return { actual, forecast: forecastArr };
  }
  function buildChartTotal(){
    const maps = series.map(s=>{const m=new Map<string,number>(); s.series.forEach(p=>m.set(p.period,p.y)); return m;});
    const nexts = forecasts.map(f=> new Map<string,number>(f.nextMonths.map(p=>[p.period,p.units])));
    const actual:number[]=[]; const forecastArr:number[]=[];
    for(const lab of labels){
      let a=0,f=0;
      maps.forEach(m=> a+= (m.get(lab)||0));
      nexts.forEach(n=> f+= (n.get(lab)||0));
      // alleen toekomst als forecast; actuals voor historische labels
      const isFuture = lab > (series[0]?.series.length? series[0].series[series[0].series.length-1].period : lab);
      actual.push(isFuture? 0 : a);
      forecastArr.push(isFuture? f : 0);
    }
    return { actual, forecast: forecastArr };
  }

  const chartSel = useMemo(()=> selectedSku? buildChartForSku(selectedSku): {actual:[],forecast:[]},[selectedSku,labels,series,forecasts]);
  const chartTot = useMemo(()=> buildChartTotal(),[labels,series,forecasts]);

  /** Allocaties */
  const nextMonthLabel = useMemo(()=>{
    if(!labels.length) return "";
    // eerste toekomstige label = eerste label met forecast >0 in totaal, anders laatste label
    const idx = chartTot.forecast.findIndex(v=>v>0);
    return idx>=0? labels[idx]: labels[labels.length-1];
  },[labels,chartTot]);

  const normShares = useMemo(()=>{
    const s=shares.map(x=>Math.max(0,x.share)); const tot=s.reduce((a,b)=>a+b,0)||1; return s.map(v=>v/tot);
  },[shares]);

  const allocSelected = useMemo(()=>{
    if(!selectedSku || !labels.length) return null;
    const f=forecasts.find(x=>x.sku===selectedSku); if(!f) return null;
    const pt=f.nextMonths.find(p=>p.period===nextMonthLabel); const units=pt?.units ?? 0;
    return { period: nextMonthLabel, rows: shares.map((r,i)=>({customer:r.customer, units:Math.round(units*normShares[i])})), total: units };
  },[selectedSku,forecasts,nextMonthLabel,normShares,shares]);

  const allocTotal = useMemo(()=>{
    if(!labels.length) return null;
    const idx=labels.indexOf(nextMonthLabel); const total = idx>=0? chartTot.forecast[idx] : 0;
    return { period: nextMonthLabel, rows: shares.map((r,i)=>({customer:r.customer, units:Math.round(total*normShares[i])})), total };
  },[labels,nextMonthLabel,chartTot,shares,normShares]);

  /** UI */
  return (
    <div className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6 py-4 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Supply Chain Optimization — Wide (SKU × Maanden)</h1>
          <p className="text-sm text-gray-600">Upload Excel met <b>Kolom A = SKU</b> en <b>Kolommen B.. = maanden</b> (mix van <i>YYYY-MM</i> en <i>MM-YYYY</i> toegestaan).</p>
        </div>
      </header>

      {/* Upload */}
      <section onDragOver={(e)=>e.preventDefault()} onDrop={handleDrop}
        className="rounded-2xl border-2 border-dashed p-6 bg-white text-center">
        <div className="text-sm text-gray-700">Sleep je Excel (.xlsx/.xls) hierheen of</div>
        <label className="mt-2 inline-flex items-center gap-2 rounded-lg bg-sky-600 text-white text-sm px-4 py-2 hover:bg-sky-700 cursor-pointer">
          Bestand kiezen
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBrowse} disabled={busy}/>
        </label>
        <p className="mt-2 text-xs text-gray-500">Voorbeeld header: SKU | 2024-01 | 02-2025 | …</p>
        {busy && <div className="mt-2 text-sm text-gray-600">Bezig met verwerken…</div>}
        {err && <div className="mt-3 inline-block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{err}</div>}
        {!!parsed?.issues?.length && (
          <div className="mt-3 text-left max-w-3xl mx-auto text-xs text-gray-700">
            <div className="font-medium">Opmerkingen</div>
            <ul className="list-disc pl-5">{parsed.issues.map((m,i)=><li key={i}>{m}</li>)}</ul>
          </div>
        )}
      </section>

      {/* KPI’s & instellingen */}
      <section className="rounded-2xl border bg-white p-4 space-y-4">
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          <div className="rounded-lg border p-3 text-sm"><div className="text-gray-500"># SKU’s</div><div className="font-semibold">{parsed?.skus?.length ?? 0}</div></div>
          <div className="rounded-lg border p-3 text-sm"><div className="text-gray-500">Horizon</div><div className="font-semibold">{horizon} mnd</div></div>
          <div className="rounded-lg border p-3 text-sm"><div className="text-gray-500">MA-venster</div><div className="font-semibold">{maWindow} mnd</div></div>
          <div className="rounded-lg border p-3 text-sm"><div className="text-gray-500">Overall MAPE</div><div className="font-semibold">{overallMAPE!==null? fmtPct(overallMAPE,1):"n.v.t."}</div></div>
        </div>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] items-end">
          <label className="text-sm"><div className="font-medium">Horizon (maanden)</div>
            <input type="number" min={1} max={24} step={1} value={horizon}
              onChange={(e)=>setHorizon(clamp(parseInt(e.target.value||"0",10),1,24))}
              className="mt-1 w-32 rounded-lg border px-3 py-2"/>
          </label>
          <label className="text-sm"><div className="font-medium">Moving average venster</div>
            <input type="number" min={2} max={12} step={1} value={maWindow}
              onChange={(e)=>setMaWindow(clamp(parseInt(e.target.value||"0",10),2,12))}
              className="mt-1 w-32 rounded-lg border px-3 py-2"/>
          </label>
          <label className="text-sm"><div className="font-medium">SKU voor grafiek & allocatie</div>
            <select value={selectedSku} onChange={(e)=>setSelectedSku(e.target.value)} className="mt-1 rounded-lg border px-3 py-2">
              {(parsed?.skus ?? []).map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
      </section>

      {/* Grafieken — responsive 2-koloms op desktop, 1-kolom mobiel */}
      {labels.length>0 && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-4">
            <h3 className="text-base font-semibold mb-2">Actuals vs Forecast — {selectedSku || "—"}</h3>
            <LineChartDual labels={labels} actual={chartSel.actual} forecast={chartSel.forecast}/>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <h3 className="text-base font-semibold mb-2">Actuals vs Forecast — Totaal</h3>
            <LineChartDual labels={labels} actual={chartTot.actual} forecast={chartTot.forecast}/>
          </div>
        </section>
      )}

      {/* Forecast per SKU (compact tabel) */}
      {forecasts.length>0 && forecasts[0].nextMonths && (
        <section className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-3">Forecast per SKU</h3>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-2">SKU</th>
                  <th className="text-left py-2 px-2">Laatste actual</th>
                  <th className="text-left py-2 px-2">MAPE (6m)</th>
                  {forecasts[0].nextMonths.map(p=> <th key={p.period} className="text-left py-2 px-2">{p.period}</th>)}
                </tr>
              </thead>
              <tbody>
                {forecasts.map(f=>(
                  <tr key={f.sku} className="border-b last:border-0">
                    <td className="py-2 px-2 font-medium">{f.sku}</td>
                    <td className="py-2 px-2">{f.lastActual ?? "-"}</td>
                    <td className="py-2 px-2">{f.mape6!==null? fmtPct(f.mape6,1):"n.v.t."}</td>
                    {f.nextMonths.map(p=> <td key={p.period} className="py-2 px-2">{p.units}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Allocatie editor */}
      <section className="rounded-2xl border bg-white p-4 space-y-3">
        <h3 className="text-base font-semibold">Allocatie — marktaandelen groothandels</h3>
        <p className="text-xs text-gray-600">Voer ruwe shares in; we normaliseren automatisch bij de berekening.</p>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          {shares.map((row,i)=>(
            <div key={i} className="rounded-lg border p-3 text-sm">
              <input type="text" value={row.customer}
                onChange={(e)=>setShares(s=>s.map((r,idx)=>idx===i?{...r,customer:e.target.value}:r))}
                className="w-full rounded-lg border px-2 py-1"/>
              <div className="mt-2">
                <input type="number" step={0.1} value={Math.round(row.share*1000)/10}
                  onChange={(e)=>{ const v=Math.max(0,parseFloat(e.target.value||"0")/100); setShares(s=>s.map((r,idx)=>idx===i?{...r,share:v}:r)); }}
                  className="w-28 rounded-lg border px-2 py-1"/> <span className="text-gray-600">%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Allocaties */}
      {allocSelected && (
        <section className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-1">Allocatie — {selectedSku} ({allocSelected.period})</h3>
          <div className="text-xs text-gray-600 mb-2">Totaal forecast: <b>{allocSelected.total}</b> units</div>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[520px]">
              <thead><tr className="border-b bg-gray-50"><th className="text-left py-2 px-2">Klant</th><th className="text-left py-2 px-2">Units</th></tr></thead>
              <tbody>{allocSelected.rows.map((r,i)=>(
                <tr key={i} className="border-b last:border-0"><td className="py-2 px-2">{r.customer}</td><td className="py-2 px-2">{r.units}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}
      {allocTotal && (
        <section className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-1">Allocatie — Totaal ({allocTotal.period})</h3>
          <div className="text-xs text-gray-600 mb-2">Totaal forecast (alle SKU’s): <b>{allocTotal.total}</b> units</div>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[520px]">
              <thead><tr className="border-b bg-gray-50"><th className="text-left py-2 px-2">Klant</th><th className="text-left py-2 px-2">Units</th></tr></thead>
              <tbody>{allocTotal.rows.map((r,i)=>(
                <tr key={i} className="border-b last:border-0"><td className="py-2 px-2">{r.customer}</td><td className="py-2 px-2">{r.units}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
