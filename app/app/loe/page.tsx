"use client";

import { useMemo, useState } from "react";

/** ============ Helpers ============ */
const eur = (n: number, d = 0) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: d })
    .format(Number.isFinite(n) ? n : 0);
const pctS = (p: number, d = 1) =>
  `${((Number.isFinite(p) ? p : 0) * 100).toFixed(d)}%`;
const compact = (n: number) =>
  new Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 1 })
    .format(Number.isFinite(n) ? n : 0);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** ============ Types ============ */
type Inputs = {
  /** Basis */
  horizon: number;          // maanden
  list0: number;            // €/unit pre-LOE
  baseUnits: number;        // units/maand
  gtn: number;              // 0..1 (pre-LOE GTN)
  cogs: number;             // 0..1 van net (EBITDA = net * (1 - cogs))

  /** Segmenten (som ≈ 1) */
  segPreferent: number;     // 0..1
  segVrij: number;          // 0..1
  segZkh: number;           // 0..1

  /** Preferentiebeleid */
  prefStartM: number;       // maand vanaf LOE
  prefRampM: number;        // ramp-in maanden
  prefOriginatorAllowance: number; // 0..0.15 (med. noodzaak/uitzondering)
  prefGenericNetOfPre: number;     // 0.15..0.35 (≈ 65–85% korting t.o.v. pre-LOE net)

  /** Vrij volume (open retail/wholesale) */
  openGenericNetOfPre: number;     // 0.35..0.6
  openOriginatorAddlDisc: number;  // extra korting 0..0.4 t.o.v. pre-LOE net
  openElasticity: number;          // 0..1 (hoe gevoelig share is voor net-gap)
  openBaseShare: number;           // 0.3..0.8 (startpunt aandeel ori in vrij segment)
  openTargetGapEUR: number;        // gewenste max gap (€/unit) voor aanbeveling

  /** Ziekenhuis (tender) */
  hospBaseShare: number;           // 0.3..0.9 (ori vóór tender)
  hospTenderMonth: number;         // maand
  hospTenderLoss: number;          // 0..0.9 (proportioneel verlies van ori-share)
  hospRampM: number;               // ramp naar nieuw niveau
  hospGenericNetOfPre: number;     // 0.35..0.55
  hospOriginatorAddlDisc: number;  // extra korting 0..0.4 vs pre-LOE net

  /** Net-floor */
  netFloorOfPre: number;           // 0.3..1 (minimaal ori net vs pre-LOE net)
};

type Point = {
  t: number;
  unitsPref: number;
  unitsOpen: number;
  unitsHosp: number;

  /** Net €/unit per segment */
  netOriPref: number;
  netGenPref: number;
  netOriOpen: number;
  netGenOpen: number;
  netOriHosp: number;
  netGenHosp: number;

  /** Shares per segment */
  shareOriPref: number;
  shareOriOpen: number;
  shareOriHosp: number;

  /** Totals per maand */
  netSalesOri: number;
  netSalesGen: number;
  shareOriTotal: number;   // gewogen totaal
};

type KPIs = {
  oriNetY1: number;
  oriNetH: number;
  oriEBITDAH: number;
  genNetY1: number;
  totalNetH: number;
  endShareOri: number;

  mixPref: number;
  mixOpen: number;
  mixHosp: number;

  endOpenGapEUR: number;
};

/** ============ Defaults & Presets ============ */
const DEFAULTS: Inputs = {
  horizon: 36,
  list0: 100,
  baseUnits: 12000,
  gtn: 0.25,
  cogs: 0.20,

  segPreferent: 0.65,
  segVrij: 0.20,
  segZkh: 0.15,

  prefStartM: 0,
  prefRampM: 2,
  prefOriginatorAllowance: 0.05,
  prefGenericNetOfPre: 0.20, // ≈ 80% korting t.o.v. pre-LOE net

  openGenericNetOfPre: 0.48,
  openOriginatorAddlDisc: 0.08,
  openElasticity: 0.35,
  openBaseShare: 0.55,
  openTargetGapEUR: 5,

  hospBaseShare: 0.70,
  hospTenderMonth: 6,
  hospTenderLoss: 0.25,
  hospRampM: 2,
  hospGenericNetOfPre: 0.45,
  hospOriginatorAddlDisc: 0.06,

  netFloorOfPre: 0.42,
};

const PRESETS: Record<string, Partial<Inputs>> = {
  "Preferentie hoog (verzekeraar)":
    { segPreferent: 0.75, segVrij: 0.15, segZkh: 0.10, prefStartM: 0, prefRampM: 2, prefOriginatorAllowance: 0.03, prefGenericNetOfPre: 0.18, openGenericNetOfPre: 0.52 },
  "Retail-gedreven (wholesale)":
    { segPreferent: 0.45, segVrij: 0.40, segZkh: 0.15, openGenericNetOfPre: 0.46, openOriginatorAddlDisc: 0.12, openElasticity: 0.45, openBaseShare: 0.6 },
  "Ziekenhuis zwaar (tenders)":
    { segPreferent: 0.40, segVrij: 0.20, segZkh: 0.40, hospBaseShare: 0.65, hospTenderMonth: 4, hospTenderLoss: 0.35, hospRampM: 2, hospGenericNetOfPre: 0.42 },
  "Geleidelijke adoptie":
    { prefStartM: 3, prefRampM: 4, prefOriginatorAllowance: 0.07, openGenericNetOfPre: 0.50, openOriginatorAddlDisc: 0.06, hospTenderMonth: 9, hospTenderLoss: 0.18 },
};

/** ============ Core model ============ */
function simulate(inp: Inputs) {
  const points: Point[] = [];
  const preNet = inp.list0 * (1 - inp.gtn); // referentie

  const ramp = (t: number, start: number, rampM: number) => {
    if (t < start) return 0;
    if (rampM <= 0) return 1;
    return clamp((t - start) / rampM, 0, 1);
  };

  for (let t = 0; t < inp.horizon; t++) {
    const unitsTotal = inp.baseUnits;

    // Segment volumes (constante mix; preferent bouwt via ramp “effectief” op via share)
    const unitsPref = unitsTotal * inp.segPreferent;
    const unitsOpen = unitsTotal * inp.segVrij;
    const unitsHosp = unitsTotal * inp.segZkh;

    /** Preferentiebeleid */
    const prefOn = ramp(t, inp.prefStartM, inp.prefRampM);   // 0→1
    const shareOriPref = clamp(inp.prefOriginatorAllowance * prefOn, 0, 0.15);
    const netGenPref = preNet * inp.prefGenericNetOfPre;
    const netOriPref = Math.max(preNet * (1 - inp.openOriginatorAddlDisc), preNet * inp.netFloorOfPre); // ori maakt zelden deal in preferent; neem basis/open als bovengrens

    /** Vrij volume (open retail/wholesale) */
    const netGenOpen = preNet * inp.openGenericNetOfPre;
    const netOriOpen = Math.max(preNet * (1 - inp.openOriginatorAddlDisc), preNet * inp.netFloorOfPre);
    // lineaire share-respons op net-gap, rond baseShare
    const rel = (netOriOpen - netGenOpen) / Math.max(1, preNet);
    const shareAdj = clamp(1 - inp.openElasticity * rel, 0.05, 0.95);
    const shareOriOpen = clamp(inp.openBaseShare * shareAdj, 0.05, 0.95);

    /** Ziekenhuis (tender) */
    const m = inp.hospTenderMonth;
    const tgt = inp.hospBaseShare * (1 - inp.hospTenderLoss);
    const tenderPhase = t < m ? 0 : clamp((t - m) / Math.max(1, inp.hospRampM), 0, 1);
    const shareOriHosp = clamp(inp.hospBaseShare * (1 - tenderPhase * inp.hospTenderLoss), 0.05, 0.95);
    const netGenHosp = preNet * inp.hospGenericNetOfPre;
    const netOriHosp = Math.max(preNet * (1 - inp.hospOriginatorAddlDisc), preNet * inp.netFloorOfPre);

    /** Netto’s × units → Net Sales per segment */
    const nsOriPref = unitsPref * shareOriPref * netOriPref;
    const nsGenPref = unitsPref * (1 - shareOriPref) * netGenPref;

    const nsOriOpen = unitsOpen * shareOriOpen * netOriOpen;
    const nsGenOpen = unitsOpen * (1 - shareOriOpen) * netGenOpen;

    const nsOriHosp = unitsHosp * shareOriHosp * netOriHosp;
    const nsGenHosp = unitsHosp * (1 - shareOriHosp) * netGenHosp;

    const netSalesOri = nsOriPref + nsOriOpen + nsOriHosp;
    const netSalesGen = nsGenPref + nsGenOpen + nsGenHosp;

    const shareOriTotal =
      (unitsPref * shareOriPref + unitsOpen * shareOriOpen + unitsHosp * shareOriHosp) /
      Math.max(1, unitsTotal);

    points.push({
      t,
      unitsPref, unitsOpen, unitsHosp,
      netOriPref, netGenPref,
      netOriOpen, netGenOpen,
      netOriHosp, netGenHosp,
      shareOriPref, shareOriOpen, shareOriHosp,
      netSalesOri, netSalesGen, shareOriTotal,
    });
  }

  const y1 = points.slice(0, Math.min(12, points.length));
  const sum = (f: (p: Point) => number) => points.reduce((a, p) => a + f(p), 0);

  const kpis: KPIs = {
    oriNetY1: y1.reduce((a, p) => a + p.netSalesOri, 0),
    oriNetH: sum((p) => p.netSalesOri),
    oriEBITDAH: sum((p) => p.netSalesOri) * (1 - clamp(DEFAULTS.cogs, 0, 0.95)), // cogs uit active inputs zetten we later
    genNetY1: y1.reduce((a, p) => a + p.netSalesGen, 0),
    totalNetH: sum((p) => p.netSalesOri + p.netSalesGen),
    endShareOri: points.at(-1)?.shareOriTotal ?? 0,

    mixPref: (points.reduce((a, p) => a + p.unitsPref, 0) / (points.length * (DEFAULTS.baseUnits || 1))) || 0,
    mixOpen: (points.reduce((a, p) => a + p.unitsOpen, 0) / (points.length * (DEFAULTS.baseUnits || 1))) || 0,
    mixHosp: (points.reduce((a, p) => a + p.unitsHosp, 0) / (points.length * (DEFAULTS.baseUnits || 1))) || 0,

    endOpenGapEUR: Math.max(0, (points.at(-1)?.netOriOpen ?? 0) - (points.at(-1)?.netGenOpen ?? 0)),
  };

  return { points, kpis, preNet };
}

/** ============ UI helpers ============ */
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
  label, value, onChange, min = 0, max = 1, help,
}: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; help?: string;
}) {
  return (
    <label className="text-sm w-full">
      <div className="font-medium">{label}</div>
      {help ? <div className="text-xs text-gray-500">{help}</div> : null}
      <div className="mt-1 grid grid-cols-[1fr_auto_auto] items-center gap-2">
        <input type="range" min={min} max={max} step={0.005} value={Number.isFinite(value) ? value : 0}
               onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full" />
        <input type="number" min={min} max={max} step={0.01} value={Number.isFinite(value) ? value : 0}
               onChange={(e) => onChange(parseFloat(e.target.value))} className="w-24 rounded-lg border px-3 py-2" />
        <span className="text-gray-500">{pctS(value)}</span>
      </div>
    </label>
  );
}
function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`px-2 py-1 rounded-full text-[11px] border ${ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
      {label}
    </span>
  );
}

/** ============ Charts (SVG) ============ */
function MultiLineChart({
  name, series, yFmt = (v: number) => v.toFixed(0), height = 220,
}: {
  name: string;
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
    <svg className="w-full h-auto" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={name} preserveAspectRatio="xMidYMid meet">
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
  );
}

/** ============ Page ============ */
const COLORS = { A: "#0ea5e9", B: "#f59e0b", Gen: "#10b981" };

export default function LOEPlanner() {
  const [A, setA] = useState<Inputs>({ ...DEFAULTS });
  const [B, setB] = useState<Inputs>({
    ...DEFAULTS,
    segPreferent: 0.70,
    segVrij: 0.20,
    segZkh: 0.10,
    prefOriginatorAllowance: 0.03,
    openOriginatorAddlDisc: 0.12,
    hospTenderMonth: 4,
    hospTenderLoss: 0.30,
  });
  const [active, setActive] = useState<"A" | "B">("A");

  const simA = useMemo(() => simulate(A), [A]);
  const simB = useMemo(() => simulate(B), [B]);

  // Correcte EBITDA met respectievelijke cogs
  const kpisA = { ...simA.kpis, oriEBITDAH: simA.kpis.oriNetH * (1 - clamp(A.cogs, 0, 0.95)) };
  const kpisB = { ...simB.kpis, oriEBITDAH: simB.kpis.oriNetH * (1 - clamp(B.cogs, 0, 0.95)) };

  const seriesNet = [
    { name: "Originator — A", color: COLORS.A, values: simA.points.map(p => p.netSalesOri) },
    { name: "Generieken — A", color: COLORS.Gen, values: simA.points.map(p => p.netSalesGen) },
    { name: "Originator — B", color: COLORS.B, values: simB.points.map(p => p.netSalesOri) },
  ];
  const seriesShare = [
    { name: "Share ori — A", color: COLORS.A, values: simA.points.map(p => p.shareOriTotal * 100) },
    { name: "Share ori — B", color: COLORS.B, values: simB.points.map(p => p.shareOriTotal * 100) },
  ];

  // Acties / aanbevelingen
  const actions = useMemo(() => {
    const act: { title: string; detail: string }[] = [];
    const a = active === "A" ? A : B;
    const sim = active === "A" ? simA : simB;

    // 1) Open gap → voorstel extra korting tot target gap
    const gap = sim.kpis.endOpenGapEUR;
    if (gap > a.openTargetGapEUR) {
      const need = Math.max(0, gap - a.openTargetGapEUR);         // € nodig
      const extraDiscPct = need / Math.max(1, sim.preNet);         // als % van preNet
      act.push({
        title: "Verlaag gap in vrij volume",
        detail: `Open gap is ${eur(gap,0)}. Overweeg ~${pctS(extraDiscPct,1)} extra korting op vrij volume om gap≈${eur(a.openTargetGapEUR,0)} te bereiken.`,
      });
    }

    // 2) Preferent allowance zeer laag?
    const lastPrefShareOri = (sim.points.at(-1)?.shareOriPref ?? 0);
    if (a.segPreferent > 0.6 && lastPrefShareOri < 0.04) {
      act.push({
        title: "Minimaliseer preferentieverlies via uitzonderingstraject",
        detail: "Allowance <4% bij hoog preferent aandeel. Borg medische noodzaak-flows en P1-SKU’s met dossier-proces.",
      });
    }

    // 3) Tenderverlies groot?
    const hospDrop = Math.max(0, a.hospTenderLoss);
    if (a.segZkh >= 0.2 && hospDrop >= 0.3) {
      act.push({
        title: "Tender-strategie aanscherpen",
        detail: "Ziekenhuissegment ≥20% en tenderverlies ≥30%. Overweeg bundelprijzen of value-add (educatie/logistiek) i.p.v. puur korting.",
      });
    }

    // 4) Mix: preferent >70% → focus op vrij & zkh
    if (a.segPreferent >= 0.7) {
      act.push({
        title: "Focus op vrij/zkh segmenten",
        detail: "Preferent domineert. Stuur op wholesaledeals (staffels, bonus) en klinische inzet voor ziekenhuizen.",
      });
    }

    return act.slice(0, 3);
  }, [active, A, B, simA, simB]);

  const setActiveInputs = (fn: (i: Inputs) => Inputs) =>
    active === "A" ? setA(fn(A)) : setB(fn(B));

  const applyPreset = (name: keyof typeof PRESETS) =>
    setActiveInputs(i => ({ ...i, ...PRESETS[name] }));

  const bump = (field: keyof Inputs, delta: number, min = -Infinity, max = Infinity) =>
    setActiveInputs(i => ({ ...i, [field]: clamp((i as any)[field] + delta, min as number, max as number) } as Inputs));

  return (
    <div className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6 py-4 space-y-6">
      {/* Header */}
      <header className="rounded-2xl border bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold truncate">LOE Planner — Preferentie • Vrij volume • Ziekenhuis</h1>
            <p className="text-sm text-gray-700">
              Plan scenario’s bij patentverloop: preferentiebeleid (80%+ korting), wholesale-deals op vrij volume, en ziekenhuistenders.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActive("A")} className={`text-sm rounded border px-3 py-2 ${active==="A"?"bg-gray-50":""}`}>Bewerk A</button>
            <button onClick={() => setActive("B")} className={`text-sm rounded border px-3 py-2 ${active==="B"?"bg-gray-50":""}`}>Bewerk B</button>
          </div>
        </div>

        {/* Compacte vergelijking */}
        <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: COLORS.A }} /> Scenario A
            </div>
            <div className="text-sm flex flex-wrap gap-x-6 gap-y-1">
              <span>Net Y1: <b>{eur(kpisA.oriNetY1)}</b></span>
              <span>Eind share: <b>{pctS(kpisA.endShareOri)}</b></span>
            </div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: COLORS.B }} /> Scenario B
            </div>
            <div className="text-sm flex flex-wrap gap-x-6 gap-y-1">
              <span>Net Y1: <b>{eur(kpisB.oriNetY1)}</b></span>
              <span>Eind share: <b>{pctS(kpisB.endShareOri)}</b></span>
            </div>
          </div>
        </div>
      </header>

      {/* Presets & What-ifs */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Presets & What-ifs ({active})</h2>
          <div className="flex gap-2 text-xs">
            <button onClick={() => applyPreset("Preferentie hoog (verzekeraar)")} className="rounded border px-3 py-1.5 hover:bg-gray-50">Preferentie hoog</button>
            <button onClick={() => applyPreset("Retail-gedreven (wholesale)")} className="rounded border px-3 py-1.5 hover:bg-gray-50">Retail-gedreven</button>
            <button onClick={() => applyPreset("Ziekenhuis zwaar (tenders)")} className="rounded border px-3 py-1.5 hover:bg-gray-50">Zkh zwaar</button>
            <button onClick={() => applyPreset("Geleidelijke adoptie")} className="rounded border px-3 py-1.5 hover:bg-gray-50">Geleidelijk</button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <button onClick={() => bump("openOriginatorAddlDisc", +0.02, 0, 0.4)} className="rounded border px-3 py-1.5 hover:bg-gray-50">Vrij: +2pp korting</button>
          <button onClick={() => bump("openOriginatorAddlDisc", -0.02, 0, 0.4)} className="rounded border px-3 py-1.5 hover:bg-gray-50">Vrij: −2pp korting</button>
          <button onClick={() => bump("prefOriginatorAllowance", +0.02, 0, 0.15)} className="rounded border px-3 py-1.5 hover:bg-gray-50">Allowance +2pp</button>
          <button onClick={() => bump("hospTenderLoss", +0.05, 0, 0.9)} className="rounded border px-3 py-1.5 hover:bg-gray-50">Tenderverlies +5pp</button>
          <button onClick={() => bump("hospTenderLoss", -0.05, 0, 0.9)} className="rounded border px-3 py-1.5 hover:bg-gray-50">Tenderverlies −5pp</button>
        </div>
      </section>

      {/* Parameters — compact en duidelijk, volledig responsive */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold mb-3">Parameters ({active})</h3>
        <div className="grid gap-4 lg:grid-cols-3 sm:grid-cols-2 grid-cols-1">
          {/* Basis */}
          <FieldNumber label="Horizon (mnd)" value={(active==="A"?A:B).horizon} min={12} max={72} step={6}
            onChange={(v)=>setActiveInputs(i=>({...i,horizon:Math.round(clamp(v,12,72))}))}/>
          <FieldNumber label="List €/unit t=0" value={(active==="A"?A:B).list0} min={1} step={1}
            onChange={(v)=>setActiveInputs(i=>({...i,list0:Math.max(0,v)}))}/>
          <FieldNumber label="Units/maand (markt)" value={(active==="A"?A:B).baseUnits} min={100} step={500}
            onChange={(v)=>setActiveInputs(i=>({...i,baseUnits:Math.max(0,Math.round(v))}))}/>
          <FieldPct label="GTN % (pre-LOE)" value={(active==="A"?A:B).gtn}
            onChange={(v)=>setActiveInputs(i=>({...i,gtn:clamp(v,0,0.8)}))}/>
          <FieldPct label="COGS % (vs net)" value={(active==="A"?A:B).cogs}
            onChange={(v)=>setActiveInputs(i=>({...i,cogs:clamp(v,0,0.95)}))}/>
          <FieldPct label="Net-floor vs pre-LOE net" value={(active==="A"?A:B).netFloorOfPre}
            onChange={(v)=>setActiveInputs(i=>({...i,netFloorOfPre:clamp(v,0.3,1)}))}/>

          {/* Mix */}
          <FieldPct label="Segment — Preferent" value={(active==="A"?A:B).segPreferent}
            onChange={(v)=>setActiveInputs(i=>({...i,segPreferent:clamp(v,0,0.95), segVrij: clamp(i.segVrij,0,1-v-i.segZkh)}))}/>
          <FieldPct label="Segment — Vrij" value={(active==="A"?A:B).segVrij}
            onChange={(v)=>setActiveInputs(i=>({...i,segVrij:clamp(v,0,1-i.segPreferent-i.segZkh)}))}/>
          <FieldPct label="Segment — Ziekenhuis" value={(active==="A"?A:B).segZkh}
            onChange={(v)=>setActiveInputs(i=>({...i,segZkh:clamp(v,0,1-i.segPreferent-i.segVrij)}))}/>

          {/* Preferent */}
          <FieldNumber label="Preferent start (mnd)" value={(active==="A"?A:B).prefStartM} min={0} step={1}
            onChange={(v)=>setActiveInputs(i=>({...i,prefStartM:Math.max(0,Math.round(v))}))}/>
          <FieldNumber label="Preferent ramp (mnd)" value={(active==="A"?A:B).prefRampM} min={0} step={1}
            onChange={(v)=>setActiveInputs(i=>({...i,prefRampM:Math.max(0,Math.round(v))}))}/>
          <FieldPct label="Allowance (ori binnen preferent)" value={(active==="A"?A:B).prefOriginatorAllowance}
            onChange={(v)=>setActiveInputs(i=>({...i,prefOriginatorAllowance:clamp(v,0,0.15)}))}/>
          <FieldPct label="Generiek-net % (preferent)" value={(active==="A"?A:B).prefGenericNetOfPre}
            onChange={(v)=>setActiveInputs(i=>({...i,prefGenericNetOfPre:clamp(v,0.15,0.35)}))}/>

          {/* Vrij */}
          <FieldPct label="Generiek-net % (vrij)" value={(active==="A"?A:B).openGenericNetOfPre}
            onChange={(v)=>setActiveInputs(i=>({...i,openGenericNetOfPre:clamp(v,0.35,0.6)}))}/>
          <FieldPct label="Ori extra korting (vrij)" value={(active==="A"?A:B).openOriginatorAddlDisc}
            onChange={(v)=>setActiveInputs(i=>({...i,openOriginatorAddlDisc:clamp(v,0,0.4)}))}/>
          <FieldPct label="Elasticiteit (vrij)" value={(active==="A"?A:B).openElasticity}
            onChange={(v)=>setActiveInputs(i=>({...i,openElasticity:clamp(v,0,1)}))}/>
          <FieldPct label="Base share ori (vrij)" value={(active==="A"?A:B).openBaseShare}
            onChange={(v)=>setActiveInputs(i=>({...i,openBaseShare:clamp(v,0.3,0.8)}))}/>
          <FieldNumber label="Target gap (€/u) vrij" value={(active==="A"?A:B).openTargetGapEUR} min={0} step={1}
            onChange={(v)=>setActiveInputs(i=>({...i,openTargetGapEUR:Math.max(0,Math.round(v))}))}/>

          {/* Ziekenhuis */}
          <FieldPct label="Base share ori (zkh)" value={(active==="A"?A:B).hospBaseShare}
            onChange={(v)=>setActiveInputs(i=>({...i,hospBaseShare:clamp(v,0.3,0.9)}))}/>
          <FieldNumber label="Tender maand" value={(active==="A"?A:B).hospTenderMonth} min={0} step={1}
            onChange={(v)=>setActiveInputs(i=>({...i,hospTenderMonth:Math.max(0,Math.round(v))}))}/>
          <FieldPct label="Tenderverlies (ori)" value={(active==="A"?A:B).hospTenderLoss}
            onChange={(v)=>setActiveInputs(i=>({...i,hospTenderLoss:clamp(v,0,0.9)}))}/>
          <FieldNumber label="Ramp (mnd)" value={(active==="A"?A:B).hospRampM} min={0} step={1}
            onChange={(v)=>setActiveInputs(i=>({...i,hospRampM:Math.max(0,Math.round(v))}))}/>
          <FieldPct label="Generiek-net % (zkh)" value={(active==="A"?A:B).hospGenericNetOfPre}
            onChange={(v)=>setActiveInputs(i=>({...i,hospGenericNetOfPre:clamp(v,0.35,0.55)}))}/>
          <FieldPct label="Ori extra korting (zkh)" value={(active==="A"?A:B).hospOriginatorAddlDisc}
            onChange={(v)=>setActiveInputs(i=>({...i,hospOriginatorAddlDisc:clamp(v,0,0.4)}))}/>
        </div>

        {/* Sanity badges */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge ok={(active==="A"?A:B).segPreferent + (active==="A"?A:B).segVrij + (active==="A"?A:B).segZkh <= 1.001} label="Segmenten ≤ 100%" />
          <Badge ok={(active==="A"?A:B).prefGenericNetOfPre <= 0.25 ? true : false} label="Preferent ~80% korting" />
          <Badge ok={(active==="A"?A:B).openTargetGapEUR <= 10} label="Gap-target realistisch" />
        </div>
      </section>

      {/* Actie-kader */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">Top aanbevelingen ({active})</h3>
          <span className="text-xs ml-auto rounded-full border bg-sky-50 text-sky-700 px-2 py-0.5">automatisch</span>
        </div>
        <ul className="mt-3 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))] text-sm">
          {actions.length ? actions.map((a,i)=>(
            <li key={i} className="rounded-xl border p-3">
              <div className="font-medium">{a.title}</div>
              <div className="text-gray-700 mt-1">{a.detail}</div>
            </li>
          )) : <li className="text-gray-600">Geen acute acties; scenario ligt binnen drempels.</li>}
        </ul>
      </section>

      {/* KPI’s per scenario */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold mb-3">KPI’s — Originator (Y1/Horizon) & Mix</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {[{ name:"Scenario A", col: COLORS.A, k: kpisA }, { name:"Scenario B", col: COLORS.B, k: kpisB }].map(({name,col,k})=>(
            <div key={name} className="rounded-2xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full" style={{background:col}} />
                <div className="font-semibold">{name}</div>
              </div>
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))] text-sm">
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-gray-500">Net Sales (Y1)</div>
                  <div className="text-lg font-semibold mt-1">{eur(k.oriNetY1)}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-gray-500">EBITDA (Horizon)</div>
                  <div className="text-lg font-semibold mt-1">{eur(k.oriEBITDAH)}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-gray-500">Eind-share ori</div>
                  <div className="text-lg font-semibold mt-1">{pctS(k.endShareOri)}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-gray-500">Segment-mix</div>
                  <div className="text-sm mt-1">
                    Pref <b>{pctS(k.mixPref)}</b> · Vrij <b>{pctS(k.mixOpen)}</b> · Zkh <b>{pctS(k.mixHosp)}</b>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Delta B t.o.v. A */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold mb-3">Verschil B t.o.v. A — besluitkader</h3>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] text-sm">
          {(() => {
            const dNetY1 = kpisB.oriNetY1 - kpisA.oriNetY1;
            const dEBITDA = kpisB.oriEBITDAH - kpisA.oriEBITDAH;
            const dShare = kpisB.endShareOri - kpisA.endShareOri;
            return (
              <>
                <div className={`rounded-xl border p-3 ${dNetY1>=0?"bg-emerald-50 border-emerald-200":"bg-rose-50 border-rose-200"}`}>
                  <div className="text-xs text-gray-700">Δ Net Sales (Y1)</div>
                  <div className="text-lg font-semibold mt-1">{dNetY1>=0?"+":"−"}{eur(Math.abs(dNetY1))}</div>
                </div>
                <div className={`rounded-xl border p-3 ${dEBITDA>=0?"bg-emerald-50 border-emerald-200":"bg-rose-50 border-rose-200"}`}>
                  <div className="text-xs text-gray-700">Δ EBITDA (Horizon)</div>
                  <div className="text-lg font-semibold mt-1">{dEBITDA>=0?"+":"−"}{eur(Math.abs(dEBITDA))}</div>
                </div>
                <div className={`rounded-xl border p-3 ${dShare>=0?"bg-emerald-50 border-emerald-200":"bg-amber-50 border-amber-200"}`}>
                  <div className="text-xs text-gray-700">Δ Eind-share (pp)</div>
                  <div className="text-lg font-semibold mt-1">{(Math.abs(dShare)*100).toFixed(1)}pp {dShare>=0? "↑":"↓"}</div>
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* Grafieken */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-2">Net sales per maand</h3>
          <MultiLineChart
            name="Net sales"
            series={seriesNet}
            yFmt={(v)=>compact(v)}
          />
          <p className="text-xs text-gray-600 mt-2">Lijnen: Ori A/B en Generieken A. (Generieken B volgt trendmatig.)</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-2">Marktaandeel originator (%)</h3>
          <MultiLineChart
            name="Share %"
            series={seriesShare}
            yFmt={(v)=>`${v.toFixed(0)}%`}
          />
          <p className="text-xs text-gray-600 mt-2">Preferentie en tender verlagen het niveau; vrij volume kun je sturen met net-gap.</p>
        </div>
      </section>
    </div>
  );
}
