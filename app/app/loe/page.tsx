"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/** ================= Helpers ================= */
const eur = (n: number, d = 0) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: d }).format(
    Number.isFinite(n) ? n : 0
  );
const compact = (n: number) =>
  new Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 1 }).format(
    Number.isFinite(n) ? n : 0
  );
const pctS = (p: number, d = 0) => `${((Number.isFinite(p) ? p : 0) * 100).toFixed(d)}%`;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const round = (n: number, d = 0) => Math.round((Number.isFinite(n) ? n : 0) * 10 ** d) / 10 ** d;
const sign = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "±");
const tone = (n: number, goodIfPositive = true) => (goodIfPositive ? (n >= 0 ? "good" : "bad") : (n <= 0 ? "good" : "bad"));

/** ================= Types ================= */
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
  tender1?: TenderEvent;
  rampDownMonths: number;
  genericNetOfPre: number;
};

type Point = {
  t: number;
  list: number;
  netOriginator: number;
  netGeneric: number;
  shareOriginator: number;
  shareGenerics: number;
  unitsOriginator: number;
  unitsGenerics: number;
  netSalesOriginator: number;
  netSalesGenerics: number;
  netSalesTotal: number;
  cogsOriginator: number;
  ebitdaOriginator: number;
};

type Scenario = { id: "A" | "B"; name: string; color: string; inputs: Inputs };

type KPIs = {
  orgNetY1: number;
  orgNetTotal: number;
  orgEbitdaTotal: number;
  orgAvgShareY1: number;
  orgEndShare: number;
  orgEndNet: number;
  genNetY1: number;
  genNetTotal: number;
  genEndShare: number;
  mktNetY1: number;
  mktNetTotal: number;
};

/** ================= Defaults ================= */
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
  tender1: { month: 6, shareLoss: 0.15 },
  rampDownMonths: 3,
  genericNetOfPre: 0.50,
};

const COLORS = { A: "#0ea5e9", B: "#f59e0b", GEN_A: "#10b981", GEN_B: "#22c55e" };

/** ================= Model ================= */
function erosionFrac(t: number, entrants: number, perEntrant: number, overTime12m: number) {
  const direct = 1 - Math.exp(-Math.max(0, entrants) * clamp(perEntrant, 0, 1) * 3.5);
  const overtime = Math.min((t / 12) * clamp(overTime12m, 0, 1), 0.5);
  return clamp(direct + overtime, 0, 0.98);
}
function shareCurveBase(t: number, entrants: number) {
  if (entrants <= 0) return 1;
  const k = 0.10 + Math.max(0, entrants) * 0.06;
  return clamp(Math.exp(-k * t), 0.05, 1);
}
function tenderMultiplier(t: number, rampDownMonths: number, ev?: TenderEvent) {
  if (!ev || ev.shareLoss <= 0) return 1;
  const m0 = Math.max(0, Math.floor(ev.month));
  const loss = clamp(ev.shareLoss, 0, 0.95);
  const floor = 1 - loss;
  if (t < m0) return 1;
  const r = Math.max(0, Math.floor(rampDownMonths));
  if (r <= 0 || t >= m0 + r) return floor;
  const frac = (t - m0) / r;
  return 1 - loss * clamp(frac, 0, 1);
}

function simulate(inp: Inputs) {
  const points: Point[] = [];
  const preNet = Math.max(0, inp.list0) * (1 - clamp(inp.gtn, 0, 0.9));
  const genericNetAbs = preNet * clamp(inp.genericNetOfPre, 0.2, 0.9);

  for (let t = 0; t < Math.max(1, Math.floor(inp.horizon)); t++) {
    const eros = erosionFrac(t, inp.entrants, inp.priceDropPerEntrant, inp.timeErosion12m);
    const list = Math.max(0, inp.list0) * (1 - eros);
    let netOriginator = list * (1 - clamp(inp.gtn, 0, 0.9));
    netOriginator = Math.max(netOriginator, preNet * clamp(inp.netFloorOfPre, 0, 1));

    let share = shareCurveBase(t, inp.entrants);
    share *= tenderMultiplier(t, inp.rampDownMonths, inp.tender1);
    share = clamp(share, 0.05, 1);

    const relative = (netOriginator - genericNetAbs) / (preNet || 1);
    const elastAdj = 1 - clamp(relative * clamp(inp.elasticity, 0, 1), -0.5, 0.5);

    const totalUnits = Math.max(0, inp.baseUnits);
    const unitsOriginator = Math.max(0, totalUnits * share * elastAdj);
    const unitsGenerics = Math.max(0, totalUnits - unitsOriginator);

    const netSalesOriginator = netOriginator * unitsOriginator;
    const netSalesGenerics = genericNetAbs * unitsGenerics;
    const netSalesTotal = netSalesOriginator + netSalesGenerics;

    const cogsOriginator = netSalesOriginator * clamp(inp.cogs, 0, 0.95);
    const ebitdaOriginator = netSalesOriginator - cogsOriginator;

    points.push({
      t,
      list,
      netOriginator,
      netGeneric: genericNetAbs,
      shareOriginator: share,
      shareGenerics: 1 - share,
      unitsOriginator,
      unitsGenerics,
      netSalesOriginator,
      netSalesGenerics,
      netSalesTotal,
      cogsOriginator,
      ebitdaOriginator,
    });
  }

  const sum = (f: (p: Point) => number) => points.reduce((a, p) => a + f(p), 0);
  const y1 = points.slice(0, Math.min(12, points.length));

  const kpis: KPIs = {
    orgNetY1: y1.reduce((a, p) => a + p.netSalesOriginator, 0),
    orgNetTotal: sum((p) => p.netSalesOriginator),
    orgEbitdaTotal: sum((p) => p.ebitdaOriginator),
    orgAvgShareY1: y1.length ? y1.reduce((a, p) => a + p.shareOriginator, 0) / y1.length : 0,
    orgEndShare: points.at(-1)?.shareOriginator ?? 0,
    orgEndNet: points.at(-1)?.netOriginator ?? 0,

    genNetY1: y1.reduce((a, p) => a + p.netSalesGenerics, 0),
    genNetTotal: sum((p) => p.netSalesGenerics),
    genEndShare: points.at(-1)?.shareGenerics ?? 0,

    mktNetY1: y1.reduce((a, p) => a + p.netSalesTotal, 0),
    mktNetTotal: sum((p) => p.netSalesTotal),
  };

  const health = {
    horizonOK: Number.isFinite(inp.horizon) && inp.horizon >= 12 && inp.horizon <= 72,
    tenderOK: inp.tender1 ? inp.tender1.month >= 0 && inp.tender1.shareLoss >= 0 && inp.tender1.shareLoss <= 0.8 : true,
    pctBandsOK:
      clamp(inp.gtn, 0, 1) <= 0.8 &&
      clamp(inp.cogs, 0, 1) <= 0.9 &&
      clamp(inp.priceDropPerEntrant, 0, 1) <= 0.4 &&
      clamp(inp.timeErosion12m, 0, 1) <= 0.5,
    mathOK:
      Number.isFinite(kpis.orgNetY1) &&
      Number.isFinite(kpis.mktNetTotal) &&
      Number.isFinite(kpis.orgEbitdaTotal),
  };

  return { points, kpis, preNet, genericNetAbs, health };
}

/** ================= Kleine UI ================= */
function FieldNumber({
  label, value, onChange, step = 1, min, max, suffix, help,
}: {
  label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string; help?: string;
}) {
  return (
    <label className="text-sm w-full min-w-0">
      <div className="font-medium">{label}</div>
      {help ? <div className="text-xs text-gray-500">{help}</div> : null}
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
function FieldPct({ label, value, onChange, max = 1, help }: { label: string; value: number; onChange: (v: number) => void; max?: number; help?: string }) {
  return (
    <label className="text-sm w-full min-w-0">
      <div className="font-medium">{label}</div>
      {help ? <div className="text-xs text-gray-500">{help}</div> : null}
      <div className="mt-1 grid grid-cols-[1fr_auto_auto] items-center gap-2">
        <input type="range" min={0} max={max} step={0.005} value={Number.isFinite(value) ? value : 0}
               onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full" />
        <input type="number" step={0.01} min={0} max={max} value={Number.isFinite(value) ? value : 0}
               onChange={(e) => onChange(parseFloat(e.target.value))} className="w-24 rounded-lg border px-3 py-2" />
        <span className="text-gray-500">{pctS(value)}</span>
      </div>
    </label>
  );
}
function Kpi({ title, value, help, tone = "default", titleTooltip }: { title: string; value: string; help?: string; tone?: "default" | "good" | "warn" | "bad"; titleTooltip?: string; }) {
  const color =
    tone === "good" ? "border-emerald-200 bg-emerald-50" :
    tone === "warn" ? "border-amber-200 bg-amber-50" :
    tone === "bad"  ? "border-rose-200 bg-rose-50" : "border-gray-200 bg-white";
  return (
    <div className={`w-full min-w-0 rounded-2xl border ${color} p-3 sm:p-4`} title={titleTooltip}>
      <div className="text-[12px] text-gray-500 leading-snug break-words">{title}</div>
      <div className="text-lg sm:text-xl font-semibold mt-1 leading-tight break-words">{value}</div>
      {help ? <div className="text-[11px] sm:text-xs text-gray-500 mt-1 leading-snug break-words">{help}</div> : null}
    </div>
  );
}

/** ================= Charts (SVG) ================= */
function MultiLineChart({
  name, series, yFmt = (v: number) => v.toFixed(0), height = 240,
}: {
  name: string;
  series: { name: string; color: string; values: number[] }[];
  yFmt?: (v: number) => string;
  height?: number;
}) {
  const w = 960, h = height, padX = 46, padY = 28;
  const maxLen = Math.max(1, ...series.map((s) => s.values.length));
  const all = series.flatMap((s) => s.values);
  const maxY = Math.max(1, ...all);
  const minY = 0;
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
              {s.values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={2} fill={s.color}>
                  <title>{`${s.name} • m${i + 1}: ${yFmt(v)}`}</title>
                </circle>
              ))}
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

/** ================= Export CSV ================= */
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

/** ================= Presets & What-ifs ================= */
const PRESETS: Record<string, Partial<Inputs>> = {
  "Tendergedreven (ziekenhuis)": { entrants: 2, priceDropPerEntrant: 0.08, timeErosion12m: 0.03, tender1: { month: 4, shareLoss: 0.30 }, rampDownMonths: 2, netFloorOfPre: 0.42 },
  "Retail langstaart": { entrants: 5, priceDropPerEntrant: 0.06, timeErosion12m: 0.08, tender1: { month: 24, shareLoss: 0.0 }, rampDownMonths: 0, netFloorOfPre: 0.48 },
  "Snelle commoditisatie": { entrants: 6, priceDropPerEntrant: 0.12, timeErosion12m: 0.10, tender1: { month: 6, shareLoss: 0.25 }, rampDownMonths: 1, netFloorOfPre: 0.40 },
  "Langzame LOE": { entrants: 1, priceDropPerEntrant: 0.05, timeErosion12m: 0.02, tender1: { month: 12, shareLoss: 0.10 }, rampDownMonths: 4, netFloorOfPre: 0.50 },
};

/** ================= Page ================= */
export default function LOEPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: "A", name: "Scenario A (basis)", color: COLORS.A, inputs: { ...DEFAULTS } },
    {
      id: "B",
      name: "Scenario B (meer druk)",
      color: COLORS.B,
      inputs: {
        ...DEFAULTS,
        entrants: 4,
        priceDropPerEntrant: 0.12,
        timeErosion12m: 0.06,
        netFloorOfPre: 0.40,
        tender1: { month: 6, shareLoss: 0.22 },
        rampDownMonths: 2,
        genericNetOfPre: 0.45,
      },
    },
  ]);
  const [activeId, setActiveId] = useState<"A" | "B">("A");
  const sA = scenarios[0], sB = scenarios[1];

  const simA = useMemo(() => simulate(sA.inputs), [sA.inputs]);
  const simB = useMemo(() => simulate(sB.inputs), [sB.inputs]);

  const updateScenario = (id: "A" | "B", fn: (i: Inputs) => Inputs) =>
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, inputs: fn(s.inputs) } : s)));

  const resetActive = () =>
    setScenarios((prev) => prev.map((s) => (s.id === activeId ? { ...s, inputs: { ...DEFAULTS } } : s)));
  const resetBoth = () =>
    setScenarios([
      { id: "A", name: "Scenario A (basis)", color: COLORS.A, inputs: { ...DEFAULTS } },
      {
        id: "B",
        name: "Scenario B (meer druk)",
        color: COLORS.B,
        inputs: {
          ...DEFAULTS,
          entrants: 4,
          priceDropPerEntrant: 0.12,
          timeErosion12m: 0.06,
          netFloorOfPre: 0.40,
          tender1: { month: 6, shareLoss: 0.22 },
          rampDownMonths: 2,
          genericNetOfPre: 0.45,
        },
      },
    ]);

  const exportCSV = () => {
    const rows: (string | number)[][] = [];
    rows.push([
      "scenario","orgNetY1","orgNetTotal","orgEbitdaTotal","orgAvgShareY1","orgEndShare","orgEndNet","genNetY1","genNetTotal","genEndShare","mktNetY1","mktNetTotal",
    ]);
    [
      { name: sA.name, k: simA.kpis },
      { name: sB.name, k: simB.kpis },
    ].forEach(({ name, k }) =>
      rows.push([
        name, Math.round(k.orgNetY1), Math.round(k.orgNetTotal), Math.round(k.orgEbitdaTotal),
        round(k.orgAvgShareY1, 4), round(k.orgEndShare, 4), round(k.orgEndNet, 2),
        Math.round(k.genNetY1), Math.round(k.genNetTotal), round(k.genEndShare, 4),
        Math.round(k.mktNetY1), Math.round(k.mktNetTotal),
      ])
    );
    downloadCSV("loe_export.csv", rows);
  };

  // Reeksen
  const seriesNetSales = [
    { name: `${sA.name} – Originator`, color: sA.color, values: simA.points.map((p) => p.netSalesOriginator) },
    { name: `${sA.name} – Generieken`, color: COLORS.GEN_A, values: simA.points.map((p) => p.netSalesGenerics) },
    { name: `${sB.name} – Originator`, color: sB.color, values: simB.points.map((p) => p.netSalesOriginator) },
    { name: `${sB.name} – Generieken`, color: COLORS.GEN_B, values: simB.points.map((p) => p.netSalesGenerics) },
  ];
  const seriesShare = [
    { name: `${sA.name} – Originator`, color: sA.color, values: simA.points.map((p) => p.shareOriginator * 100) },
    { name: `${sA.name} – Generieken`, color: COLORS.GEN_A, values: simA.points.map((p) => p.shareGenerics * 100) },
    { name: `${sB.name} – Originator`, color: sB.color, values: simB.points.map((p) => p.shareOriginator * 100) },
    { name: `${sB.name} – Generieken`, color: COLORS.GEN_B, values: simB.points.map((p) => p.shareGenerics * 100) },
  ];
  const seriesNetPrice = [
    { name: `${sA.name} – Originator`, color: sA.color, values: simA.points.map((p) => p.netOriginator) },
    { name: `${sA.name} – Generiek`, color: COLORS.GEN_A, values: simA.points.map((p) => p.netGeneric) },
    { name: `${sB.name} – Originator`, color: sB.color, values: simB.points.map((p) => p.netOriginator) },
    { name: `${sB.name} – Generiek`, color: COLORS.GEN_B, values: simB.points.map((p) => p.netGeneric) },
  ];

  // Delta B t.o.v. A (jaar 1 / einde)
  const dNetY1 = simB.kpis.orgNetY1 - simA.kpis.orgNetY1;
  const dEbitda = simB.kpis.orgEbitdaTotal - simA.kpis.orgEbitdaTotal;
  const dEndShare = simB.kpis.orgEndShare - simA.kpis.orgEndShare;
  const dEndNet = simB.kpis.orgEndNet - simA.kpis.orgEndNet;

  // UI helpers
  const active = scenarios.find((s) => s.id === activeId)!;
  const activeSim = active.id === "A" ? simA : simB;

  const applyPreset = (name: keyof typeof PRESETS) => {
    updateScenario(active.id, (i) => ({ ...i, ...PRESETS[name] }));
  };

  // What-if quick edits
  const bump = (field: keyof Inputs, delta: number, clampTo?: [number, number]) => {
    updateScenario(active.id, (i) => {
      const next = { ...i, [field]: (i as any)[field] + delta };
      if (clampTo) (next as any)[field] = clamp((next as any)[field], clampTo[0], clampTo[1]);
      if (field === "tender1") return next; // not used here
      return next;
    });
  };

  return (
    <div className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6 py-4 space-y-6">
      {/* Header + compare bar */}
      <header className="rounded-2xl border bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold truncate">Loss of Exclusivity — Originator vs. Generieken</h1>
            <p className="text-gray-600 text-sm">
              LOE op t=0. Meerdere generieken drukken prijs en aandeel. Tender verlaagt originator blijvend (optioneel, met ramp-down).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCSV} className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">Export CSV</button>
            <button onClick={() => setActiveId(activeId === "A" ? "B" : "A")} className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">
              Bewerk: {activeId === "A" ? "Scenario B" : "Scenario A"}
            </button>
            <button onClick={resetActive} className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">Reset actief</button>
            <button onClick={resetBoth} className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">Reset beide</button>
          </div>
        </div>

        {/* Compacte vergelijking A vs B */}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[{ sc: sA, sim: simA }, { sc: sB, sim: simB }].map(({ sc, sim }) => (
            <div key={sc.id} className="rounded-xl border p-3">
              <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: sc.color }} />
                {sc.name}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span title="Net sales jaar 1">Net Y1: <b>{eur(sim.kpis.orgNetY1)}</b></span>
                <span title="Einde marktaandeel originator">Eind share: <b>{pctS(sim.kpis.orgEndShare, 1)}</b></span>
                <span title="Netto koperprijs originator op einde horizon">Eind net €/u: <b>{eur(sim.kpis.orgEndNet, 0)}</b></span>
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* Navigatie links */}
      <div className="flex flex-wrap gap-2">
        <Link href="/app/waterfall" className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">Waterfall</Link>
        <Link href="/app/consistency" className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">Consistency</Link>
      </div>

      {/* Presets + what-if shortcuts */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: active.color }} />
            <h2 className="text-base font-semibold">{active.name} — Presets & What-ifs</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveId("A")} className={`text-xs rounded border px-2 py-1 ${activeId === "A" ? "bg-gray-50" : ""}`}>Scenario A</button>
            <button onClick={() => setActiveId("B")} className={`text-xs rounded border px-2 py-1 ${activeId === "B" ? "bg-gray-50" : ""}`}>Scenario B</button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border p-3">
            <div className="text-sm font-medium mb-2">Presets (farma-archetypen)</div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(PRESETS).map((p) => (
                <button
                  key={p}
                  onClick={() => applyPreset(p)}
                  className="text-xs rounded border px-3 py-1.5 hover:bg-gray-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="text-sm font-medium mb-2">What-if snelknoppen</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button onClick={() => bump("entrants", +1, [0, 8])} className="rounded border px-3 py-1.5 hover:bg-gray-50">+1 entrant</button>
              <button onClick={() => bump("entrants", -1, [0, 8])} className="rounded border px-3 py-1.5 hover:bg-gray-50">−1 entrant</button>
              <button onClick={() => updateScenario(active.id, (i) => ({ ...i, tender1: { month: Math.max(0, (i.tender1?.month ?? 6) - 3), shareLoss: i.tender1?.shareLoss ?? 0.15 } }))} className="rounded border px-3 py-1.5 hover:bg-gray-50">Tender 3 mnd eerder</button>
              <button onClick={() => updateScenario(active.id, (i) => ({ ...i, tender1: { month: (i.tender1?.month ?? 6) + 3, shareLoss: i.tender1?.shareLoss ?? 0.15 } }))} className="rounded border px-3 py-1.5 hover:bg-gray-50">Tender 3 mnd later</button>
              <button onClick={() => bump("gtn", +0.02, [0, 0.8])} className="rounded border px-3 py-1.5 hover:bg-gray-50">GTN +2pp</button>
              <button onClick={() => bump("gtn", -0.02, [0, 0.8])} className="rounded border px-3 py-1.5 hover:bg-gray-50">GTN −2pp</button>
              <button onClick={() => bump("genericNetOfPre", -0.05, [0.2, 0.9])} className="rounded border px-3 py-1.5 hover:bg-gray-50">Generiek net −5pp</button>
            </div>
          </div>
        </div>
      </section>

      {/* Parameters actief scenario */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="text-sm text-gray-700 mb-3">
          Stel de parameters voor <b>{active.name}</b> in. Pre-LOE net = list × (1 − GTN). Originator heeft net-floor t.o.v. pre-LOE net.
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FieldNumber label="Horizon (maanden)" value={active.inputs.horizon} min={12} max={72} step={6}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, horizon: Math.round(v) }))} />
          <FieldNumber label="List price t=0 (€)" value={active.inputs.list0} min={1} step={5}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, list0: v }))} />
          <FieldNumber label="Units/maand (markt, pre-LOE)" value={active.inputs.baseUnits} min={100} step={500}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, baseUnits: v }))} />

          <FieldPct label="GTN %" value={active.inputs.gtn}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, gtn: clamp(v, 0, 0.8) }))} />
          <FieldPct label="COGS %" value={active.inputs.cogs}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, cogs: clamp(v, 0, 0.9) }))} />

          <FieldNumber label="# generieke entrants" value={active.inputs.entrants} min={0} max={8} step={1}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, entrants: Math.round(clamp(v, 0, 8)) }))} />
          <FieldPct label="Prijsdruk per entrant" value={active.inputs.priceDropPerEntrant} help="Effect op list-prijs richting generiek net"
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, priceDropPerEntrant: clamp(v, 0, 0.4) }))} />
          <FieldPct label="Extra erosie / 12m" value={active.inputs.timeErosion12m}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, timeErosion12m: clamp(v, 0, 0.5) }))} />
          <FieldPct label="Net floor (vs pre-LOE net)" value={active.inputs.netFloorOfPre}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, netFloorOfPre: clamp(v, 0.2, 1) }))} />

          <FieldNumber label="Tender — maand" value={active.inputs.tender1?.month ?? 6} min={0} step={1}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, tender1: { month: Math.max(0, Math.round(v)), shareLoss: i.tender1?.shareLoss ?? 0.15 } }))} />
          <FieldPct label="Tender — shareverlies" value={active.inputs.tender1?.shareLoss ?? 0}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, tender1: { month: i.tender1?.month ?? 6, shareLoss: clamp(v, 0, 0.8) } }))} />
          <FieldNumber label="Ramp-down (maanden)" value={active.inputs.rampDownMonths} min={0} step={1}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, rampDownMonths: Math.max(0, Math.round(v)) }))} />

          <FieldPct label="Generiek net % vs pre-LOE net" value={active.inputs.genericNetOfPre}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, genericNetOfPre: clamp(v, 0.2, 0.9) }))} />
          <FieldPct label="Elasticiteit (originator penalty)" value={active.inputs.elasticity}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, elasticity: clamp(v, 0, 1) }))} />
        </div>

        {/* Health */}
        <div className="mt-3 text-xs">
          <div className="inline-flex flex-wrap gap-2">
            <Badge ok={activeSim.health.horizonOK} label="Horizon 12–72" />
            <Badge ok={activeSim.health.tenderOK} label="Tender ok" />
            <Badge ok={activeSim.health.pctBandsOK} label="Parameters in band" />
            <Badge ok={activeSim.health.mathOK} label="Berekening ok" />
          </div>
          <div className="text-gray-500 mt-1">
            Pre-LOE net (originator): {eur(activeSim.preNet, 0)} • Generiek net (aanname): {eur(activeSim.genericNetAbs, 0)}
          </div>
        </div>
      </section>

      {/* Delta B t.o.v. A — compact besluitkader */}
      <section className="rounded
