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
function tertileBounds(values: number[]) {
  if (!values.length) return { t1: 0, t2: 0 };
  const xs = [...values].sort((a, b) => a - b);
  const idx = (p: number) => clamp(Math.floor((xs.length - 1) * p), 0, xs.length - 1);
  return { t1: xs[idx(1 / 3)], t2: xs[idx(2 / 3)] };
}
function bucketLabelByGross(g: number, b: { t1: number; t2: number }) {
  return g <= b.t1 ? "Small" : g <= b.t2 ? "Medium" : "Large";
}

/** Responsieve scatter + benchmark-lijn(en) (zonder libs) */
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
      {/* X ticks */}
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
          <line x1={pad} x2={w - pad} y1={yScale(overallLine)} y2={yScale(overallLine)} stroke="#111827" strokeDasharray="6,4" />
          <text x={w - pad} y={yScale(overallLine) - 6} fontSize="10" textAnchor="end" fill="#111827">
            Benchmark overall {overallLine.toFixed(1)}%
          </text>
        </>
      ) : (
        (["Small", "Medium", "Large"] as const).map((b) => {
          const y = yScale(sizeLines[b]);
          const col = b === "Small" ? "#0ea5e9" : b === "Medium" ? "#22c55e" : "#f59e0b";
          return (
            <g key={b}>
              <line x1={pad} x2={w - pad} y1={y} y2={y} stroke={col} strokeDasharray="6,4" />
              <text x={w - pad} y={y - 6} fontSize="10" textAnchor="end" fill={col}>
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
  const [tab, setTab] = useState<"overall" | "size">("size");     // Tabs zijn terug (Overall / By Size)
  const [minorPP, setMinorPP] = useState(2);                      // lichte drempel
  const [majorPP, setMajorPP] = useState(5);                      // zware drempel

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

  const base = useMemo(() => {
    // Agg per klant
    const byCustomer = new Map<string, { gross: number; disc: number }>();
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

    const customers = [...byCustomer.entries()].map(([cust, v]) => ({
      cust,
      gross: v.gross,
      pct: v.gross ? (v.disc / v.gross) * 100 : 0,
    }));

    const overallPct = grossTotal ? (discTotal / grossTotal) * 100 : 0;
    const { t1, t2 } = tertileBounds(customers.map((c) => c.gross));
    const sizeBench: Record<"Small" | "Medium" | "Large", number> = { Small: 0, Medium: 0, Large: 0 };

    (["Small", "Medium", "Large"] as const).forEach((B) => {
      const subset = customers.filter((c) => bucketLabelByGross(c.gross, { t1, t2 }) === B);
      const gSum = subset.reduce((a, x) => a + x.gross, 0);
      const dSum = subset.reduce((a, x) => a + (x.gross * x.pct) / 100, 0);
      sizeBench[B] = gSum ? (dSum / gSum) * 100 : 0;
    });

    // Scatter points
    const points = customers.map((c) => ({
      x: c.gross,
      y: c.pct,
      label: c.cust,
      bucket: bucketLabelByGross(c.gross, { t1, t2 }),
    })) as { x: number; y: number; label: string; bucket: "Small" | "Medium" | "Large" }[];

    // Spread & percentielen voor aanvullende inzichten
    const pcts = customers.map((c) => c.pct).sort((a, b) => a - b);
    const q = (p: number) => {
      const i = clamp(Math.floor((pcts.length - 1) * p), 0, pcts.length - 1);
      return pcts[i] ?? 0;
    };
    const p25 = q(0.25), p50 = q(0.5), p75 = q(0.75);
    const spreadPP = p75 - p25;

    return { customers, points, overallPct, sizeBench, bounds: { t1, t2 }, grossTotal, p25, p50, p75, spreadPP };
  }, [rows]);

  const derived = useMemo(() => {
    const benchOf = (gross: number) => (tab === "overall" ? base.overallPct : base.sizeBench[bucketLabelByGross(gross, base.bounds)]);
    const deviations = base.customers.map((c) => {
      const bench = benchOf(c.gross);
      const deviation = c.pct - bench; // in pp
      const potential = deviation > 0 ? (deviation / 100) * c.gross : 0;
      return { ...c, bench, deviation, potential, bucket: bucketLabelByGross(c.gross, base.bounds) as "Small" | "Medium" | "Large" };
    });

    const topOver = deviations.filter(d => d.deviation > 0).sort((a,b)=>b.potential - a.potential).slice(0, 8);
    const topUnder = deviations.filter(d => d.deviation < 0).sort((a,b)=>a.deviation - b.deviation).slice(0, 8);

    // KPI’s voor scherpere inzichten
    const overCount = deviations.filter(d => d.deviation > minorPP).length;
    const underCount = deviations.filter(d => d.deviation < -minorPP).length;
    const overShare = base.customers.length ? (overCount / base.customers.length) * 100 : 0;
    const underShare = base.customers.length ? (underCount / base.customers.length) * 100 : 0;
    const totalPotential = deviations.reduce((a, d) => a + d.potential, 0);

    // Bucket-samenvattingen
    const bucketSummary = (B: "Small" | "Medium" | "Large") => {
      const sub = deviations.filter(d => d.bucket === B);
      const count = sub.length;
      const over = sub.filter(d => d.deviation > minorPP).length;
      const avgDev = count ? sub.reduce((a,d)=>a+d.deviation,0)/count : 0;
      return { count, over, overPct: count ? (over*100)/count : 0, avgDev };
    };

    return {
      deviations, topOver, topUnder,
      overShare, underShare, totalPotential,
      bucketSmall: bucketSummary("Small"),
      bucketMedium: bucketSummary("Medium"),
      bucketLarge: bucketSummary("Large"),
    };
  }, [base, tab, minorPP]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Consistency – Overzicht</h1>
          <p className="text-gray-600 text-sm">
            Vergelijk korting% per klant met de gekozen benchmark. Gebruik de inzichten hieronder voor directe acties met Sales & Finance.
          </p>
        </div>
        <Link href="/app/consistency/customers" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">Naar Customers</Link>
      </header>

      {/* Tabs + sliders */}
      <section className="rounded-2xl border bg-white p-4">
        {/* Tabs */}
        <div className="flex gap-2 border-b pb-2">
          <button
            className={`px-3 py-1.5 text-sm rounded-t ${tab === "overall" ? "bg-gray-900 text-white" : "hover:bg-gray-50 border"}`}
            onClick={() => setTab("overall")}
          >
            Overall
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-t ${tab === "size" ? "bg-gray-900 text-white" : "hover:bg-gray-50 border"}`}
            onClick={() => setTab("size")}
          >
            By Size (Small/Medium/Large)
          </button>
        </div>

        {/* Bench info + thresholds */}
        <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border p-3">
            <div className="font-medium">Benchmark</div>
            {tab === "overall" ? (
              <div className="mt-1 text-gray-700">Overall korting: <b>{base.overallPct.toFixed(1)}%</b></div>
            ) : (
              <div className="mt-1 text-gray-700">
                Small <b>{base.sizeBench.Small.toFixed(1)}%</b> · Medium <b>{base.sizeBench.Medium.toFixed(1)}%</b> · Large <b>{base.sizeBench.Large.toFixed(1)}%</b>
              </div>
            )}
            <div className="mt-1 text-xs text-gray-500">Buckets op basis van tertielen van jaaromzet (gross).</div>
          </div>
          <label className="rounded-lg border p-3">
            <div className="font-medium">Lichte actie drempel (pp)</div>
            <input type="range" min={0} max={10} step={0.5} value={minorPP} onChange={(e)=>setMinorPP(parseFloat(e.target.value))} className="w-full mt-2" />
            <div className="text-xs text-gray-500 mt-1">{minorPP} pp</div>
          </label>
          <label className="rounded-lg border p-3">
            <div className="font-medium">Zware actie drempel (pp)</div>
            <input type="range" min={1} max={20} step={0.5} value={majorPP} onChange={(e)=>setMajorPP(parseFloat(e.target.value))} className="w-full mt-2" />
            <div className="text-xs text-gray-500 mt-1">{majorPP} pp</div>
          </label>
        </div>
      </section>

      {/* Visual */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Korting% vs Omzet (per klant)</h2>
          <div className="text-xs text-gray-600">
            <span className="inline-flex items-center mr-3"><span className="w-2 h-2 rounded-full inline-block mr-1" style={{background:"#0ea5e9"}}/> Small</span>
            <span className="inline-flex items-center mr-3"><span className="w-2 h-2 rounded-full inline-block mr-1" style={{background:"#22c55e"}}/> Medium</span>
            <span className="inline-flex items-center"><span className="w-2 h-2 rounded-full inline-block mr-1" style={{background:"#f59e0b"}}/> Large</span>
          </div>
        </div>
        <div className="mt-2">
          <ScatterChart
            points={base.points}
            mode={tab}
            overallLine={base.overallPct}
            sizeLines={base.sizeBench as any}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Elke stip is een klant. Y-as = korting% (kortingen t.o.v. gross), X-as = jaaromzet (gross). Gestreepte lijnen zijn de benchmarks per tab.
        </p>
      </section>

      {/* Rijkere inzichten */}
      <section className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Totale besparingspotentieel</div>
          <div className="text-lg font-semibold mt-1">{eur0(derived.totalPotential)}</div>
          <div className="text-xs text-gray-500 mt-1">
            Som van (afwijking boven benchmark in pp × omzet).
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Klantspreiding (IQR)</div>
          <div className="text-lg font-semibold mt-1">{base.spreadPP.toFixed(1)} pp</div>
          <div className="text-xs text-gray-500 mt-1">P75 − P25; mediane korting: {base.p50.toFixed(1)}%</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Boven/onder drempel</div>
          <div className="text-lg font-semibold mt-1">
            {derived.overShare.toFixed(0)}% boven · {derived.underShare.toFixed(0)}% onder
          </div>
          <div className="text-xs text-gray-500 mt-1">T.o.v. {minorPP} pp drempel</div>
        </div>
      </section>

      {/* Bucket samenvatting */}
      <section className="rounded-2xl border bg-white p-4">
        <h3 className="text-base font-semibold mb-2">Kort inzicht per bucket</h3>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          {[
            { name: "Small", data: derived.bucketSmall },
            { name: "Medium", data: derived.bucketMedium },
            { name: "Large", data: derived.bucketLarge },
          ].map(({ name, data }) => (
            <div key={name} className="rounded-xl border p-3">
              <div className="font-medium">{name}</div>
              <div className="mt-1 text-gray-700">
                Klanten: <b>{data.count}</b> · Boven drempel: <b>{data.over}</b> ({data.overPct.toFixed(0)}%)
                <br />
                Gem. afwijking: <b>{data.avgDev.toFixed(1)} pp</b>
              </div>
            </div>
          ))}
        </div>
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
                  Potentieel: <b>{eur0(c.potential)}</b> • Omzet: {eur0(c.gross)} • Bucket: {c.bucket}
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
                <div className="mt-1 text-gray-600">Omzet: {eur0(c.gross)} • Bucket: {c.bucket}</div>
              </li>
            ))}
            {!derived.topUnder.length && <li className="text-gray-600">Geen klanten onder drempels.</li>}
          </ul>
        </div>
      </section>

      {/* Top acties */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Top acties om marge te optimaliseren</h2>
          <span className="ml-auto text-xs px-2 py-1 rounded-full border bg-sky-50 text-sky-700 border-sky-200">
            Drempels: {minorPP}/{majorPP} pp
          </span>
        </div>
        <ul className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
          {base.customers.length ? (
            // recompute acties hier zodat we tekst kunnen personaliseren
            (() => {
              const benchOf = (g: number) => (tab === "overall" ? base.overallPct : base.sizeBench[bucketLabelByGross(g, base.bounds)]);
              const deviations = base.customers.map((c) => {
                const bench = benchOf(c.gross);
                const deviation = c.pct - bench;
                const potential = deviation > 0 ? (deviation / 100) * c.gross : 0;
                const bucket = bucketLabelByGross(c.gross, base.bounds);
                return { ...c, bench, deviation, potential, bucket };
              });
              const actions = deviations
                .map((c) => {
                  if (c.deviation > majorPP) {
                    return {
                      key: "maj-" + c.cust,
                      title: `Heronderhandel ${c.cust}`,
                      amount: c.potential,
                      desc: `${c.deviation.toFixed(1)}pp boven ${tab === "overall" ? "overall" : c.bucket} benchmark; focus op klantkorting/volume-staffel.`,
                    };
                  }
                  if (c.deviation > minorPP) {
                    return {
                      key: "min-" + c.cust,
                      title: `Normaliseer korting ${c.cust}`,
                      amount: c.potential,
                      desc: `${c.deviation.toFixed(1)}pp boven benchmark; converteer deel van korting naar bonus op realisatie.`,
                    };
                  }
                  if (c.deviation < -minorPP) {
                    return {
                      key: "ret-" + c.cust,
                      title: `Retentieactie ${c.cust}`,
                      amount: 0,
                      desc: `${Math.abs(c.deviation).toFixed(1)}pp onder benchmark; overweeg waardegerichte proposities i.p.v. korting.`,
                    };
                  }
                  return null;
                })
                .filter(Boolean)
                .sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0))
                .slice(0, 3) as { key: string; title: string; amount: number; desc: string }[];

              return actions.map((a) => (
                <li key={a.key} className="rounded-xl border p-3">
                  <div className="font-medium">{a.title}</div>
                  <p className="text-gray-700 mt-1">{a.desc}</p>
                  {a.amount > 0 ? (
                    <div className="mt-2">Potentiële margeverbetering: <b>{eur0(a.amount)}</b></div>
                  ) : (
                    <div className="mt-2 text-gray-600">Retentie / risicobeperking</div>
                  )}
                  <div className="mt-3">
                    <Link href="/app/consistency/customers" className="inline-flex items-center rounded-lg border px-3 py-1.5 hover:bg-gray-50">
                      Bekijk details →
                    </Link>
                  </div>
                </li>
              ));
            })()
          ) : (
            <li className="text-sm text-gray-600">Geen urgente acties op basis van drempels.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
