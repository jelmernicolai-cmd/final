"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/** ========= Helpers ========= */
const eur = (n: number, d = 0) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: d }).format(
    Number.isFinite(n) ? n : 0
  );
const compact = (n: number) =>
  new Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 1 }).format(Number.isFinite(n) ? n : 0);
const pctS = (p: number, d = 0) => `${((Number.isFinite(p) ? p : 0) * 100).toFixed(d)}%`;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const round = (n: number, d = 0) => Math.round((Number.isFinite(n) ? n : 0) * 10 ** d) / 10 ** d;

/** ========= Types ========= */
type TenderEvent = { month: number; shareLoss: number };
type Inputs = {
  horizon: number;
  list0: number;
  baseUnits: number;
  gtn: number;
  cogs: number;
  entrants: number;
  priceDropPerEntrant: number;
  timeErosion12m: number;
  netFloorOfPre: number;
  elasticity: number;
  rampDownMonths: number;
  tender1?: TenderEvent;
  tender2?: TenderEvent;
};
type Point = {
  t: number;
  list: number;
  net: number;
  share: number;
  units: number;
  netSales: number;
  cogsEur: number;
  ebitda: number;
};
type Scenario = { id: "A" | "B"; name: string; color: string; inputs: Inputs };

/** ========= Defaults ========= */
const DEFAULTS: Inputs = {
  horizon: 36,
  list0: 100,
  baseUnits: 10000,
  gtn: 0.25,
  cogs: 0.20,
  entrants: 2,
  priceDropPerEntrant: 0.10,
  timeErosion12m: 0.04,
  netFloorOfPre: 0.45,
  elasticity: 0.20,
  rampDownMonths: 0,
  tender1: { month: 6, shareLoss: 0.15 },
  tender2: undefined,
};
const COLORS = { A: "#0ea5e9", B: "#f59e0b" };

/** ========= Model ========= */
function erosionFrac(t: number, entrants: number, perEntrant: number, overTime12m: number) {
  const direct = Math.min(entrants * perEntrant, 0.95);
  const overtime = Math.min((t / 12) * overTime12m, 0.5);
  return clamp(direct + overtime, 0, 0.98);
}
function shareCurveBase(t: number, entrants: number) {
  if (entrants <= 0) return 1;
  const k = 0.10 + entrants * 0.05;
  return clamp(Math.exp(-k * t), 0.05, 1);
}
function tenderMultiplier(t: number, rampDownMonths: number, events: (TenderEvent | undefined)[]) {
  const perEvent = (ev?: TenderEvent) => {
    if (!ev || ev.shareLoss <= 0) return 1;
    const m0 = Math.max(0, Math.floor(ev.month));
    const loss = clamp(ev.shareLoss, 0, 0.95);
    const floor = 1 - loss;
    if (t < m0) return 1;
    if (rampDownMonths <= 0) return floor;
    const end = m0 + rampDownMonths;
    if (t >= end) return floor;
    const frac = (t - m0) / rampDownMonths;
    return 1 - loss * clamp(frac, 0, 1);
  };
  return clamp(perEvent(events[0]) * perEvent(events[1]), 0.05, 1);
}
function simulate(inp: Inputs) {
  const points: Point[] = [];
  const preNet = inp.list0 * (1 - inp.gtn);

  for (let t = 0; t < inp.horizon; t++) {
    const eros = erosionFrac(t, inp.entrants, inp.priceDropPerEntrant, inp.timeErosion12m);
    const list = inp.list0 * (1 - eros);
    let net = list * (1 - inp.gtn);
    net = Math.max(net, preNet * inp.netFloorOfPre);

    let share = shareCurveBase(t, inp.entrants);
    share *= tenderMultiplier(t, Math.max(0, Math.round(inp.rampDownMonths)), [inp.tender1, inp.tender2]);
    share = clamp(share, 0.05, 1);

    const relative = (net - preNet * 0.5) / (preNet || 1);
    const elastAdj = 1 - clamp(relative * inp.elasticity, -0.5, 0.5);

    const units = Math.max(0, inp.baseUnits * share * elastAdj);
    const netSales = net * units;
    const cogsEur = netSales * inp.cogs;
    const ebitda = netSales - cogsEur;
    points.push({ t, list, net, share, units, netSales, cogsEur, ebitda });
  }

  const sum = (arr: Point[], f: (p: Point) => number) => arr.reduce((a, p) => a + f(p), 0);
  const y1 = points.slice(0, Math.min(12, points.length));
  const netY1 = sum(y1, (p) => p.netSales);
  const grossY1 = sum(y1, (p) => p.list * p.units);
  const kpis = {
    netY1,
    netTotal: sum(points, (p) => p.netSales),
    ebitdaTotal: sum(points, (p) => p.ebitda),
    avgShareY1: y1.length ? y1.reduce((a, p) => a + p.share, 0) / y1.length : 0,
    endShare: points.at(-1)?.share ?? 0,
    endNet: points.at(-1)?.net ?? 0,
    volLossY1: 1 - (sum(y1, (p) => p.units) / (inp.baseUnits * (y1.length || 1) || 1)),
    gtnLeakY1: grossY1 > 0 ? 1 - netY1 / grossY1 : 0,
  };
  return { points, kpis, preNet };
}

/** ========= Small UI ========= */
function FieldNumber({ label, value, onChange, step = 1, min, max, suffix }: {
  label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string;
}) {
  return (
    <label className="text-sm w-full">
      <div className="font-medium">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full rounded-lg border px-3 py-2"
        />
        {suffix ? <span className="text-gray-500">{suffix}</span> : null}
      </div>
    </label>
  );
}
function FieldPct({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="text-sm w-full">
      <div className="font-medium">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <input type="range" min={0} max={1} step={0.01} value={Number.isFinite(value) ? value : 0}
               onChange={(e) => onChange(parseFloat(e.target.value))} className="w-36 sm:w-40" />
        <input type="number" step={0.01} min={0} max={1} value={Number.isFinite(value) ? value : 0}
               onChange={(e) => onChange(parseFloat(e.target.value))} className="w-24 rounded-lg border px-3 py-2" />
        <span className="text-gray-500">{pctS(value)}</span>
      </div>
    </label>
  );
}
function Kpi({ title, value, help }: { title: string; value: string; help?: string }) {
  return (
    <div className="w-full min-w-0 rounded-2xl border bg-white p-4">
      <div className="text-sm text-gray-500 leading-snug break-words">{title}</div>
      <div className="text-xl font-semibold mt-1 leading-tight break-words">{value}</div>
      {help ? <div className="text-xs text-gray-500 mt-1 leading-snug break-words">{help}</div> : null}
    </div>
  );
}

/** ========= Charts ========= */
function MultiLineChart({
  name,
  series,
  yFmt = (v: number) => v.toFixed(0),
  height = 240,
}: {
  name: string;
  series: { name: string; color: string; values: number[] }[];
  yFmt?: (v: number) => string;
  height?: number;
}) {
  const w = 960, h = height, padX = 46, padY = 28;
  const maxLen = Math.max(1, ...series.map((s) => s.values.length));
  const all = series.flatMap((s) => s.values);
  const maxY = Math.max(1, ...all), minY = 0;
  const x = (i: number) => padX + (i / Math.max(1, maxLen - 1)) * (w - 2 * padX);
  const y = (v: number) => h - padY - ((v - minY) / (maxY - minY)) * (h - 2 * padY);
  const ticks = Array.from({ length: 5 }, (_, i) => (maxY / 4) * i);

  return (
    <div className="w-full">
      <svg className="w-full h-auto" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={name} preserveAspectRatio="xMidYMid meet">
        <rect x={12} y={12} width={w - 24} height={h - 24} rx={16} fill="#fff" stroke="#e5e7eb" />
        {ticks.map((tv, i) => (
          <g key={i}>
            <line x1={padX} y1={y(tv)} x2={w - padX} y2={y(tv)} stroke="#f3f4f6" />
            <text x={padX - 8} y={y(tv) + 4} fontSize="10" textAnchor="end" fill="#6b7280">
              {yFmt(tv)}
            </text>
          </g>
        ))}
        {series.map((s, si) => {
          const d = s.values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
          return (
            <g key={si}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} />
              {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={2} fill={s.color} />)}
              <text x={w - padX} y={y(s.values.at(-1) || 0) - 6} fontSize="10" textAnchor="end" fill={s.color}>
                {s.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** ========= Export ========= */
function toCSV(rows: (string | number)[][]) {
  const esc = (v: string | number) =>
    typeof v === "number" ? String(v) : /[",;\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v;
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}
function downloadCSV(name: string, rows: (string | number)[][]) {
  const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** ========= Page ========= */
export default function LOEPlanner() {
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: "A", name: "Scenario A (Base)", color: COLORS.A, inputs: { ...DEFAULTS } },
    { id: "B", name: "Scenario B (Ramp-down)", color: COLORS.B, inputs: { ...DEFAULTS, rampDownMonths: 3 } },
  ]);
  const [activeId, setActiveId] = useState<"A" | "B">("A");

  const sA = scenarios[0], sB = scenarios[1];
  const simA = useMemo(() => simulate(sA.inputs), [sA.inputs]);
  const simB = useMemo(() => simulate(sB.inputs), [sB.inputs]);
  const active = scenarios.find((s) => s.id === activeId)!;
  const activeSim = active.id === "A" ? simA : simB;

  const resetActive = () =>
    setScenarios((prev) => prev.map((s) => (s.id === activeId ? { ...s, inputs: { ...DEFAULTS } } : s)));
  const resetBoth = () =>
    setScenarios([
      { id: "A", name: "Scenario A (Base)", color: COLORS.A, inputs: { ...DEFAULTS } },
      { id: "B", name: "Scenario B (Ramp-down)", color: COLORS.B, inputs: { ...DEFAULTS, rampDownMonths: 3 } },
    ]);

  const exportCSV = () => {
    const rows: (string | number)[][] = [];
    rows.push(["scenario", "netY1", "netTotal", "ebitdaTotal", "avgShareY1", "endShare", "endNet"]);
    [{ name: sA.name, k: simA.kpis }, { name: sB.name, k: simB.kpis }].forEach(({ name, k }) =>
      rows.push([name, k.netY1, k.netTotal, k.ebitdaTotal, k.avgShareY1, k.endShare, k.endNet])
    );
    downloadCSV("loe_export.csv", rows);
  };

  const updateScenario = (id: "A" | "B", fn: (i: Inputs) => Inputs) =>
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, inputs: fn(s.inputs) } : s)));

  const seriesNet = [
    { name: sA.name, color: sA.color, values: simA.points.map((p) => p.netSales) },
    { name: sB.name, color: sB.color, values: simB.points.map((p) => p.netSales) },
  ];
  const seriesShare = [
    { name: sA.name, color: sA.color, values: simA.points.map((p) => p.share * 100) },
    { name: sB.name, color: sB.color, values: simB.points.map((p) => p.share * 100) },
  ];

  return (
    <div className="space-y-6 p-3 sm:p-4 lg:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Loss of Exclusivity – Scenario Planner</h1>
          <p className="text-gray-600 text-sm">Responsive KPI’s en grafieken. Vergelijk twee scenario’s en exporteer CSV.</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button onClick={exportCSV} className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">
            Export CSV
          </button>
          <button onClick={() => setActiveId(activeId === "A" ? "B" : "A")} className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">
            Bewerk: {activeId === "A" ? "Scenario B" : "Scenario A"}
          </button>
          <button onClick={resetActive} className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">Reset actief</button>
          <button onClick={resetBoth} className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">Reset beide</button>
        </div>
      </header>

      {/* KPI’s */}
      <section className="grid gap-4 sm:grid-cols-2
