"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

const pctS = (p: number, d = 0) => `${(p * 100).toFixed(d)}%`;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;

/** ========= Inputs & Model ========= */
export type Inputs = {
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
  // Optioneel voor planners: mix ziekenhuis/ambulant (heeft vaak ander tenderprofiel)
  hospMix: number;          // % van volume in ziekenhuis-kanaal
  hospTenderExtraLoss: number; // extra share-verlies bij tender in ziekenhuizen
};

export type Point = {
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
  hospMix: 0.45,
  hospTenderExtraLoss: 0.10,
};

type Scenario = {
  id: string;
  name: string;
  color: string;
  inputs: Inputs;
  pinned?: boolean; // voor vaste referentie (bijv. “Base case”)
};

type SimResult = {
  points: Point[];
  kpis: {
    netY1: number;
    netTotal: number;
    ebitdaTotal: number;
    avgShareY1: number;
    endShare: number;
    endNet: number;
    volLossY1: number;
    grossToNetLeakY1: number; // indicatieve GTN leakage jaar 1
  };
  preNet: number;
};

const COLORS = [
  "#0ea5e9", // cyan/sky
  "#f59e0b", // amber
  "#22c55e", // green
  "#ef4444", // red
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#e11d48", // rose
];

/** Prijs-erosie tegen de tijd (0..1 fractie van daling t.o.v. t=0 list) */
function erosionFrac(t: number, entrants: number, perEntrant: number, overTime12m: number) {
  const direct = Math.min(entrants * perEntrant, 0.95);
  const overtime = Math.min((t / 12) * overTime12m, 0.50);
  return clamp(direct + overtime, 0, 0.98);
}

/** Originator share-retentie (0..1). Snellere daling bij meer entrants. */
function shareCurve(t: number, entrants: number) {
  const k = 0.10 + entrants * 0.05;
  const base = Math.exp(-k * t);
  return clamp(base, 0.05, 1);
}

function simulate(inp: Inputs): SimResult {
  const points: Point[] = [];
  const preNet = inp.list0 * (1 - inp.gtn); // referentie voor net-floor

  for (let t = 0; t < inp.horizon; t++) {
    // 1) Prijs
    const eros = erosionFrac(t, inp.entrants, inp.priceDropPerEntrant, inp.timeErosion12m);
    const list = inp.list0 * (1 - eros);
    let net = list * (1 - inp.gtn);
    net = Math.max(net, preNet * inp.netFloorOfPre); // net floor

    // 2) Share & tender (kanaalverschil ziekenhuizen vs ambulant)
    const baseShare = shareCurve(t, inp.entrants);
    const tenderHitBase = t === inp.tenderMonth ? inp.tenderShareLoss : 0;
    const tenderHitHosp = t === inp.tenderMonth ? inp.tenderShareLoss + inp.hospTenderExtraLoss : 0;

    const shareHosp = Math.max(0.05, baseShare * (1 - tenderHitHosp));
    const shareRetail = Math.max(0.05, baseShare * (1 - tenderHitBase));
    const share = clamp(inp.hospMix * shareHosp + (1 - inp.hospMix) * shareRetail, 0.05, 1);

    // 3) Elasticiteit (originator duurder t.o.v. “typische” generiek-net ~ 50% preNet)
    const relative = (net - preNet * 0.5) / (preNet || 1);
    const elastAdj = 1 - clamp(relative * inp.elasticity, -0.5, 0.5);

    const units = Math.max(0, inp.baseUnits * share * elastAdj);
    const netSales = net * units;
    const cogsEur = netSales * inp.cogs;
    const ebitda = netSales - cogsEur; // opex buiten scope

    points.push({ t, list, net, share, units, netSales, cogsEur, ebitda });
  }

  // KPI’s
  const sum = (arr: Point[], f: (p: Point) => number) => arr.reduce((a, p) => a + f(p), 0);
  const y1 = points.slice(0, Math.min(12, points.length));
  const netY1 = sum(y1, (p) => p.netSales);
  const grossY1 = sum(y1, (p) => p.list * p.units);
  const gtnLeak = grossY1 > 0 ? 1 - netY1 / grossY1 : 0;

  const kpis = {
    netY1,
    netTotal: sum(points, (p) => p.netSales),
    ebitdaTotal: sum(points, (p) => p.ebitda),
    avgShareY1: y1.reduce((a, p) => a + p.share, 0) / (y1.length || 1),
    endShare: points.at(-1)?.share ?? 0,
    endNet: points.at(-1)?.net ?? 0,
    volLossY1: 1 - (sum(y1, (p) => p.units) / (inp.baseUnits * (y1.length || 1) || 1)), // vs pre-LOE run-rate
    grossToNetLeakY1: gtnLeak,
  };

  return { points, kpis, preNet };
}

/** ========= Charts ========= */
function MultiLineChart({
  series,
  height = 240,
  yFmt = (v: number) => v.toFixed(0),
  name,
}: {
  series: { name: string; color: string; values: number[] }[];
  height?: number;
  yFmt?: (v: number) => string;
  name: string;
}) {
  const w = 960;
  const h = height;
  const padX = 46;
  const padY = 28;

  const maxLen = Math.max(1, ...series.map((s) => s.values.length));
  const allVals = series.flatMap((s) => s.values);
  const maxY = Math.max(1, ...allVals);
  const minY = 0;

  const x = (i: number) => padX + (i / Math.max(1, maxLen - 1)) * (w - 2 * padX);
  const y = (v: number) => h - padY - ((v - minY) / (maxY - minY)) * (h - 2 * padY);

  const ticks = Array.from({ length: 5 }, (_, i) => (maxY / 4) * i);

  // Voor export naar PNG: zet ref op SVG
  const svgRef = useRef<SVGSVGElement | null>(null);

  return (
    <div className="w-full">
      <svg ref={svgRef} className="w-full" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={name} data-chart-name={name}>
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
              {s.values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={2} fill={s.color} />
              ))}
              <text x={w - padX} y={y(s.values.at(-1) || 0) - 6} fontSize="10" textAnchor="end" fill={s.color}>
                {s.name}
              </text>
            </g>
          );
        })}
      </svg>
      <ChartExportButtons svgRef={svgRef} />
    </div>
  );
}

function ChartExportButtons({ svgRef }: { svgRef: React.RefObject<SVGSVGElement> }) {
  // Exporteer SVG naar PNG (client-side, zonder libs)
  const exportPNG = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const rect = svgEl.viewBox.baseVal || { width: 960, height: 240, x: 0, y: 0 };
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        const name = svgEl.getAttribute("data-chart-name") || "chart";
        a.download = `${name}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        URL.revokeObjectURL(url);
      });
    };
    img.src = url;
  };

  const exportSVG = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const data = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const name = svgEl.getAttribute("data-chart-name") || "chart";
    a.download = `${name}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="mt-2 flex gap-2">
      <button onClick={exportPNG} className="text-xs rounded border px-2 py-1 hover:bg-gray-50">Export PNG</button>
      <button onClick={exportSVG} className="text-xs rounded border px-2 py-1 hover:bg-gray-50">Export SVG</button>
    </div>
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
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-40"
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
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
      {help ? <div className="text-xs text-gray-500 mt-1">{help}</div> : null}
    </div>
  );
}

/** ========= Export helpers ========= */
function toCSV(rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    if (typeof v === "number") return String(v);
    const needsQuote = /[",;\n]/.test(v);
    const s = v.replace(/"/g, '""');
    return needsQuote ? `"${s}"` : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

function downloadFile(name: string, mime: string, content: string | Blob) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** ========= Pagina ========= */
export default function LOEPlannerPro() {
  // Scenario beheer
  const [scenarios, setScenarios] = useState<Scenario[]>(() => {
    // probeer te laden uit URL-hash (shareable)
    try {
      const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
      if (hash) {
        const decoded = JSON.parse(atob(decodeURIComponent(hash)));
        if (Array.isArray(decoded) && decoded.length) return decoded;
      }
    } catch {}
    // default: Base + Assertief
    return [
      { id: cryptoId(), name: "Base case", color: COLORS[0], inputs: { ...DEFAULTS }, pinned: true },
      {
        id: cryptoId(),
        name: "Assertief (meer druk)",
        color: COLORS[1],
        inputs: {
          ...DEFAULTS,
          entrants: 4,
          priceDropPerEntrant: 0.12,
          timeErosion12m: 0.06,
          netFloorOfPre: 0.40,
          tenderShareLoss: 0.20,
          hospTenderExtraLoss: 0.15,
        },
      },
    ];
  });

  // actief geselecteerd scenario om te bewerken
  const [activeId, setActiveId] = useState<string>(() => scenarios[0]?.id);
  useEffect(() => {
    if (!scenarios.find((s) => s.id === activeId) && scenarios[0]) setActiveId(scenarios[0].id);
  }, [scenarios, activeId]);

  const active = scenarios.find((s) => s.id === activeId)!;

  // Simulaties
  const sims = useMemo(() => {
    return scenarios.map((s) => ({ s, sim: simulate(s.inputs) }));
  }, [scenarios]);

  // Series voor charts
  const seriesNet = sims.map(({ s, sim }) => ({ name: s.name, color: s.color, values: sim.points.map((p) => p.netSales) }));
  const seriesShare = sims.map(({ s, sim }) => ({ name: s.name, color: s.color, values: sim.points.map((p) => p.share * 100) }));
  const seriesNetPrice = sims.map(({ s, sim }) => ({ name: s.name, color: s.color, values: sim.points.map((p) => p.net) }));

  // KPI vergelijking (plus diffs vs pinned “Base case” indien aanwezig)
  const base = sims.find(({ s }) => s.pinned)?.sim;
  const kpiCompare = sims.map(({ s, sim }) => ({
    scenario: s.name,
    color: s.color,
    netY1: sim.kpis.netY1,
    netTotal: sim.kpis.netTotal,
    ebitdaTotal: sim.kpis.ebitdaTotal,
    avgShareY1: sim.kpis.avgShareY1,
    endShare: sim.kpis.endShare,
    endNet: sim.kpis.endNet,
    volLossY1: sim.kpis.volLossY1,
    gtnLeak: sim.kpis.grossToNetLeakY1,
    vsBase: base
      ? {
          netY1: sim.kpis.netY1 - base.kpis.netY1,
          netTotal: sim.kpis.netTotal - base.kpis.netTotal,
          ebitdaTotal: sim.kpis.ebitdaTotal - base.kpis.ebitdaTotal,
          avgShareY1: sim.kpis.avgShareY1 - base.kpis.avgShareY1,
          endShare: sim.kpis.endShare - base.kpis.endShare,
          endNet: sim.kpis.endNet - base.kpis.endNet,
        }
      : undefined,
    preNet: sim.preNet,
  }));

  // Deelbare link
  const updateShareLink = () => {
    const payload = encodeURIComponent(btoa(JSON.stringify(scenarios)));
    window.location.hash = payload;
  };

  // Export: alle punten (met scenario-kolom) en KPI’s
  const exportAllCSV = () => {
    const header = ["scenario", "t", "list", "net", "share", "units", "netSales", "cogsEur", "ebitda"];
    const rows: (string | number)[][] = [header];
    sims.forEach(({ s, sim }) => {
      sim.points.forEach((p) => {
        rows.push([s.name, p.t, round(p.list, 2), round(p.net, 2), round(p.share, 4), Math.round(p.units), Math.round(p.netSales), Math.round(p.cogsEur), Math.round(p.ebitda)]);
      });
    });
    downloadFile("loe_scenarios_points.csv", "text/csv;charset=utf-8", toCSV(rows));
  };

  const exportKPIsCSV = () => {
    const header = ["scenario", "netY1", "netTotal", "ebitdaTotal", "avgShareY1", "endShare", "endNet", "volLossY1", "gtnLeakY1", "preNet"];
    const rows: (string | number)[][] = [header];
    kpiCompare.forEach((r) => {
      rows.push([
        r.scenario,
        Math.round(r.netY1),
        Math.round(r.netTotal),
        Math.round(r.ebitdaTotal),
        round(r.avgShareY1, 4),
        round(r.endShare, 4),
        round(r.endNet, 2),
        round(r.volLossY1, 4),
        round(r.gtnLeak, 4),
        round(r.preNet, 2),
      ]);
    });
    downloadFile("loe_scenarios_kpis.csv", "text/csv;charset=utf-8", toCSV(rows));
  };

  const exportJSON = () => {
    const data = JSON.stringify(scenarios, null, 2);
    downloadFile("loe_scenarios.json", "application/json;charset=utf-8", data);
  };

  // Scenario acties
  const addScenario = () => {
    const i = scenarios.length % COLORS.length;
    setScenarios((arr) => [
      ...arr,
      { id: cryptoId(), name: `Scenario ${arr.length + 1}`, color: COLORS[i], inputs: { ...DEFAULTS } },
    ]);
  };
  const duplicateScenario = (id: string) => {
    const src = scenarios.find((s) => s.id === id);
    if (!src) return;
    const i = scenarios.length % COLORS.length;
    setScenarios((arr) => [...arr, { id: cryptoId(), name: `${src.name} (copy)`, color: COLORS[i], inputs: { ...src.inputs } }]);
  };
  const removeScenario = (id: string) => {
    setScenarios((arr) => {
      const s = arr.find((x) => x.id === id);
      if (s?.pinned) return arr; // base case niet verwijderen
      return arr.filter((x) => x.id !== id);
    });
  };
  const updateScenario = (id: string, fn: (prev: Scenario) => Scenario) => {
    setScenarios((arr) => arr.map((s) => (s.id === id ? fn(s) : s)));
  };

  // Inzichten op basis van actief scenario
  const { sim: activeSim } = sims.find(({ s }) => s.id === activeId)!;
  const { preNet } = activeSim;

  const biggestDrivers = useMemo(() => {
    const s = active.inputs;
    return [
      { key: "Net price floor", impact: Math.abs(s.netFloorOfPre - 0.45), hint: "Verken hogere floor (+5pp) als IRP/Z-index ruimte laat." },
      { key: "Tender share loss", impact: Math.abs(s.tenderShareLoss - 0.15), hint: "Shield tender met bonus-op-realisatie i.p.v. front-end korting." },
      { key: "Aantal entrants", impact: s.entrants / 10, hint: "Plan eigen generiek/autorisatie om erosie te absorberen." },
      { key: "GTN%", impact: Math.abs(s.gtn - 0.25), hint: "Herijk staffels; verplaats naar performance-bonussen." },
    ]
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3);
  }, [active]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Loss of Exclusivity – Scenario Planner (Pro)</h1>
          <p className="text-gray-600 text-sm">
            Bouw meerdere scenario’s, vergelijk KPI’s en exporteer onderbouwing. Ontworpen voor Market Access & Commercial Finance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportAllCSV} className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Export punten (CSV)</button>
          <button onClick={exportKPIsCSV} className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Export KPI’s (CSV)</button>
          <button onClick={exportJSON} className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Export scenario’s (JSON)</button>
          <button onClick={updateShareLink} className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Deelbare link</button>
        </div>
      </header>

      {/* Snelle navigatie */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link href="/app/waterfall" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Waterfall</Link>
        <Link href="/app/consistency" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Consistency</Link>
      </div>

      {/* Scenario lijst / beheer */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Scenario’s</h2>
          <div className="flex gap-2">
            <button onClick={addScenario} className="text-sm rounded border px-3 py-1.5 hover:bg-gray-50">+ Nieuw scenario</button>
            <button
              onClick={() => duplicateScenario(activeId)}
              className="text-sm rounded border px-3 py-1.5 hover:bg-gray-50"
            >
              Dupliceer actief
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenarios.map((sc) => (
            <div key={sc.id} className={`rounded-xl border p-3 ${activeId === sc.id ? "ring-2 ring-offset-2 ring-sky-300" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: sc.color }} />
                  <input
                    value={sc.name}
                    onChange={(e) => updateScenario(sc.id, (prev) => ({ ...prev, name: e.target.value }))}
                    className="text-sm font-medium border rounded px-2 py-1"
                  />
                  {sc.pinned ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 border text-gray-600">Base</span>
                  ) : (
                    <button
                      onClick={() => updateScenario(sc.id, (prev) => ({ ...prev, pinned: true }))}
                      className="text-[10px] px-1.5 py-0.5 rounded border hover:bg-gray-50"
                      title="Maak base case"
                    >
                      Pin
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setActiveId(sc.id)} className="text-xs rounded border px-2 py-1 hover:bg-gray-50">Bewerk</button>
                  <button
                    onClick={() => duplicateScenario(sc.id)}
                    className="text-xs rounded border px-2 py-1 hover:bg-gray-50"
                    title="Dupliceer"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => removeScenario(sc.id)}
                    className="text-xs rounded border px-2 py-1 hover:bg-gray-50 disabled:opacity-40"
                    disabled={!!sc.pinned}
                    title={sc.pinned ? "Base case kan niet worden verwijderd" : "Verwijder"}
                  >
                    Verwijder
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Entrants {sc.inputs.entrants}, GTN {pctS(sc.inputs.gtn)}, Floor {pctS(sc.inputs.netFloorOfPre)}, Tender m{sc.inputs.tenderMonth}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Invoer actief scenario */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold mb-2">Parameters – {active.name}</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FieldNumber label="Horizon (maanden)" value={active.inputs.horizon} min={12} max={72} step={6}
            onChange={(v) => updateScenario(active.id, (prev) => ({ ...prev, inputs: { ...prev.inputs, horizon: Math.round(v) } }))} />
          <FieldNumber label="List price t=0 (€)" value={active.inputs.list0} min={1} step={5}
            onChange={(v) => updateScenario(active.id, (prev) => ({ ...prev, inputs: { ...prev.inputs, list0: v } }))} />
          <FieldNumber label="Units/maand (pre-LOE)" value={active.inputs.baseUnits} min={100} step={500}
            onChange={(v) => updateScenario(active.id, (prev) => ({ ...prev, inputs: { ...prev.inputs, baseUnits: v } }))} />

          <FieldPct label="GTN %" value={active.inputs.gtn}
            onChange={(v) => updateScenario(active.id, (prev) => ({ ...prev, inputs: { ...prev.inputs, gtn: clamp(v, 0, 0.8) } }))} />
          <FieldPct label="COGS %" value={active.inputs.cogs}
            onChange={(v) => updateScenario(active.id, (prev) => ({ ...prev, inputs: { ...prev.inputs, cogs: clamp(v, 0, 0.9) } }))} />

          <FieldNumber label="# entrants" value={active.inputs.entrants} min={0} max={8} step={1}
            onChange={(v) => updateScenario(active.id, (prev) => ({ ...prev, inputs: { ...prev.inputs, entrants: Math.round(clamp(v, 0, 8)) } }))} />
          <FieldPct label="Prijsdruk per entrant" value={active.inputs.priceDropPerEntrant}
            onChange={(v) => updateScenario(active.id, (prev) => ({ ...prev, inputs: { ...prev.inputs, priceDropPerEntrant: clamp(v, 0, 0.4) } }))} />
          <FieldPct label="Extra erosie per 12m" value={active.inputs.timeErosion12m}
            onChange={(v) => updateScenario(active.id, (prev) => ({ ...prev, inputs: { ...prev.inputs, timeErosion12m: clamp(v, 0, 0.5) } }))} />
          <FieldPct label="Net price floor (vs pre-LOE net)" value={active.inputs.netFloorOfPre}
            onChange={(v) => updateScenario(active.id, (prev) => ({ ...prev, inputs: { ...prev.inputs, netFloorOfPre: clamp(v, 0.2, 1) } }))} />

          <FieldNumber label="Tender (maand)" value={active.inputs.tenderMonth} min={0} max={71} step={1}
            onChange={(v) => updateScenario(active.id, (prev) => ({
              ...prev,
              inputs: { ...prev.inputs, tenderMonth: Math.round(clamp(v, 0, prev.inputs.horizon - 1)) },
            }))} />
          <FieldPct label="Tender share-verlies" value={active.inputs.tenderShareLoss}
            onChange={(v) => updateScenario(active.id, (prev) => ({ ...prev, inputs: { ...prev.inputs, tenderShareLoss: clamp(v, 0, 0.8) } }))} />
          <FieldPct label="Elasticiteit" value={active.inputs.elasticity}
            onChange={(v) => updateScenario(active.id, (prev) => ({ ...prev, inputs: { ...prev.inputs, elasticity: clamp(v, 0, 1) } }))} />

          <FieldPct label="Ziekenhuismix (volume %)" value={active.inputs.hospMix}
            onChange={(v) => updateScenario(active.id, (prev) => ({ ...prev, inputs: { ...prev.inputs, hospMix: clamp(v, 0, 1) } }))} />
          <FieldPct label="Extra tenderverlies in ziekenhuizen" value={active.inputs.hospTenderExtraLoss}
            onChange={(v) => updateScenario(active.id, (prev) => ({ ...prev, inputs: { ...prev.inputs, hospTenderExtraLoss: clamp(v, 0, 0.5) } }))} />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Tip: pas <b>net floor</b>, <b>GTN%</b> en <b>tendermoment</b> aan voor realistische access-scenario’s per kanaal. Pre-LOE net is {eur(preNet, 0)}.
        </p>
      </section>

      {/* KPI’s – vergelijking */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold mb-3">KPI vergelijking</h3>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Scenario</th>
                <th className="py-2 pr-4">Net sales – Y1</th>
                <th className="py-2 pr-4">Net sales – Horizon</th>
                <th className="py-2 pr-4">EBITDA – Horizon</th>
                <th className="py-2 pr-4">Ø Share Y1</th>
                <th className="py-2 pr-4">Eind-share</th>
                <th className="py-2 pr-4">Eind-net €/u</th>
                <th className="py-2 pr-4">Volumeverlies Y1</th>
                <th className="py-2 pr-4">GTN leakage Y1</th>
                {base && <th className="py-2 pr-4">Δ Net Y1 vs Base</th>}
              </tr>
            </thead>
            <tbody>
              {kpiCompare.map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2 pr-4">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                      {r.scenario}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{eur(r.netY1)}</td>
                  <td className="py-2 pr-4">{eur(r.netTotal)}</td>
                  <td className="py-2 pr-4">{eur(r.ebitdaTotal)}</td>
                  <td className="py-2 pr-4">{pctS(r.avgShareY1, 1)}</td>
                  <td className="py-2 pr-4">{pctS(r.endShare, 1)}</td>
                  <td className="py-2 pr-4">{eur(r.endNet, 0)}</td>
                  <td className="py-2 pr-4">{pctS(r.volLossY1, 1)}</td>
                  <td className="py-2 pr-4">{pctS(r.gtnLeak, 1)}</td>
                  {base && (
                    <td className="py-2 pr-4">
                      <span className={r.vsBase!.netY1 >= 0 ? "text-emerald-600" : "text-rose-600"}>
                        {eur(Math.abs(r.vsBase!.netY1))} {r.vsBase!.netY1 >= 0 ? "↑" : "↓"}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Snelle kaartjes voor actief scenario */}
        <div className="grid md:grid-cols-4 gap-4 mt-4">
          <Kpi title="Net sales – Jaar 1" value={eur(activeSim.kpis.netY1)} />
          <Kpi title="Net sales – Horizon" value={eur(activeSim.kpis.netTotal)} />
          <Kpi title="EBITDA – Horizon" value={eur(activeSim.kpis.ebitdaTotal)} />
          <Kpi title="Eind-netto prijs" value={eur(activeSim.kpis.endNet, 0)} help={`Pre-LOE net = ${eur(preNet, 0)}`} />
        </div>
      </section>

      {/* Grafieken – vergelijking multi-line */}
      <section className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-2">Net sales per maand</h3>
          <MultiLineChart
            name="Net sales"
            series={seriesNet}
            yFmt={(v) => compact(v)}
          />
          <p className="text-xs text-gray-600 mt-2">
            Tip: test <b>Net price floor</b> en <b>GTN%</b> om omzet langer te beschermen zonder onhoudbare front-end kortingen.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-2">Originator marktaandeel (%)</h3>
          <MultiLineChart
            name="Share %"
            series={seriesShare}
            yFmt={(v) => `${v.toFixed(0)}%`}
          />
          <p className="text-xs text-gray-600 mt-2">
            Tender op maand <b>{active.inputs.tenderMonth}</b> geeft sprong omlaag; ziekenhuizen hebben extra impact conform <b>Extra tenderverlies</b>.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 lg:col-span-2">
          <h3 className="text-base font-semibold mb-2">Netto prijs per unit (€)</h3>
          <MultiLineChart
            name="Net €/unit"
            series={seriesNetPrice}
            yFmt={(v) => new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(v)}
          />
          <p className="text-xs text-gray-600 mt-2">
            Je <b>pre-LOE net</b> is {eur(preNet, 0)}. De <b>net floor</b> voorkomt een “free fall” en bewaakt marge, maar kan share kosten bij hoge elasticiteit.
          </p>
        </div>
      </section>

      {/* Concrete inzichten & acties */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold">Aanbevolen acties op basis van <i>{active.name}</i></h3>
        <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-2">
          {biggestDrivers.map((d) => (
            <li key={d.key}>
              <b>{d.key}:</b> {d.hint}
            </li>
          ))}
          <li>
            <b>Heronderhandel GTN-mix</b>: verschuif front-end korting naar <i>bonus op realisatie</i> om post-LOE erosie te dempen zonder structurele prijsverlagingen.
          </li>
          <li>
            <b>Tendervoorbereiding</b>: plan scenario’s met lagere <i>Tender share-verlies</i> en latere tendermaand; toets met Market Access & Finance.
          </li>
          <li>
            <b>Portfolio-strategie</b>: overweeg eigen generiek of autorisatie-constructie om erosie door <i>Entrants</i> te absorberen i.p.v. alleen defensief prijzen.
          </li>
        </ul>
      </section>
    </div>
  );
}

/** ========= Utils ========= */
function cryptoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}
