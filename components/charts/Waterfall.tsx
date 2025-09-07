// components/charts/Waterfall.tsx
"use client";

import React from "react";

type Step = { label: string; delta: number }; // delta < 0 = omlaag (kosten/korting), delta > 0 = omhoog
type Props = {
  start: number;           // beginwaarde (bijv. Gross)
  steps: Step[];           // stappen (bijv. -d_channel, -d_customer, ...)
  width?: number;          // default 680
  height?: number;         // default 280
  currencyFmt?: (v: number) => string; // formatter voor tooltip/labels
};

/**
 * Lichtgewicht SVG Waterfall chart.
 * - Laat start (Gross), tussenstappen (kortingen), en eind (Net) zien.
 * - Kleuren: groen = start/eind, rood = neerwaartse stap, blauw = opwaartse stap (mocht je positieve deltas hebben).
 */
export default function Waterfall({
  start,
  steps,
  width = 680,
  height = 280,
  currencyFmt = (v) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v),
}: Props) {
  const padding = { top: 16, right: 16, bottom: 40, left: 60 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  // Cumulatieve punten
  const cumValues: number[] = [start];
  for (const s of steps) {
    cumValues.push(cumValues[cumValues.length - 1] + s.delta);
  }
  const end = cumValues[cumValues.length - 1];

  const maxY = Math.max(start, end, ...cumValues);
  const minY = Math.min(0, ...cumValues, ...steps.map((_, i) => cumValues[i] + Math.min(0, steps[i].delta)));
  const yRange = Math.max(1, maxY - minY);
  const yScale = (v: number) => padding.top + innerH - ((v - minY) / yRange) * innerH;

  const n = steps.length + 2; // start + steps + end
  const colW = innerW / n;
  const xForIndex = (i: number) => padding.left + i * colW + colW * 0.15;
  const barW = colW * 0.7;

  // Data voor render
  type Bar = { x: number; y: number; w: number; h: number; color: string; label: string; value: number; isTotal?: boolean };
  const bars: Bar[] = [];
  // Start
  {
    const y0 = yScale(0);
    const y1 = yScale(start);
    const h = Math.abs(y1 - y0);
    bars.push({
      x: xForIndex(0),
      y: Math.min(y0, y1),
      w: barW,
      h,
      color: "#16a34a", // groen
      label: "Gross",
      value: start,
      isTotal: true,
    });
  }
  // Steps
  steps.forEach((s, i) => {
    const from = cumValues[i];
    const to = from + s.delta;
    const y1 = yScale(from);
    const y2 = yScale(to);
    bars.push({
      x: xForIndex(i + 1),
      y: Math.min(y1, y2),
      w: barW,
      h: Math.abs(y2 - y1),
      color: s.delta < 0 ? "#dc2626" : "#2563eb", // rood omlaag, blauw omhoog
      label: s.label,
      value: s.delta,
    });
  });
  // End (Net)
  {
    const y0 = yScale(0);
    const y1 = yScale(end);
    bars.push({
      x: xForIndex(n - 1),
      y: Math.min(y0, y1),
      w: barW,
      h: Math.abs(y1 - y0),
      color: "#16a34a",
      label: "Net",
      value: end,
      isTotal: true,
    });
  }

  return (
    <svg width={width} height={height} role="img" aria-label="Waterfall chart">
      {/* As-lijn (0) */}
      <line
        x1={padding.left - 8}
        x2={width - padding.right + 8}
        y1={yScale(0)}
        y2={yScale(0)}
        stroke="#e5e7eb"
        strokeWidth={1}
      />
      {/* Bars */}
      {bars.map((b, idx) => (
        <g key={idx}>
          <rect x={b.x} y={b.y} width={b.w} height={Math.max(1, b.h)} fill={b.color} rx={4} />
          {/* Value label */}
          <text
            x={b.x + b.w / 2}
            y={b.y - 6}
            textAnchor="middle"
            fontSize={11}
            fill="#374151"
          >
            {b.isTotal ? currencyFmt(b.value) : (b.value < 0 ? "-" : "+") + currencyFmt(Math.abs(b.value))}
          </text>
          {/* X-label */}
          <text
            x={b.x + b.w / 2}
            y={height - 8}
            textAnchor="middle"
            fontSize={11}
            fill="#6b7280"
          >
            {b.label}
          </text>
        </g>
      ))}
      {/* Y-as labels (min, 0, max) */}
      {[minY, 0, maxY].map((v, i) => (
        <g key={"tick-" + i}>
          <text x={8} y={yScale(v) + 4} fontSize={11} fill="#6b7280">
            {currencyFmt(v)}
          </text>
          <line x1={padding.left - 6} x2={padding.left} y1={yScale(v)} y2={yScale(v)} stroke="#9ca3af" />
        </g>
      ))}
    </svg>
  );
}
