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

/** ================= Types ================= */
type TenderEvent = { month: number; shareLoss: number }; // fractie 0..1

type Inputs = {
  // Simulatie-invoer
  horizon: number;                 // maanden na LOE
  list0: number;                   // list price t=0 (pre-LOE)
  baseUnits: number;               // totale markt-units/maand (pre-LOE)
  gtn: number;                     // GTN% 0..1
  cogs: number;                    // COGS% 0..1 (originator)
  entrants: number;                // # generieke concurrenten
  priceDropPerEntrant: number;     // prijsdruk/entrant (basis-intensiteit)
  timeErosion12m: number;          // extra erosie per 12m (bovenop entrants)
  netFloorOfPre: number;           // floor originator net vs pre-LOE net (0..1)
  elasticity: number;              // volumegevoeligheid (originator penalty) 0..1
  tender1?: TenderEvent;           // tender 1 (blijvend effect)
  rampDownMonths: number;          // maanden naar blijvend tender-niveau (0 = direct)
  // Generieken
  genericNetOfPre: number;         // generiek net €/unit als % van pre-LOE net (0..1)
};

type Point = {
  t: number;
  // prijzen
  list: number;
  netOriginator: number;
  netGeneric: number;
  // shares/units
  shareOriginator: number;
  shareGenerics: number;
  unitsOriginator: number;
  unitsGenerics: number;
  // omzet/marge
  netSalesOriginator: number;
  netSalesGenerics: number;
  netSalesTotal: number;
  cogsOriginator: number;
  ebitdaOriginator: number;
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
  tender1: { month: 6, shareLoss: 0.15 },
  rampDownMonths: 3,
  genericNetOfPre: 0.50,
};

const COLORS = { A: "#0ea5e9", B: "#f59e0b" };

/** ================= Model ================= */
/** Prijs-erosie: s-curve op #entrants + tijdseffect. Saturatie voorkomt absurde dalingen. */
function erosionFrac(t: number, entrants: number, perEntrant: number, overTime12m: number) {
  // S-curve: ~exponentiële benadering richting plateau
  const direct = 1 - Math.exp(-Math.max(0, entrants) * clamp(perEntrant, 0, 1) * 3.5); // 0..~0.95
  const overtime = Math.min((t / 12) * clamp(overTime12m, 0, 1), 0.5);
  return clamp(direct + overtime, 0, 0.98);
}

/** Share-basis: sneller verlies bij meer generieken. */
function shareCurveBase(t: number, entrants: number) {
  if (entrants <= 0) return 1;
  const k = 0.10 + Math.max(0, entrants) * 0.06; // steilere daling bij meer generieken
  return clamp(Math.exp(-k * t), 0.05, 1);
}

/** Tender-effect: blijvende reductie met optionele ramp-down (0 = direct). */
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

/** Hoofdsimulatie */
function simulate(inp: Inputs) {
  const points: Point[] = [];

  // Referenties
  const preNet = Math.max(0, inp.list0) * (1 - clamp(inp.gtn, 0, 0.9));
  const genericNetAbs = preNet * clamp(inp.genericNetOfPre, 0.2, 0.9); // typische generiek ~50% van pre-LOE net

  for (let t = 0; t < Math.max(1, Math.floor(inp.horizon)); t++) {
    // 1) Originator prijs na erosie
    const eros = erosionFrac(t, inp.entrants, inp.priceDropPerEntrant, inp.timeErosion12m);
    const list = Math.max(0, inp.list0) * (1 - eros);
    let netOriginator = list * (1 - clamp(inp.gtn, 0, 0.9));
    netOriginator = Math.max(netOriginator, preNet * clamp(inp.netFloorOfPre, 0, 1)); // net floor vs pre-LOE

    // 2) Share met blijvend tender-effect (geen herstel)
    let share = shareCurveBase(t, inp.entrants);
    share *= tenderMultiplier(t, inp.rampDownMonths, inp.tender1);
    share = clamp(share, 0.05, 1);

    // 3) Elasticiteit: duurdere originator ⇒ lichte volumepenalty (marktvolume blijft gelijk)
    const relative = (netOriginator - genericNetAbs) / (preNet || 1); // vs generieke net
    const elastAdj = 1 - clamp(relative * clamp(inp.elasticity, 0, 1), -0.5, 0.5);

    // Marktvolume constant (bewust): verlies originator vloeit naar generieken
    const totalUnits = Math.max(0, inp.baseUnits);
    const unitsOriginator = Math.max(0, totalUnits * share * elastAdj);
    const unitsGenerics = Math.max(0, totalUnits - unitsOriginator); // rest gaat naar generiek

    // 4) Omzet/marge
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

  // KPI’s
  const sum = (f: (p: Point) => number) => points.reduce((a, p) => a + f(p), 0);
  const y1 = points.slice(0, Math.min(12, points.length));

  const kpis = {
    // Originator
    orgNetY1: sum((p) => p.netSalesOriginator) - sum((p, i) => (i >= 12 ? 0 : 0)), // expliciet voor leesbaarheid
    orgNetTotal: sum((p) => p.netSalesOriginator),
    orgEbitdaTotal: sum((p) => p.ebitdaOriginator),
    orgAvgShareY1: y1.length ? y1.reduce((a, p) => a + p.shareOriginator, 0) / y1.length : 0,
    orgEndShare: points.at(-1)?.shareOriginator ?? 0,
    orgEndNet: points.at(-1)?.netOriginator ?? 0,

    // Generics
    genNetY1: sum((p, i) => (i < 12 ? p.netSalesGenerics : 0)),
    genNetTotal: sum((p) => p.netSalesGenerics),
    genEndShare: points.at(-1)?.shareGenerics ?? 0,
    genNetUnit: points.at(0)?.netGeneric ?? 0,

    // Markt
    mktNetY1: sum((p, i) => (i < 12 ? p.netSalesTotal : 0)),
    mktNetTotal: sum((p) => p.netSalesTotal),
  };

  // Gezondheidschecks
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

/** ================= Kleine UI-componenten ================= */
function FieldNumber({
  label, value, onChange, step = 1, min, max, suffix,
}: {
  label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string;
}) {
  return (
    <label className="text-sm w-full min-w-0">
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
    <label className="text-sm w-full min-w-0">
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
      <div className="text-sm text-gray-500 leading-snug">{title}</div>
      <div className="text-xl font-semibold mt-1 leading-tight">{value}</div>
      {help ? <div className="text-xs text-gray-500 mt-1 leading-snug">{help}</div> : null}
    </div>
  );
}
function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={
        "px-2 py-1 rounded-full text-[11px] border " +
        (ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200")
      }
      title={ok ? "OK" : "Controleer parameters"}
    >
      {label}
    </span>
  );
}

/** ================= Charts (SVG, lib-loos) ================= */
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

/** ================= Page ================= */
export default function LOEPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: "A", name: "Scenario A (Base)", color: COLORS.A, inputs: { ...DEFAULTS } },
    {
      id: "B",
      name: "Scenario B (Meer druk)",
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
  const active = scenarios.find((s) => s.id === activeId)!;
  const activeSim = active.id === "A" ? simA : simB;

  const updateScenario = (id: "A" | "B", fn: (i: Inputs) => Inputs) =>
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, inputs: fn(s.inputs) } : s)));

  const resetActive = () =>
    setScenarios((prev) => prev.map((s) => (s.id === activeId ? { ...s, inputs: { ...DEFAULTS } } : s)));
  const resetBoth = () =>
    setScenarios([
      { id: "A", name: "Scenario A (Base)", color: COLORS.A, inputs: { ...DEFAULTS } },
      {
        id: "B",
        name: "Scenario B (Meer druk)",
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
      "scenario",
      "orgNetY1",
      "orgNetTotal",
      "orgEbitdaTotal",
      "orgAvgShareY1",
      "orgEndShare",
      "orgEndNet",
      "genNetY1",
      "genNetTotal",
      "genEndShare",
      "mktNetY1",
      "mktNetTotal",
    ]);
    [
      { name: sA.name, k: simA.kpis },
      { name: sB.name, k: simB.kpis },
    ].forEach(({ name, k }) =>
      rows.push([
        name,
        Math.round(k.orgNetY1),
        Math.round(k.orgNetTotal),
        Math.round(k.orgEbitdaTotal),
        round(k.orgAvgShareY1, 4),
        round(k.orgEndShare, 4),
        round(k.orgEndNet, 2),
        Math.round(k.genNetY1),
        Math.round(k.genNetTotal),
        round(k.genEndShare, 4),
        Math.round(k.mktNetY1),
        Math.round(k.mktNetTotal),
      ])
    );
    downloadCSV("loe_export.csv", rows);
  };

  // Reeksen
  const seriesNetSales = [
    { name: `${sA.name} – Originator`, color: sA.color, values: simA.points.map((p) => p.netSalesOriginator) },
    { name: `${sA.name} – Generieken`, color: "#10b981", values: simA.points.map((p) => p.netSalesGenerics) },
    { name: `${sB.name} – Originator`, color: sB.color, values: simB.points.map((p) => p.netSalesOriginator) },
    { name: `${sB.name} – Generieken`, color: "#22c55e", values: simB.points.map((p) => p.netSalesGenerics) },
  ];
  const seriesShare = [
    { name: `${sA.name} – Originator`, color: sA.color, values: simA.points.map((p) => p.shareOriginator * 100) },
    { name: `${sA.name} – Generieken`, color: "#10b981", values: simA.points.map((p) => p.shareGenerics * 100) },
    { name: `${sB.name} – Originator`, color: sB.color, values: simB.points.map((p) => p.shareOriginator * 100) },
    { name: `${sB.name} – Generieken`, color: "#22c55e", values: simB.points.map((p) => p.shareGenerics * 100) },
  ];
  const seriesNetPrice = [
    { name: `${sA.name} – Originator`, color: sA.color, values: simA.points.map((p) => p.netOriginator) },
    { name: `${sA.name} – Generiek`, color: "#10b981", values: simA.points.map((p) => p.netGeneric) },
    { name: `${sB.name} – Originator`, color: sB.color, values: simB.points.map((p) => p.netOriginator) },
    { name: `${sB.name} – Generiek`, color: "#22c55e", values: simB.points.map((p) => p.netGeneric) },
  ];

  return (
    <div className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6 py-4 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">Loss of Exclusivity – Originator vs Generieken</h1>
          <p className="text-gray-600 text-sm">
            LOE op t=0. Simuleer prijsdruk door meerdere generieken, blijvend tender-effect en volumeschuif naar generieken.
            Marktvolume blijft constant; verlies originator vloeit naar generiek.
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
      </header>

      {/* Uitleg */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-base font-semibold">Wat modelleert deze pagina?</h2>
        <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
          <li><b>Prijs</b>: list daalt via s-curve op <i># generieken</i> + extra tijdseffect; <b>net originator</b> via GTN en <b>net floor</b>.</li>
          <li><b>Share</b>: basisdaling versnelt bij meer generieken. Tender verlaagt het niveau <b>blijvend</b> (ramp-down optioneel).</li>
          <li><b>Volume</b>: totale markt (units) blijft gelijk; originator-penalty door elasticiteit schuift volume naar generieken.</li>
          <li><b>Generieken</b>: net €/unit = <b>% van pre-LOE net</b> (instelbaar). Toon omzet & share apart.</li>
          <li><b>Vlak-test</b>: zet entrants=0, erosie=0, tender=0, elast=0 ⇒ originator net sales blijft vlak.</li>
        </ul>
      </section>

      {/* Kort naar andere tools */}
      <div className="flex flex-wrap gap-2">
        <Link href="/app/waterfall" className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">Waterfall</Link>
        <Link href="/app/consistency" className="shrink-0 whitespace-nowrap text-sm rounded border px-3 py-2 hover:bg-gray-50">Consistency</Link>
      </div>

      {/* Parameters actief scenario */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3 min-w-0">
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: active.color }} />
            <span className="font-semibold truncate">{active.name}</span>
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button onClick={() => setActiveId("A")} className={`text-xs rounded border px-2 py-1 ${activeId === "A" ? "bg-gray-50" : ""}`}>Scenario A</button>
            <button onClick={() => setActiveId("B")} className={`text-xs rounded border px-2 py-1 ${activeId === "B" ? "bg-gray-50" : ""}`}>Scenario B</button>
          </div>
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
          <FieldPct label="Prijsdruk per entrant" value={active.inputs.priceDropPerEntrant}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, priceDropPerEntrant: clamp(v, 0, 0.4) }))} />
          <FieldPct label="Extra erosie / 12m" value={active.inputs.timeErosion12m}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, timeErosion12m: clamp(v, 0, 0.5) }))} />
          <FieldPct label="Net floor (vs pre-LOE net)" value={active.inputs.netFloorOfPre}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, netFloorOfPre: clamp(v, 0.2, 1) }))} />

          <FieldNumber label="Tender – maand" value={active.inputs.tender1?.month ?? 6} min={0} step={1}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, tender1: { month: Math.max(0, Math.round(v)), shareLoss: i.tender1?.shareLoss ?? 0.15 } }))} />
          <FieldPct label="Tender – share verlies" value={active.inputs.tender1?.shareLoss ?? 0}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, tender1: { month: i.tender1?.month ?? 6, shareLoss: clamp(v, 0, 0.8) } }))} />
          <FieldNumber label="Ramp-down (maanden)" value={active.inputs.rampDownMonths} min={0} step={1}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, rampDownMonths: Math.max(0, Math.round(v)) }))} />

          <FieldPct label="Generiek net % vs pre-LOE net" value={active.inputs.genericNetOfPre}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, genericNetOfPre: clamp(v, 0.2, 0.9) }))} />
          <FieldPct label="Elasticiteit (originator penalty)" value={active.inputs.elasticity}
            onChange={(v) => updateScenario(active.id, (i) => ({ ...i, elasticity: clamp(v, 0, 1) }))} />
        </div>

        {/* Health/consistency strip */}
        <div className="mt-3 text-xs">
          <div className="inline-flex flex-wrap gap-2">
            <Badge ok={activeSim.health.horizonOK} label="Horizon 12–72" />
            <Badge ok={activeSim.health.tenderOK} label="Tender-instellingen OK" />
            <Badge ok={activeSim.health.pctBandsOK} label="Parameters in band" />
            <Badge ok={activeSim.health.mathOK} label="Berekening OK" />
          </div>
          <div className="text-gray-500 mt-1">
            Pre-LOE net (originator): {eur(activeSim.preNet, 0)} • Generiek net (aanname): {eur(activeSim.genericNetAbs, 0)}
          </div>
        </div>
      </section>

      {/* KPI’s per scenario */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold mb-3">KPI’s — Originator, Generieken en Markt</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {[{ sc: sA, sim: simA }, { sc: sB, sim: simB }].map(({ sc, sim }) => (
            <div key={sc.id} className="rounded-2xl border p-4">
              <div className="flex items-center gap-2 mb-2 min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sc.color }} />
                <div className="font-semibold truncate">{sc.name}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Kpi title="Originator — Net Y1" value={eur(sim.kpis.orgNetY1)} help={`Ø share Y1: ${pctS(sim.kpis.orgAvgShareY1, 1)}`} />
                <Kpi title="Originator — EBITDA (Horizon)" value={eur(sim.kpis.orgEbitdaTotal)} help={`Eind-share: ${pctS(sim.kpis.orgEndShare, 1)}`} />
                <Kpi title="Generieken — Net Y1" value={eur(sim.kpis.genNetY1)} help={`Eind-share: ${pctS(sim.kpis.genEndShare, 1)}`} />
                <Kpi title="Markt — Net (Horizon)" value={eur(sim.kpis.mktNetTotal)} help={`Originator eind-net: ${eur(sim.kpis.orgEndNet, 0)}`} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Grafieken */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-2">Net sales per maand — Originator vs Generieken</h3>
          <MultiLineChart
            name="Net sales"
            series={seriesNetSales}
            yFmt={(v) => compact(v)}
          />
          <p className="text-xs text-gray-600 mt-2">
            Na LOE schuift volume zichtbaar naar generieken; tender verlaagt originator blijvend (ramp-down bepaalt tempo).
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-2">Marktaandeel (%) — Originator vs Generieken</h3>
          <MultiLineChart
            name="Share %"
            series={seriesShare}
            yFmt={(v) => `${v.toFixed(0)}%`}
          />
          <p className="text-xs text-gray-600 mt-2">Meer generieken ⇒ snellere share-daling. Tender zet een nieuw, lager niveau (geen herstel).</p>
        </div>

        <div className="rounded-2xl border bg-white p-4 lg:col-span-2">
          <h3 className="text-base font-semibold mb-2">Netto prijs per unit (€) — Originator vs Generiek</h3>
          <MultiLineChart
            name="Net €/unit"
            series={seriesNetPrice}
            yFmt={(v) => new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(v)}
          />
          <p className="text-xs text-gray-600 mt-2">
            Generiek net wordt gemodelleerd als % van pre-LOE net (instelbaar). Originator heeft floor t.o.v. pre-LOE net.
          </p>
        </div>
      </section>
    </div>
  );
}
