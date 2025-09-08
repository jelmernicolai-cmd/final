"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/** ========= Helpers ========= */
const eur = (n: number, d = 0) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: d }).format(n || 0);
const compact = (n: number) =>
  new Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);
const pctS = (p: number, d = 0) => `${(p * 100).toFixed(d)}%`;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;

/** ========= Types ========= */
type TenderEvent = { month: number; shareLoss: number }; // 0..1
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
  rampDownMonths: number;   // 0=direct; >0 = geleidelijke inloop
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
  const overtime = Math.min((t / 12) * overTime12m, 0.50);
  return clamp(direct + overtime, 0, 0.98);
}

function shareCurveBase(t: number, entrants: number) {
  if (entrants <= 0) return 1; // geen afkalving zonder concurrentie
  const k = 0.10 + entrants * 0.05;
  const base = Math.exp(-k * t);
  return clamp(base, 0.05, 1);
}

/** Tender multiplier: lineair inrampen naar (1-loss) binnen rampDownMonths, daarna blijvend. Twee events multiplicatief. */
function tenderMultiplier(t: number, rampDownMonths: number, events: (TenderEvent | undefined)[]) {
  const multForEvent = (ev?: TenderEvent) => {
    if (!ev || ev.shareLoss <= 0) return 1;
    const m0 = Math.max(0, Math.floor(ev.month));
    const loss = clamp(ev.shareLoss, 0, 0.95);
    const floor = 1 - loss;

    if (t < m0) return 1;
    if (rampDownMonths <= 0) return floor;

    const end = m0 + rampDownMonths;
    if (t >= end) return floor;

    const frac = (t - m0) / rampDownMonths; // 0..1
    return 1 - loss * clamp(frac, 0, 1);
  };
  const m1 = multForEvent(events[0]);
  const m2 = multForEvent(events[1]);
  return clamp(m1 * m2, 0.05, 1);
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
    avgShareY1: y1.reduce((a, p) => a + p.share, 0) / (y1.length || 1),
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
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
      {help ? <div className="text-xs text-gray-500 mt-1">{help}</div> : null}
    </div>
  );
}

/** ========= Charts (responsive SVG) ========= */
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
  const maxLen = Math.max(1, ...series.map(s => s.values.length));
  const all = series.flatMap(s => s.values);
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

/** ========= Export (één CSV) ========= */
function toCSV(rows: (string | number)[][]) {
  const esc = (v: string | number) => typeof v === "number" ? String(v) : /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return rows.map(r => r.map(esc).join(",")).join("\n");
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
export default function LOEPlannerResponsive() {
  // 2 scenario’s
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: "A", name: "Scenario A (Base)", color: COLORS.A, inputs: { ...DEFAULTS } },
    {
      id: "B",
      name: "Scenario B (Ramp-down)",
      color: COLORS.B,
      inputs: { ...DEFAULTS, rampDownMonths: 3, tender1: { month: 6, shareLoss: 0.15 }, tender2: { month: 18, shareLoss: 0.10 } },
    },
  ]);
  const [activeId, setActiveId] = useState<"A" | "B">("A");

  const sA = scenarios[0];
  const sB = scenarios[1];
  const simA = useMemo(() => simulate(sA.inputs), [sA.inputs]);
  const simB = useMemo(() => simulate(sB.inputs), [sB.inputs]);

  const active = scenarios.find(s => s.id === activeId)!;
  const activeSim = active.id === "A" ? simA : simB;

  // Resets
  const resetActive = () => setScenarios(prev => prev.map(s => s.id === activeId ? { ...s, inputs: { ...DEFAULTS } } : s));
  const resetBoth = () => {
    setScenarios([
      { id: "A", name: "Scenario A (Base)", color: COLORS.A, inputs: { ...DEFAULTS } },
      { id: "B", name: "Scenario B (Ramp-down)", color: COLORS.B, inputs: { ...DEFAULTS, rampDownMonths: 3, tender1: { month: 6, shareLoss: 0.15 }, tender2: { month: 18, shareLoss: 0.10 } } },
    ]);
    setActiveId("A");
  };

  // Export
  const exportCSV = () => {
    const rows: (string | number)[][] = [];
    rows.push(["KPI’s"]);
    rows.push(["scenario", "netY1", "netTotal", "ebitdaTotal", "avgShareY1", "endShare", "endNet", "volLossY1", "gtnLeakY1"]);
    [{ name: sA.name, k: simA.kpis }, { name: sB.name, k: simB.kpis }].forEach(({ name, k }) =>
      rows.push([name, Math.round(k.netY1), Math.round(k.netTotal), Math.round(k.ebitdaTotal), round(k.avgShareY1, 4), round(k.endShare, 4), round(k.endNet, 2), round(k.volLossY1, 4), round(k.gtnLeakY1, 4)])
    );

    rows.push([]);
    rows.push(["Maandelijkse punten"]);
    rows.push(["scenario", "t", "list", "net", "share", "units", "netSales", "cogsEur", "ebitda"]);
    [{ name: sA.name, points: simA.points }, { name: sB.name, points: simB.points }].forEach(({ name, points }) =>
      points.forEach(p => rows.push([name, p.t, round(p.list, 2), round(p.net, 2), round(p.share, 4), Math.round(p.units), Math.round(p.netSales), Math.round(p.cogsEur), Math.round(p.ebitda)]))
    );

    downloadCSV("loe_export.csv", rows);
  };

  // Updates
  const updateScenario = (id: "A" | "B", fn: (i: Inputs) => Inputs) => {
    setScenarios(prev => prev.map(s => (s.id === id ? { ...s, inputs: fn(s.inputs) } : s)));
  };

  // Series
  const seriesNet = [
    { name: sA.name, color: sA.color, values: simA.points.map(p => p.netSales) },
    { name: sB.name, color: sB.color, values: simB.points.map(p => p.netSales) },
  ];
  const seriesShare = [
    { name: sA.name, color: sA.color, values: simA.points.map(p => p.share * 100) },
    { name: sB.name, color: sB.color, values: simB.points.map(p => p.share * 100) },
  ];
  const seriesNetPrice = [
    { name: sA.name, color: sA.color, values: simA.points.map(p => p.net) },
    { name: sB.name, color: sB.color, values: simB.points.map(p => p.net) },
  ];

  return (
    <div className="space-y-6 p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Loss of Exclusivity – Scenario Planner</h1>
          <p className="text-gray-600 text-sm">
            Volledig responsive. Vergelijk twee scenario’s met ramp-down tenders en exporteer onderbouwing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button onClick={exportCSV} className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">Export CSV</button>
          <button onClick={() => setActiveId(activeId === "A" ? "B" : "A")} className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">
            Bewerk: {activeId === "A" ? "Scenario B" : "Scenario A"}
          </button>
          <button onClick={resetActive} className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">Reset actief</button>
          <button onClick={resetBoth} className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">Reset beide</button>
        </div>
      </header>

      {/* Uitlegblok */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-base font-semibold">Hoe rekent het model</h2>
        <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
          <li><b>Prijs</b>: list daalt door <i>entrants</i> + <i>tijd</i>; <b>net</b> via GTN met <b>net floor</b> (vs pre-LOE net).</li>
          <li><b>Share</b>: basiscurve daalt; tender(s) drukken het niveau <b>blijvend</b>. Met <b>rampDownMonths</b> loopt de daling geleidelijk in.</li>
          <li><b>Volume</b> = baseline × share × elasticiteit (duurdere originator ⇒ minder volume).</li>
          <li><b>Vlak-test</b>: zet alle druk op 0 (entrants/time-erosie/tender/elast) ⇒ sales blijft vlak.</li>
        </ul>
      </section>

      {/* Snelle navigatie (optioneel) */}
      <div className="flex flex-wrap gap-2">
        <Link href="/app/waterfall" className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">Waterfall</Link>
        <Link href="/app/consistency" className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">Consistency</Link>
      </div>

      {/* Parameters actief scenario */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: active.color }} />
            <span className="font-semibold">{active.name}</span>
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button onClick={() => setActiveId("A")} className={`text-xs rounded border px-2 py-1 ${activeId==="A"?"bg-gray-50":""}`}>Scenario A</button>
            <button onClick={() => setActiveId("B")} className={`text-xs rounded border px-2 py-1 ${activeId==="B"?"bg-gray-50":""}`}>Scenario B</button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FieldNumber label="Horizon (maanden)" value={active.inputs.horizon} min={12} max={72} step={6}
            onChange={(v) => updateScenario(active.id, i => ({ ...i, horizon: Math.round(v) }))} />
          <FieldNumber label="List price t=0 (€)" value={active.inputs.list0} min={1} step={5}
            onChange={(v) => updateScenario(active.id, i => ({ ...i, list0: v }))} />
          <FieldNumber label="Units/maand (pre-LOE)" value={active.inputs.baseUnits} min={100} step={500}
            onChange={(v) => updateScenario(active.id, i => ({ ...i, baseUnits: v }))} />

          <FieldPct label="GTN %" value={active.inputs.gtn}
            onChange={(v) => updateScenario(active.id, i => ({ ...i, gtn: clamp(v, 0, 0.8) }))} />
          <FieldPct label="COGS %" value={active.inputs.cogs}
            onChange={(v) => updateScenario(active.id, i => ({ ...i, cogs: clamp(v, 0, 0.9) }))} />

          <FieldNumber label="# entrants" value={active.inputs.entrants} min={0} max={8} step={1}
            onChange={(v) => updateScenario(active.id, i => ({ ...i, entrants: Math.round(clamp(v, 0, 8)) }))} />
          <FieldPct label="Prijsdruk per entrant" value={active.inputs.priceDropPerEntrant}
            onChange={(v) => updateScenario(active.id, i => ({ ...i, priceDropPerEntrant: clamp(v, 0, 0.4) }))} />
          <FieldPct label="Extra erosie per 12m" value={active.inputs.timeErosion12m}
            onChange={(v) => updateScenario(active.id, i => ({ ...i, timeErosion12m: clamp(v, 0, 0.5) }))} />
          <FieldPct label="Net price floor (vs pre-LOE net)" value={active.inputs.netFloorOfPre}
            onChange={(v) => updateScenario(active.id, i => ({ ...i, netFloorOfPre: clamp(v, 0.2, 1) }))} />

          <FieldNumber label="Tender 1 – maand" value={active.inputs.tender1?.month ?? 6} min={0} step={1}
            onChange={(v) => updateScenario(active.id, i => ({ ...i, tender1: { month: Math.max(0, Math.round(v)), shareLoss: i.tender1?.shareLoss ?? 0.15 } }))} />
          <FieldPct label="Tender 1 – share verlies" value={active.inputs.tender1?.shareLoss ?? 0}
            onChange={(v) => updateScenario(active.id, i => ({ ...i, tender1: { month: i.tender1?.month ?? 6, shareLoss: clamp(v, 0, 0.8) } }))} />
          <FieldNumber label="Ramp-down (maanden)" value={active.inputs.rampDownMonths} min={0} step={1}
            onChange={(v) => updateScenario(active.id, i => ({ ...i, rampDownMonths: Math.max(0, Math.round(v)) }))} />

          <FieldNumber label="Tender 2 – maand (opt.)" value={active.inputs.tender2?.month ?? 18} min={0} step={1}
            onChange={(v) => updateScenario(active.id, i => ({ ...i, tender2: { month: Math.max(0, Math.round(v)), shareLoss: i.tender2?.shareLoss ?? 0.1 } }))} />
          <FieldPct label="Tender 2 – share verlies (opt.)" value={active.inputs.tender2?.shareLoss ?? 0}
            onChange={(v) => updateScenario(active.id, i => ({ ...i, tender2: { month: i.tender2?.month ?? 18, shareLoss: clamp(v, 0, 0.8) } }))} />
          <FieldPct label="Elasticiteit" value={active.inputs.elasticity}
            onChange={(v) => updateScenario(active.id, i => ({ ...i, elasticity: clamp(v, 0, 1) }))} />
        </div>

        <div className="mt-2 text-xs text-gray-500">
          Pre-LOE net (floor referentie) = {eur(activeSim.preNet, 0)}.
        </div>
      </section>

      {/* KPI’s en vergelijking */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold mb-3">KPI’s en vergelijking</h3>

        {/* Cards: responsive grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {[{ sc: sA, sim: simA }, { sc: sB, sim: simB }].map(({ sc, sim }) => (
            <div key={sc.id} className="rounded-2xl border p-4">
              <div className="flex items-center gap-2 mb-2 min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sc.color }} />
                <div className="font-semibold truncate">{sc.name}</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi title="Net sales – Y1" value={eur(sim.kpis.netY1)} />
                <Kpi title="Net sales – Horizon" value={eur(sim.kpis.netTotal)} />
                <Kpi title="EBITDA – Horizon" value={eur(sim.kpis.ebitdaTotal)} />
                <Kpi title="Eind-netto prijs" value={eur(sim.kpis.endNet, 0)} help={`Eind-share: ${pctS(sim.kpis.endShare, 1)}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Tabel met horizontale scroll op small screens */}
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 px-2">Scenario</th>
                <th className="py-2 px-2">Net sales – Y1</th>
                <th className="py-2 px-2">Net sales – Horizon</th>
                <th className="py-2 px-2">EBITDA – Horizon</th>
                <th className="py-2 px-2">Ø Share Y1</th>
                <th className="py-2 px-2">Eind-share</th>
                <th className="py-2 px-2">Eind-net €/u</th>
                <th className="py-2 px-2">Volumeverlies Y1</th>
                <th className="py-2 px-2">GTN leakage Y1</th>
                <th className="py-2 px-2">Δ Net Y1 (vs A)</th>
              </tr>
            </thead>
            <tbody>
              {[{ sc: sA, sim: simA }, { sc: sB, sim: simB }].map(({ sc, sim }) => {
                const base = simA.kpis;
                const dNetY1 = sim.kpis.netY1 - base.netY1;
                return (
                  <tr key={sc.id} className="border-b">
                    <td className="py-2 px-2">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: sc.color }} /> {sc.name}
                      </span>
                    </td>
                    <td className="py-2 px-2">{eur(sim.kpis.netY1)}</td>
                    <td className="py-2 px-2">{eur(sim.kpis.netTotal)}</td>
                    <td className="py-2 px-2">{eur(sim.kpis.ebitdaTotal)}</td>
                    <td className="py-2 px-2">{pctS(sim.kpis.avgShareY1, 1)}</td>
                    <td className="py-2 px-2">{pctS(sim.kpis.endShare, 1)}</td>
                    <td className="py-2 px-2">{eur(sim.kpis.endNet, 0)}</td>
                    <td className="py-2 px-2">{pctS(sim.kpis.volLossY1, 1)}</td>
                    <td className="py-2 px-2">{pctS(sim.kpis.gtnLeakY1, 1)}</td>
                    <td className="py-2 px-2">
                      <span className={dNetY1 >= 0 ? "text-emerald-600" : "text-rose-600"}>
                        {dNetY1 >= 0 ? "↑" : "↓"} {eur(Math.abs(dNetY1))}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Actieknoppen (responsive) */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={exportCSV} className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">Export CSV</button>
          <button onClick={() => setActiveId(activeId === "A" ? "B" : "A")} className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">
            Bewerk: {activeId === "A" ? "Scenario B" : "Scenario A"}
          </button>
          <button onClick={resetActive} className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">Reset actief</button>
          <button onClick={resetBoth} className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">Reset beide</button>
        </div>
      </section>

      {/* Grafieken */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-2">Net sales per maand</h3>
          <MultiLineChart name="Net sales" series={seriesNet} yFmt={(v) => compact(v)} />
          <p className="text-xs text-gray-600 mt-2">Gebruik <b>Net floor</b> en <b>GTN%</b> om omzet te stabiliseren vs. tenderdruk.</p>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-2">Originator marktaandeel (%)</h3>
          <MultiLineChart name="Share %" series={seriesShare} yFmt={(v) => `${v.toFixed(0)}%`} />
          <p className="text-xs text-gray-600 mt-2">Tender(s) drukken het niveau blijvend; ramp-down maakt de stap geleidelijk.</p>
        </div>

        <div className="rounded-2xl border bg-white p-4 lg:col-span-2">
          <h3 className="text-base font-semibold mb-2">Netto prijs per unit (€)</h3>
          <MultiLineChart name="Net €/unit" series={seriesNetPrice} yFmt={(v) => new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(v)} />
        </div>
      </section>
    </div>
  );
}
