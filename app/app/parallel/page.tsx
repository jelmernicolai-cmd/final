"use client";

import { useMemo, useState } from "react";

/** ==== Helpers ==== */
const eur = (n: number, d = 0) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: d })
    .format(Number.isFinite(n) ? n : 0);
const pctS = (p: number, d = 0) => `${((Number.isFinite(p) ? p : 0) * 100).toFixed(d)}%`;
const compact = (n: number) =>
  new Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 1 })
    .format(Number.isFinite(n) ? n : 0);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const round = (n: number, d = 0) => Math.round((Number.isFinite(n) ? n : 0) * 10 ** d) / 10 ** d;

/** ==== Model (bewust simpel) ====
  Inputs: List NL, front %, bonus %, EU landed prijs, units/maand.
  Afleidingen:
   - NetOriginator = list * (1 - front)
   - NL effectief (koper) = NetOriginator * (1 - bonus)
   - Gap = NL effectief - EU landed
   - PI-share (model) = min(CAP, max(0, (Gap - THRESHOLD) * SLOPE)) met ramp-in.
   Handmatig: zet manualPI=true en vul eind-PI-share + ramp in.
*/
type Inputs = {
  listNL: number;         // €/unit
  front: number;          // 0..1
  bonus: number;          // 0..1
  euLanded: number;       // €/unit
  units: number;          // units/maand

  // Handmatige PI-share (optioneel)
  manualPI: boolean;      // aan/uit
  manualPIShare: number;  // 0..1 (eindniveau)
  manualPIRamp: number;   // maanden naar eindniveau
};

type Settings = {
  threshold: number;      // €/unit drempel voordat PI "gaat lopen"
  slope: number;          // gevoeligheid PI-share per €/gap
  cap: number;            // max PI-share
  rampMonths: number;     // ramp-in (modelmodus)
  horizon: number;        // maanden
  cogs: number;           // COGS% op originator net
};

type Point = {
  t: number;
  netOriginator: number;
  netEffective: number;
  gap: number;
  sharePI: number;
  netSalesPI: number;
  netSalesOriginator: number;
  ebitdaOriginator: number;
};

type KPIs = {
  orgNetY1: number;
  orgNetTotal: number;
  piNetY1: number;
  piNetTotal: number;
  endSharePI: number;
  endNetOriginator: number;
  endGap: number;
  neededBonusDeltaPP: number; // pp bonus extra nodig om gap ≤ threshold te krijgen
};

const DEFAULT_INPUTS: Inputs = {
  listNL: 100,
  front: 0.18,
  bonus: 0.06,
  euLanded: 65,
  units: 9000,
  manualPI: false,
  manualPIShare: 0.15,
  manualPIRamp: 2,
};

const DEFAULT_SETTINGS: Settings = {
  threshold: 2,
  slope: 0.06,
  cap: 0.35,
  rampMonths: 3,
  horizon: 24,
  cogs: 0.20,
};

/** ==== Simulatie ==== */
function simulate(inp: Inputs, cfg: Settings) {
  const pts: Point[] = [];
  const netOriginator0 = inp.listNL * (1 - inp.front);

  for (let t = 0; t < cfg.horizon; t++) {
    const netOriginator = netOriginator0; // list/front constant
    const netEffective = netOriginator * (1 - inp.bonus);
    const gap = netEffective - inp.euLanded;

    let sharePI: number;
    if (inp.manualPI) {
      // Handmatige modus: jouw marktinschatting
      const target = clamp(inp.manualPIShare, 0, cfg.cap);
      const ramp = Math.min(1, inp.manualPIRamp > 0 ? t / inp.manualPIRamp : 1);
      sharePI = clamp(target * ramp, 0, cfg.cap);
    } else {
      // Modelmodus: op basis van gap
      sharePI = 0;
      if (gap > cfg.threshold) {
        sharePI = Math.min(cfg.cap, (gap - cfg.threshold) * cfg.slope);
        const ramp = Math.min(1, cfg.rampMonths > 0 ? t / cfg.rampMonths : 1);
        sharePI *= ramp;
      }
      sharePI = clamp(sharePI, 0, cfg.cap);
    }

    const shareOriginator = 1 - sharePI;
    const netSalesPI = inp.units * sharePI * inp.euLanded;
    const netSalesOriginator = inp.units * shareOriginator * netOriginator;
    const ebitdaOriginator = netSalesOriginator * (1 - cfg.cogs);

    pts.push({ t, netOriginator, netEffective, gap, sharePI, netSalesPI, netSalesOriginator, ebitdaOriginator });
  }

  const y1 = pts.slice(0, Math.min(12, pts.length));
  const sum = (f: (p: Point) => number) => pts.reduce((a, p) => a + f(p), 0);

  // Slimme suggestie: hoeveel bonus extra is nodig om gap ≤ threshold te maken?
  const end = pts.at(-1)!;
  const neededEffective = inp.euLanded + cfg.threshold;
  const bonusNeeded = 1 - neededEffective / (netOriginator0 || 1);
  const neededBonusDelta = Math.max(0, bonusNeeded - inp.bonus); // absolute (0..1)

  const kpis: KPIs = {
    orgNetY1: y1.reduce((a, p) => a + p.netSalesOriginator, 0),
    orgNetTotal: sum((p) => p.netSalesOriginator),
    piNetY1: y1.reduce((a, p) => a + p.netSalesPI, 0),
    piNetTotal: sum((p) => p.netSalesPI),
    endSharePI: end.sharePI,
    endNetOriginator: end.netOriginator,
    endGap: end.gap,
    neededBonusDeltaPP: neededBonusDelta * 100,
  };

  return { points: pts, kpis, netOriginator0 };
}

/** ==== UI bouwstenen ==== */
function FieldNumber({
  label, value, onChange, step = 1, min, max, suffix,
}: {
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
    <div className="rounded-2xl border bg-white p-3 sm:p-4">
      <div className="text-[12px] text-gray-500">{title}</div>
      <div className="text-lg sm:text-xl font-semibold mt-1">{value}</div>
      {help ? <div className="text-[11px] sm:text-xs text-gray-500 mt-1">{help}</div> : null}
    </div>
  );
}

/** ==== Heel simpele lijnchart (SVG) ==== */
function LineChart({
  name, color = "#0ea5e9", values, yFmt = (v: number) => v.toFixed(0), height = 220,
}: {
  name: string; color?: string; values: number[]; yFmt?: (v: number) => string; height?: number;
}) {
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

/** ==== Pagina ==== */
export default function ParallelSimplePage() {
  const [inpA, setInpA] = useState<Inputs>({ ...DEFAULT_INPUTS });
  const [useCompare, setUseCompare] = useState(true);

  // Simulatie huidig beleid (A)
  const simA = useMemo(() => simulate(inpA, DEFAULT_SETTINGS), [inpA]);

  // Voorstel (B): alleen bonus ophogen tot voorgestelde gap-closure
  const suggestedBonus = clamp(inpA.bonus + simA.kpis.neededBonusDeltaPP / 100, 0, 0.5);
  const inpB: Inputs = useMemo(
    () => ({ ...inpA, bonus: suggestedBonus }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inpA, simA.kpis.neededBonusDeltaPP]
  );
  const simB = useMemo(() => simulate(inpB, DEFAULT_SETTINGS), [inpB]);

  // Delta’s B - A
  const deltas = {
    orgNetY1: simB.kpis.orgNetY1 - simA.kpis.orgNetY1,
    piNetY1: simB.kpis.piNetY1 - simA.kpis.piNetY1,
    endSharePI: simB.kpis.endSharePI - simA.kpis.endSharePI,
    endGap: simB.kpis.endGap - simA.kpis.endGap,
    bonusPP: (inpB.bonus - inpA.bonus) * 100,
  };

  return (
    <div className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6 py-4 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Parallelimport — Slimme Gap-tool</h1>
          <p className="text-sm text-gray-600">
            Minimalistische tool op basis van de <b>NL-prijs</b>. Vergelijk jouw <i>effectieve koperprijs</i> met de <i>EU landed</i> en zie direct
            hoeveel <b>bonus-pp</b> je nodig hebt om paralleldruk te neutraliseren — zonder list price te wijzigen.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm inline-flex items-center gap-2">
            <input type="checkbox" checked={useCompare} onChange={(e) => setUseCompare(e.target.checked)} />
            <span>Vergelijk voorstel (A vs B)</span>
          </label>
        </div>
      </header>

      {/* Uitleg & interpretatie */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-base font-semibold">Uitleg & interpretatie</h2>
        <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
          <li><b>NL effectief</b> = List × (1 − front) × (1 − bonus). Dit is de prijs die jouw Nederlandse klant ervaart.</li>
          <li><b>EU landed</b> is de laagste haalbare inkoop elders in de EU plus logistiek. Parallelhandel vergelijkt hiertegen.</li>
          <li><b>Gap</b> = NL effectief − EU landed. Als gap &gt; €{DEFAULT_SETTINGS.threshold.toFixed(0)} wordt PI aantrekkelijk en groeit PI-share richting een cap.</li>
          <li><b>Voorstel (B)</b> verhoogt alléén de bonus zodat <i>gap ≤ drempel</i>. Je list blijft ongemoeid (IRP-vriendelijk).</li>
          <li><b>Handmatige modus</b>: zet een eigen PI-share pad als jouw marktkennis sterker is dan het simpele gap-model.</li>
        </ul>
        <p className="mt-2 text-xs text-gray-600">
          Realisme: dit is een <i>early-warning</i> en <i>what-if</i> tool. Tenders, volumes per verpakking en beschikbaarheid per land kunnen het beeld beïnvloeden.
          Gebruik dit om snel richting te bepalen en vervolganalyses te prioriteren.
        </p>
      </section>

      {/* Inputs */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-base font-semibold mb-3">Parameters</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FieldNumber label="List price NL (€/unit)" value={inpA.listNL} min={1} step={1}
            onChange={(v) => setInpA(s => ({ ...s, listNL: Math.max(0, v) }))} />
          <FieldPct label="Front-end %" value={inpA.front}
            onChange={(v) => setInpA(s => ({ ...s, front: clamp(v, 0, 0.8) }))} />
          <FieldPct label="Bonus op realisatie %" value={inpA.bonus}
            onChange={(v) => setInpA(s => ({ ...s, bonus: clamp(v, 0, 0.5) }))} />
          <FieldNumber label="EU landed (€/unit)" value={inpA.euLanded} min={1} step={0.5}
            onChange={(v) => setInpA(s => ({ ...s, euLanded: Math.max(0, v) }))} />
          <FieldNumber label="Units/maand (NL markt)" value={inpA.units} min={100} step={100}
            onChange={(v) => setInpA(s => ({ ...s, units: Math.max(0, v) }))} />
        </div>

        {/* Handmatige PI-share toggle */}
        <hr className="my-3" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm w-full inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={inpA.manualPI}
              onChange={(e) => setInpA(s => ({ ...s, manualPI: e.target.checked }))}
            />
            <span className="font-medium">PI-share handmatig invullen</span>
          </label>

          <FieldPct
            label="Handmatige PI-share (eind)"
            value={inpA.manualPIShare}
            onChange={(v) => setInpA(s => ({ ...s, manualPIShare: clamp(v, 0, 1) }))}
          />

          <FieldNumber
            label="Ramp-in (maanden) — handmatig"
            value={inpA.manualPIRamp}
            min={0}
            step={1}
            onChange={(v) => setInpA(s => ({ ...s, manualPIRamp: Math.max(0, Math.round(v)) }))}
          />
        </div>

        {inpA.manualPI && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            Handmatige modus actief: PI-share volgt jouw invoer (met ramp) en wordt niet uit de prijs-gap berekend.
          </p>
        )}
      </section>

      {/* KPI’s — huidig beleid */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold mb-3">KPI’s — Huidig beleid (A)</h3>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          <Kpi title="NL effectief (einde)" value={eur(simA.points.at(-1)?.netEffective ?? 0, 0)}
               help={`Net originator: ${eur(simA.netOriginator0, 0)}`} />
          <Kpi title="EU landed (referentie)" value={eur(inpA.euLanded, 0)}
               help={`Gap (einde): ${eur(simA.kpis.endGap, 0)}`} />
          <Kpi title="PI-share (einde)" value={pctS(simA.kpis.endSharePI, 1)}
               help={`Cap: ${pctS(DEFAULT_SETTINGS.cap, 0)}`} />
          <Kpi title="Originator Net — Jaar 1" value={eur(simA.kpis.orgNetY1)} />
          <Kpi title="Parallel Net — Jaar 1" value={eur(simA.kpis.piNetY1)} />
          <Kpi title="Benodigde bonus ↑" value={`${round(simA.kpis.neededBonusDeltaPP, 1)} pp`}
               help={`Van ${pctS(inpA.bonus,1)} naar ${pctS(inpA.bonus + simA.kpis.neededBonusDeltaPP/100,1)}`} />
        </div>
      </section>

      {/* Vergelijking (optioneel) */}
      {useCompare && (
        <section className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-3">Vergelijking — Voorstel (B) t.o.v. Huidig (A)</h3>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
            <Kpi title="Bonus voorstel"
                 value={`${round(deltas.bonusPP, 1)} pp`}
                 help={`A: ${pctS(inpA.bonus,1)} → B: ${pctS(clamp(inpA.bonus + simA.kpis.neededBonusDeltaPP/100,0,0.5),1)}`} />
            <Kpi title="Δ PI-share (einde)"
                 value={pctS(deltas.endSharePI, 1)}
                 help={`A: ${pctS(simA.kpis.endSharePI,1)} → B: ${pctS(simB.kpis.endSharePI,1)}`} />
            <Kpi title="Δ Gap (einde)" value={eur(deltas.endGap, 0)}
                 help={`A: ${eur(simA.kpis.endGap,0)} → B: ${eur(simB.kpis.endGap,0)}`} />
            <Kpi title="Δ Originator Net — Jaar 1" value={eur(deltas.orgNetY1)} />
            <Kpi title="Δ Parallel Net — Jaar 1" value={eur(deltas.piNetY1)} />
          </div>
        </section>
      )}

      {/* Grafieken (compact) */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h4 className="text-sm font-semibold mb-2">Net sales per maand — Originator (A)</h4>
          <LineChart name="Originator Net A" color="#0ea5e9" values={simA.points.map(p => p.netSalesOriginator)} yFmt={(v) => compact(v)} />
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <h4 className="text-sm font-semibold mb-2">PI-share per maand (A)</h4>
          <LineChart name="PI share A" color="#22c55e" values={simA.points.map(p => p.sharePI * 100)} yFmt={(v) => `${v.toFixed(0)}%`} />
        </div>
      </section>

      {/* Praktische aanbevelingen */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold mb-2">Aanbevolen acties</h3>
        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-2">
          {(() => {
            const tips: string[] = [];
            if (!inpA.manualPI && simA.kpis.endGap > DEFAULT_SETTINGS.threshold) {
              tips.push(`Verhoog bonus op realisatie met ~${round(simA.kpis.neededBonusDeltaPP, 1)} pp om de gap te sluiten tot ≤ €${DEFAULT_SETTINGS.threshold}.`);
            } else if (!inpA.manualPI) {
              tips.push("Gap is binnen drempel; houd maandelijkse EU-landed check aan en borg prijsdiscipline.");
            }
            if ((inpA.manualPI && inpA.manualPIShare > 0.25) || (!inpA.manualPI && simA.kpis.endSharePI > 0.25)) {
              tips.push("Schuif korting van front-end naar performance-bonus om switchprikkels te beperken, zonder list te raken.");
            }
            tips.push("Rapporteer maandelijks: NL effectief, EU landed, gap, PI-share (einde), Net Y1 en benodigde bonus-pp.");
            return tips.map((t, i) => <li key={i}>{t}</li>);
          })()}
        </ul>
      </section>
    </div>
  );
}
