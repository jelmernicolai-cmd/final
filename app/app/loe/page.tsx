"use client";

import { useMemo, useState } from "react";

/** ========= helpers ========= */
const eur = (n: number, d = 0) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: d })
    .format(Number.isFinite(n) ? n : 0);
const pctS = (p: number, d = 1) => `${((Number.isFinite(p) ? p : 0) * 100).toFixed(d)}%`;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const compact = (n: number) =>
  new Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 1 })
    .format(Number.isFinite(n) ? n : 0);

/** ========= types ========= */
type Inputs = {
  horizon: number;          // maanden
  preNet: number;           // €/unit pre-LOE net (simpel & herkenbaar)
  units: number;            // units/maand (markt)

  // 5 stuurknoppen:
  prefIntensity: "geen" | "middel" | "hoog"; // geeft preferent-aandeel
  allowance: number;        // 0..0.10 (ori binnen preferent)
  freeExtraDisc: number;    // 0..0.15 (extra korting ori op vrij volume)
  tenderLoss: number;       // 0..0.5  (ori verliest aandeel in zkh)
  tenderMonth: number;      // 0..12   (moment verlies)

  // (constanten onder water)
};

type Point = {
  t: number;
  sharePref: number; shareFree: number; shareHosp: number;
  // shares binnen segment
  shareOriPref: number; shareOriFree: number; shareOriHosp: number;
  // netprijzen
  netOriPref: number; netGenPref: number;
  netOriFree: number; netGenFree: number;
  netOriHosp: number; netGenHosp: number;
  // omzet
  nsOri: number; nsGen: number;
  shareOriTotal: number;
};

type Sim = {
  points: Point[];
  kpis: {
    oriNetY1: number;
    oriNetH: number;
    ebitdaY1: number;
    endShare: number;
    openGapEUR: number;   // vrij volume – laatste maand
    mixPref: number; mixFree: number; mixHosp: number;
  };
};

/** ========= vaste aannames (pragmatisch, farma-realistisch) ========= */
// Segmentmix op basis van preferentie-intensiteit:
const prefMix = (i: Inputs) => {
  const pref = i.prefIntensity === "geen" ? 0 : i.prefIntensity === "middel" ? 0.5 : 0.75;
  const rest = 1 - pref;
  const free = rest * 0.7;  // vrij volume ≈ 70% van niet-preferent
  const hosp = rest * 0.3;  // zkh ≈ 30% van niet-preferent
  return { pref, free, hosp };
};
// Generiek net als % van pre-LOE net:
const GEN_PREF = 0.20; // ≈ 80% korting (preferentie)
const GEN_FREE = 0.50; // vrij volume ~50% van pre-LOE net
const GEN_HOSP = 0.45; // zkh iets scherper
// Originator net-floors/extra korting (beperkt en herkenbaar):
const NET_FLOOR = 0.42;      // ori zakt niet onder 42% van pre-LOE net
const EXTRA_HOSP = 0.06;     // ori extra korting in zkh (vast)
const BASE_FREE_SHARE = 0.55; // startpunt aandeel ori in vrij segment
const ELASTICITY_FREE = 0.35; // respons van vrij-aandeel op net-gap
const COGS = 0.20;           // EBITDA-berekening: eenvoudig en verklaarbaar

/** ========= simulatie ========= */
function simulate(i: Inputs): Sim {
  const { pref, free, hosp } = prefMix(i);
  const pts: Point[] = [];

  for (let t = 0; t < i.horizon; t++) {
    const unitsPref = i.units * pref;
    const unitsFree = i.units * free;
    const unitsHosp = i.units * hosp;

    // Preferentie: ori krijgt klein "allowance"-deel
    const shareOriPref = clamp(i.allowance, 0, 0.10);
    const netGenPref = i.preNet * GEN_PREF;
    // ori-deal in preferentie is zeldzaam → neem net gelijk aan vrij-net (maar onder floor)
    const netOriPref = Math.max(i.preNet * (1 - i.freeExtraDisc), i.preNet * NET_FLOOR);

    // Vrij: netprijzen + aandeel o.b.v. gap
    const netGenFree = i.preNet * GEN_FREE;
    const netOriFree = Math.max(i.preNet * (1 - i.freeExtraDisc), i.preNet * NET_FLOOR);
    const gapFree = netOriFree - netGenFree;
    const shareAdj = clamp(1 - ELASTICITY_FREE * (gapFree / Math.max(i.preNet, 1)), 0.05, 0.95);
    const shareOriFree = clamp(BASE_FREE_SHARE * shareAdj, 0.05, 0.95);

    // Ziekenhuis: tenderverlies vanaf tenderMonth (lineaire ramp 2 mnd)
    const beforeShareHosp = 0.70;
    const afterShareHosp = beforeShareHosp * (1 - clamp(i.tenderLoss, 0, 0.5));
    const ramp =
      t < i.tenderMonth ? 0 :
      t >= i.tenderMonth + 2 ? 1 :
      (t - i.tenderMonth) / 2;
    const shareOriHosp = clamp(beforeShareHosp + (afterShareHosp - beforeShareHosp) * ramp, 0.05, 0.95);
    const netGenHosp = i.preNet * GEN_HOSP;
    const netOriHosp = Math.max(i.preNet * (1 - EXTRA_HOSP), i.preNet * NET_FLOOR);

    // Omzet
    const nsOri =
      unitsPref * shareOriPref * netOriPref +
      unitsFree * shareOriFree * netOriFree +
      unitsHosp * shareOriHosp * netOriHosp;
    const nsGen =
      unitsPref * (1 - shareOriPref) * netGenPref +
      unitsFree * (1 - shareOriFree) * netGenFree +
      unitsHosp * (1 - shareOriHosp) * netGenHosp;

    const shareOriTotal =
      (unitsPref * shareOriPref + unitsFree * shareOriFree + unitsHosp * shareOriHosp) /
      Math.max(1, i.units);

    pts.push({
      t,
      sharePref: pref, shareFree: free, shareHosp: hosp,
      shareOriPref, shareOriFree, shareOriHosp,
      netOriPref, netGenPref, netOriFree, netGenFree, netOriHosp, netGenHosp,
      nsOri, nsGen, shareOriTotal,
    });
  }

  const y1 = pts.slice(0, Math.min(12, pts.length));
  const sum = (f: (p: Point) => number) => pts.reduce((a, p) => a + f(p), 0);

  const openGapEUR = (pts.at(-1)?.netOriFree ?? 0) - (pts.at(-1)?.netGenFree ?? 0);

  return {
    points: pts,
    kpis: {
      oriNetY1: y1.reduce((a, p) => a + p.nsOri, 0),
      oriNetH: sum(p => p.nsOri),
      ebitdaY1: y1.reduce((a, p) => a + p.nsOri, 0) * (1 - COGS),
      endShare: pts.at(-1)?.shareOriTotal ?? 0,
      openGapEUR,
      mixPref: pref, mixFree: free, mixHosp: hosp,
    }
  };
}

/** ========= kleine UI bouwstenen ========= */
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
          step={step} min={min} max={max}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full rounded-lg border px-3 py-2"
        />
        {suffix ? <span className="text-gray-500">{suffix}</span> : null}
      </div>
    </label>
  );
}
function FieldPct({ label, value, onChange, max = 1, help }: {
  label: string; value: number; onChange: (v: number) => void; max?: number; help?: string;
}) {
  return (
    <label className="text-sm w-full">
      <div className="font-medium">{label}</div>
      {help ? <div className="text-xs text-gray-500">{help}</div> : null}
      <div className="mt-1 grid grid-cols-[1fr_auto_auto] items-center gap-2">
        <input type="range" min={0} max={max} step={0.005} value={Number.isFinite(value) ? value : 0}
               onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full" />
        <input type="number" min={0} max={max} step={0.01} value={Number.isFinite(value) ? value : 0}
               onChange={(e) => onChange(parseFloat(e.target.value))} className="w-24 rounded-lg border px-3 py-2" />
        <span className="text-gray-500">{pctS(value)}</span>
      </div>
    </label>
  );
}
function SelectPref({ value, onChange }: { value: Inputs["prefIntensity"]; onChange: (v: Inputs["prefIntensity"]) => void }) {
  return (
    <label className="text-sm w-full">
      <div className="font-medium">Preferentie-intensiteit</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Inputs["prefIntensity"])}
        className="mt-1 w-full rounded-lg border px-3 py-2"
      >
        <option value="geen">Geen</option>
        <option value="middel">Middel (±50% markt)</option>
        <option value="hoog">Hoog (±75% markt)</option>
      </select>
    </label>
  );
}

/** ========= simpele lijnchart (SVG, responsive) ========= */
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
      {values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={2} fill={color}>
        <title>{`${name} • m${i + 1}: ${yFmt(v)}`}</title>
      </circle>)}
      <text x={w - padX} y={y(values.at(-1) || 0) - 6} fontSize="10" textAnchor="end" fill={color}>{name}</text>
    </svg>
  );
}

/** ========= pagina ========= */
export default function LOESimple() {
  const [inp, setInp] = useState<Inputs>({
    horizon: 24,
    preNet: 25,        // € pre-LOE net per unit
    units: 10000,      // units/maand
    prefIntensity: "hoog",
    allowance: 0.04,   // 4% allowance binnen preferent
    freeExtraDisc: 0.08, // 8% extra korting op vrij volume
    tenderLoss: 0.30,  // 30% verlies in zkh
    tenderMonth: 6,    // na 6 maanden
  });

  const sim = useMemo(() => simulate(inp), [inp]);

  // Aanbevelingen (actiegericht, in mensentaal)
  const actions = useMemo(() => {
    const A: { title: string; detail: string }[] = [];
    if (sim.kpis.openGapEUR > 5) {
      const needPct = sim.kpis.openGapEUR / Math.max(1, inp.preNet);
      A.push({
        title: "Verlaag open-gap in vrij volume",
        detail: `Gap is ${eur(sim.kpis.openGapEUR, 0)}. Overweeg ~${pctS(needPct, 1)} extra korting op vrij volume om richting €5 te gaan.`,
      });
    }
    if (inp.prefIntensity !== "geen" && inp.allowance < 0.05) {
      A.push({
        title: "Borg allowance-traject in preferentie",
        detail: "Allowance <5% bij preferentie: maak med. noodzaak/uitzonderingen expliciet om verlies te beperken.",
      });
    }
    if (inp.tenderLoss >= 0.3) {
      A.push({
        title: "Anticipeer op tenderverlies",
        detail: "Tenderverlies ≥30%: overweeg bundelprijzen of value-add i.p.v. alleen korting.",
      });
    }
    return A.slice(0, 3);
  }, [sim.kpis.openGapEUR, inp.prefIntensity, inp.allowance, inp.tenderLoss, inp.preNet]);

  return (
    <div className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6 py-4 space-y-6">
      {/* Header */}
      <header className="rounded-2xl border bg-white p-4 sm:p-5">
        <h1 className="text-xl sm:text-2xl font-semibold">LOE Planner — Preferentie, Vrij volume, Ziekenhuis</h1>
        <p className="text-sm text-gray-700 mt-1">
          Stel <b>5 knoppen</b> af: preferentie, allowance, vrij-korting, tenderverlies & maand. KPI’s en grafieken updaten direct.
        </p>
      </header>

      {/* Stuurknoppen (compact & duidelijk) */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="grid gap-4 lg:grid-cols-3 sm:grid-cols-2">
          <FieldNumber label="Horizon (mnd)" value={inp.horizon} min={12} max={36} step={6}
            onChange={(v) => setInp(s => ({ ...s, horizon: clamp(Math.round(v), 12, 36) }))} />
          <FieldNumber label="Pre-LOE net €/unit" value={inp.preNet} min={1} step={1}
            onChange={(v) => setInp(s => ({ ...s, preNet: Math.max(0, v) }))} />
          <FieldNumber label="Units/maand (markt)" value={inp.units} min={100} step={500}
            onChange={(v) => setInp(s => ({ ...s, units: Math.max(0, Math.round(v)) }))} />

          <SelectPref value={inp.prefIntensity} onChange={(v) => setInp(s => ({ ...s, prefIntensity: v }))} />
          <FieldPct label="Allowance (ori binnen preferent)" value={inp.allowance} max={0.10}
            onChange={(v) => setInp(s => ({ ...s, allowance: clamp(v, 0, 0.10) }))} />
          <FieldPct label="Extra korting op vrij volume" value={inp.freeExtraDisc} max={0.15}
            onChange={(v) => setInp(s => ({ ...s, freeExtraDisc: clamp(v, 0, 0.15) }))} />

          <FieldPct label="Tenderverlies (zkh)" value={inp.tenderLoss} max={0.5}
            onChange={(v) => setInp(s => ({ ...s, tenderLoss: clamp(v, 0, 0.5) }))} />
          <FieldNumber label="Tender — maand" value={inp.tenderMonth} min={0} max={12} step={1}
            onChange={(v) => setInp(s => ({ ...s, tenderMonth: clamp(Math.round(v), 0, 12) }))} />
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Aannames (eenvoudig en uitlegbaar): generiek-net (preferent) = <b>20%</b> van pre-LOE net; vrij = <b>50%</b>; zkh = <b>45%</b>.
          Originator heeft een <b>net-floor</b> ≈ 42%. Vrij-aandeel reageert op de net-gap (elasticiteit).
        </p>
      </section>

      {/* KPI’s */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-base font-semibold mb-3">KPI’s (automatisch)</h2>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-500">Originator Net Sales — Jaar 1</div>
            <div className="text-lg font-semibold mt-1">{eur(sim.kpis.oriNetY1)}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-500">EBITDA — Jaar 1 (COGS {pctS(COGS)})</div>
            <div className="text-lg font-semibold mt-1">{eur(sim.kpis.ebitdaY1)}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-500">Eind-marktaandeel originator</div>
            <div className="text-lg font-semibold mt-1">{pctS(sim.kpis.endShare, 1)}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-500">Open-gap (vrij) — laatste maand</div>
            <div className="text-lg font-semibold mt-1">{eur(sim.kpis.openGapEUR, 0)}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-500">Segment-mix (verondersteld)</div>
            <div className="text-sm mt-1">
              Pref <b>{pctS(sim.kpis.mixPref)}</b> · Vrij <b>{pctS(sim.kpis.mixFree)}</b> · Zkh <b>{pctS(sim.kpis.mixHosp)}</b>
            </div>
          </div>
        </div>
      </section>

      {/* Aanbevelingen */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">Top aanbevelingen</h3>
          <span className="text-xs ml-auto rounded-full border bg-sky-50 text-sky-700 px-2 py-0.5">automatisch</span>
        </div>
        <ul className="mt-3 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))] text-sm">
          {actions.length ? actions.map((a, i) => (
            <li key={i} className="rounded-xl border p-3">
              <div className="font-medium">{a.title}</div>
              <div className="text-gray-700 mt-1">{a.detail}</div>
            </li>
          )) : <li className="text-gray-600">Geen acute acties — scenario binnen drempels.</li>}
        </ul>
      </section>

      {/* Grafieken */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h4 className="text-sm font-semibold mb-2">Originator Net Sales per maand</h4>
          <LineChart
            name="Net Sales ori"
            color="#0ea5e9"
            values={sim.points.map(p => p.nsOri)}
            yFmt={(v) => compact(v)}
          />
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <h4 className="text-sm font-semibold mb-2">Marktaandeel originator (%)</h4>
          <LineChart
            name="Share ori"
            color="#f59e0b"
            values={sim.points.map(p => p.shareOriTotal * 100)}
            yFmt={(v) => `${v.toFixed(0)}%`}
          />
        </div>
      </section>
    </div>
  );
}
