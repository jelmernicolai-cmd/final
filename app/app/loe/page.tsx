"use client";

import { useMemo, useState } from "react";

/** ===== helpers ===== */
const eur = (n: number, d = 0) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: d })
    .format(Number.isFinite(n) ? n : 0);
const pctS = (p: number, d = 1) => `${((Number.isFinite(p) ? p : 0) * 100).toFixed(d)}%`;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const compact = (n: number) =>
  new Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 1 })
    .format(Number.isFinite(n) ? n : 0);

/** ===== types ===== */
type Inputs = {
  horizon: number;        // maanden (12-36)
  preNet: number;         // €/unit pre-LOE net
  units: number;          // units/maand (markt)

  prefIntensity: "geen" | "middel" | "hoog"; // bepaalt marktmix per segment
  mnShare: number;        // 0..0.10  (medische noodzaak volume binnen preferentie)
  freeExtraDisc: number;  // 0..0.15  (extra korting op vrij volume, als fractie)
  tenderLoss: number;     // 0..0.50  (aandeelverlies in ziekenhuis)
  tenderMonth: number;    // 0..12    (moment tenderverlies)
};

type Point = {
  t: number;
  // segmentmix
  sharePref: number; shareFree: number; shareHosp: number;
  // shares binnen segment
  shareOriPref: number; shareOriFree: number; shareOriHosp: number;
  // netprijzen
  netOriPref: number; netGenPref: number;
  netOriFree: number; netGenFree: number;
  netOriHosp: number; netGenHosp: number;
  // omzet + totaal share
  nsOri: number; nsGen: number; shareOriTotal: number;
};

type Sim = {
  points: Point[];
  kpis: {
    oriNetY1: number;
    ebitdaY1: number;
    endShare: number;
    openGapEUR: number;
    mixPref: number; mixFree: number; mixHosp: number;
  };
};

/** ===== aannames (eenvoudig & uitlegbaar) ===== */
// Segmentmix o.b.v. preferentie-intensiteit
const prefMix = (i: Inputs) => {
  const pref = i.prefIntensity === "geen" ? 0 : i.prefIntensity === "middel" ? 0.5 : 0.75;
  const rest = 1 - pref;
  const free = rest * 0.7;  // vrij volume ≈ 70% van niet-preferent
  const hosp = rest * 0.3;  // ziekenhuis ≈ 30% van niet-preferent
  return { pref, free, hosp };
};
// Generiek net als % van pre-LOE net (typisch NL):
const GEN_PREF = 0.20; // preferentie ≈ 80% korting
const GEN_FREE = 0.50; // vrij volume
const GEN_HOSP = 0.45; // ziekenhuis iets scherper
// Originator: net-floor & vaste ziekenhuiskorting
const NET_FLOOR = 0.42;    // ori zakt niet onder 42% van pre-LOE net
const EXTRA_HOSP = 0.06;   // extra korting in ziekenhuis (vast)
// Vrij volume: aandeel is gevoelig voor net-gap
const BASE_FREE_SHARE = 0.55;
const ELASTICITY_FREE = 0.35;
// Simpele EBITDA-berekening (benadering)
const COGS = 0.20;

/** ===== simulatie ===== */
function simulate(i: Inputs): Sim {
  const { pref, free, hosp } = prefMix(i);
  const pts: Point[] = [];

  for (let t = 0; t < clamp(Math.round(i.horizon), 12, 36); t++) {
    const unitsPref = i.units * pref;
    const unitsFree = i.units * free;
    const unitsHosp = i.units * hosp;

    // Preferentie: carve-out voor originator op MN (medische noodzaak)
    const shareOriPref = clamp(i.mnShare, 0, 0.10);
    const netGenPref = i.preNet * GEN_PREF;
    const netOriPref = Math.max(i.preNet * (1 - i.freeExtraDisc), i.preNet * NET_FLOOR);

    // Vrij: prijzen + aandeel o.b.v. net-gap
    const netGenFree = i.preNet * GEN_FREE;
    const netOriFree = Math.max(i.preNet * (1 - i.freeExtraDisc), i.preNet * NET_FLOOR);
    const gapFree = netOriFree - netGenFree;
    const shareAdj = clamp(1 - ELASTICITY_FREE * (gapFree / Math.max(i.preNet, 1)), 0.05, 0.95);
    const shareOriFree = clamp(BASE_FREE_SHARE * shareAdj, 0.05, 0.95);

    // Ziekenhuis: tenderverlies vanaf tenderMonth (ramp 2 mnd)
    const beforeShareHosp = 0.70;
    const afterShareHosp = beforeShareHosp * (1 - clamp(i.tenderLoss, 0, 0.5));
    const ramp =
      t < i.tenderMonth ? 0 :
      t >= i.tenderMonth + 2 ? 1 :
      (t - i.tenderMonth) / 2;
    const shareOriHosp = clamp(beforeShareHosp + (afterShareHosp - beforeShareHosp) * ramp, 0.05, 0.95);
    const netGenHosp = i.preNet * GEN_HOSP;
    const netOriHosp = Math.max(i.preNet * (1 - EXTRA_HOSP), i.preNet * NET_FLOOR);

    // Omzet originator & generiek
    const nsOri =
      unitsPref * shareOriPref * netOriPref +
      unitsFree * shareOriFree * netOriFree +
      unitsHosp * shareOriHosp * netOriHosp;
    const nsGen =
      unitsPref * (1 - shareOriPref) * netGenPref +
      unitsFree * (1 - shareOriFree) * netGenFree +
      unitsHosp * (1 - shareOriHosp) * netGenHosp;

    // Totaalmarktaandeel ori
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
  const end = pts.at(-1)!;

  return {
    points: pts,
    kpis: {
      oriNetY1: y1.reduce((a, p) => a + p.nsOri, 0),
      ebitdaY1: y1.reduce((a, p) => a + p.nsOri, 0) * (1 - COGS),
      endShare: end.shareOriTotal,
      openGapEUR: (end.netOriFree ?? 0) - (end.netGenFree ?? 0),
      mixPref: pts[0]?.sharePref ?? 0,
      mixFree: pts[0]?.shareFree ?? 0,
      mixHosp: pts[0]?.shareHosp ?? 0,
    }
  };
}

/** ===== kleine UI bouwstenen ===== */
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
function FieldPct({
  label, value, onChange, max = 1, help,
}: {
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
function SelectPref({
  value, onChange,
}: { value: Inputs["prefIntensity"]; onChange: (v: Inputs["prefIntensity"]) => void }) {
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

/** ===== overlay line chart (2 reeksen) ===== */
function OverlayChart({
  title, series, yFmt = (v: number) => v.toFixed(0), height = 240,
}: {
  title: string;
  series: { name: string; color: string; values: number[] }[];
  yFmt?: (v: number) => string;
  height?: number;
}) {
  const w = 960, h = height, padX = 46, padY = 28;
  const maxLen = Math.max(1, ...series.map(s => s.values.length));
  const all = series.flatMap(s => s.values);
  const maxY = Math.max(1, ...all);
  const minY = 0;
  const x = (i: number) => padX + (i / Math.max(1, maxLen - 1)) * (w - 2 * padX);
  const y = (v: number) => h - padY - ((v - minY) / (maxY - minY)) * (h - 2 * padY);
  const ticks = Array.from({ length: 5 }, (_, i) => (maxY / 4) * i);

  return (
    <div className="w-full">
      <svg className="w-full h-auto" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={title} preserveAspectRatio="xMidYMid meet">
        <rect x={12} y={12} width={w - 24} height={h - 24} rx={16} fill="#fff" stroke="#e5e7eb" />
        {ticks.map((tv, i) => (
          <g key={i}>
            <line x1={padX} y1={y(tv)} x2={w - padX} y2={y(tv)} stroke="#f3f4f6" />
            <text x={padX - 8} y={y(tv) + 4} fontSize="10" textAnchor="end" fill="#6b7280">{yFmt(tv)}</text>
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

/** ===== pagina ===== */
export default function LOECompareSimple() {
  const [A, setA] = useState<Inputs>({
    horizon: 24, preNet: 25, units: 10000,
    prefIntensity: "middel",
    mnShare: 0.04,
    freeExtraDisc: 0.06,
    tenderLoss: 0.20,
    tenderMonth: 6,
  });
  const [B, setB] = useState<Inputs>({
    horizon: 24, preNet: 25, units: 10000,
    prefIntensity: "hoog",
    mnShare: 0.05,
    freeExtraDisc: 0.10,
    tenderLoss: 0.30,
    tenderMonth: 6,
  });

  const simA = useMemo(() => simulate(A), [A]);
  const simB = useMemo(() => simulate(B), [B]);

  // Deltas (B - A)
  const dNetY1 = simB.kpis.oriNetY1 - simA.kpis.oriNetY1;
  const dEbY1  = simB.kpis.ebitdaY1 - simA.kpis.ebitdaY1;
  const dShare = simB.kpis.endShare - simA.kpis.endShare;
  const dGap   = simB.kpis.openGapEUR - simA.kpis.openGapEUR;

  const copyAtoB = () => setB({ ...A });
  const swapAB = () => { const a = A; setA(B); setB(a); };
  const reset = () => {
    setA({ horizon: 24, preNet: 25, units: 10000, prefIntensity: "middel", mnShare: 0.04, freeExtraDisc: 0.06, tenderLoss: 0.20, tenderMonth: 6 });
    setB({ horizon: 24, preNet: 25, units: 10000, prefIntensity: "hoog",   mnShare: 0.05, freeExtraDisc: 0.10, tenderLoss: 0.30, tenderMonth: 6 });
  };

  return (
    <div className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6 py-4 space-y-6">
      {/* Header + compare bar */}
      <header className="rounded-2xl border bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">LOE – Scenariovergelijker (A vs. B)</h1>
            <p className="text-sm text-gray-700 mt-1">
              Twee scenario’s met 5 stuurknoppen: **preferentie**, **medische noodzaak volumes**, **vrij-korting**, **tenderverlies** en **tender-maand**.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={copyAtoB} className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Kopieer A → B</button>
            <button onClick={swapAB} className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Swap A ↔ B</button>
            <button onClick={reset} className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Reset</button>
          </div>
        </div>

        {/* Δ-KPI’s */}
        <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          <div className={`rounded-xl border p-3 ${dNetY1 >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
            <div className="text-xs text-gray-600">Δ Net Sales Y1 (B−A)</div>
            <div className="text-lg font-semibold mt-1">{eur(dNetY1)}</div>
          </div>
          <div className={`rounded-xl border p-3 ${dEbY1 >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
            <div className="text-xs text-gray-600">Δ EBITDA Y1 (B−A)</div>
            <div className="text-lg font-semibold mt-1">{eur(dEbY1)}</div>
          </div>
          <div className={`rounded-xl border p-3 ${dShare >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
            <div className="text-xs text-gray-600">Δ Eind-share ori (B−A)</div>
            <div className="text-lg font-semibold mt-1">{pctS(dShare, 1)}</div>
          </div>
          <div className={`rounded-xl border p-3 ${dGap <= 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
            <div className="text-xs text-gray-600">Δ Open-gap vrij (€) (B−A)</div>
            <div className="text-lg font-semibold mt-1">{eur(dGap, 0)}</div>
          </div>
        </div>
      </header>

      {/* Parameters A / B */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* A */}
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full" style={{ background: "#0ea5e9" }} />
            <h2 className="text-base font-semibold">Scenario A</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldNumber label="Horizon (mnd)" value={A.horizon} min={12} max={36} step={6}
              onChange={(v) => setA(s => ({ ...s, horizon: clamp(Math.round(v), 12, 36) }))} />
            <FieldNumber label="Pre-LOE net €/unit" value={A.preNet} min={1} step={1}
              onChange={(v) => setA(s => ({ ...s, preNet: Math.max(0, v) }))} />
            <FieldNumber label="Units/maand (markt)" value={A.units} min={100} step={500}
              onChange={(v) => setA(s => ({ ...s, units: Math.max(0, Math.round(v)) }))} />

            <SelectPref value={A.prefIntensity} onChange={(v) => setA(s => ({ ...s, prefIntensity: v }))} />
            <FieldPct label="Medische noodzaak volume (preferentie)" value={A.mnShare} max={0.10}
              help="Toegestaan originator-aandeel binnen preferentie (MN/uitzonderingen)." 
              onChange={(v) => setA(s => ({ ...s, mnShare: clamp(v, 0, 0.10) }))} />
            <FieldPct label="Extra korting op vrij volume" value={A.freeExtraDisc} max={0.15}
              onChange={(v) => setA(s => ({ ...s, freeExtraDisc: clamp(v, 0, 0.15) }))} />
            <FieldPct label="Tenderverlies (ziekenhuis)" value={A.tenderLoss} max={0.5}
              onChange={(v) => setA(s => ({ ...s, tenderLoss: clamp(v, 0, 0.5) }))} />
            <FieldNumber label="Tender — maand" value={A.tenderMonth} min={0} max={12} step={1}
              onChange={(v) => setA(s => ({ ...s, tenderMonth: clamp(Math.round(v), 0, 12) }))} />
          </div>

          {/* KPI's A */}
          <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))] text-sm">
            <div className="rounded-xl border p-3"><div className="text-xs text-gray-600">Net Sales — Jaar 1</div><div className="text-lg font-semibold mt-1">{eur(simA.kpis.oriNetY1)}</div></div>
            <div className="rounded-xl border p-3"><div className="text-xs text-gray-600">EBITDA — Jaar 1</div><div className="text-lg font-semibold mt-1">{eur(simA.kpis.ebitdaY1)}</div></div>
            <div className="rounded-xl border p-3"><div className="text-xs text-gray-600">Eind-share</div><div className="text-lg font-semibold mt-1">{pctS(simA.kpis.endShare, 1)}</div></div>
            <div className="rounded-xl border p-3"><div className="text-xs text-gray-600">Open-gap (vrij) m{A.horizon}</div><div className="text-lg font-semibold mt-1">{eur(simA.kpis.openGapEUR, 0)}</div></div>
          </div>
        </div>

        {/* B */}
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full" style={{ background: "#f59e0b" }} />
            <h2 className="text-base font-semibold">Scenario B</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldNumber label="Horizon (mnd)" value={B.horizon} min={12} max={36} step={6}
              onChange={(v) => setB(s => ({ ...s, horizon: clamp(Math.round(v), 12, 36) }))} />
            <FieldNumber label="Pre-LOE net €/unit" value={B.preNet} min={1} step={1}
              onChange={(v) => setB(s => ({ ...s, preNet: Math.max(0, v) }))} />
            <FieldNumber label="Units/maand (markt)" value={B.units} min={100} step={500}
              onChange={(v) => setB(s => ({ ...s, units: Math.max(0, Math.round(v)) }))} />

            <SelectPref value={B.prefIntensity} onChange={(v) => setB(s => ({ ...s, prefIntensity: v }))} />
            <FieldPct label="Medische noodzaak volume (preferentie)" value={B.mnShare} max={0.10}
              help="Toegestaan originator-aandeel binnen preferentie (MN/uitzonderingen)." 
              onChange={(v) => setB(s => ({ ...s, mnShare: clamp(v, 0, 0.10) }))} />
            <FieldPct label="Extra korting op vrij volume" value={B.freeExtraDisc} max={0.15}
              onChange={(v) => setB(s => ({ ...s, freeExtraDisc: clamp(v, 0, 0.15) }))} />
            <FieldPct label="Tenderverlies (ziekenhuis)" value={B.tenderLoss} max={0.5}
              onChange={(v) => setB(s => ({ ...s, tenderLoss: clamp(v, 0, 0.5) }))} />
            <FieldNumber label="Tender — maand" value={B.tenderMonth} min={0} max={12} step={1}
              onChange={(v) => setB(s => ({ ...s, tenderMonth: clamp(Math.round(v), 0, 12) }))} />
          </div>

          {/* KPI's B */}
          <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))] text-sm">
            <div className="rounded-xl border p-3"><div className="text-xs text-gray-600">Net Sales — Jaar 1</div><div className="text-lg font-semibold mt-1">{eur(simB.kpis.oriNetY1)}</div></div>
            <div className="rounded-xl border p-3"><div className="text-xs text-gray-600">EBITDA — Jaar 1</div><div className="text-lg font-semibold mt-1">{eur(simB.kpis.ebitdaY1)}</div></div>
            <div className="rounded-xl border p-3"><div className="text-xs text-gray-600">Eind-share</div><div className="text-lg font-semibold mt-1">{pctS(simB.kpis.endShare, 1)}</div></div>
            <div className="rounded-xl border p-3"><div className="text-xs text-gray-600">Open-gap (vrij) m{B.horizon}</div><div className="text-lg font-semibold mt-1">{eur(simB.kpis.openGapEUR, 0)}</div></div>
          </div>
        </div>
      </section>

      {/* Grafieken: overlay A/B */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-2">Originator Net Sales per maand</h3>
          <OverlayChart
            title="Net Sales"
            series={[
              { name: "A — Net Sales", color: "#0ea5e9", values: simA.points.map(p => p.nsOri) },
              { name: "B — Net Sales", color: "#f59e0b", values: simB.points.map(p => p.nsOri) },
            ]}
            yFmt={(v) => compact(v)}
          />
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-2">Marktaandeel originator (%)</h3>
          <OverlayChart
            title="Share %"
            series={[
              { name: "A — Share", color: "#0ea5e9", values: simA.points.map(p => p.shareOriTotal * 100) },
              { name: "B — Share", color: "#f59e0b", values: simB.points.map(p => p.shareOriTotal * 100) },
            ]}
            yFmt={(v) => `${v.toFixed(0)}%`}
          />
        </div>
      </section>

      {/* Korte toelichting */}
      <section className="rounded-2xl border bg-white p-4 text-xs text-gray-600">
        <p>
          <b>Medische noodzaak volume</b> = toegestaan originator-aandeel binnen preferentie (MN/uitzonderingen). 
          Generiek-net aanname: preferentie 20%, vrij 50%, ziekenhuis 45% van pre-LOE net. Originator heeft net-floor (~42%).
        </p>
      </section>
    </div>
  );
}
