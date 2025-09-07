"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { loadWaterfallRows, eur0 } from "@/lib/waterfall-storage";
import type { Row } from "@/lib/waterfall-types";

/** Helpers */
function sumDiscounts(r: Row) {
  return (
    (r.d_channel || 0) +
    (r.d_customer || 0) +
    (r.d_product || 0) +
    (r.d_volume || 0) +
    (r.d_other_sales || 0) +
    (r.d_mandatory || 0) +
    (r.d_local || 0)
  );
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/** Bepaal 33% en 66% kwantielen op basis van omzet (gross) */
function tertileBounds(values: number[]) {
  if (!values.length) return { t1: 0, t2: 0 };
  const xs = [...values].sort((a, b) => a - b);
  const idx = (p: number) => clamp(Math.floor((xs.length - 1) * p), 0, xs.length - 1);
  return { t1: xs[idx(1 / 3)], t2: xs[idx(2 / 3)] };
}

/** Simpele, responsieve scatter + benchmark-lijnen (zonder libs) */
function ScatterChart({
  points,
  width = 720,
  height = 300,
  mode,
  overallLine,
  sizeLines,
}: {
  points: { x: number; y: number; bucket: "Small" | "Medium" | "Large"; label: string }[];
  width?: number;
  height?: number;
  mode: "overall" | "size";
  overallLine: number;
  sizeLines: { Small: number; Medium: number; Large: number };
}) {
  const pad = 36;
  const w = width;
  const h = height;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = 0;
  const xMax = Math.max(1, Math.max(...xs));
  const yMin = 0;
  const yMax = Math.max(5, Math.ceil(Math.max(0, ...ys) / 5) * 5);

  const xScale = (v: number) => pad + ((v - xMin) / (xMax - xMin || 1)) * (w - 2 * pad);
  const yScale = (v: number) => h - pad - ((v - yMin) / (yMax - yMin || 1)) * (h - 2 * pad);

  const bucketColor = (b: "Small" | "Medium" | "Large") =>
    b === "Small" ? "#0ea5e9" : b === "Medium" ? "#22c55e" : "#f59e0b";

  return (
    <svg className="w-full" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Discount% vs Omzet">
      {/* Axes */}
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#e5e7eb" />
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#e5e7eb" />
      {/* X ticks (0, 25%, 50%, 75%, 100% van max omzetten in EUR-korte aslabels) */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const vx = xMin + (xMax - xMin) * t;
        const x = xScale(vx);
        return (
          <g key={i}>
            <line x1={x} y1={h - pad} x2={x} y2={h - pad + 4} stroke="#e5e7eb" />
            <text x={x} y={h - pad + 16} fontSize="10" textAnchor="middle" fill="#6b7280">
              {Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 1 }).format(vx)}
            </text>
          </g>
        );
      })}
      {/* Y ticks */}
      {Array.from({ length: 6 }).map((_, i) => {
        const vy = (yMax / 5) * i;
        const y = yScale(vy);
        return (
          <g key={i}>
            <line x1={pad - 4} y1={y} x2={w - pad} y2={y} stroke="#f3f4f6" />
            <text x={pad - 8} y={y + 3} fontSize="10" textAnchor="end" fill="#6b7280">
              {vy}%
            </text>
          </g>
        );
      })}

      {/* Benchmark line(s) */}
      {mode === "overall" ? (
        <>
          <line
            x1={pad}
            x2={w - pad}
            y1={yScale(overallLine)}
            y2={yScale(overallLine)}
            stroke="#111827"
            strokeDasharray="6,4"
          />
          <text x={w - pad} y={yScale(overallLine) - 6} fontSize="10" textAnchor="end" fill="#111827">
            Benchmark overall {overallLine.toFixed(1)}%
          </text>
        </>
      ) : (
        (["Small", "Medium", "Large"] as const).map((b, i) => {
          const y = yScale(sizeLines[b]);
          return (
            <g key={b}>
              <line x1={pad} x2={w - pad} y1={y} y2={y} stroke={bucketColor(b)} strokeDasharray="6,4" />
              <text x={w - pad} y={y - 6} fontSize="10" textAnchor="end" fill={bucketColor(b)}>
                {b} benchmark {sizeLines[b].toFixed(1)}%
              </text>
            </g>
          );
        })
      )}

      {/* Points */}
      {points.map((p, i) => (
        <g key={i} transform={`translate(${xScale(p.x)}, ${yScale(p.y)})`} opacity={0.9}>
          <circle r={4} fill={bucketColor(p.bucket)} />
        </g>
      ))}
    </svg>
  );
}

export default function ConsistencyPage() {
  const rows: Row[] = loadWaterfallRows();

  const [mode, setMode] = useState<"overall" | "size">("size"); // default terug naar 'size' zoals jij prefereerde
  const [minorPP, setMinorPP] = useState(2); // drempel lichte actie (pp)
  const [majorPP, setMajorPP] = useState(5); // drempel zware actie (pp)

  if (!rows.length) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold">Consistency</h1>
        </header>
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-gray-600">
            Geen data gevonden. Ga naar <Link className="underline" href="/app/upload">Upload</Link>, sla op en kom terug.
          </p>
        </div>
      </div>
    );
  }

  const {
    grossTotal,
    overallPct,
    customers,
    bounds,
    sizeBench,
    points,
    actions,
    topOver,
    topUnder,
  } = useMemo(() => {
    // Agg per klant
    const byCustomer = new Map<
      string,
      { gross: number; disc: number }
    >();
    let grossTotal = 0;
    let discTotal = 0;

    for (const r of rows) {
      const g = r.gross || 0;
      const d = sumDiscounts(r);
      grossTotal += g;
      discTotal += d;
      const cur = byCustomer.get(r.cust) || { gross: 0, disc: 0 };
      cur.gross += g;
      cur.disc += d;
      byCustomer.set(r.cust, cur);
    }

    const customers = [...byCustomer.entries()].map(([cust, v]) => {
      const pct = v.gross ? (v.disc / v.gross) * 100 : 0;
      return { cust, gross: v.gross, pct };
    });

    const overallPct = grossTotal ? (discTotal / grossTotal) * 100 : 0;

    // Bucketting op omzet (tertiles)
    const { t1, t2 } = tertileBounds(customers.map((c) => c.gross));
    const bucketOf = (g: number): "Small" | "Medium" | "Large" =>
      g <= t1 ? "Small" : g <= t2 ? "Medium" : "Large";

    const sizeBench = { Small: 0, Medium: 0, Large: 0 } as Record<
      "Small" | "Medium" | "Large",
      number
    >;
    (["Small", "Medium", "Large"] as const).forEach((b) => {
      const subset = customers.filter((c) => bucketOf(c.gross) === b);
      const gSum = subset.reduce((a, x) => a + x.gross, 0);
      const dSum = subset.reduce((a, x) => a + (x.gross * x.pct) / 100, 0);
      sizeBench[b] = gSum ? (dSum / gSum) * 100 : 0; // gewogen per bucket
    });

    const points = customers.map((c) => ({
      x: c.gross,
      y: c.pct,
      bucket: bucketOf(c.gross),
      label: c.cust,
    }));

    // Acties bepalen t.o.v. gekozen benchmark gebeurt later (met state)
    return {
      grossTotal,
      overallPct,
      customers,
      bounds: { t1, t2 },
      sizeBench,
      points,
      actions: [] as any[],
      topOver: [] as any[],
      topUnder: [] as any[],
    };
  }, [rows]);

  // Op basis van modus benchmarks definiëren en acties uitrekenen
  const derived = useMemo(() => {
    const benchOf = (custGross: number) => {
      if (mode === "overall") return overallPct;
      // by size
      if (custGross <= bounds.t1) return sizeBench.Small;
      if (custGross <= bounds.t2) return sizeBench.Medium;
      return sizeBench.Large;
    };

    const deviations = customers.map((c) => {
      const bench = benchOf(c.gross);
      const deviation = c.pct - bench; // in percentagepunten
      const potential = deviation > 0 ? (deviation / 100) * c.gross : 0;
      return { ...c, bench, deviation, potential };
    });

    const topOver = deviations
      .filter((d) => d.deviation > 0)
      .sort((a, b) => b.potential - a.potential)
      .slice(0, 8);

    const topUnder = deviations
      .filter((d) => d.deviation < 0)
      .sort((a, b) => a.deviation - b.deviation)
      .slice(0, 8);

    const actions = deviations
      .map((c) => {
        if (c.deviation > majorPP) {
          return {
            key: "maj-" + c.cust,
            title: `Heronderhandel ${c.cust}`,
            amount: c.potential,
            desc: `${c.deviation.toFixed(1)}pp boven ${mode === "overall" ? "overall" : bucketLabel(c.gross, bounds)} benchmark bij omzet ${eur0(c.gross)}.`,
          };
        }
        if (c.deviation > minorPP) {
          return {
            key: "min-" + c.cust,
            title: `Normaliseer korting ${c.cust}`,
            amount: c.potential,
            desc: `${c.deviation.toFixed(1)}pp boven ${mode === "overall" ? "overall" : bucketLabel(c.gross, bounds)} benchmark (overweeg bonus/staffel).`,
          };
        }
        if (c.deviation < -minorPP) {
          return {
            key: "ret-" + c.cust,
            title: `Retentieactie ${c.cust}`,
            amount: 0,
            desc: `${Math.abs(c.deviation).toFixed(1)}pp onder ${mode === "overall" ? "overall" : bucketLabel(c.gross, bounds)} benchmark (waarde i.p.v. korting).`,
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0))
      .slice(0, 3) as { key: string; title: string; amount: number; desc: string }[];

    return { deviations, topOver, topUnder, actions };
  }, [customers, overallPct, sizeBench, bounds, mode, minorPP, majorPP]);

  function bucketLabel(gross: number, b: { t1: number; t2: number }) {
    return gross <= b.t1 ? "Small" : gross <= b.t2 ? "Medium" : "Large";
  }

  return (
    <div className="space-y-6">
      {/* Header & uitleg */}
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Consistency – Overzicht</h1>
          <p className="text-gray-600 text-sm">
            Vergelijk korting% per klant met de gekozen benchmark. Mode <b>{mode === "overall" ? "Overall" : "By Size"}</b> toont
            {mode === "overall" ? " één algemene referentie" : " per klantgrootte (Small/Medium/Large) een referentie"}.
          </p>
        </div>
        <Link href="/app/consistency/customers" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">
          Naar Customers
        </Link>
      </header>

      {/* Bediening */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div>
            <div className="text-sm font-medium mb-1">Benchmark mode</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode("overall")}
                className={`px-3 py-1.5 rounded-lg border text-sm ${mode === "overall" ? "bg-gray-900 text-white" : "hover:bg-gray-50"}`}
              >
                Overall
              </button>
              <button
                type="button"
                onClick={() => setMode("size")}
                className={`px-3 py-1.5 rounded-lg border text-sm ${mode === "size" ? "bg-gray-900 text-white" : "hover:bg-gray-50"}`}
              >
                By Size (Small/Medium/Large)
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Overall benchmark: {overallPct.toFixed(1)}% • Size: S {sizeBench.Small.toFixed(1)}% · M {sizeBench.Medium.toFixed(1)}% · L {sizeBench.Large.toFixed(1)}%
            </div>
          </div>

          <div className="md:ml-auto grid grid-cols-2 gap-3">
            <label className="text-sm">
              <div>Lichte actie drempel (pp)</div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={minorPP}
                onChange={(e) => setMinorPP(parseFloat(e.target.value))}
                className="w-48"
                aria-label="Minor threshold"
              />
              <div className="text-xs text-gray-500">{minorPP} pp</div>
            </label>
            <label className="text-sm">
              <div>Zware actie drempel (pp)</div>
              <input
                type="range"
                min={1}
                max={20}
                step={0.5}
                value={majorPP}
                onChange={(e) => setMajorPP(parseFloat(e.target.value))}
                className="w-48"
                aria-label="Major threshold"
              />
              <div className="text-xs text-gray-500">{majorPP} pp</div>
            </label>
          </div>
        </div>
      </section>

      {/* Grafiek */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Korting% vs Omzet (per klant)</h2>
          <div className="text-xs text-gray-600">
            <span className="inline-flex items-center mr-3">
              <span className="w-2 h-2 rounded-full inline-block mr-1" style={{ background: "#0ea5e9" }} /> Small
            </span>
            <span className="inline-flex items-center mr-3">
              <span className="w-2 h-2 rounded-full inline-block mr-1" style={{ background: "#22c55e" }} /> Medium
            </span>
            <span className="inline-flex items-center">
              <span className="w-2 h-2 rounded-full inline-block mr-1" style={{ background: "#f59e0b" }} /> Large
            </span>
          </div>
        </div>
        <div className="mt-2">
          <ScatterChart
            points={points}
            mode={mode}
            overallLine={overallPct}
            sizeLines={sizeBench as any}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Elke stip is een klant. Y-as = korting% (kortingen t.o.v. gross), X-as = jaaromzet (gross). Gestreepte lijnen zijn de benchmarks.
        </p>
      </section>

      {/* Top afwijkingen */}
      <section className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-2">Te hoge korting (grootste besparingspotentieel)</h3>
          <ul className="space-y-2 text-sm">
            {derived.topOver.map((c) => (
              <li key={c.cust} className="border rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{c.cust}</div>
                  <div className="text-gray-700">{c.deviation.toFixed(1)} pp</div>
                </div>
                <div className="mt-1 text-gray-600">
                  Potentieel: <b>{eur0(c.potential)}</b> • Omzet: {eur0(c.gross)}
                </div>
              </li>
            ))}
            {!derived.topOver.length && <li className="text-gray-600">Geen klanten boven drempels.</li>}
          </ul>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <h3 className="text-base font-semibold mb-2">Te lage korting (retentie-risico)</h3>
          <ul className="space-y-2 text-sm">
            {derived.topUnder.map((c) => (
              <li key={c.cust} className="border rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{c.cust}</div>
                  <div className="text-gray-700">{c.deviation.toFixed(1)} pp</div>
                </div>
                <div className="mt-1 text-gray-600">Omzet: {eur0(c.gross)}</div>
              </li>
            ))}
            {!derived.topUnder.length && <li className="text-gray-600">Geen klanten onder drempels.</li>}
          </ul>
        </div>
      </section>

      {/* Top 3 acties */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Top acties om marge te optimaliseren</h2>
          <span className="ml-auto text-xs px-2 py-1 rounded-full border bg-sky-50 text-sky-700 border-sky-200">
            Drempels: {minorPP}/{majorPP} pp
          </span>
        </div>
        <ul className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
          {derived.actions.length ? (
            derived.actions.map((a) => (
              <li key={a.key} className="rounded-xl border p-3">
                <div className="font-medium">{a.title}</div>
                <p className="text-gray-700 mt-1">{a.desc}</p>
                {a.amount > 0 ? (
                  <div className="mt-2">
                    Potentiële margeverbetering: <b>{eur0(a.amount)}</b>
                  </div>
                ) : (
                  <div className="mt-2 text-gray-600">Retentie / risicobeperking</div>
                )}
                <div className="mt-3">
                  <Link
                    href="/app/consistency/customers"
                    className="inline-flex items-center rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                  >
                    Bekijk details →
                  </Link>
                </div>
              </li>
            ))
          ) : (
            <li className="text-sm text-gray-600">Geen urgente acties op basis van drempels.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
