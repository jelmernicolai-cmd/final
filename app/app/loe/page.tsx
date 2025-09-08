// app/app/loe/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/** ========= Kleine helpers ========= */
const eur = (n: number, digits = 0) =>
  new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: digits,
  }).format(n || 0);

const compact = (n: number) =>
  new Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);

const pctS = (p: number) => `${(p * 100).toFixed(0)}%`;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** ========= Inputs & Model ========= */
type Inputs = {
  horizon: number;          // maanden na LOE (simulatieperiode)
  list0: number;            // list price t=0
  baseUnits: number;        // units/maand vóór LOE
  gtn: number;              // GTN % (kortingen+rebates)
  cogs: number;             // COGS % van net sales
  entrants: number;         // # generieke concurrenten
  priceDropPerEntrant: number; // extra list-price-erosie/entrant (lineaire benadering)
  timeErosion12m: number;   // extra erosie over 12m (bovenop entrants-effect)
  netFloorOfPre: number;    // floor voor net price als % van pre-LOE net
  tenderMonth: number;      // maand van tender-schok
  tenderShareLoss: number;  // share verlies bij tender
  elasticity: number;       // volumegevoeligheid op prijsverschil
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
  tenderMonth: 6,
  tenderShareLoss: 0.15,
  elasticity: 0.20,
};

/** Prijs-erosie tegen de tijd (0..1 fractie van daling t.o.v. t=0 list) */
function erosionFrac(t: number, entrants: number, perEntrant: number, overTime12m: number) {
  const direct = Math.min(entrants * perEntrant, 0.95);              // max 95% voor veiligheid
  const overtime = Math.min((t / 12) * overTime12m, 0.50);           // max 50% extra in 36m
  return clamp(direct + overtime, 0, 0.98);
}

/** Originator share-retentie (0..1). Simpele curve: sneller verlies in het begin. */
function shareCurve(t: number, entrants: number) {
  const k = 0.10 + entrants * 0.05;
  const base = Math.exp(-k * t);          // daling versnelt bij meer entrants
  return clamp(base, 0.05, 1);            // niet lager dan 5%
}

function simulate(inp: Inputs) {
  const points: Point[] = [];
  const preNet = inp.list0 * (1 - inp.gtn); // referentie voor net-floor

  for (let t = 0; t < inp.horizon; t++) {
    // 1) Prijs
    const eros = erosionFrac(t, inp.entrants, inp.priceDropPerEntrant, inp.timeErosion12m);
    const list = inp.list0 * (1 - eros);
    let net = list * (1 - inp.gtn);
    net = Math.max(net, preNet * inp.netFloorOfPre); // net floor

    // 2) Share & tender
    let share = shareCurve(t, inp.entrants);
    if (t === inp.tenderMonth) {
      share = Math.max(0.05, share * (1 - inp.tenderShareLoss));
    }

    // 3) Elasticiteit (originator vaak duurder -> wat volume penalty)
    const relative = (net - preNet * 0.5) / (preNet || 1); // heuristiek vs “typische” generiek-net
    const elastAdj = 1 - clamp(relative * inp.elasticity, -0.5, 0.5);

    const units = Math.max(0, inp.baseUnits * share * elastAdj);
    const netSales = net * units;
    const cogsEur = netSales * inp.cogs;
    const ebitda = netSales - cogsEur; // opex buiten scope in deze simpele versie

    points.push({ t, list, net, share, units, netSales, cogsEur, ebitda });
  }

  // KPI’s
  const sum = (f: (p: Point) => number) => points.reduce((a, p) => a + f(p), 0);
  const y1 = points.slice(0, 12);
  const kpis = {
    netY1: y1.reduce((a, p) => a + p.netSales, 0),
    netTotal: sum((p) => p.netSales),
    ebitdaTotal: sum((p) => p.ebitda),
    avgShareY1: y1.reduce((a, p) => a + p.share, 0) / (y1.length || 1),
    endShare: points.at(-1)?.share ?? 0,
    endNet: points.at(-1)?.net ?? 0,
  };

  return { points, kpis, preNet };
}

/** ========= Heel simpele, mooie lijnchart (SVG, geen libs) ========= */
function LineChart({
  name, values, color = "#0ea5e9", height = 220, yFmt = (v: number) => v.toFixed(0),
}: {
  name: string;
  values: number[];
  color?: string;
  height?: number;
  yFmt?: (v: number) => string;
}) {
  const w = 960;
  const h = height;
  const padX = 40;
  const padY = 26;

  const n = values.length || 1;
  const maxY = Math.max(1, Math.max(...values));
  const minY = 0;

  const x = (i: number) => padX + (i / Math.max(1, n - 1)) * (w - 2 * padX);
  const y = (v: number) => h - padY - ((v - minY) / (maxY - minY)) * (h - 2 * padY);

  const ticks = Array.from({ length: 5 }, (_, i) => (maxY / 4) * i);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");

  return (
    <svg className="w-full" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={name}>
      <rect x={12} y={12} width={w - 24} height={h - 24} rx={16} fill="#fff" stroke="#e5e7eb" />
      {ticks.map((tv, i) => (
        <g key={i}>
          <line x1={padX} y1={y(tv)} x2={w - padX} y2={y(tv)} stroke="#f3f4f6" />
          <text x={padX - 8} y={y(tv) + 3} fontSize="10" textAnchor="end" fill="#6b7280">
            {yFmt(tv)}
          </text>
        </g>
      ))}
      <path d={d} fill="none" stroke={color} strokeWidth={2} />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={2} fill={color} />
      ))}
      <text x={w - padX} y={y(values.at(-1) || 0) - 6} fontSize="10" textAnchor="end" fill={color}>
        {name}
      </text>
    </svg>
  );
}

/** ========= UI-componenten ========= */
function FieldNumber({
  label, value, onChange, step = 1, min, max, suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <label className="text-sm">
      <div className="font-medium">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number"
          value={value}
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
  label, value, onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="text-sm">
      <div className="font-medium">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-40"
        />
        <input
          type="number"
          step={0.01}
          min={0}
          max={1}
          value={value}
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
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
      {help ? <div className="text-xs text-gray-500 mt-1">{help}</div> : null}
    </div>
  );
}

/** ========= Pagina ========= */
export default function LOEPageSimple() {
  const [inp, setInp] = useState<Inputs>({ ...DEFAULTS });

  const { points, kpis, preNet } = useMemo(() => simulate(inp), [inp]);

  // Grafiekreeksen
  const sNet = points.map((p) => p.netSales);
  const sShare = points.map((p) => p.share * 100);
  const sNetPrice = points.map((p) => p.net);

  // Snelle presets: conservatief vs assertief
  function applyPreset(type: "conservative" | "assertive") {
    if (type === "conservative") {
      setInp((s) => ({
        ...s,
        entrants: 1,
        priceDropPerEntrant: 0.08,
        timeErosion12m: 0.03,
        netFloorOfPre: 0.55,
        tenderShareLoss: 0.10,
      }));
    } else {
      setInp((s) => ({
        ...s,
        entrants: 4,
        priceDropPerEntrant: 0.12,
        timeErosion12m: 0.06,
        netFloorOfPre: 0.40,
        tenderShareLoss: 0.20,
      }));
    }
  }

  // Inzichten (concreet en actiegericht)
  const biggestDrivers = [
    { key: "Net price floor", impact: Math.abs(inp.netFloorOfPre - 0.45), hint: "Verken hogere floor (bijv. +5pp) als IRP/Z-index ruimte laat." },
    { key: "Tender share loss", impact: Math.abs(inp.tenderShareLoss - 0.15), hint: "Shield tender met bonus-op-realisatie i.p.v. front-end korting." },
    { key: "Aantal entrants", impact: inp.entrants / 10, hint: "Plan portfolio-strategie (eigen generiek/autorisatie) om erosie te dempen." },
    { key: "GTN%", impact: Math.abs(inp.gtn - 0.25), hint: "Herijk GTN met staffels; verschuif naar performance-bonussen." },
  ]
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Loss of Exclusivity – Simpele Scenario Tool</h1>
          <p className="text-gray-600 text-sm">
            Vul de belangrijkste aannames in en zie direct de impact op omzet, prijs en marktaandeel. Ontworpen voor snelle, professionele “what-if”.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/waterfall" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Waterfall</Link>
          <Link href="/app/consistency" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Consistency</Link>
        </div>
      </header>

      {/* Uitlegblok */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-base font-semibold">Hoe deze tool rekent</h2>
        <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
          <li><b>Prijs na LOE</b> = <i>list</i> met erosie (entrants + tijd) → <i>net</i> via jouw GTN%, met bodempagina (<b>net floor</b>) t.o.v. pre-LOE net.</li>
          <li><b>Marktaandeel</b> daalt volgens een eenvoudige curve; op de tender-maand pas ik een extra daling toe.</li>
          <li><b>Volume</b> = baseline × share × elasticiteitseffect (duurdere originator → iets minder volume).</li>
          <li><b>EBITDA</b> ≈ Net sales − COGS (opex buiten scope om het simpel te houden).</li>
        </ul>
      </section>

      {/* KPI’s */}
      <section className="grid md:grid-cols-4 gap-4">
        <Kpi title="Net sales – Jaar 1" value={eur(kpis.netY1)} />
        <Kpi title="Net sales – 36 mnd" value={eur(kpis.netTotal)} />
        <Kpi title="EBITDA – 36 mnd" value={eur(kpis.ebitdaTotal)} />
        <Kpi title="Eind-netto prijs" value={eur(kpis.endNet, 0)} help={`Pre-LOE net = ${eur(preNet, 0)}`} />
      </section>

      {/* Invoer – kort en krachtig */}
      <section className="rounded-2xl border bg-white p-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FieldNumber label="Horizon (maanden)" value={inp.horizon} min={12} max={72} step={6}
          onChange={(v) => setInp(s => ({ ...s, horizon: v }))} />
        <FieldNumber label="List price t=0 (€)" value={inp.list0} min={1} step={5}
          onChange={(v) => setInp(s => ({ ...s, list0: v }))} />
        <FieldNumber label="Units/maand (pre-LOE)" value={inp.baseUnits} min={100} step={500}
          onChange={(v) => setInp(s => ({ ...s, baseUnits: v }))} />

        <FieldPct label="GTN %" value={inp.gtn}
          onChange={(v) => setInp(s => ({ ...s, gtn: clamp(v, 0, 0.8) }))} />
        <FieldPct label="COGS %" value={inp.cogs}
          onChange={(v) => setInp(s => ({ ...s, cogs: clamp(v, 0, 0.9) }))} />

        <FieldNumber label="# entrants" value={inp.entrants} min={0} max={8} step={1}
          onChange={(v) => setInp(s => ({ ...s, entrants: Math.round(clamp(v, 0, 8)) }))} />
        <FieldPct label="Prijsdruk per entrant" value={inp.priceDropPerEntrant}
          onChange={(v) => setInp(s => ({ ...s, priceDropPerEntrant: clamp(v, 0, 0.4) }))} />
        <FieldPct label="Extra erosie per 12m" value={inp.timeErosion12m}
          onChange={(v) => setInp(s => ({ ...s, timeErosion12m: clamp(v, 0, 0.5) }))} />
        <FieldPct label="Net price floor (vs pre-LOE net)" value={inp.netFloorOfPre}
          onChange={(v) => setInp(s => ({ ...s, netFloorOfPre: clamp(v, 0.2, 1) }))} />

        <FieldNumber label="Tender (maand)" value={inp.tenderMonth} min={0} max={71} step={1}
          onChange={(v) => setInp(s => ({ ...s, tenderMonth: Math.round(clamp(v, 0, s.horizon - 1)) }))} />
        <FieldPct label="Tender share-verlies" value={inp.tenderShareLoss}
          onChange={(v) => setInp(s => ({ ...s, tenderShareLoss: clamp(v, 0, 0.8) }))} />
        <FieldPct label="Elasticiteit" value={inp.elasticity}
          onChange={(v) => setInp(s => ({ ...s, elasticity: clamp(v, 0, 1) }))} />
      </section>

      {/* Presets */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => applyPreset("conservative")} className="text-sm rounded border px-3 py-1.5 hover:bg-gray-50">
            Preset: Conservatief
          </button>
          <button onClick={() => applyPreset("assertive")} className="text-sm rounded border px-3 py-1.5 hover:bg-gray-50">
            Preset: Assertief (meer druk)
          </button>
          <button onClick={() => setInp({ ...DEFAULTS })} className="text-sm rounded border px-3 py-1.5 hover:bg-gray-50">
            Reset
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Presets passen alleen erosie-, tender- en floor-parameters aan; je eigen prijs/volume/GTN/COGS blijven leidend.
        </p>
      </section>

      {/* Grafieken */}
      <section className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-2">Net sales per maand</h3>
          <LineChart name="Net sales" values={sNet} color="#0ea5e9" yFmt={(v) => compact(v)} />
          <p className="text-xs text-gray-600 mt-2">
            Tip: test <b>Net price floor</b> en <b>GTN%</b> om te zien hoe je omzet langer kunt beschermen zonder onhoudbare front-end kortingen.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-2">Originator marktaandeel (%)</h3>
          <LineChart name="Share %" values={sShare} color="#f59e0b" yFmt={(v) => `${v.toFixed(0)}%`} />
          <p className="text-xs text-gray-600 mt-2">
            Tender op maand <b>{inp.tenderMonth}</b> veroorzaakt een sprong omlaag. Verlaag <b>Tender share-verlies</b> door minder front-end korting en meer bonus op realisatie.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 lg:col-span-2">
          <h3 className="text-base font-semibold mb-2">Netto prijs per unit (€)</h3>
          <LineChart name="Net €/unit" values={sNetPrice} color="#22c55e" yFmt={(v) => new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(v)} />
          <p className="text-xs text-gray-600 mt-2">
            Je <b>pre-LOE net</b> is {eur(preNet, 0)}. De <b>net floor</b> voorkomt een “free fall” en helpt marges bewaken, maar kan share kosten bij hoge elasticiteit.
          </p>
        </div>
      </section>

      {/* Concrete inzichten & acties */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold">Aanbevolen acties (automatisch op basis van je aannames)</h3>
        <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-2">
          {biggestDrivers.map((d) => (
            <li key={d.key}>
              <b>{d.key}:</b> {d.hint}
            </li>
          ))}
          <li>
            <b>Heronderhandel GTN-mix</b>: verschuif een deel van front-end korting naar <i>bonus op realisatie</i> om post-LOE erosie te dempen zonder
            structurele prijsverlagingen.
          </li>
          <li>
            <b>Voorbereiding tender</b>: plan scenario’s met lagere <i>Tender share-verlies</i> en latere tendermaand; toets samen met Market Access & Finance.
          </li>
          <li>
            <b>Portfolio-strategie</b>: overweeg eigen generiek of autorisatie-constructie om erosie door <i>Entrants</i> te absorberen in plaats van alleen defensief te prijzen.
          </li>
        </ul>
      </section>
    </div>
  );
}
