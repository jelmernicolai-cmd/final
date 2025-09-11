// components/contracts/ContractCharts.tsx
"use client";
import type { TotalRow } from "../../lib/contract-analysis";

function LineChart({ x, y, height=160 }:{x:string[]; y:number[]; height?:number}) {
  const width=700, pad=24;
  const xs = x.map((_,i)=> pad + (i*(width-2*pad))/Math.max(1,x.length-1));
  const minY = Math.min(...y), maxY = Math.max(...y);
  const sy = (v:number)=> maxY===minY ? height/2 : (height-pad) - ((v-minY)*(height-2*pad))/(maxY-minY);
  const d = y.map((v,i)=> `${i?"L":"M"} ${xs[i]} ${sy(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded-lg border bg-white">
      <path d={d} fill="none" stroke="currentColor" className="text-gray-800" strokeWidth={2}/>
      {x.map((lbl,i)=> i%Math.ceil(x.length/6)===0 ? (
        <text key={i} x={xs[i]} y={height-4} fontSize="10" textAnchor="middle" className="fill-gray-500">{lbl}</text>
      ):null)}
    </svg>
  );
}

export default function ContractCharts({
  totals, topContracts, seriesByContract,
}:{
  totals: TotalRow[];
  topContracts: string[];
  seriesByContract: Record<string,{x:string[]; y:number[];}>;
}) {
  const x = totals.map(t=>t.periode);
  const y = totals.map(t=>t.totaal_netto);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="mb-2 text-sm font-medium text-gray-700">Totaal netto-omzet per maand</div>
        <LineChart x={x} y={y}/>
      </div>
      <div>
        <div className="mb-2 text-sm font-medium text-gray-700">Top contracten – netto-omzet (tijdreeks)</div>
        <div className="space-y-4">
          {topContracts.map(c=>(
            <div key={c}>
              <div className="mb-1 text-xs text-gray-500">{c}</div>
              <LineChart x={seriesByContract[c].x} y={seriesByContract[c].y} height={120}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
