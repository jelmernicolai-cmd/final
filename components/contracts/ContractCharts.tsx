// components/contracts/ContractCharts.tsx
"use client";
import type { TotalRow } from "@/lib/contract-analysis";

/* Kleine helpers */
function yyyymm(a: string) {
  // verwacht "YYYY-MM" of "YYYYQn"; normaliseer voor sorteren
  const m = /^(\d{4})-(\d{2})$/.exec(a);
  const q = /^(\d{4})Q([1-4])$/i.exec(a);
  if (m) return `${m[1]}-${m[2]}`;
  if (q) return `${q[1]}-${String((Number(q[2]) - 1) * 3 + 1).padStart(2, "0")}`;
  return a;
}
function sortByPeriodKey<T extends { periodKey: string }>(rows: T[]) {
  return [...rows].sort((a, b) => (yyyymm(a.periodKey) < yyyymm(b.periodKey) ? -1 : 1));
}
/** Tolerant uitlezen van netto totaal uit TotalRow met verschillende sleutel-namen */
function getNetTotal(t: TotalRow): number {
  const anyT = t as any;
  return (
    Number(anyT.totalNet) ??
    Number(anyT.total_net) ??
    Number(anyT.net_total) ??
    Number(anyT.netto) ??
    Number(anyT.totaalNetto) ??
    Number(anyT.totaal_netto) ??
    0
  );
}

/* Eenvoudige lijnchart (responsive via viewBox) */
function LineChart({
  x,
  y,
  height = 160,
}: {
  x: string[];
  y: number[];
  height?: number;
}) {
  const width = 700;
  const pad = 24;
  const xs = x.map((_, i) => pad + (i * (width - 2 * pad)) / Math.max(1, x.length - 1));
  const minY = Math.min(...y);
  const maxY = Math.max(...y);
  const sy = (v: number) =>
    maxY === minY ? height / 2 : (height - pad) - ((v - minY) * (height - 2 * pad)) / (maxY - minY);
  const d = y.map((v, i) => `${i ? "L" : "M"} ${xs[i]} ${sy(v)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded-lg border bg-white">
      <path d={d} fill="none" stroke="currentColor" className="text-gray-800" strokeWidth={2} />
      {x.map((lbl, i) =>
        i % Math.ceil(x.length / 6 || 1) === 0 ? (
          <text
            key={i}
            x={xs[i]}
            y={height - 4}
            fontSize="10"
            textAnchor="middle"
            className="fill-gray-500"
          >
            {lbl}
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
  // 1) Totaal chart
  const sortedTotals = sortByPeriodKey(totals);
  const x = sortedTotals.map((t) => t.periodKey);
  const y = sortedTotals.map((t) => getNetTotal(t));

  // 2) Alleen series tonen die bestaan
  const safeTop = topContracts.filter((c) => seriesByContract[c]?.x?.length);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="mb-2 text-sm font-medium text-gray-700">Totaal netto-omzet per periode</div>
        <LineChart x={x} y={y} />
      </div>
      <div>
        <div className="mb-2 text-sm font-medium text-gray-700">Top contracten – netto-omzet (tijdreeks)</div>
        <div className="space-y-4">
          {safeTop.map((c) => (
            <div key={c}>
              <div className="mb-1 text-xs text-gray-500">{c}</div>
              <LineChart x={seriesByContract[c].x} y={seriesByContract[c].y} height={120} />
            </div>
          ))}
          {safeTop.length === 0 && (
            <div className="text-xs text-gray-500">Geen contract-series beschikbaar voor weergave.</div>
          )}
        </div>
      </div>
    </div>
  );
}
