"use client";

import { useMemo, useState } from "react";

/** ===== Helpers ===== */
const eur = (n: number, d = 0) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: d }).format(
    Number.isFinite(n) ? n : 0
  );
const pctS = (p: number, d = 0) => `${((Number.isFinite(p) ? p : 0) * 100).toFixed(d)}%`;
const compact = (n: number) =>
  new Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 1 }).format(
    Number.isFinite(n) ? n : 0
  );
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** ===== Types ===== */
type Inputs = {
  horizon: number;             // maanden
  listNL: number;              // List price NL €/unit
  gtnFront: number;            // Front-end % (fees/discounts)
  bonusOnReal: number;         // Bonus op realisatie %
  netFloorVsPre: number;       // Floor vs pre-net (IRP comfort)
  baseUnitsNL: number;         // NL markt-units/maand (constant)
  cogs: number;                // COGS %
  logisticsPerUnit: number;    // Logistiek/marge PI €/unit (NL zijde)
  arbitrageThreshold: number;  // Drempel €/unit
  availabilityCap: number;     // Max PI share
  shareElasticity: number;     // PI gevoeligheid vs gap
  rampMonths: number;          // Ramp-in naar cap
  // EU referentie (afgeleid uit EU-tabel, maar fallback nodig)
  euRefFallback: number;       // fallback min landprijs als EU-ref
};

type Point = {
  t: number;
  netOriginator: number;
  netEffectiveBuyer: number;
  sharePI: number;
  shareOriginator: number;
  unitsPI: number;
  unitsOriginator: number;
  netSalesPI: number;
  netSalesOriginator: number;
  ebitdaOriginator: number;
};

type Scenario = {
  id: "A" | "B";
  name: string;
  color: string;
  inputs: Inputs;
};

type EUCountryRow = {
  id: string;
  country: string;
  exFactory: number;
  currency: "EUR" | "PLN" | "CZK" | "HUF" | "GBP" | "DKK";
  fxToEUR: number; // 1 currency = fxToEUR EUR
  logistics: number; // extra logistiek/handling naar NL in EUR/unit
  buffer: number;    // risico-/wastagebuffer in EUR/unit
  capShare: number;  // max aandeel dat uit dit land te halen is (0..1) — info, niet in sim gebruikt
};

/** ===== Defaults ===== */
const DEFAULTS: Inputs = {
  horizon: 24,
  listNL: 100,
  gtnFront: 0.18,
  bonusOnReal: 0.06,
  netFloorVsPre: 0.85,
  baseUnitsNL: 9000,
  cogs: 0.20,
  logisticsPerUnit: 4,
  arbitrageThreshold: 2,
  availabilityCap: 0.35,
  shareElasticity: 0.055,
  rampMonths: 3,
  euRefFallback: 65,
};

const MORE_PRESSURE: Partial<Inputs> = {
  availabilityCap: 0.45,
  shareElasticity: 0.07,
  arbitrageThreshold: 1.5,
};

const COLORS = { A: "#0ea5e9", B: "#f59e0b", PI_A: "#22c55e", PI_B: "#16a34a" };

const EU_DEFAULT: EUCountryRow[] = [
  { id: "pl", country: "Polen",      exFactory: 240,   currency: "PLN", fxToEUR: 0.23,  logistics: 3.5, buffer: 1.0, capShare: 0.12 },
  { id: "cz", country: "Tsjechië",   exFactory: 760,   currency: "CZK", fxToEUR: 0.041, logistics: 3.5, buffer: 1.0, capShare: 0.08 },
  { id: "hu", country: "Hongarije",  exFactory: 24000, currency: "HUF", fxToEUR: 0.0026,logistics: 4.0, buffer: 1.0, capShare: 0.10 },
  { id: "dk", country: "Denemarken", exFactory: 85,    currency: "EUR", fxToEUR: 1,     logistics: 2.5, buffer: 0.8, capShare: 0.06 },
  { id: "uk", country: "VK",         exFactory: 72,    currency: "GBP", fxToEUR: 1.17,  logistics: 4.5, buffer: 1.2, capShare: 0.10 },
  { id: "es", country: "Spanje",     exFactory: 68,    currency: "EUR", fxToEUR: 1,     logistics: 3.0, buffer: 0.8, capShare: 0.10 },
];

/** ===== Simulation ===== */
/**
 * - netOriginator = list * (1 - gtnFront), met floor vs pre
 * - netEffectiveBuyer = netOriginator * (1 - bonusOnReal)
 * - euRefNet (min landed EU) = min( (exFactory*fx)+logistics(buffer)+NL-logistics ) over landen
 * - gap = netEffectiveBuyer - (euRefNet)
 * - sharePI = min(availabilityCap, max(0, (gap - threshold)*elasticity)) * ramp-in
 */
function simulate(inp: Inputs, euRows: EUCountryRow[]) {
  const points: Point[] = [];

  const preNet = inp.listNL * (1 - inp.gtnFront);

  // Bepaal referentie op basis van landen (landed naar NL)
  const euLandedPrices = euRows.map((r) => r.exFactory * r.fxToEUR + r.logistics + r.buffer);
  const euRefNet = euLandedPrices.length
    ? Math.min(...euLandedPrices)
    : inp.euRefFallback;

  for (let t = 0; t < inp.horizon; t++) {
    let netOriginator = inp.listNL * (1 - inp.gtnFront);
    netOriginator = Math.max(netOriginator, preNet * inp.netFloorVsPre);

    const netEffectiveBuyer = netOriginator * (1 - inp.bonusOnReal);

    const gap = netEffectiveBuyer - euRefNet;
    let sharePI = 0;
    if (gap > inp.arbitrageThreshold) {
      sharePI = Math.max(0, (gap - inp.arbitrageThreshold) * inp.shareElasticity);
      sharePI = Math.min(inp.availabilityCap, sharePI);
      const ramp = Math.min(1, inp.rampMonths > 0 ? t / inp.rampMonths : 1);
      sharePI *= ramp;
    }

    const shareOriginator = 1 - sharePI;
    const unitsOriginator = inp.baseUnitsNL * shareOriginator;
    const unitsPI = inp.baseUnitsNL * sharePI;

    const netSalesOriginator = unitsOriginator * netOriginator;
    const netSalesPI = unitsPI * euRefNet; // omzet die richting PI wegvloeit tegen EU-ref

    const ebitdaOriginator = netSalesOriginator * (1 - inp.cogs);

    points.push({
      t,
      netOriginator,
      netEffectiveBuyer,
      sharePI,
      shareOriginator,
      unitsPI,
      unitsOriginator,
      netSalesPI,
      netSalesOriginator,
      ebitdaOriginator,
    });
  }

  const y1 = points.slice(0, 12);
  const sum = (f: (p: Point) => number) => points.reduce((a, p) => a + f(p), 0);

  return {
    points,
    kpis: {
      piShareY1: y1.length ? y1.reduce((a, p) => a + p.sharePI, 0) / y1.length : 0,
      piNetY1: y1.reduce((a, p) => a + p.netSalesPI, 0),
      piNetTotal: sum((p) => p.netSalesPI),
      orgNetY1: y1.reduce((a, p) => a + p.netSalesOriginator, 0),
      orgNetTotal: sum((p) => p.netSalesOriginator),
      orgEbitdaTotal: sum((p) => p.ebitdaOriginator),
      endPIshare: points.at(-1)?.sharePI ?? 0,
      endNetOriginator: points.at(-1)?.netOriginator ?? 0,
      euRefNet,
      netEffectiveBuyerEnd: points.at(-1)?.netEffectiveBuyer ?? 0,
    },
  };
}

/** ===== UI Primitives ===== */
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
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-36 sm:w-40"
        />
        <input
          type="number"
          step={0.01}
          min={0}
          max={1}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-24 rounded-lg border px-3 py-2"
        />
        <span className="text-gray-500">{pctS(value)}</span>
      </div>
    </label>
  );
}

function Kpi({ title, value, help }: { title: string; value: string; help?: string }) {
  return (
    <div className="w-full min-w-0 rounded-2xl border bg-white p-3 sm:p-4">
      <div className="text-[12px] text-gray-500 leading-snug break-words">{title}</div>
      <div className="text-lg sm:text-xl font-semibold mt-1 leading-tight break-words">{value}</div>
      {help ? <div className="text-[11px] sm:text-xs text-gray-500 mt-1 leading-snug break-words">{help}</div> : null}
    </div>
  );
}

/** ===== Charts (SVG) ===== */
function MultiLineChart({
  series,
  yFmt,
  height = 240,
  name = "",
}: {
  series: { name: string; color: string; values: number[] }[];
  yFmt: (v: number) => string;
  height?: number;
  name?: string;
}) {
  const w = 960;
  const h = height;
  const padX = 46;
  const padY = 28;
  const maxLen = Math.max(1, ...series.map((s) => s.values.length));
  const all = series.flatMap((s) => s.values);
  const maxY = Math.max(1, ...all);
  const minY = 0;
  const x = (i: number) => padX + (i / Math.max(1, maxLen - 1)) * (w - 2 * padX);
  const y = (v: number) => h - padY - ((v - minY) / (maxY - minY)) * (h - 2 * padY);
  const ticks = Array.from({ length: 5 }, (_, i) => (maxY / 4) * i);

  return (
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
  );
}

/** ===== Page ===== */
export default function ParallelPage() {
  // Scenario state (interactief)
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: "A", name: "Scenario A (basis)", color: COLORS.A, inputs: { ...DEFAULTS } },
    { id: "B", name: "Scenario B (meer PI-druk)", color: COLORS.B, inputs: { ...DEFAULTS, ...MORE_PRESSURE } },
  ]);
  const [activeId, setActiveId] = useState<"A" | "B">("A");
  const active = scenarios.find((s) => s.id === activeId)!;

  // EU tabel (interactief)
  const [euRows, setEuRows] = useState<EUCountryRow[]>(EU_DEFAULT);

  // Simulaties (live herrekenen bij wijzigingen)
  const simA = useMemo(() => simulate(scenarios[0].inputs, euRows), [scenarios[0].inputs, euRows]);
  const simB = useMemo(() => simulate(scenarios[1].inputs, euRows), [scenarios[1].inputs, euRows]);
  const activeSim = activeId === "A" ? simA : simB;

  const updateActive = (fn: (i: Inputs) => Inputs) =>
    setScenarios((prev) => prev.map((s) => (s.id === activeId ? { ...s, inputs: fn(s.inputs) } : s)));

  const resetActive = () => setScenarios((prev) => prev.map((s) => (s.id === activeId ? {
    ...s,
    inputs: s.id === "A" ? { ...DEFAULTS } : { ...DEFAULTS, ...MORE_PRESSURE },
  } : s)));

  const resetBoth = () =>
    setScenarios([
      { id: "A", name: "Scenario A (basis)", color: COLORS.A, inputs: { ...DEFAULTS } },
      { id: "B", name: "Scenario B (meer PI-druk)", color: COLORS.B, inputs: { ...DEFAULTS, ...MORE_PRESSURE } },
    ]);

  // EU-helpers
  const addCountry = () =>
    setEuRows((r) => [
      ...r,
      {
        id: `c${Date.now()}`,
        country: "Nieuw land",
        exFactory: 50,
        currency: "EUR",
        fxToEUR: 1,
        logistics: 3,
        buffer: 1,
        capShare: 0.05,
      },
    ]);
  const removeCountry = (id: string) => setEuRows((r) => r.filter((x) => x.id !== id));
  const updateCountry = (id: string, patch: Partial<EUCountryRow>) =>
    setEuRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  // Reeksen
  const seriesNet = [
    { name: "Originator A", color: COLORS.A, values: simA.points.map((p) => p.netSalesOriginator) },
    { name: "PI A", color: COLORS.PI_A, values: simA.points.map((p) => p.netSalesPI) },
    { name: "Originator B", color: COLORS.B, values: simB.points.map((p) => p.netSalesOriginator) },
    { name: "PI B", color: COLORS.PI_B, values: simB.points.map((p) => p.netSalesPI) },
  ];
  const seriesShare = [
    { name: "PI A", color: COLORS.PI_A, values: simA.points.map((p) => p.sharePI * 100) },
    { name: "PI B", color: COLORS.PI_B, values: simB.points.map((p) => p.sharePI * 100) },
  ];

  return (
    <div className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6 py-4 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">Parallelimport — Analyse & Scenario’s</h1>
          <p className="text-gray-600 text-sm">
            Meet de druk van parallelimport op de Nederlandse markt en test of je <b>kortingsmix</b> (front vs bonus) volumes kan terugwinnen
            <span className="hidden sm:inline"> — zonder je listprijs te wijzigen (IRP-vriendelijk).</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveId(activeId === "A" ? "B" : "A")} className="text-sm rounded border px-3 py-2 hover:bg-gray-50">
            Bewerk: {activeId === "A" ? "Scenario B" : "Scenario A"}
          </button>
          <button onClick={resetActive} className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Reset actief</button>
          <button onClick={resetBoth} className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Reset beide</button>
        </div>
      </header>

      {/* Scenario selector / legend */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.A }} />
            A = basis
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.B }} />
            B = meer PI-druk
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.PI_A }} />
            Groen = omzet/ aandeel PI
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          <b>Interpretatie:</b> Als de <i>effectieve NL netprijs</i> (front+bonus) substantieel hoger ligt dan de <i>EU landed PI-prijs</i>,
          stijgt het PI-aandeel richting de ingestelde cap. Met bonus op realisatie kun je netto verlagen zonder list te raken.
        </p>
      </section>

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
          <FieldNumber label="Horizon (maanden)" value={active.inputs.horizon} min={6} max={60} step={6}
            onChange={(v) => updateActive((i) => ({ ...i, horizon: Math.round(clamp(v, 6, 60)) }))} />
          <FieldNumber label="List price NL (€)" value={active.inputs.listNL} min={1} step={1}
            onChange={(v) => updateActive((i) => ({ ...i, listNL: Math.max(0, v) }))} />
          <FieldNumber label="Units/maand (NL markt)" value={active.inputs.baseUnitsNL} min={100} step={100}
            onChange={(v) => updateActive((i) => ({ ...i, baseUnitsNL: Math.max(0, v) }))} />

          <FieldPct label="Front-end %" value={active.inputs.gtnFront}
            onChange={(v) => updateActive((i) => ({ ...i, gtnFront: clamp(v, 0, 0.8) }))} />
          <FieldPct label="Bonus op realisatie %" value={active.inputs.bonusOnReal}
            onChange={(v) => updateActive((i) => ({ ...i, bonusOnReal: clamp(v, 0, 0.5) }))} />
          <FieldPct label="Net floor vs pre-net" value={active.inputs.netFloorVsPre}
            onChange={(v) => updateActive((i) => ({ ...i, netFloorVsPre: clamp(v, 0.6, 1) }))} />

          <FieldPct label="COGS %" value={active.inputs.cogs}
            onChange={(v) => updateActive((i) => ({ ...i, cogs: clamp(v, 0, 0.9) }))} />
          <FieldNumber label="NL logistiek PI (€/unit)" value={active.inputs.logisticsPerUnit} min={0} step={0.5}
            onChange={(v) => updateActive((i) => ({ ...i, logisticsPerUnit: Math.max(0, v) }))} />
          <FieldNumber label="Arbitrage-drempel (€/unit)" value={active.inputs.arbitrageThreshold} min={0} step={0.5}
            onChange={(v) => updateActive((i) => ({ ...i, arbitrageThreshold: Math.max(0, v) }))} />

          <FieldPct label="Max PI-share (cap)" value={active.inputs.availabilityCap}
            onChange={(v) => updateActive((i) => ({ ...i, availabilityCap: clamp(v, 0, 0.8) }))} />
          <FieldNumber label="PI-gevoeligheid (per €/gap)" value={active.inputs.shareElasticity} min={0} step={0.005}
            onChange={(v) => updateActive((i) => ({ ...i, shareElasticity: Math.max(0, v) }))} />
          <FieldNumber label="Ramp-in (maanden)" value={active.inputs.rampMonths} min={0} step={1}
            onChange={(v) => updateActive((i) => ({ ...i, rampMonths: Math.max(0, Math.round(v)) }))} />
        </div>

        <div className="mt-3 text-xs text-gray-600">
          Eind-effectieve NL netprijs: <b>{eur(activeSim.kpis.netEffectiveBuyerEnd, 0)}</b> • EU referentie (min landed): <b>{eur(activeSim.kpis.euRefNet, 0)}</b>
        </div>
      </section>

      {/* KPI’s per scenario — responsive */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold mb-3">KPI’s — Originator & Parallelimport</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {[{ sc: scenarios[0], sim: simA }, { sc: scenarios[1], sim: simB }].map(({ sc, sim }) => (
            <div key={sc.id} className="rounded-2xl border p-4">
              <div className="flex items-center gap-2 mb-2 min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sc.color }} />
                <div className="font-semibold truncate">{sc.name}</div>
              </div>
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
                <Kpi title="Originator — Net Y1" value={eur(sim.kpis.orgNetY1)} />
                <Kpi title="Parallelimport — Net Y1" value={eur(sim.kpis.piNetY1)} />
                <Kpi title="Eind-share PI" value={pctS(sim.kpis.endPIshare, 1)} help={`EU ref: ${eur(sim.kpis.euRefNet, 0)}`} />
                <Kpi title="Originator — EBITDA (Horizon)" value={eur(sim.kpis.orgEbitdaTotal)} help={`Originator eind-net: ${eur(sim.kpis.endNetOriginator, 0)}`} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Grafieken */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-2">Net sales per maand</h3>
          <MultiLineChart
            name="Net sales"
            series={seriesNet}
            yFmt={(v) => compact(v)}
          />
          <p className="text-xs text-gray-600 mt-2">
            Bonus op realisatie verlaagt de effectieve koperprijs zonder list te raken. Zichtbaar effect op PI-instroom.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-2">Marktaandeel PI (%)</h3>
          <MultiLineChart
            name="PI share"
            series={seriesShare}
            yFmt={(v) => `${v.toFixed(0)}%`}
          />
          <p className="text-xs text-gray-600 mt-2">PI share groeit als de gap > drempel; cap en ramp-in beperken tempo en plafond.</p>
        </div>
      </section>

      {/* EU Prijsvergelijker — interactief */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold">EU parallel prijsvergelijking (landed → NL)</h3>
          <div className="flex gap-2">
            <button onClick={addCountry} className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Land toevoegen</button>
          </div>
        </div>
        <div className="mt-3 w-full overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-2 px-2">Land</th>
                <th className="text-right py-2 px-2">Ex-factory</th>
                <th className="text-left py-2 px-2">Valuta</th>
                <th className="text-right py-2 px-2">FX→EUR</th>
                <th className="text-right py-2 px-2">Logistiek (EUR)</th>
                <th className="text-right py-2 px-2">Buffer (EUR)</th>
                <th className="text-right py-2 px-2">Landed NL (EUR)</th>
                <th className="text-right py-2 px-2">Cap (info)</th>
                <th className="text-right py-2 px-2">Actie</th>
              </tr>
            </thead>
            <tbody>
              {euRows.map((r) => {
                const baseEUR = r.exFactory * r.fxToEUR;
                const landed = baseEUR + r.logistics + r.buffer + (active.inputs.logisticsPerUnit || 0);
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-1 px-2">
                      <input value={r.country} onChange={(e) => updateCountry(r.id, { country: e.target.value })}
                             className="w-full border rounded px-2 py-1" />
                    </td>
                    <td className="py-1 px-2 text-right">
                      <input type="number" step={0.1} value={r.exFactory}
                             onChange={(e) => updateCountry(r.id, { exFactory: parseFloat(e.target.value) })}
                             className="w-28 border rounded px-2 py-1 text-right" />
                    </td>
                    <td className="py-1 px-2">
                      <select value={r.currency} onChange={(e) => updateCountry(r.id, { currency: e.target.value as EUCountryRow["currency"] })}
                              className="border rounded px-2 py-1">
                        {["EUR","PLN","CZK","HUF","GBP","DKK"].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="py-1 px-2 text-right">
                      <input type="number" step={0.001} value={r.fxToEUR}
                             onChange={(e) => updateCountry(r.id, { fxToEUR: parseFloat(e.target.value) })}
                             className="w-24 border rounded px-2 py-1 text-right" />
                    </td>
                    <td className="py-1 px-2 text-right">
                      <input type="number" step={0.1} value={r.logistics}
                             onChange={(e) => updateCountry(r.id, { logistics: parseFloat(e.target.value) })}
                             className="w-24 border rounded px-2 py-1 text-right" />
                    </td>
                    <td className="py-1 px-2 text-right">
                      <input type="number" step={0.1} value={r.buffer}
                             onChange={(e) => updateCountry(r.id, { buffer: parseFloat(e.target.value) })}
                             className="w-24 border rounded px-2 py-1 text-right" />
                    </td>
                    <td className="py-1 px-2 text-right font-medium">{eur(landed, 0)}</td>
                    <td className="py-1 px-2 text-right">
                      <input type="number" step={0.01} value={r.capShare}
                             onChange={(e) => updateCountry(r.id, { capShare: clamp(parseFloat(e.target.value),0,1) })}
                             className="w-20 border rounded px-2 py-1 text-right" />
                    </td>
                    <td className="py-1 px-2 text-right">
                      <button onClick={() => removeCountry(r.id)} className="text-xs rounded border px-2 py-1 hover:bg-gray-50">Verwijderen</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-600 mt-2">
          <b>Tip:</b> De <i>EU referentie</i> in de simulatie is de <b>laagste landed prijs</b> uit de tabel (incl. NL-logistiek). Als jouw
          <i>effectieve NL net</i> hier ruim boven ligt en de drempel overschrijdt, stijgt het PI-aandeel richting de cap. Verlaag bij voorkeur
          met <b>bonus op realisatie</b> om IRP-effecten te vermijden.
        </p>
      </section>
    </div>
  );
}
