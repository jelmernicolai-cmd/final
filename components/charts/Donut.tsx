"use client";
import React from "react";

export default function Donut({
  value, label = "Gem. korting", size = 140, thickness = 14,
  format = (v:number)=>v.toFixed(1)+"%"
}: {
  value: number; label?: string; size?: number; thickness?: number; format?: (v:number)=>string;
}) {
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const clamp = Math.max(0, Math.min(100, value));
  const dash = (clamp / 100) * circ;

  return (
    <div className="inline-flex flex-col items-center" style={{width:size}}>
      <svg width={size} height={size} role="img" aria-label={`${label} ${format(value)}`}>
        <circle cx={c} cy={c} r={r} stroke="currentColor" strokeOpacity={0.15} strokeWidth={thickness} fill="none"/>
        <circle cx={c} cy={c} r={r} stroke="currentColor" strokeWidth={thickness}
          fill="none" strokeDasharray={`${dash} ${circ - dash}`} transform={`rotate(-90 ${c} ${c})`} />
      </svg>
      <div className="text-sm font-medium -mt-[calc(50%+4px)]">{format(value)}</div>
      <div className="text-xs text-gray-600 mt-[calc(50%+8px)]">{label}</div>
    </div>
  );
}
