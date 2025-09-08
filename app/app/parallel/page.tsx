"use client";

import { useState, useMemo } from "react";

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
  horizon: number;
  listNL: number;
  gtnFront: number;
  bonusOnReal: number;
  netFloorVsPre: number;
  baseUnitsNL: number;
  cogs: number;
  euRefNet: number;
  logisticsPerUnit: number;
  arbitrageThreshold: number;
  availabilityCap: number;
  shareElasticity: number;
  rampMonths: number;
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
  country: string;
  exFactory: number;
  currency: "EUR" | "PLN" | "CZK" | "HUF" | "GBP" | "DKK";
  fxToEUR: number;
  logistics: number;
  buffer: number;
  capShare: number;
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
  euRefNet: 65,
  logisticsPerUnit: 4,
  arbitrageThreshold: 2,
  availabilityCap: 0.35,
  shareElasticity: 0.055,
  rampMonths: 3,
};

const MORE_PRESSURE: Partial<Inputs> = {
  euRefNet: 60,
  availabilityCap: 0.45,
  shareElasticity: 0.07,
};

const COLORS = { A: "#0ea5e9", B: "#f59e0b", PI_A: "#22c55e", PI_B: "#16a34a" };

/** ===== Simulation ===== */
function simulate(inp: Inputs) {
  const points: Point[] = [];

  const preNet = inp.listNL * (1 - inp.gtnFront);

  for (let t = 0; t < inp.horizon; t++) {
    let netOriginator = inp.listNL * (1 - inp.gtnFront);
    netOriginator = Math.max(netOriginator, preNet * inp.netFloorVsPre);

    const netEffectiveBuyer = netOriginator * (1 - inp.bonusOnReal);

    const gap = netEffectiveBuyer - (inp.euRefNet + inp.logisticsPerUnit);
    let sharePI = 0;
    if (gap > inp.arbitrageThreshold) {
      sharePI = Math.min(inp.availabilityCap, (gap * inp.shareElasticity));
      const ramp = Math.min(1, t / inp.rampMonths);
      sharePI *= ramp;
    }

    const shareOriginator = 1 - sharePI;

    const unitsOriginator = inp.baseUnitsNL * shareOriginator;
    const unitsPI = inp.baseUnitsNL * sharePI;

    const netSalesOriginator = unitsOriginator * netOriginator;
    const netSalesPI = unitsPI * inp.euRefNet;

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
      piShareY1: y1.reduce((a, p) => a + p.sharePI, 0) / y1.length,
      piNetY1: y1.reduce((a, p) => a + p.netSalesPI, 0),
      piNetTotal: sum((p) => p.netSalesPI),
      orgNetY1: y1.reduce((a, p) => a + p.netSalesOriginator, 0),
      orgNetTotal: sum((p) => p.netSalesOriginator),
      orgEbitdaTotal: sum((p) => p.ebitdaOriginator),
      endPIshare: points.at(-1)?.sharePI ?? 0,
      endNetOriginator: points.at(-1)?.netOriginator ?? 0,
    },
    preNet,
  };
}

/** ===== Charts (SVG) ===== */
function MultiLineChart({
  series,
  yFmt,
  height = 240,
}: {
  series: { name: string; color: string; values: number[] }[];
  yFmt: (v: number) => string;
  height?: number;
}) {
  const w = 960;
  const h = height;
  const padX = 40;
  const padY = 28;
  const maxLen = Math.max(...series.map((s) => s.values.length));
  const all = series.flatMap((s) => s.values);
  const maxY = Math.max(1, ...all);
  const x = (i: number) => padX + (i / (maxLen - 1)) * (w - 2 * padX);
  const y = (v: number) => h - padY - (v / maxY) * (h - 2 * padY);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <rect x={12} y={12} width={w - 24} height={h - 24} rx={16} fill="#fff" stroke="#e5e7eb" />
      {series.map((s) => {
        const d = s.values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
        return (
          <g key={s.name}>
            <path d={d} fill="none" stroke={s.color} strokeWidth={2} />
          </g>
        );
      })}
    </svg>
  );
}

/** ===== EU Price Panel ===== */
const EU_DEFAULT: EUCountryRow[] = [
  { country: "Polen", exFactory: 240, currency: "PLN", fxToEUR: 0.23, logistics: 3.5, buffer: 1.0, capShare: 0.12 },
  { country: "Tsjechië", exFactory: 760, currency: "CZK", fxToEUR: 0.041, logistics: 3.5, buffer: 1.0, capShare: 0.08 },
  { country: "Hongarije", exFactory: 24000, currency: "HUF", fxToEUR: 0.0026, logistics: 4.0, buffer: 1.0, capShare: 0.10 },
  { country: "Denemarken", exFactory: 85, currency: "EUR", fxToEUR: 1, logistics: 2.5, buffer: 0.8, capShare: 0.06 },
  { country: "VK", exFactory: 72, currency: "GBP", fxToEUR: 1.17, logistics: 4.5, buffer: 1.2, capShare: 0.10 },
  { country: "Spanje", exFactory: 68, currency: "EUR", fxToEUR: 1, logistics: 3.0, buffer: 0.8, capShare: 0.10 },
];

/** ===== Page ===== */
export default function ParallelPage() {
  const [scenarios] = useState<Scenario[]>([
    { id: "A", name: "Scenario A (basis)", color: COLORS.A, inputs: { ...DEFAULTS } },
    { id: "B", name: "Scenario B (meer PI-druk)", color: COLORS.B, inputs: { ...DEFAULTS, ...MORE_PRESSURE } },
  ]);
  const simA = useMemo(() => simulate(scenarios[0].inputs), []);
  const simB = useMemo(() => simulate(scenarios[1].inputs), []);

  const [euRows] = useState<EUCountryRow[]>(EU_DEFAULT);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold">Parallelimport Analyse Tool</h1>
      <p className="text-gray-600 text-sm">
        Analyseer de impact van parallelimport op je Nederlandse omzet en test hoe aangepast kortingsbeleid volumes kan
        terugwinnen.
      </p>

      {/* KPI’s */}
      <section className="grid gap-4 md:grid-cols-2">
        {[{ sc: scenarios[0], sim: simA }, { sc: scenarios[1], sim: simB }].map(({ sc, sim }) => (
          <div key={sc.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: sc.color }}></span>
              <span className="font-semibold">{sc.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Originator Net Y1</div>
              <div className="text-right font-medium">{eur(sim.kpis.orgNetY1)}</div>
              <div>Parallelimport Net Y1</div>
              <div className="text-right font-medium">{eur(sim.kpis.piNetY1)}</div>
              <div>Eind-share PI</div>
              <div className="text-right font-medium">{pctS(sim.kpis.endPIshare, 1)}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Grafieken */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-2">Net sales per maand</h3>
          <MultiLineChart
            series={[
              { name: "Originator A", color: COLORS.A, values: simA.points.map((p) => p.netSalesOriginator) },
              { name: "PI A", color: COLORS.PI_A, values: simA.points.map((p) => p.netSalesPI) },
              { name: "Originator B", color: COLORS.B, values: simB.points.map((p) => p.netSalesOriginator) },
              { name: "PI B", color: COLORS.PI_B, values: simB.points.map((p) => p.netSalesPI) },
            ]}
            yFmt={(v) => compact(v)}
          />
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold mb-2">Marktaandeel (%)</h3>
          <MultiLineChart
            series={[
              { name: "PI A", color: COLORS.PI_A, values: simA.points.map((p) => p.sharePI * 100) },
              { name: "PI B", color: COLORS.PI_B, values: simB.points.map((p) => p.sharePI * 100) },
            ]}
            yFmt={(v) => `${v.toFixed(0)}%`}
          />
        </div>
      </section>

      {/* EU Prijsvergelijker */}
      <section className="rounded-xl border bg-white p-4">
        <h3 className="text-sm font-semibold mb-2">EU Parallel prijsvergelijking</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1">Land</th>
              <th className="text-right py-1">Ex-factory</th>
              <th className="text-right py-1">FX→EUR</th>
              <th className="text-right py-1">Landed NL (EUR)</th>
            </tr>
          </thead>
          <tbody>
            {euRows.map((r) => {
              const baseEUR = r.exFactory * r.fxToEUR;
              const landed = baseEUR + r.logistics + r.buffer;
              return (
                <tr key={r.country} className="border-b last:border-0">
                  <td className="py-1">{r.country}</td>
                  <td className="text-right py-1">{r.exFactory} {r.currency}</td>
                  <td className="text-right py-1">{r.fxToEUR.toFixed(3)}</td>
                  <td className="text-right py-1 font-medium">{eur(landed, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-xs text-gray-600 mt-2">
          Vergelijk landed PI-prijzen met de effectieve NL netprijs (front + bonus). Als het verschil structureel groter
          is dan de arbitragedrempel, is PI-instroom waarschijnlijk.
        </p>
      </section>
    </div>
  );
}
