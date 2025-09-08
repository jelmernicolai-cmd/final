"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/** ================= Helpers ================= */
const eur = (n: number, d = 0) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: d })
    .format(Number.isFinite(n) ? n : 0);

const compact = (n: number) =>
  new Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 1 })
    .format(Number.isFinite(n) ? n : 0);

const pctS = (p: number, d = 0) => `${((Number.isFinite(p) ? p : 0) * 100).toFixed(d)}%`;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const round = (n: number, d = 0) => Math.round((Number.isFinite(n) ? n : 0) * 10 ** d) / 10 ** d;

/** ================= Responsive hook ================= */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    onChange();
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, [query]);
  return matches;
}
const useIsMobile = () => useMediaQuery("(max-width: 640px)");

/** ================= Types ================= */
type TenderEvent = { month: number; shareLoss: number }; // 0..1
type Inputs = {
  horizon: number;
  list0: number;
  baseUnits: number;
  gtn: number;          // 0..1
  cogs: number;         // 0..1
  entrants: number;
  priceDropPerEntrant: number; // 0..1
  timeErosion12m: number;      // 0..1
  netFloorOfPre: number;       // 0..1
  elasticity: number;          // 0..1
  rampDownMonths: number;      // 0 = direct
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
  rampDownMonths: 0,
  tender1: { month: 6, shareLoss: 0.15 },
  tender2: undefined,
};
const COLORS = { A: "#0ea5e9", B: "#f59e0b" };

/** ================= Model ================= */
function erosionFrac(t: number, entrants: number, perEntrant: number, overTime12m: number) {
  const direct = Math.min(Math.max(0, entrants) * clamp(perEntrant, 0, 1), 0.95);
  const overtime = Math.min((t / 12) * clamp(overTime12m, 0, 1), 0.5);
  return clamp(direct + overtime, 0, 0.98);
}
function shareCurveBase(t: number, entrants: number) {
  if (entrants <= 0) return 1;
  const k = 0.10 + Math.max(0, entrants) * 0.05;
  return clamp(Math.exp(-k * t), 0.05, 1);
}
function tenderMultiplier(t: number, rampDownMonths: number, events: (TenderEvent | undefined)[]) {
  const perEvent = (ev?: TenderEvent) => {
    if (!ev || ev.shareLoss <= 0) return 1;
    const m0 = Math.max(0, Math.floor(ev.month));
    const loss = clamp(ev.shareLoss, 0, 0.95);
    const floor = 1 - loss;
    if (t < m0) return 1;
    const r = Math.max(0, Math.floor(rampDownMonths));
    if (r <= 0) return floor;
    const end = m0 + r;
    if (t >= end) return floor;
    const frac = (t - m0) / r; // 0..1
    return 1 - loss * clamp(frac, 0, 1);
  };
  return clamp(perEvent(events[0]) * perEvent(events[1]), 0.05, 1);
}
function simulate(inp: Inputs) {
  const points: Point[] = [];
  const preNet = Math.max(0, inp.list0) * (1 - clamp(inp.gtn, 0, 0.9));

  for (let t = 0; t < Math.max(1, Math.floor(inp.horizon)); t++) {
    const eros = erosionFrac(t, inp.entrants, inp.priceDropPerEntrant, inp.timeErosion12m);
    const list = Math.max(0, inp.list0) * (1 - eros);
    let net = list * (1 - clamp(inp.gtn, 0, 0.9));
    net = Math.max(net, preNet * clamp(inp.netFloorOfPre, 0, 1));

    let share = shareCurveBase(t, inp.entrants);
    share *= tenderMultiplier(t, inp.rampDownMonths, [inp.tender1, inp.tender2]);
    share = clamp(share, 0.05, 1);

    const relative = (net - preNet * 0.5) / (preNet || 1);
    const elastAdj = 1 - clamp(relative * clamp(inp.elasticity, 0, 1), -0.5, 0.5);

    const units = Math.max(0, inp.baseUnits * share * elastAdj);
    const netSales = net * units;
    const cogsEur = netSales * clamp(inp.cogs, 0, 0.95);
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
    volLossY1: y1.length ? 1 - sum(y1, (p) => p.units) / (inp.baseUnits * y1.length || 1) : 0,
    gtnLeakY1: grossY1 > 0 ? 1 - netY1 / grossY1 : 0,
  };

  const health = {
    horizonOK: Number.isFinite(inp.horizon) && inp.horizon >= 12 && inp.horizon <= 72,
    tenderOrderOK:
      (inp.tender1 ? inp.tender1.month >= 0 : true) &&
      (inp.tender2 ? inp.tender2.month >= 0 : true) &&
      (inp.tender1 && inp.tender2 ? inp.tender2.month >= inp.tender1.month : true),
    pctBandsOK:
      clamp(inp.gtn, 0, 1) <= 0.8 &&
      clamp(inp.cogs, 0, 1) <= 0.9 &&
      clamp(inp.priceDropPerEntrant, 0, 1) <= 0.4 &&
      clamp(inp.timeErosion12m, 0, 1) <= 0.5,
    mathOK: Number.isFinite(netY1) && Number.isFinite(kpis.netTotal) && Number.isFinite(kpis.ebitdaTotal),
  };

  return { points, kpis, preNet, health };
}

/** ================= Small UI ================= */
function FieldNumber({
  label, value, onChange, step = 1, min, max, suffix,
}: {
  label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string;
}) {
  return (
    <label className="text-base sm:text-sm w-full min-w-0">
      <div className="font-medium">{label}</div>
      <div className="mt-1 flex items-center gap-3">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          inputMode="decimal"
          className="w-full rounded-lg border px-4 py-3 sm:px-3 sm:py-2"
        />
        {suffix ? <span className="text-gray-500">{suffix}</span> : null}
      </div>
    </label>
  );
}
function FieldPct({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="text-base sm:text-sm w-full min-w-0">
      <div className="font-medium">{label}</div>
      <div className="mt-2 sm:mt-1 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-40 sm:w-40"
        />
        <input
          type="number"
          step={0.01}
          min={0}
          max={1}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          inputMode="decimal"
          className="w-28 rounded-lg border px-4 py-3 sm:px-3 sm:py-2"
        />
        <span className="text-gray-500">{pctS(value)}</span>
      </div>
    </label>
  );
}
function Kpi({ title, value, help }: { title: string; value: string; help?: string }) {
  return (
    <div className="w-full min-w-0 rounded-2xl border bg-white p-4">
      <div className="text-sm sm:text-xs text-gray-500 leading-snug break-words">{title}</div>
      <div className="text-2xl sm:text-xl font-semibold mt-1 leading-tight break-words">{value}</div>
      {help ? <div className="text-xs text-gray-500 mt-1 leading-snug break-words">{help}</div> : null}
    </div>
  );
}
function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={
        "px-2 py-1 rounded-full text-[12px] sm:text-[11px] border " +
        (ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200")
      }
      title={ok ? "OK" : "Controleer parameter/bandbreedte"}
    >
      {label}
    </span>
  );
}

/** ================= Charts (SVG, responsive) ================= */
function MultiLineChart({
  name, series, yFmt = (v: number) => v.toFixed(0), height,
}: {
  name: string;
  series: { name: string; color: string; values: number[] }[];
  yFmt?: (v: number) => string;
  height?: number; // we zetten deze per device
}) {
  const w = 960;
  const h = height ?? 260;
  const padX = 46, padY = 28;
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

/** ================= Export ================= */
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

/** ================= Page ================= */
export default function LOEPageMobileFirst() {
  const isMobile = useIsMobile();

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

  const updateScenario = (id: "A" | "B", fn: (i: Inputs) => Inputs) =>
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, inputs: fn(s.inputs) } : s)));

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
      rows.push([
        name,
        Math.round(k.netY1),
        Math.round(k.netTotal),
        Math.round(k.ebitdaTotal),
        round(k.avgShareY1, 4),
        round(k.endShare, 4),
        round(k.endNet, 2),
      ])
    );
    downloadCSV("loe_export.csv", rows);
  };

  const seriesNet = [
    { name: sA.name, color: sA.color, values: simA.points.map((p) => p.netSales) },
    { name: sB.name, color: sB.color, values: simB.points.map((p) => p.netSales) },
  ];
  const seriesShare = [
    { name: sA.name, color: sA.color, values: simA.points.map((p) => p.share * 100) },
    { name: sB.name, color: sB.color, values: simB.points.map((p) => p.share * 100) },
  ];
  const seriesNetPrice = [
    { name: sA.name, color: sA.color, values: simA.points.map((p) => p.net) },
    { name: sB.name, color: sB.color, values: simB.points.map((p) => p.net) },
  ];

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-xl font-semibold truncate">Loss of Exclusivity – Scenario Planner</h1>
          <p className="text-gray-600 text-base sm:text-sm">
            Mobile-first. Vergelijk scenario’s, exporteer CSV en controleer consistentie.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCSV} className="shrink-0 whitespace-nowrap text-base sm:text-sm rounded-lg border px-4 py-3 sm:px-3 sm:py-2 hover:bg-gray-50">Export CSV</button>
          <button onClick={() => setActiveId(activeId === "A" ? "B" : "A")} className="shrink-0 whitespace-nowrap text-base sm:text-sm rounded-lg border px-4 py-3 sm:px-3 sm:py-2 hover:bg-gray-50">
            Bewerk: {activeId === "A" ? "Scenario B" : "Scenario A"}
          </button>
          <button onClick={resetActive} className="shrink-0 whitespace-nowrap text-base sm:text-sm rounded-lg border px-4 py-3 sm:px-3 sm:py-2 hover:bg-gray-50">Reset actief</button>
          <button onClick={resetBoth} className="shrink-0 whitespace-nowrap text-base sm:text-sm rounded-lg border px-4 py-3 sm:px-3 sm:py-2 hover:bg-gray-50">Reset beide</button>
        </div>
      </header>

      {/* Uitleg */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg sm:text-base font-semibold">Hoe rekent het model</h2>
        <ul className="mt-2 text-base sm:text-sm text-gray-700 list-disc pl-5 space-y-1">
          <li><b>Prijs</b>: list daalt door <i>entrants</i> + <i>tijd</i>; <b>net</b> via GTN met <b>net floor</b> (vs pre-LOE net).</li>
          <li><b>Share</b>: basiscurve; tender(s) drukken het niveau <b>blijvend</b>. Met <b>rampDownMonths</b> loopt de stap geleidelijk in.</li>
          <li><b>Volume</b> = baseline × share × elasticiteit (duurdere originator ⇒ minder volume).</li>
          <li><b>Vlak-test</b>: zet alle druk op 0 (entrants/time-erosie/tenders/elast) ⇒ sales blijft vlak.</li>
        </ul>
      </section>

      {/* Quick nav */}
      <div className="flex flex-wrap gap-2">
        <Link href="/app/waterfall" className="shrink-0 whitespace-nowrap text-base sm:text-sm rounded-lg border px-4 py-3 sm:px-3 sm:py-2 hover:bg-gray-50">Waterfall</Link>
        <Link href="/app/consistency" className="shrink-0 whitespace-nowrap text-base sm:text-sm rounded-lg border px-4 py-3 sm:px-3 sm:py-2 hover:bg-gray-50">Consistency</Link>
      </div>

      {/* Parameters actief scenario — op mobiel inklapbaar */}
      <section className="rounded-2xl border bg-white p-2 sm:p-4">
        <details open={!isMobile} className="group">
          <summary className="cursor-pointer list-none p-3 sm:p-0 flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: active.color }} />
              <span className="font-semibold text-lg sm:text-base">{active.name}</span>
            </span>
            <span className="text-sm text-gray-600 group-open:hidden">Toon</span>
            <span className="text-sm text-gray-600 hidden group-open:inline">Verberg</span>
          </summary>

          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FieldNumber label="Horizon (maanden)" value={active.inputs.horizon} min={12} max={72} step={6}
              onChange={(v) => updateScenario(active.id, (i) => ({ ...i, horizon: Math.round(v) }))} />
            <FieldNumber label="List price t=0 (€)" value={active.inputs.list0} min={1} step={5}
              onChange={(v) => updateScenario(active.id, (i) => ({ ...i, list0: v }))} />
            <FieldNumber label="Units/maand (pre-LOE)" value={active.inputs.baseUnits} min={100} step={500}
              onChange={(v) => updateScenario(active.id, (i) => ({ ...i, baseUnits: v }))} />

            <FieldPct label="GTN %" value={active.inputs.gtn}
              onChange={(v) => updateScenario(active.id, (i) => ({ ...i, gtn: clamp(v, 0, 0.8) }))} />
            <FieldPct label="COGS %" value={active.inputs.cogs}
              onChange={(v) => updateScenario(active.id, (i) => ({ ...i, cogs: clamp(v, 0, 0.9) }))} />

            <FieldNumber label="# entrants" value={active.inputs.entrants} min={0} max={8} step={1}
              onChange={(v) => updateScenario(active.id, (i) => ({ ...i, entrants: Math.round(clamp(v, 0, 8)) }))} />
            <FieldPct label="Prijsdruk per entrant" value={active.inputs.priceDropPerEntrant}
              onChange={(v) => updateScenario(active.id, (i) => ({ ...i, priceDropPerEntrant: clamp(v, 0, 0.4) }))} />
            <FieldPct label="Extra erosie per 12m" value={active.inputs.timeErosion12m}
              onChange={(v) => updateScenario(active.id, (i) => ({ ...i, timeErosion12m: clamp(v, 0, 0.5) }))} />
            <FieldPct label="Net price floor (vs pre-LOE net)" value={active.inputs.netFloorOfPre}
              onChange={(v) => updateScenario(active.id, (i) => ({ ...i, netFloorOfPre: clamp(v, 0.2, 1) }))} />

            <FieldNumber label="Tender 1 – maand" value={active.inputs.tender1?.month ?? 6} min={0} step={1}
              onChange={(v) => updateScenario(active.id, (i) => ({ ...i, tender1: { month: Math.max(0, Math.round(v)), shareLoss: i.tender1?.shareLoss ?? 0.15 } }))} />
            <FieldPct label="Tender 1 – share verlies" value={active.inputs.tender1?.shareLoss ?? 0}
              onChange={(v) => updateScenario(active.id, (i) => ({ ...i, tender1: { month: i.tender1?.month ?? 6, shareLoss: clamp(v, 0, 0.8) } }))} />
            <FieldNumber label="Ramp-down (maanden)" value={active.inputs.rampDownMonths} min={0} step={1}
              onChange={(v) => updateScenario(active.id, (i) => ({ ...i, rampDownMonths: Math.max(0, Math.round(v)) }))} />

            <FieldNumber label="Tender 2 – maand (opt.)" value={active.inputs.tender2?.month ?? 18} min={0} step={1}
              onChange={(v) => updateScenario(active.id, (i) => ({ ...i, tender2: { month: Math.max(0, Math.round(v)), shareLoss: i.tender2?.shareLoss ?? 0.1 } }))} />
            <FieldPct label="Tender 2 – share verlies (opt.)" value={active.inputs.tender2?.shareLoss ?? 0}
              onChange={(v) => updateScenario(active.id, (i) => ({ ...i, tender2: { month: i.tender2?.month ?? 18, shareLoss: clamp(v, 0, 0.8) } }))} />
            <FieldPct label="Elasticiteit" value={active.inputs.elasticity}
              onChange={(v) => updateScenario(active.id, (i) => ({ ...i, elasticity: clamp(v, 0, 1) }))} />
          </div>

          {/* Health/consistency strip */}
          <div className="mt-4 text-sm sm:text-xs">
            <div className="inline-flex flex-wrap gap-2">
              <Badge ok={activeSim.health.horizonOK} label="Horizon 12–72" />
              <Badge ok={activeSim.health.tenderOrderOK} label="Tender volgorde OK" />
              <Badge ok={activeSim.health.pctBandsOK} label="Parameters in band" />
              <Badge ok={activeSim.health.mathOK} label="Berekening OK" />
            </div>
            <div className="text-gray-500 mt-2">Pre-LOE net (floor referentie): {eur(activeSim.preNet, 0)}.</div>
          </div>
        </details>
      </section>

      {/* KPI’s — responsive tegels */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-lg sm:text-base font-semibold mb-3">KPI’s per scenario</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {[{ sc: sA, sim: simA }, { sc: sB, sim: simB }].map(({ sc, sim }) => (
            <div key={sc.id} className="rounded-2xl border p-4">
              <div className="flex items-center gap-2 mb-2 min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sc.color }} />
                <div className="font-semibold truncate">{sc.name}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Kpi title="Net sales – Y1" value={eur(sim.kpis.netY1)} />
                <Kpi title="Net sales – Horizon" value={eur(sim.kpis.netTotal)} />
                <Kpi title="EBITDA – Horizon" value={eur(sim.kpis.ebitdaTotal)} />
                <Kpi title="Eind-netto prijs" value={eur(sim.kpis.endNet, 0)} help={`Eind-share: ${pctS(sim.kpis.endShare, 1)}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Vergelijking: op mobiel cards, op ≥sm tabel */}
        {isMobile ? (
          <div className="mt-4 grid gap-3">
            {[{ sc: sA, sim: simA }, { sc: sB, sim: simB }].map(({ sc, sim }) => {
              const dNetY1 = sim.kpis.netY1 - simA.kpis.netY1;
              return (
                <div key={sc.id} className="rounded-2xl border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: sc.color }} />
                    <div className="font-semibold">{sc.name}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">Net Y1</div><div className="font-medium">{eur(sim.kpis.netY1)}</div>
                    <div className="text-gray-500">Ø Share Y1</div><div className="font-medium">{pctS(sim.kpis.avgShareY1, 1)}</div>
                    <div className="text-gray-500">Eind-share</div><div className="font-medium">{pctS(sim.kpis.endShare, 1)}</div>
                    <div className="text-gray-500">Δ vs A</div>
                    <div className={`font-medium ${dNetY1 >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {dNetY1 >= 0 ? "↑" : "↓"} {eur(Math.abs(dNetY1))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
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
                  const dNetY1 = sim.kpis.netY1 - simA.kpis.netY1;
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
        )}
      </section>

      {/* Grafieken – hoger op mobiel voor leesbaarheid */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-lg sm:text-base font-semibold mb-2">Net sales per maand</h3>
          <MultiLineChart name="Net sales" series={seriesNet} yFmt={(v) => compact(v)} height={isMobile ? 320 : 260} />
          <p className="text-sm sm:text-xs text-gray-600 mt-2">Gebruik <b>Net floor</b> en <b>GTN%</b> om omzet te stabiliseren t.o.v. tenderdruk.</p>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-lg sm:text-base font-semibold mb-2">Originator marktaandeel (%)</h3>
          <MultiLineChart name="Share %" series={seriesShare} yFmt={(v) => `${v.toFixed(0)}%`} height={isMobile ? 320 : 260} />
          <p className="text-sm sm:text-xs text-gray-600 mt-2">Tender(s) drukken het niveau blijvend; ramp-down maakt de stap geleidelijk.</p>
        </div>

        <div className="rounded-2xl border bg-white p-4 lg:col-span-2">
          <h3 className="text-lg sm:text-base font-semibold mb-2">Netto prijs per unit (€)</h3>
          <MultiLineChart
            name="Net €/unit"
            series={seriesNetPrice}
            yFmt={(v) => new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(v)}
            height={isMobile ? 340 : 260}
          />
        </div>
      </section>
    </div>
  );
}
