"use client";

import { TotalRow, AggRow } from "@/lib/contract-analysis";

function LineChart({
  x,
  y,
  height = 160,
}: { x: string[]; y: number[]; height?: number }) {
  // lightweight inline SVG line chart, no extra deps
  const width = 700;
  const pad = 24;
  const xs = x.map((_, i) => pad + (i * (width - 2 * pad)) / Math.max(1, x.length - 1));
  const minY = Math.min(...y);
  const maxY = Math.max(...y);
  const scaleY = (v: number) => {
    if (maxY === minY) return height / 2;
    return height - pad - ((v - minY) * (height - 2 * pad)) / (maxY - minY);
  };
  const d = y.map((v, i) => `${i === 0 ? "M" : "L"} ${xs[i]} ${scaleY(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded-lg border bg-white">
      <path d={d} fill="none" stroke="currentColor" className="text-gray-800" strokeWidth={2} />
      {/* x labels (sparse) */}
      {x.map((label, i) =>
        i % Math.ceil(x.length / 6) === 0 ? (
          <text key={i} x={xs[i]} y={height - 4} fontSize="10" textAnchor="middle" className="fill-gray-500">
            {label}
          </text>
        ) : null
      )}
    </svg>
  );
}

export default function ContractCharts({
  totals,
  topContracts,
  seriesByContract,
}: {
  totals: TotalRow[];
  topContracts: string[];
  seriesByContract: Record<string, { x: string[]; y: number[] }>;
}) {
  const x = totals.map((t) => t.periode);
  const y = totals.map((t) => t.totaal_netto);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="mb-2 text-sm font-medium text-gray-700">Totaal netto-omzet per maand</div>
        <LineChart x={x} y={y} />
      </div>
      <div>
        <div className="mb-2 text-sm font-medium text-gray-700">Top contracten – netto-omzet (tijdreeks)</div>
        <div className="space-y-4">
          {topContracts.map((c) => (
            <div key={c}>
              <div className="mb-1 text-xs text-gray-500">{c}</div>
              <LineChart x={seriesByContract[c].x} y={seriesByContract[c].y} height={120} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
