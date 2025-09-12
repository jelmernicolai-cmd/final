// components/contracts/ContractCharts.tsx
"use client";

import * as React from "react";
import type { TotalRow } from "../../lib/contract-analysis";

/* ========= Helpers ========= */
function parsePeriodKey(pk: string) {
  // Ondersteunt "YYYY-MM" en "YYYY-Qn"
  const q = /^(\d{4})-Q([1-4])$/i.exec(pk);
  if (q) {
    const y = Number(q[1]);
    const qi = Number(q[2]);
    // map kwartaal naar eerste maand-index (0,3,6,9)
    const m0 = (qi - 1) * 3;
    return { y, m0, isQuarter: true };
  }
  const m = /^(\d{4})-(\d{2})$/.exec(pk);
  if (m) {
    const y = Number(m[1]);
    const m0 = Number(m[2]) - 1;
    return { y, m0, isQuarter: false };
  }
  // fallback: plaats ver weg zodat het einde in sort valt
  return { y: Number.MIN_SAFE_INTEGER, m0: -1, isQuarter: false };
}

function sortByPeriodKey<T extends { periodKey: string }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const A = parsePeriodKey(a.periodKey);
    const B = parsePeriodKey(b.periodKey);
    return A.y === B.y ? A.m0 - B.m0 : A.y - B.y;
  });
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

/* ========= Kleine, responsive line chart ========= */
function LineChart({
  x,
  y,
  height = 160,
  color = "#0f172a", // slate-900
  yFmt = (n: number) => new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(n),
}: {
  x: string[];
  y: number[];
  height?: number;
  color?: string;
  yFmt?: (n: number) => string;
}) {
  const width = 720;
  const padX = 28;
  const padY = 22;

  const n = Math.max(1, y.length);
  const xs = x.map((_, i) => padX + (i * (width - 2 * padX)) / Math.max(1, n - 1));

  const minY = Math.min(...y, 0);
  const maxY = Math.max(...y, 1);
  const same = maxY === minY;

  const sy = (v: number) =>
    same ? height / 2 : height - padY - ((v - minY) * (height - 2 * padY)) / (maxY - minY);

  const pathD = y.map((v, i) => `${i ? "L" : "M"} ${xs[i]} ${sy(v)}`).join(" ");

  // y-grid (4 tussenstappen)
  const ticks = Array.from({ length: 5 }, (_, i) => minY + ((maxY - minY) * i) / 4);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full rounded-lg border bg-white"
      role="img"
      aria-label="Lijngrafiek"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Achtergrondpanel */}
      <rect x={10} y={10} width={width - 20} height={height - 20} rx={12} fill="#fff" stroke="#e5e7eb" />

      {/* Grid + y-ticks */}
      {ticks.map((tv, i) => {
        const yPix = sy(tv);
        return (
          <g key={i}>
            <line x1={padX} y1={yPix} x2={width - padX} y2={yPix} stroke="#f3f4f6" />
            <text x={padX - 6} y={yPix + 3} fontSize="10" textAnchor="end" fill="#6b7280">
              {yFmt(tv)}
            </text>
          </g>
        );
      })}

      {/* Lijn */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} />

      {/* Punten */}
      {y.map((v, i) => (
        <circle key={i} cx={xs[i]} cy={sy(v)} r={2} fill={color} />
      ))}

      {/* x-labels (max ±6 zichtbaar) */}
      {x.map((lbl, i) =>
        i % Math.max(1, Math.ceil(x.length / 6)) === 0 ? (
          <text key={i} x={xs[i]} y={height - 6} fontSize="10" textAnchor="middle" fill="#6b7280">
            {lbl}
          </text>
        ) : null
      )}
    </svg>
  );
}

/* ========= Hoofdcomponent ========= */
export default function ContractCharts({
  totals,
  topContracts,
  seriesByContract,
}: {
  totals: TotalRow[];
  topContracts: string[];
  seriesByContract: Record<string, { x: string[]; y: number[] }>;
}) {
  // Sorteer periodes robuust (maand & kwartaal)
  const sortedTotals = sortByPeriodKey(totals);
  const x = sortedTotals.map((t) => t.periodKey);
  const y = sortedTotals.map((t) => t.totaal_netto);

  // Fix: toon alleen bestaande series & align op gezamenlijke x-as waar mogelijk
  const safeTop = topContracts.filter((c) => seriesByContract[c]?.x?.length);

  // Maak een verenigde x-as voor topcontracten indien doelen overlappen
  const unionX = uniq(
    safeTop.flatMap((c) => seriesByContract[c].x)
  ).sort((a, b) => {
    const A = parsePeriodKey(a);
    const B = parsePeriodKey(b);
    return A.y === B.y ? A.m0 - B.m0 : A.y - B.y;
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="mb-2 text-sm font-medium text-gray-700">Totaal netto-omzet per periode</div>
        <LineChart x={x} y={y} />
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-gray-700">Top contracten — netto-omzet (tijdreeks)</div>
        <div className="space-y-4">
          {safeTop.length === 0 ? (
            <div className="text-sm text-gray-500 border rounded-lg p-3 bg-white">Geen reeksen beschikbaar.</div>
          ) : (
            safeTop.map((c) => {
              const serie = seriesByContract[c];
              // Re-map naar unionX (missende punten = 0) voor betere vergelijkbaarheid
              const yAligned = unionX.map((lbl) => {
                const idx = serie.x.indexOf(lbl);
                return idx >= 0 ? serie.y[idx] : 0;
              });
              return (
                <div key={c}>
                  <div className="mb-1 text-xs text-gray-500">{c}</div>
                  <LineChart x={unionX} y={yAligned} height={120} color="#0ea5e9" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
