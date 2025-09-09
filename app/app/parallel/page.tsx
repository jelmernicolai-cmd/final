"use client";

import { useMemo, useState } from "react";

/** ========== Helpers ========== */
const eur = (n: number, d = 0) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: d })
    .format(Number.isFinite(n) ? n : 0);
const pctS = (p: number, d = 1) => `${((Number.isFinite(p) ? p : 0) * 100).toFixed(d)}%`;
const compact = (n: number) =>
  new Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 1 })
    .format(Number.isFinite(n) ? n : 0);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const round = (n: number, d = 1) => Math.round((Number.isFinite(n) ? n : 0) * 10 ** d) / 10 ** d;

/** ========== Begrippen ==========
 * Front-end korting  = directe contractkorting op list (factuurkorting).
 * Bonus op realisatie = achteraf uit te keren bonus op gerealiseerd volume/omzet.
 * Parallel referentieprijs = laagste haalbare EU-inkoop + logistiek (“landed”), benchmark voor PI.
 */

/** ========== Types ========== */
type Inputs = {
  listNL: number;            // €/unit (Nederland, list)
  front: number;             // 0..1 (front-end)
  bonus: number;             // 0..1 (bonus op realisatie)
  parallelRef: number;       // €/unit (parallel referentieprijs, EU landed)
  units: number;             // units/maand (NL markt)

  // Gedrag van terugwinning wanneer PI afneemt
  recaptureEff: number;      // 0..1 fractie van PI-reductie die je terugwint
  recaptureRampM: number;    // maanden tot volle effectiviteit
};

type Settings = {
  threshold: number;         // €/unit: gap waarboven PI aantrekt
  slope: number;             // PI-gevoeligheid (%-punt per € gap boven drempel)
  cap: number;               // max PI-share
  rampMonths: number;        // maanden tot vol PI-effect bij een gap
  horizon: number;           // maanden
  cogsPct: number;           // COGS% op originator net sales
};

type Point = {
  t: number;
  netOriginator: number;     // €/unit na front
  netEffective: number;      // €/unit na front én bonus (koperprijs)
  gap: number;               // €/unit verschil vs parallelRef
  sPI_base: number;          // model-PI-share zonder recapture-logica
  sPI_effective: number;     // effectieve PI-share na recapture (voor KPI-weergave)
  sOriginator: number;       // effectieve originator-share
  unitsOriginator: number;
  unitsPI: number;
  netSalesOriginator: number;
  netSalesPI: number;
  discountSpendFront: number; // € front-korting op originatorunits
  discountSpendBonus: number; // € bonus op realisatie op originatorunits
  ebitdaOriginator: number;   // simpel: originator net − COGS
};

type KPIs = {
  netY1: number;               // originator Net (12m)
  piY1: number;                // parallel Net (12m)
  ebitdaY1: number;            // originator EBITDA (12m)
  discFrontY1: number;         // front spend (12m)
  discBonusY1: number;         // bonus spend (12m)
  endPIshare: number;          // einde PI-share
  endGap: number;              // einde gap
  endNetEffective: number;     // einde koperprijs
};

/** ========== Defaults ========== */
const DEFAULTS_A: Inputs = {
  listNL: 100,
  front: 0.18,
  bonus: 0.06,
  parallelRef: 65,
  units: 9000,
  recaptureEff: 0.7,
  recaptureRampM: 3,
};
const DEFAULTS_B: Inputs = {
  ...DEFAULTS_A,
  bonus: 0.10, // voorbeeldvoorstel; gebruiker past aan
};

const CFG: Settings = {
  threshold: 2,
  slope: 0.06,   // ~6 pp PI-share per extra € boven drempel (tot cap)
  cap: 0.35,
  rampMonths: 3,
  horizon: 24,
  cogsPct: 0.20,
};

/** ========== Kern: PI-share model en simulatie ========== */
function modelPIshare(gap: number, t: number, cfg: Settings) {
  // eenvoudige gap -> PI relatie met ramp-in
  if (gap <= cfg.threshold) return 0;
  const base = (gap - cfg.threshold) * cfg.slope;     // lineair
  const ramp = Math.min(1, cfg.rampMonths > 0 ? t / cfg.rampMonths : 1);
  return clamp(base * ramp, 0, cfg.cap);
}

/**
 * Simuleer scenario S gegeven A als referentie, zodat recapture realistisch is:
 * - Eerst bereken je A (baseline).
 * - B herrekent sPI_base_B uit zijn gap.
 * - PI-reductie Δ = sPI_A - sPI_B_base.
 * - Effectieve originator-share in B: 1 - sPI_B_base - (1 - e_eff)*Δ,
 *   waarbij e_eff = recaptureEff * ramp(t; recaptureRampM).
 *   (Het deel (1-e_eff)*Δ gaat “verloren”: komt niet terug als verkoop.)
 */
function simulateScenario(inpS: Inputs, inpA_baseline: Inputs | null, cfg: Settings) {
  const pts: Point[] = [];
  const netOriginator0 = inpS.listNL * (1 - inpS.front);

  // Als baseline nodig is (voor B), simuleer eerst A's sPI_base per t:
  const sPI_base_A: number[] = [];
  if (inpA_baseline) {
    const net0A = inpA_baseline.listNL * (1 - inpA_baseline.front);
    for (let t = 0; t < cfg.horizon; t++) {
      const netEffA = net0A * (1 - inpA_baseline.bonus);
      const gapA = netEffA - inpA_baseline.parallelRef;
      sPI_base_A[t] = modelPIshare(gapA, t, cfg);
    }
  }

  for (let t = 0; t < cfg.horizon; t++) {
    const netOriginator = netOriginator0;                  // list/front constant per scenario
    const netEffective = netOriginator * (1 - inpS.bonus); // koperprijs
    const gap = netEffective - inpS.parallelRef;

    // Bepaal basis PI-share in dit scenario (zonder recapture)
    const sPI_base = modelPIshare(gap, t, cfg);

    // Recapture-effectiviteit met ramp
    const recRamp = Math.min(1, inpS.recaptureRampM > 0 ? t / inpS.recaptureRampM : 1);
    const e_eff = clamp(inpS.recaptureEff * recRamp, 0, 1);

    let sOriginator: number;
    let sPI_effective: number;

    if (sPI_base_A.length) {
      // We vergelijken t.o.v. baseline A
      const sA = sPI_base_A[t];
      const delta = Math.max(0, sA - sPI_base); // PI-reductie door beleid S t.o.v. A
      // Effectieve originator-share (zie afleiding in analyse):
      sOriginator = 1 - sPI_base - (1 - e_eff) * delta;
      sPI_effective = 1 - sOriginator; // rest is PI
    } else {
      // Scenario A zelf (geen recapture nodig)
      sPI_effective = sPI_base;
      sOriginator = 1 - sPI_effective;
    }

    // Units
    const unitsOriginator = Math.max(0, inpS.units * sOriginator);
    const unitsPI = Math.max(0, inpS.units * sPI_effective);

    // Geld
    const netSalesOriginator = unitsOriginator * netOriginator;
    const netSalesPI = unitsPI * inpS.parallelRef;

    // Kortingslasten op originatorunits
    const grossOriginator = unitsOriginator * inpS.listNL;
    const discountSpendFront = grossOriginator * inpS.front;                // front op list
    const discountSpendBonus = netOriginator * unitsOriginator * inpS.bonus; // bonus op net (koperprijsbasis)

    const cogs = netSalesOriginator * cfg.cogsPct;
    const ebitdaOriginator = netSalesOriginator - cogs;

    pts.push({
      t,
      netOriginator,
      netEffective,
      gap,
      sPI_base,
      sPI_effective,
      sOriginator,
      unitsOriginator,
      unitsPI,
      netSalesOriginator,
      netSalesPI,
      discountSpendFront,
      discountSpendBonus,
      ebitdaOriginator,
    });
  }

  const sum = (f: (p: Point) => number) => pts.reduce((a, p) => a + f(p), 0);
  const y1 = pts.slice(0, Math.min(12, pts.length));
  const end = pts.at(-1)!;

  const kpis: KPIs = {
    netY1: sum((p) => y1.includes(p) ? p.netSalesOriginator : 0),
    piY1: sum((p) => y1.includes(p) ? p.netSalesPI : 0),
    ebitdaY1: sum((p) => y1.includes(p) ? p.ebitdaOriginator : 0),
    discFrontY1: sum((p) => y1.includes(p) ? p.discountSpendFront : 0),
    discBonusY1: sum((p) => y1.includes(p) ? p.discountSpendBonus : 0),
    endPIshare: end.sPI_effective,
    endGap: end.gap,
    endNetEffective: end.netEffective,
  };

  return { points: pts, kpis, netOriginator0 };
}

/** ========== Kleine UI componenten ========== */
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

/** ========== Pagina ========== */
export default function ParallelTool() {
  // Scenario A en B expliciet gescheiden
  const [A, setA] = useState<Inputs>({ ...DEFAULTS_A });
  const [B, setB] = useState<Inputs>({ ...DEFAULTS_B });

  // Simuleer A (baseline)
  const simA = useMemo(() => simulateScenario(A, null, CFG), [A]);

  // Simuleer B t.o.v. A voor realistische recapture
  const simB = useMemo(() => simulateScenario(B, A, CFG), [B, A]);

  // Deltas Jaar 1 (wat uiteindelijk telt)
  const deltas = useMemo(() => {
    const dNet = simB.kpis.netY1 - simA.kpis.netY1;
    const dFront = simB.kpis.discFrontY1 - simA.kpis.discFrontY1;
    const dBonus = simB.kpis.discBonusY1 - simA.kpis.discBonusY1;
    const dDiscTotal = dFront + dBonus;
    const dPI = simB.kpis.piY1 - simA.kpis.piY1;
    const dEBITDA = simB.kpis.ebitdaY1 - simA.kpis.ebitdaY1;
    return { dNet, dFront, dBonus, dDiscTotal, dPI, dEBITDA };
  }, [simA.kpis, simB.kpis]);

  // Handige knoppen
  function copyAtoB() {
    setB({ ...A });
  }
  function setB_toCloseGap() {
    // verhoog alleen bonus B om gap naar drempel te brengen (indicatief)
    const net0 = B.listNL * (1 - B.front);
    const neededEffective = B.parallelRef + CFG.threshold;
    const bonusNeeded = 1 - neededEffective / (net0 || 1);
    setB((s) => ({ ...s, bonus: clamp(bonusNeeded, 0, 0.6) }));
  }

  return (
    <div className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6 py-4 space-y-6">
      {/* Intro */}
      <header className="rounded-2xl border bg-white p-4 sm:p-5">
        <h1 className="text-xl sm:text-2xl font-semibold">Parallelimport – Beslis- en vergelijkingstool</h1>
        <p className="text-sm text-gray-700 mt-1">
          Beantwoord in minuten: <i>Wat is mijn gap t.o.v. parallel?</i> – <i>Wat gebeurt er met PI-share?</i> –{" "}
          <i>Wat is het netto effect op Net Sales en marge als ik méér bonus geef?</i>
        </p>
      </header>

      {/* Scenario-invoer */}
      <section className="rounded-2xl border bg-white p-4 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold">Parameters per scenario</h2>
          <div className="flex gap-2">
            <button onClick={copyAtoB} className="text-sm rounded border px-3 py-1.5 hover:bg-gray-50">Kopieer A → B</button>
            <button onClick={setB_toCloseGap} className="text-sm rounded border px-3 py-1.5 hover:bg-gray-50">B: bonus om gap ≈ drempel</button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Scenario A */}
          <div className="rounded-xl border p-4">
            <div className="font-semibold mb-3">Scenario A — Huidig</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldNumber label="List price NL (€/unit)" value={A.listNL} min={0} step={0.5}
                help="Officiële prijslijst (list)."
                onChange={(v) => setA(s => ({ ...s, listNL: Math.max(0, v) }))} />
              <FieldPct label="Front-end korting %" value={A.front}
                help="Directe contractkorting op list (factuur)."
                onChange={(v) => setA(s => ({ ...s, front: clamp(v, 0, 0.8) }))} />
              <FieldPct label="Bonus op realisatie %" value={A.bonus}
                help="Achteraf te betalen bonus op gerealiseerde afname (op koperprijsbasis)."
                onChange={(v) => setA(s => ({ ...s, bonus: clamp(v, 0, 0.6) }))} />
              <FieldNumber label="Parallel referentieprijs (€/unit)" value={A.parallelRef} min={0} step={0.5}
                help="Laagste EU-inkoop incl. logistiek (benchmark voor PI)."
                onChange={(v) => setA(s => ({ ...s, parallelRef: Math.max(0, v) }))} />
              <FieldNumber label="Units/maand (NL)" value={A.units} min={0} step={100}
                help="Totaalmarkt voor dit product in NL."
                onChange={(v) => setA(s => ({ ...s, units: Math.max(0, Math.round(v)) }))} />
              <FieldPct label="Recapture-effectiviteit" value={A.recaptureEff}
                help="Deel van afnemende PI dat je terugwint (rest verdampt)."
                onChange={(v) => setA(s => ({ ...s, recaptureEff: clamp(v, 0, 1) }))} />
              <FieldNumber label="Recapture-ramp (mnd)" value={A.recaptureRampM} min={0} step={1}
                help="Hoe snel komt terugwinning op gang?"
                onChange={(v) => setA(s => ({ ...s, recaptureRampM: Math.max(0, Math.round(v)) }))} />
            </div>
          </div>

          {/* Scenario B */}
          <div className="rounded-xl border p-4">
            <div className="font-semibold mb-3">Scenario B — Voorstel</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldNumber label="List price NL (€/unit)" value={B.listNL} min={0} step={0.5}
                onChange={(v) => setB(s => ({ ...s, listNL: Math.max(0, v) }))} />
              <FieldPct label="Front-end korting %" value={B.front}
                onChange={(v) => setB(s => ({ ...s, front: clamp(v, 0, 0.8) }))} />
              <FieldPct label="Bonus op realisatie %" value={B.bonus}
                onChange={(v) => setB(s => ({ ...s, bonus: clamp(v, 0, 0.6) }))} />
              <FieldNumber label="Parallel referentieprijs (€/unit)" value={B.parallelRef} min={0} step={0.5}
                onChange={(v) => setB(s => ({ ...s, parallelRef: Math.max(0, v) }))} />
              <FieldNumber label="Units/maand (NL)" value={B.units} min={0} step={100}
                onChange={(v) => setB(s => ({ ...s, units: Math.max(0, Math.round(v)) }))} />
              <FieldPct label="Recapture-effectiviteit" value={B.recaptureEff}
                onChange={(v) => setB(s => ({ ...s, recaptureEff: clamp(v, 0, 1) }))} />
              <FieldNumber label="Recapture-ramp (mnd)" value={B.recaptureRampM} min={0} step={1}
                onChange={(v) => setB(s => ({ ...s, recaptureRampM: Math.max(0, Math.round(v)) }))} />
            </div>
          </div>
        </div>
      </section>

      {/* KPI’s per scenario */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold mb-3">KPI’s per scenario (Jaar 1)</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {/* A */}
          <div className="rounded-xl border p-4">
            <div className="font-semibold mb-2">Scenario A</div>
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
              <Kpi title="Gap (einde)" value={eur(simA.kpis.endGap, 0)}
                   help={`NL koperprijs: ${eur(simA.kpis.endNetEffective,0)} • Parallel ref: ${eur(A.parallelRef,0)}`}
                   tone={simA.kpis.endGap > CFG.threshold ? "bad" : simA.kpis.endGap > 0 ? "warn" : "good"} />
              <Kpi title="PI-share (einde)" value={pctS(simA.kpis.endPIshare)}
                   help={`Cap model: ${pctS(CFG.cap,0)}`}
                   tone={simA.kpis.endPIshare > 0.25 ? "bad" : simA.kpis.endPIshare > 0.10 ? "warn" : "default"} />
              <Kpi title="Net Sales A (Y1)" value={eur(simA.kpis.netY1)} />
              <Kpi title="EBITDA A (Y1)" value={eur(simA.kpis.ebitdaY1)} />
              <Kpi title="Front spend A (Y1)" value={eur(simA.kpis.discFrontY1)} />
              <Kpi title="Bonus spend A (Y1)" value={eur(simA.kpis.discBonusY1)} />
            </div>
          </div>

          {/* B */}
          <div className="rounded-xl border p-4">
            <div className="font-semibold mb-2">Scenario B</div>
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
              <Kpi title="Gap (einde)" value={eur(simB.kpis.endGap, 0)}
                   help={`NL koperprijs: ${eur(simB.kpis.endNetEffective,0)} • Parallel ref: ${eur(B.parallelRef,0)}`}
                   tone={simB.kpis.endGap > CFG.threshold ? "bad" : simB.kpis.endGap > 0 ? "warn" : "good"} />
              <Kpi title="PI-share (einde)" value={pctS(simB.kpis.endPIshare)}
                   help={`Cap model: ${pctS(CFG.cap,0)}`}
                   tone={simB.kpis.endPIshare > 0.25 ? "bad" : simB.kpis.endPIshare > 0.10 ? "warn" : "default"} />
              <Kpi title="Net Sales B (Y1)" value={eur(simB.kpis.netY1)} />
              <Kpi title="EBITDA B (Y1)" value={eur(simB.kpis.ebitdaY1)} />
              <Kpi title="Front spend B (Y1)" value={eur(simB.kpis.discFrontY1)} />
              <Kpi title="Bonus spend B (Y1)" value={eur(simB.kpis.discBonusY1)} />
            </div>
          </div>
        </div>
      </section>

      {/* Verschil A → B (dit wil je weten) */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold mb-3">Verschil B t.o.v. A — Jaar 1</h3>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          <Kpi title="Δ Net Sales (Y1)" value={eur(deltas.dNet)}
               tone={deltas.dNet >= 0 ? "good" : "bad"}
               help="Positief = betere Net Sales" />
          <Kpi title="Δ EBITDA (Y1)" value={eur(deltas.dEBITDA)}
               tone={deltas.dEBITDA >= 0 ? "good" : "bad"}
               help="Simpel: Net − COGS" />
          <Kpi title="Δ Parallel omzet (Y1)" value={eur(deltas.dPI)}
               tone={deltas.dPI <= 0 ? "good" : "warn"}
               help="Negatief = minder PI" />
          <Kpi title="Extra front spend (Y1)" value={eur(deltas.dFront)}
               tone={deltas.dFront <= 0 ? "good" : "warn"} />
          <Kpi title="Extra bonus spend (Y1)" value={eur(deltas.dBonus)}
               tone={deltas.dBonus <= 0 ? "good" : "warn"} />
          <Kpi title="Δ Totale korting/bonus (Y1)" value={eur(deltas.dDiscTotal)}
               tone={deltas.dDiscTotal <= 0 ? "good" : "warn"}
               help="Front + bonus op originatorunits" />
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Dit zijn de daadwerkelijke uitkomsten inclusief aanname dat slechts een deel van de afnemende PI terugkeert
          als jouw verkoop (<b>recapture-effectiviteit</b>). Verhoog je bonus maar komt er weinig volume terug, dan kan
          Net Sales en marge alsnog verslechteren — dat zie je hier direct terug.
        </p>
      </section>

      {/* Grafieken */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h4 className="text-sm font-semibold mb-2">Originator Net Sales per maand</h4>
          <LineChart
            name="Net Sales A"
            color="#0ea5e9"
            values={simA.points.map((p) => p.netSalesOriginator)}
            yFmt={(v) => compact(v)}
          />
          <div className="mt-2" />
          <LineChart
            name="Net Sales B"
            color="#22c55e"
            values={simB.points.map((p) => p.netSalesOriginator)}
            yFmt={(v) => compact(v)}
          />
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <h4 className="text-sm font-semibold mb-2">PI-share per maand</h4>
          <LineChart
            name="PI share A"
            color="#6366f1"
            values={simA.points.map((p) => p.sPI_effective * 100)}
            yFmt={(v) => `${v.toFixed(0)}%`}
          />
          <div className="mt-2" />
          <LineChart
            name="PI share B"
            color="#f59e0b"
            values={simB.points.map((p) => p.sPI_effective * 100)}
            yFmt={(v) => `${v.toFixed(0)}%`}
          />
        </div>
      </section>
    </div>
  );
}
