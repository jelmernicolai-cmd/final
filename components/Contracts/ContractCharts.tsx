// components/contracts/ContractCharts.tsx
"use client";
import type { TotalRow } from "../../lib/contract-analysis";

function LineChart({ x, y, height=160 }:{x:string[]; y:number[]; height?:number}) {
  const width=700, pad=24;
  const xs = x.map((_,i)=> pad + (i*(width-2*pad))/Math.max(1,x.length-1));
  const minY = Math.min(...y), maxY = Math.max(...y);
  const sy = (v:number)=> maxY===minY ? height/2 : (height-pad) - ((v-minY)*(height-2*pad))/(maxY-minY);
  const d = y.map((v,i)=> `${i?"L":"M"} ${xs[i]} ${sy(v
