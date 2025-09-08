// app/app/loe/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/** ===== Helpers ===== */
function eur0(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
}
function compact(n: number) {
  return new Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);
}
function fmtPct(p: number) { return `${(p * 100).toFixed(0)}%`; }
function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }

const DEFAULTS: Inputs = {
  horizonMonths: 36,
  listPrice0: 100,
  baseUnitsPm: 10000,
  gtnPct: 0.25,
  cogsPct: 0.20,
  opexPct: 0.08,
  entrants: 2,
  erosionPerEntrant: 0.10,
  erosionOverTimePct: 0.04,
  priceFloorNetPctOfPre: 0.45,
  tenderLossPct: 0.15,
  tenderAtMonth: 6,
  elasticity: 0.20,
  stockpilingPre: 0.10,
  stockCorrectionPost: -0.05,
  discountRate: 0.10,
};

/** ===== Model ===== */
type Inputs = {
  horizonMonths: number;
  listPrice0: number;
  baseUnitsPm: number;
  gtnPct: number;
  cogsPct: number;
  opexPct: number;
  entrants: number;
  erosionPerEntrant: number;
  erosionOverTimePct: number;
  priceFloorNetPctOfPre: number;
  tenderLossPct: number;
  tenderAtMonth: number;
  elasticity: number;
  stockpilingPre: number;
  stockCorrectionPost: number;
  discountRate: number;
};

type MonthPoint = {
  t: number;
  listPrice: number;
  netPrice: number;
  units: number;
  share: number;
  netSales: number;
  cogs: number;
  opex: number;
  ebitda: number;
};

type SimResult = { points: MonthPoint[]; kpis: {
  netSalesY1: number; netSalesTotal: number; ebitdaTotal: number; npv: number;
  avgShareY1: number; endShare: number; endNetPrice: number;
}};

function priceErosion(t: number, entrants: number, perEntrant: number, overtimePct: number) {
  const direct = 1 - Math.min(entrants * perEntrant, 0.95);
  const overtime = 1 - Math.min((t / 12) * overtimePct, 0.5);
  return 1 - direct * overtime; // 0..1 erosiefractie
}
function shareRetention(t: number, entrants: number) {
  const base = Math.exp(-(0.10 + entrants * 0.05) * t);
  return clamp(base, 0.05, 1);
}

function simulate(i: Inputs): SimResult {
  const points: MonthPoint[] = [];
  const preNet = i.listPrice0 * (1 - i.gtnPct);

  for (let t = 0; t < i.horizonMonths; t++) {
    const eros = priceErosion(t, i.entrants, i.erosionPerEntrant, i.erosionOverTimePct);
    const listPrice = i.listPrice0 * (1 - eros);
    let netPrice = listPrice * (1 - i.gtnPct);
    netPrice = Math.max(netPrice, preNet * i.priceFloorNetPctOfPre);

    let share = shareRetention(t, i.entrants);
    if (t === i.tenderAtMonth) share = Math.max(0.05, share * (1 - i.tenderLossPct));

    let stockAdj = 1;
    if (t === 0 && i.stockpilingPre) stockAdj *= (1 + i.stockpilingPre);
    if (t === 1 && i.stockCorrectionPost) stockAdj *= (1 + i.stockCorrectionPost);

    // simpele relatieve prijsvoorsprong tov 50% van preNet (heuristiek)
    const relativeAdv = (netPrice - preNet * 0.5) / (preNet || 1);
    const elasticityAdj = 1 - clamp(relativeAdv * i.elasticity, -0.5, 0.5);

    const units = Math.max(0, i.baseUnitsPm * share * stockAdj * elasticityAdj);
    const netSales = netPrice * units;
    const cogs = netSales * i.cogsPct;
    const opex = netSales * i.opexPct;
    const ebitda = netSales - cogs - opex;

    points.push({ t, listPrice, netPrice, units, share, netSales, cogs, opex, ebitda });
  }

  const sum = (f: (p: MonthPoint) => number) => points.reduce((a, p) => a + f(p), 0);
  const y1 = points.slice(0, 12);
  const y1Net = y1.reduce((a, p) => a + p.netSales, 0);
  const totalNet = sum(p => p.netSales);
  const totalEbitda = sum(p => p.ebitda);
  const r = i.discountRate;
  const npv = points.reduce((a, p) => a + p.ebitda / Math.pow(1 + r, p.t / 12), 0);

  return {
    points,
    kpis: {
      netSalesY1: y1Net,
      netSalesTotal: totalNet,
      ebitdaTotal: totalEbitda,
      npv,
      avgShareY1: y1.reduce((a, p) => a + p.share, 0) / (y1.length || 1),
      endShare: points.at(-1)?.share || 0,
      endNetPrice: points.at(-1)?.netPrice || 0,
    }
  };
}

/** ===== Charts ===== */
function LineChart({
  series, title, height = 260, yFmt,
}: {
  series: { name: string; values: number[]; color: string }[];
  title: string; height?: number; yFmt: (v:number)=>string;
}) {
  const w = 960, h = height, padX = 40, padY = 28;
  const n = Math.max(...series.map(s => s.values.length));
  const xs = Array.from({ length: n }, (_, i) => i);
  const ys = series.flatMap(s => s.values);
  const maxY = Math.max(1, Math.max(...ys));
  const minY = 0;
  const x = (i:number)=> padX + (i / Math.max(1, n - 1)) * (w - 2*padX);
  const y = (v:number)=> h - padY - ((v - minY) / (maxY - minY)) * (h - 2*padY);
  const ticks = Array.from({ length: 5 }, (_, i) => (maxY/4)*i);

  return (
    <svg className="w-full" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={title}>
      <rect x={12} y={12} width={w-24} height={h-24} rx={16} fill="#fff" stroke="#e5e7eb"/>
      {ticks.map((tv,i)=>(
        <g key={i}>
          <line x1={padX} y1={y(tv)} x2={w-padX} y2={y(tv)} stroke="#f3f4f6"/>
          <text x={padX-8} y={y(tv)+3} fontSize="10" textAnchor="end" fill="#6b7280">{yFmt(tv)}</text>
        </g>
      ))}
      {series.map((s, si)=>{
        const d = s.values.map((v,i)=>`${i===0?"M":"L"} ${x(i)} ${y(v)}`).join(" ");
        return (
          <g key={si}>
            <path d={d} fill="none" stroke={s.color} strokeWidth={2}/>
            {s.values.map((v,i)=>(<circle key={i} cx={x(i)} cy={y(v)} r={2} fill={s.color}/>))}
            <text x={w-padX} y={y(s.values.at(-1) || 0)-6} fontSize="10" textAnchor="end" fill={s.color}>{s.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** ===== UI ===== */
export default function LOEComparePage() {
  const [A, setA] = useState<Inputs>({...DEFAULTS});                  // Scenario A (bijv. Huidig)
  const [B, setB] = useState<Inputs>({...DEFAULTS, entrants:3});      // Scenario B (Plan)
  const [active, setActive] = useState<"A"|"B">("B");

  const resA = useMemo(()=> simulate(A), [A]);
  const resB = useMemo(()=> simulate(B), [B]);

  const netFmt = (v:number)=> new Intl.NumberFormat("nl-NL",{notation:"compact",maximumFractionDigits:1}).format(v);
  const eurFmt = (v:number)=> new Intl.NumberFormat("nl-NL",{maximumFractionDigits:0}).format(v);

  function copyAtoB(){ setB({...A}); }
  function resetA(){ setA({...DEFAULTS}); }
  function resetB(){ setB({...DEFAULTS}); }
  function exportCSV() {
    const maxN = Math.max(resA.points.length, resB.points.length);
    const rows = [["Month","A_NetSales","B_NetSales","A_Share","B_Share","A_NetPrice","B_NetPrice"]];
    for (let i=0;i<maxN;i++){
      const a = resA.points[i], b = resB.points[i];
      rows.push([
        i.toString(),
        a? a.netSales.toString():"", b? b.netSales.toString():"",
        a? a.share.toString():"", b? b.share.toString():"",
        a? a.netPrice.toString():"", b? b.netPrice.toString():"",
      ]);
    }
    const blob = new Blob([rows.map(r=>r.join(",")).join("\n")], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "loe_compare.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const act = active==="A"? A : B;
  const setAct = active==="A"? setA : setB;

  // Deltas (B vs A)
  const dNetY1 = resB.kpis.netSalesY1 - resA.kpis.netSalesY1;
  const dNPV   = resB.kpis.npv - resA.kpis.npv;
  const dEBIT  = resB.kpis.ebitdaTotal - resA.kpis.ebitdaTotal;

  const seriesNet = [
    { name: "A – Net sales", values: resA.points.map(p=>p.netSales), color:"#0ea5e9" },
    { name: "B – Net sales", values: resB.points.map(p=>p.netSales), color:"#111827" },
  ];
  const seriesShare = [
    { name: "A – Share", values: resA.points.map(p=>p.share*100), color:"#f59e0b" },
    { name: "B – Share", values: resB.points.map(p=>p.share*100), color:"#16a34a" },
  ];
  const seriesPrice = [
    { name: "A – Net €/u", values: resA.points.map(p=>p.netPrice), color:"#22c55e" },
    { name: "B – Net €/u", values: resB.points.map(p=>p.netPrice), color:"#8b5cf6" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">LOE – Scenario Planner (A/B)</h1>
          <p className="text-gray-600 text-sm">
            Vergelijk <b>Scenario A (Huidig)</b> met <b>Scenario B (Plan)</b>. Pas inputs aan en zie impact op omzet, share, prijs en NPV.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/waterfall" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Waterfall</Link>
          <Link href="/app/consistency" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Consistency</Link>
          <button onClick={exportCSV} className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Export CSV</button>
        </div>
      </header>

      {/* KPI vergelijktablet */}
      <section className="grid lg:grid-cols-3 gap-4">
        <CompareKpi title="Net sales – Jaar 1"
          A={eur0(resA.kpis.netSalesY1)} B={eur0(resB.kpis.netSalesY1)} delta={eur0(dNetY1)} pos={dNetY1>=0}/>
        <CompareKpi title="EBITDA – 36 mnd"
          A={eur0(resA.kpis.ebitdaTotal)} B={eur0(resB.kpis.ebitdaTotal)} delta={eur0(dEBIT)} pos={dEBIT>=0}/>
        <CompareKpi title="NPV (EBITDA)"
          A={eur0(resA.kpis.npv)} B={eur0(resB.kpis.npv)} delta={eur0(dNPV)} pos={dNPV>=0}/>
      </section>

      {/* Scenario tabs + Inputs */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <button
            className={`px-3 py-1.5 text-sm rounded-t ${active==="A"?"bg-gray-900 text-white":"hover:bg-gray-50 border"}`}
            onClick={()=>setActive("A")}
          >Scenario A (Huidig)</button>
          <button
            className={`px-3 py-1.5 text-sm rounded-t ${active==="B"?"bg-gray-900 text-white":"hover:bg-gray-50 border"}`}
            onClick={()=>setActive("B")}
          >Scenario B (Plan)</button>
          <div className="ml-auto flex gap-2">
            <button onClick={copyAtoB} className="text-sm rounded border px-3 py-1.5 hover:bg-gray-50">Kopieer A → B</button>
            <button onClick={active==="A"?resetA:resetB} className="text-sm rounded border px-3 py-1.5 hover:bg-gray-50">Reset {active}</button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
          <FieldNumber label="Horizon (maanden)" value={act.horizonMonths} step={6} min={12} max={72} onChange={v=>setAct(s=>({...s,horizonMonths:v}))}/>
          <FieldNumber label="List price t=0 (€)" value={act.listPrice0} step={5} min={1} onChange={v=>setAct(s=>({...s,listPrice0:v}))}/>
          <FieldNumber label="Units per maand (baseline)" value={act.baseUnitsPm} step={500} min={100} onChange={v=>setAct(s=>({...s,baseUnitsPm:v}))}/>

          <FieldPct label="GTN %" value={act.gtnPct} onChange={v=>setAct(s=>({...s,gtnPct:v}))}/>
          <FieldPct label="COGS %" value={act.cogsPct} onChange={v=>setAct(s=>({...s,cogsPct:v}))}/>
          <FieldPct label="Opex %" value={act.opexPct} onChange={v=>setAct(s=>({...s,opexPct:v}))}/>

          <FieldNumber label="# generieke entrants" value={act.entrants} step={1} min={0} max={8} onChange={v=>setAct(s=>({...s,entrants:v}))}/>
          <FieldPct label="Prijsdruk per entrant" value={act.erosionPerEntrant} onChange={v=>setAct(s=>({...s,erosionPerEntrant:v}))}/>
          <FieldPct label="Extra erosie per 12m" value={act.erosionOverTimePct} onChange={v=>setAct(s=>({...s,erosionOverTimePct:v}))}/>
          <FieldPct label="Net price floor (t.o.v. pre-LOE net)" value={act.priceFloorNetPctOfPre} onChange={v=>setAct(s=>({...s,priceFloorNetPctOfPre:v}))}/>

          <FieldPct label="Tender share-verlies" value={act.tenderLossPct} onChange={v=>setAct(s=>({...s,tenderLossPct:v}))}/>
          <FieldNumber label="Tender op maand" value={act.tenderAtMonth} step={1} min={0} max={71} onChange={v=>setAct(s=>({...s,tenderAtMonth:v}))}/>
          <FieldPct label="Elasticiteit (volume)" value={act.elasticity} onChange={v=>setAct(s=>({...s,elasticity:v}))}/>

          <FieldPct label="Stockpiling (maand 0)" value={act.stockpilingPre} onChange={v=>setAct(s=>({...s,stockpilingPre:v}))}/>
          <FieldPct label="Correctie (maand 1)" value={act.stockCorrectionPost} onChange={v=>setAct(s=>({...s,stockCorrectionPost:v}))}/>
          <FieldPct label="Disconteringsvoet (WACC)" value={act.discountRate} onChange={v=>setAct(s=>({...s,discountRate:v}))}/>
        </div>
      </section>

      {/* Grafieken: overlay A vs B */}
      <section className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-2">Net sales per maand</h3>
          <LineChart title="Net sales" yFmt={v=>compact(v)} series={[
            { name:"A – Net sales", values: resA.points.map(p=>p.netSales), color:"#0ea5e9" },
            { name:"B – Net sales", values: resB.points.map(p=>p.netSales), color:"#111827" },
          ]}/>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-2">Originator marktaandeel (%)</h3>
          <LineChart title="Share" yFmt={v=>`${v.toFixed(0)}%`} series={[
            { name:"A – Share", values: resA.points.map(p=>p.share*100), color:"#f59e0b" },
            { name:"B – Share", values: resB.points.map(p=>p.share*100), color:"#16a34a" },
          ]}/>
        </div>
        <div className="rounded-2xl border bg-white p-4 lg:col-span-2">
          <h3 className="text-base font-semibold mb-2">Netto prijs per unit (€)</h3>
          <LineChart title="Net price" yFmt={v=>eurFmt(v)} series={[
            { name:"A – Net €/u", values: resA.points.map(p=>p.netPrice), color:"#22c55e" },
            { name:"B – Net €/u", values: resB.points.map(p=>p.netPrice), color:"#8b5cf6" },
          ]}/>
        </div>
      </section>

      {/* Inzichten & acties */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold">Inzichten & aanbevolen acties</h3>
        <ul className="mt-2 text-sm text-gray-700 space-y-2 list-disc pl-5">
          <li>
            <b>Δ Net sales Jaar 1:</b> {eur0(dNetY1)} ({dNetY1>=0? "beter":"slechter"}) · focus op “Prijsdruk per entrant” en “GTN%” om deze delta te sturen.
          </li>
          <li>
            <b>Δ NPV:</b> {eur0(dNPV)} – NPV reageert sterk op <i>price floor</i>, <i>tender verlies</i> en <i>COGS/Opex%</i>.
          </li>
          <li>
            <b>Tender shielding:</b> verlaag “Tender share-verlies” of verschuif korting naar bonus achteraf; test maand van tender.
          </li>
          <li>
            <b>Prijsstrategie:</b> hogere “Net price floor” en lagere “GTN%” houden net price op niveau; check effect op share via elasticiteit.
          </li>
          <li>
            <b>Supply & Finance:</b> gebruik “Stockpiling (0)” en “Correctie (1)” om cash-flow te optimaliseren rondom LOE-moment.
          </li>
        </ul>
      </section>
    </div>
  );
}

/** ===== UI Subcomponents ===== */
function CompareKpi({ title, A, B, delta, pos }:{title:string; A:string; B:string; delta:string; pos:boolean}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 grid grid-cols-3 gap-2 items-end">
        <div>
          <div className="text-xs text-gray-500">A (Huidig)</div>
          <div className="font-semibold">{A}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">B (Plan)</div>
          <div className="font-semibold">{B}</div>
        </div>
        <div className="justify-self-end">
          <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${pos?"bg-green-50 text-green-700 border-green-200":"bg-rose-50 text-rose-700 border-rose-200"}`}>
            Δ {delta}
          </span>
        </div>
      </div>
    </div>
  );
}

function FieldNumber({ label, value, onChange, step=1, min, max }:{
  label:string; value:number; onChange:(v:number)=>void; step?:number; min?:number; max?:number;
}) {
  return (
    <label className="text-sm">
      <div className="font-medium">{label}</div>
      <input
        type="number"
        value={value}
        step={step}
        min={min} max={max}
        onChange={(e)=>onChange(parseFloat(e.target.value))}
        className="mt-1 w-full rounded-lg border px-3 py-2"
      />
    </label>
  );
}

function FieldPct({ label, value, onChange }:{ label:string; value:number; onChange:(v:number)=>void }) {
  return (
    <label className="text-sm">
      <div className="font-medium">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e)=>onChange(parseFloat(e.target.value))} className="w-40"/>
        <input type="number" step={0.01} min={0} max={1} value={value} onChange={(e)=>onChange(parseFloat(e.target.value))} className="w-24 rounded-lg border px-3 py-2"/>
        <span className="text-gray-500">{fmtPct(value)}</span>
      </div>
    </label>
  );
}
