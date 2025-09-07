"use client";
import React from "react";

export default function MiniBar({
  values, labels, width = 320, height = 120, barGap = 6,
  valueFmt = (v:number)=>v.toFixed(1)+"%", tooltip = (i:number,v:number,l:string)=>`${l}: ${valueFmt(v)}`
}: {
  values: number[]; labels: string[];
  width?: number; height?: number; barGap?: number;
  valueFmt?: (v:number)=>string; tooltip?: (i:number,v:number,l:string)=>string;
}) {
  const n = values.length;
  if (!n) return null;
  const pad = 16;
  const innerW = width - pad*2;
  const innerH = height - pad*2;
  const barW = (innerW - (n-1)*barGap) / n;
  const max = Math.max(...values.map(v=>Math.abs(v))) || 1;
  const zeroY = pad + innerH * 0.5;

  return (
    <svg width={width} height={height} role="img" aria-label="Mini bar chart">
      <line x1={pad} x2={width-pad} y1={zeroY} y2={zeroY} stroke="currentColor" strokeOpacity={0.2}/>
      {values.map((v,i)=>{
        const x = pad + i*(barW+barGap);
        const h = (Math.abs(v)/max) * (innerH/2);
        const y = v>=0 ? zeroY - h : zeroY;
        return (
          <g key={i}>
            <title>{tooltip(i,v,labels[i])}</title>
            <rect x={x} y={y} width={barW} height={h} fill="currentColor" opacity={0.8}/>
          </g>
        );
      })}
    </svg>
  );
}
