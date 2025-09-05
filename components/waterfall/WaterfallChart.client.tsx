"use client";

type Step = { label: string; amount: number; color?: string };

function toCurrency(n: number) {
  return n.toLocaleString("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export default function WaterfallChart({ steps }: { steps: Step[] }) {
  // Bouw cumulatief: start op 0 en pas elke stap toe
  const cumul: number[] = [0];
  for (const s of steps) {
    cumul.push(cumul[cumul.length - 1] + s.amount);
  }

  const all = [...cumul];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = (max - min) * 0.1 || 1;
  const y0 = min - pad;
  const y1 = max + pad;

  const width = 900;
  const height = steps.length * 38 + 60;
  const leftPad = 80;
  const rightPad = 20;

  const scaleX = (v: number) => {
    const inner = width - leftPad - rightPad;
    return leftPad + ((v - y0) / (y1 - y0)) * inner;
  };

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="rounded-lg border bg-white">
      {/* Horizonlijn */}
      <line x1={scaleX(0)} y1={20} x2={scaleX(0)} y2={height - 20} stroke="#e5e7eb" strokeWidth="1" />
      {/* labels links */}
      {steps.map((s, i) => (
        <text key={`lbl-${i}`} x={8} y={40 + i * 38} dominantBaseline="middle" fontSize="12" fill="#374151">
          {s.label}
        </text>
      ))}
      {/* bars */}
      {steps.map((s, i) => {
        const start = cumul[i];
        const end = cumul[i + 1];
        const x1 = scaleX(Math.min(start, end));
        const x2 = scaleX(Math.max(start, end));
        const w = Math.max(2, x2 - x1);
        const y = 40 + i * 38 - 12;
        const pos = s.amount >= 0;
        const fill = s.color || (pos ? "#16a34a" : "#dc2626"); // groen/rood
        return (
          <g key={`bar-${i}`}>
            <rect x={x1} y={y} width={w} height={24} fill={fill} opacity="0.9" rx="4" />
            <text x={x2 + 6} y={y + 12} dominantBaseline="middle" fontSize="11" fill="#374151">
              {toCurrency(end)}
            </text>
          </g>
        );
      })}
      {/* as-waarden (min, 0, max) */}
      {[min, 0, max].map((tick, i) => (
        <g key={`tick-${i}`}>
          <line x1={scaleX(tick)} y1={20} x2={scaleX(tick)} y2={height - 20} stroke="#f3f4f6" />
          <text x={scaleX(tick)} y={height - 6} fontSize="11" textAnchor="middle" fill="#6b7280">
            {toCurrency(tick)}
          </text>
        </g>
      ))}
    </svg>
  );
}
