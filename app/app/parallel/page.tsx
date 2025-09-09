"use client";

import { useMemo, useState } from "react";

/** Helpers */
const eur = (n: number, d = 0) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: d })
    .format(Number.isFinite(n) ? n : 0);
const pctS = (p: number, d = 1) => `${((Number.isFinite(p) ? p : 0) * 100).toFixed(d)}%`;
const compact = (n: number) =>
  new Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 1 })
    .format(Number.isFinite(n) ? n : 0);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const round = (n: number, d = 1) => Math.round((Number.isFinite(n) ? n : 0) * 10 ** d) / 10 ** d;

/** Types */
type Inputs = {
  listNL: number;        // €/unit (list NL)
  discount: number;      // 0..1 (één korting-schuif)
  parallelRef: number;   // €/unit (parallel referentieprijs)
  units: number;         // units/maand NL

  // Recapture
  recaptureEff: number;  // 0..1 fractie PI-reductie die terugkomt
  recaptureRampM: number;// maanden tot volle recapture

  // Handmatige PI (optioneel)
  manualPI: boolean;
  manualPIShare: number; // 0..1 (eindniveau)
  manualPIRampM: number; // maanden naar eindniveau
};

type Settings = {
  threshold: number;     // €/unit: gap-drempel
  slope: number;         // PI-gevoeligheid (pp per € boven drempel)
  cap: number;           // max PI-share (instelbaar)
  rampMonths: number;    // ramp-in van PI op basis van gap
  horizon: number;       // maanden
  cogsPct: number;       // COGS% op originator net
};

type Point = {
  t: number;
  netOriginator: number;
  gap: number;
  sPI_base: number;         // vóór recapture (uit model of manual)
  sPI_effective: number;    // ná recapture/vergelijking met baseline
  sOriginator: number;
  unitsOriginator: number;
  unitsPI: number;
  netSalesOriginator: number;
  netSalesPI: number;
  discountSpend: number;
  ebitdaOriginator: number;
};

type KPIs = {
  netY1: number;
  piY1: number;
  ebitdaY1: number;
  discY1: number;
  endPIshare: number;
  endGap: number;
  endNet: number;
};

/** Defaults */
const DEFAULTS_A: Inputs = {
  listNL: 100,
  discount: 0.22,
  parallelRef: 65,
  units: 9000,
  recaptureEff: 0.7,
  recaptureRampM: 3,
  manualPI: false,
  manualPIShare: 0.15,
  manualPIRampM: 2,
};
const DEFAULTS_B: Inputs = { ...DEFAULTS_A, discount: 0.27 };

const DEFAULT_CFG: Settings = {
  threshold: 2,
  slope: 0.06,   // ~6 pp PI-share per extra € boven drempel (lineair, tot cap)
  cap: 0.35,     // was de “35%”: nu instelbaar per product/markt
  rampMonths: 3,
  horizon: 24,
  cogsPct: 0.20,
};

/** PI-share uit model of handmatig */
function piShareBase(gap: number, t: number, cfg: Settings, manualOn: boolean, manualTarget: number, manualRampM: number) {
  if (manualOn) {
    const ramp = Math.min(1, manualRampM > 0 ? t / manualRampM : 1);
    return clamp(manualTarget * ramp, 0, 1);
  }
  if (gap <= cfg.threshold) return 0;
  const base = (gap - cfg.threshold) * cfg.slope;
  const ramp = Math.min(1, cfg.rampMonths > 0 ? t / cfg.rampMonths : 1);
  return clamp(base * ramp, 0, 1);
}

/** Simuleer scenario met optionele baseline (voor recapture van PI-daling) */
function simulateWithBaseline(inp: Inputs, cfg: Settings, sPI_base_A: number[] | null) {
  const pts: Point[] = [];
  const net0 = inp.listNL * (1 - inp.discount);

  for (let t = 0; t < cfg.horizon; t++) {
    const netOriginator = net0;
    const gap = netOriginator - inp.parallelRef;

    // basis PI-share: handmatig OF model
    const manualTargetCapped = Math.min(inp.manualPIShare, cfg.cap);
    const sPI_base = Math.min(
      piShareBase(gap, t, cfg, inp.manualPI, manualTargetCapped, inp.manualPIRampM),
      cfg.cap
    );

    // recapture met ramp
    const recRamp = Math.min(1, inp.recaptureRampM > 0 ? t / inp.recaptureRampM : 1);
    const e_eff = clamp(inp.recaptureEff * recRamp, 0, 1);

    let sOriginator: number;
    if (sPI_base_A && Number.isFinite(sPI_base_A[t])) {
      const sA = sPI_base_A[t]!;
      const delta = Math.max(0, sA - sPI_base);      // PI-reductie vs baseline
      sOriginator = 1 - sPI_base - (1 - e_eff) * delta;
    } else {
      sOriginator = 1 - sPI_base;
    }
    sOriginator = clamp(sOriginator, 0, 1);
    const sPI_effective = 1 - sOriginator;

    const unitsOriginator = Math.max(0, inp.units * sOriginator);
    const unitsPI = Math.max(0, inp.units * sPI_effective);

    const netSalesOriginator = unitsOriginator * netOriginator;
    const netSalesPI = unitsPI * inp.parallelRef;

    const grossOriginator = unitsOriginator * inp.listNL;
    const discountSpend = grossOriginator * inp.discount;

    const cogs = netSalesOriginator * cfg.cogsPct;
    const ebitdaOriginator = netSalesOriginator - cogs;

    pts.push({
      t, netOriginator, gap, sPI_base, sPI_effective, sOriginator,
      unitsOriginator, unitsPI, netSalesOriginator, netSalesPI,
      discountSpend, ebitdaOriginator,
    });
  }

  const y1 = pts.slice(0, Math.min(12, pts.length));
  const sum = (f: (p: Point) => number) => pts.reduce((a, p) => a + f(p), 0);
  const end = pts.at(-1)!;

  const kpis: KPIs = {
    netY1: sum((p) => (y1.includes(p) ? p.netSalesOriginator : 0)),
    piY1: sum((p) => (y1.includes(p) ? p.netSalesPI : 0)),
    ebitdaY1: sum((p) => (y1.includes(p) ? p.ebitdaOriginator : 0)),
    discY1: sum((p) => (y1.includes(p) ? p.discountSpend : 0)),
    endPIshare: end.sPI_effective,
    endGap: end.gap,
    endNet: end.netOriginator,
  };

  return { points: pts, kpis };
}

/** Simuleer A + baselinecurve voor B (A's sPI_base per t) */
function simulateA(inpA: Inputs, cfg: Settings) {
  const sPI_base_A: number[] = [];
  const net0A = inpA.listNL * (1 - inpA.discount);
  for (let t = 0; t < cfg.horizon; t++) {
    const gapA = net0A - inpA.parallelRef;
    const manualTargetCapped = Math.min(inpA.manualPIShare, cfg.cap);
    sPI_base_A[t] = Math.min(
      piShareBase(gapA, t, cfg, inpA.manualPI, manualTargetCapped, inpA.manualPIRampM),
      cfg.cap
    );
  }
  const simA = simulateWithBaseline(inpA, cfg, null);
  return { simA, sPI_base_A };
}

/** Break-even korting (Y1 net sales delta ≈ 0) */
function findBreakEvenDiscount(inpA: Inputs, cfg: Settings, sPI_base_A: number[], simA_netY1: number) {
  let best = inpA.discount;
  let bestAbs = Infinity;
  for (let d = 0; d <= 0.9; d += 0.002) {
    const cand: Inputs = { ...inpA, discount: d };
    const sim = simulateWithBaseline(cand, cfg, sPI_base_A);
    const delta = sim.kpis.netY1 - simA_netY1;
    const abs = Math.abs(delta);
    if (abs < bestAbs) { bestAbs = abs; best = d; }
  }
  return best;
}

/** Kleine UI bouwstenen */
function FieldNumber({
  label, value, onChange, step = 1, min, max, suffix, help,
}: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; max?: number; suffix?: string; help?: string;
}) {
  return (
    <label className="text-sm w-full">
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
function FieldPct({
  label, value, onChange, max = 1, help,
}: {
  label: string; value: number; onChange: (v: number) => void; max?: number; help?: string;
}) {
  return (
    <label className="text-sm w-full">
      <div className="font-medium">{label}</div>
      {help ? <div className="text-xs text-gray-500">{help}</div> : null}
      <div className="mt-1 flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={max}
          step={0.005}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-36 sm:w-44"
        />
        <input
          type="number"
          step={0.01}
          min={0}
          max={max}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-24 rounded-lg border px-3 py-2"
        />
        <span className="text-gray-500">{pctS(value)}</span>
      </div>
    </label>
  );
}
function Kpi({ title, value, help, tone = "default" }: {
  title: string; value: string; help?: string; tone?: "default" | "good" | "warn" | "bad";
}) {
  const color =
    tone === "good" ? "border-emerald-200 bg-emerald-50" :
    tone === "warn" ? "border-amber-200 bg-amber-50" :
    tone === "bad"  ? "border-rose-200 bg-rose-50" : "border-gray-200 bg-white";
  return (
    <div className={`rounded-2xl border ${color} p-3 sm:p-4`}>
      <div className="text-[12px] text-gray-600">{title}</div>
      <div className="text-lg sm:text-xl font-semibold mt-1 break-words">{value}</div>
      {help ? <div className="text-[11px] sm:text-xs text-gray-600 mt-1">{help}</div> : null}
    </div>
  );
}
function LineChart({
  name, color = "#0ea5e9", values, yFmt = (v: number) => v.toFixed(0), height = 220,
}: { name: string; color?: string; values: number[]; yFmt?: (v: number) => string; height?: number }) {
  const w = 960, h = height, padX = 46, padY = 28;
  const n = values.length || 1;
  const maxY = Math.max(1, ...values);
  const minY = 0;
  const x = (i: number) => padX + (i / Math.max(1, n - 1)) * (w - 2 * padX);
  const y = (v: number) => h - padY - ((v - minY) / (maxY - minY)) * (h - 2 * padY);
  const ticks = Array.from({ length: 5 }, (_, i) => (maxY / 4) * i);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
  return (
    <svg className="w-full h-auto" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={name} preserveAspectRatio="xMidYMid meet">
      <rect x={12} y={12} width={w - 24} height={h - 24} rx={16} fill="#fff" stroke="#e5e7eb" />
      {ticks.map((tv, i) => (
        <g key={i}>
          <line x1={padX} y1={y(tv)} x2={w - padX} y2={y(tv)} stroke="#f3f4f6" />
          <text x={padX - 8} y={y(tv) + 4} fontSize="10" textAnchor="end" fill="#6b7280">{yFmt(tv)}</text>
        </g>
      ))}
      <path d={d} fill="none" stroke={color} strokeWidth={2} />
      {values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={2} fill={color} />)}
      <text x={w - padX} y={y(values.at(-1) || 0) - 6} fontSize="10" textAnchor="end" fill={color}>{name}</text>
    </svg>
  );
}

/** Pagina */
export default function ParallelTool() {
  // Instelbare modelparameters (incl. cap)
  const [cfg, setCfg] = useState<Settings>({ ...DEFAULT_CFG });

  // Scenario A/B
  const [A, setA] = useState<Inputs>({ ...DEFAULTS_A });
  const [B, setB] = useState<Inputs>({ ...DEFAULTS_B });

  // Simuleer A en baselinecurve
  const { simA, sPI_base_A } = useMemo(() => simulateA(A, cfg), [A, cfg]);

  // Simuleer B tegen baseline
  const simB = useMemo(() => simulateWithBaseline(B, cfg, sPI_base_A), [B, cfg, sPI_base_A]);

  // Deltas (Y1)
  const deltas = useMemo(() => {
    const dNet = simB.kpis.netY1 - simA.kpis.netY1;
    const dPI = simB.kpis.piY1 - simA.kpis.piY1;
    const dEBITDA = simB.kpis.ebitdaY1 - simA.kpis.ebitdaY1;
    const dDisc = simB.kpis.discY1 - simA.kpis.discY1;
    return { dNet, dPI, dEBITDA, dDisc };
  }, [simA.kpis, simB.kpis]);

  // Handige acties
  function copyAtoB() { setB({ ...A }); }
  function setB_toGapThreshold() {
    const neededNet = B.parallelRef + cfg.threshold;
    const discountNeeded = 1 - neededNet / (B.listNL || 1);
    setB((s) => ({ ...s, discount: clamp(discountNeeded, 0, 0.9) }));
  }
  function setB_toBreakEvenNet() {
    const be = findBreakEvenDiscount(A, cfg, sPI_base_A, simA.kpis.netY1);
    setB((s) => ({ ...s, discount: clamp(be, 0, 0.9) }));
  }

  // Adviesregels o.b.v. A/B (concreet en eerlijk)
  const advies: string[] = useMemo(() => {
    const items: string[] = [];
    const gapClosed = simB.kpis.endGap <= cfg.threshold;
    const piDown = simB.kpis.endPIshare < simA.kpis.endPIshare;
    const netUp = deltas.dNet > 0;
    const ebitdaUp = deltas.dEBITDA > 0;

    // 1) Als gap binnen drempel en Net/EBITDA omhoog: doen
    if (gapClosed && netUp && ebitdaUp) {
      items.push(
        `Verlaag je korting tot maximaal ${pctS(B.discount,1)} (B). Gap is ≤ drempel (€${cfg.threshold}) en zowel Net Sales (+${eur(deltas.dNet)}) als EBITDA (+${eur(deltas.dEBITDA)}) verbeteren t.o.v. A.`
      );
    }
    // 2) Gap dicht, maar Net of EBITDA negatief → recapture op orde brengen
    if (gapClosed && (!netUp || !ebitdaUp)) {
      items.push(
        `Gap sluiten alleen is onvoldoende. Versterk recapture: verhoog effectiviteit naar ≥ ${pctS(Math.min(1, A.recaptureEff + 0.1))} en verkort ramp naar ${Math.max(1, A.recaptureRampM - 1)} mnd via afspraken met groothandel/ziekenhuizen (voorkeursleverancier, servicelevel, voorraadgaranties).`
