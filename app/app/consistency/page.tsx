"use client";

import Link from "next/link";
import { useMemo } from "react";
import { loadWaterfallRows, eur0 } from "@/lib/waterfall-storage";
import type { Row } from "@/lib/waterfall-types";
import BenchmarkControls from "@/components/consistency/BenchmarkControls";
import { useBenchmarks } from "@/components/consistency/BenchmarksContext";

export default function ConsistencyOverviewPage() {
  const rows: Row[] = loadWaterfallRows();
  const { method, majorPP, minorPP } = useBenchmarks();

  const discOf = (r: Row) =>
    (r.d_channel || 0) +
    (r.d_customer || 0) +
    (r.d_product || 0) +
    (r.d_volume || 0) +
    (r.d_other_sales || 0) +
    (r.d_mandatory || 0) +
    (r.d_local || 0);

  const {
    grossTotal,
    overallPct,
    medianPct,
    bench,
    topOver,
    topUnder,
    actions,
  } = useMemo(() => {
    let grossTotal = 0;
    let discTotal = 0;
    const byCustomer = new Map<string, { gross: number; disc: number }>();

    for (const r of rows) {
      const g = r.gross || 0;
      const d = discOf(r);
      grossTotal += g;
      discTotal += d;

      const cur = byCustomer.get(r.cust) || { gross: 0, disc: 0 };
      cur.gross += g;
      cur.disc += d;
      byCustomer.set(r.cust, cur);
    }

    const overallPct = grossTotal ? (discTotal / grossTotal) * 100 : 0;

    const custPcts = [...byCustomer.values()]
      .map((v) => (v.gross ? (v.disc / v.gross) * 100 : 0))
      .sort((a, b) => a - b);
    const mid = Math.floor(custPcts.length / 2);
    const medianPct =
      custPcts.length === 0
        ? 0
        : custPcts.length % 2
        ? custPcts[mid]
        : (custPcts[mid - 1] + custPcts[mid]) / 2;

    const bench = method === "median" ? medianPct : overallPct;

    const deviations = [...byCustomer.entries()].map(([cust, v]) => {
      const pct = v.gross ? (v.disc / v.gross) * 100 : 0;
      const deviation = pct - bench; // in percentagepunten
      const potential = deviation > 0 ? (deviation / 100) * v.gross : 0;
      return { cust, gross: v.gross, discPct: pct, deviation, potential };
    });

    const topOver = deviations
      .filter((d) => d.deviation > 0)
      .sort((a, b) => b.potential - a.potential)
      .slice(0, 8);

    const topUnder = deviations
      .filter((d) => d.deviation < 0)
      .sort((a, b) => a.deviation - b.deviation) // meest negatief eerst
      .slice(0, 8);

    const actions = deviations
      .map((c) => {
        if (c.deviation > majorPP) {
          return {
            key: "maj-" + c.cust,
            title: `Heronderhandel ${c.cust}`,
            amount: c.potential,
            desc: `${c.deviation.toFixed(1)}pp boven benchmark bij omzet ${eur0(
              c.gross
            )}.`,
          };
        }
        if (c.deviation > minorPP) {
          return {
            key: "min-" + c.cust,
            title: `Normaliseer korting ${c.cust}`,
            amount: c.potential,
            desc: `${c.deviation.toFixed(
              1
            )}pp boven benchmark (converteer naar bonus/staffel).`,
          };
        }
        if (c.deviation < -minorPP) {
          return {
            key: "ret-" + c.cust,
            title: `Retentieactie ${c.cust}`,
            amount: 0,
            desc: `${Math.abs(c.deviation).toFixed(
              1
            )}pp onder benchmark (waarde i.p.v. korting).`,
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0))
      .slice(0, 3) as {
      key: string;
      title: string;
      amount: number;
      desc: string;
    }[];

    return { grossTotal, overallPct, medianPct, bench, topOver, topUnder, actions };
  }, [rows, method, majorPP, minorPP]);

  const Bar = ({ pct }: { pct: number }) => (
    <div className="h-2 bg-gray-100 rounded">
      <div
        className="h-2 rounded bg-sky-600"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );

  if (!rows.length) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold">Consistency</h1>
        </header>
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-gray-600">
            Upload eerst data bij{" "}
            <Link className="underline" href="/app/upload">
              Upload
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Consistency – Overzicht</h1>
          <p className="text-gray-600 text-sm">
            Benchmark:{" "}
            <b>{method === "median" ? "Median (robuust)" : "Overall (gewogen)"}</b>{" "}
            • Huidige benchmark {bench.toFixed(1)}% korting.
          </p>
        </div>
        <Link
          href="/app/consistency/customers"
          className="text-sm rounded border px-3 py-2 hover:bg-gray-50"
        >
          Naar Customers
        </Link>
      </header>

      <BenchmarkControls />

      {/* KPI’s */}
      <section className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Totaal Gross</div>
          <div className="text-lg font-semibold mt-1">{eur0(grossTotal)}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Overall korting%</div>
          <div className="text-lg font-semibold mt-1">
            {overallPct.toFixed(1)}%
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Median korting% (per klant)</div>
          <div className="text-lg font-semibold mt-1">{medianPct.toFixed(1)}%</div>
        </div>
      </section>

      {/* Top afwijkingen */}
      <section className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="text-lg font-semibold mb-2">Te hoge korting (top)</h2>
          <ul className="space-y-2 text-sm">
            {topOver.map((c) => (
              <li key={c.cust} className="border rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{c.cust}</div>
                  <div className="text-gray-700">{c.deviation.toFixed(1)} pp</div>
                </div>
                <div className="mt-1 text-gray-600">
                  Potentieel: <b>{eur0(c.potential)}</b>
                </div>
                <div className="mt-2">
                  {/* eenvoudige schaal: 0..20pp → 0..100% */}
                  <Bar pct={Math.min(100, Math.max(0, (c.deviation / 20) * 100))} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <h2 className="text-lg font-semibold mb-2">Te lage korting (retentie-risico)</h2>
          <ul className="space-y-2 text-sm">
            {topUnder.map((c) => (
              <li key={c.cust} className="border rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{c.cust}</div>
                  <div className="text-gray-700">{c.deviation.toFixed(1)} pp</div>
                </div>
                <div className="mt-1 text-gray-600">Omzet: {eur0(c.gross)}</div>
                <div className="mt-2">
                  <Bar pct={Math.min(100, Math.max(0, (Math.abs(c.deviation) / 20) * 100))} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Top 3 acties */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Top 3 acties om marge te optimaliseren</h2>
          <span className="ml-auto text-xs px-2 py-1 rounded-full border bg-sky-50 text-sky-700 border-sky-200">
            Drempels: {minorPP}/{majorPP} pp
          </span>
        </div>
        <ul className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
          {actions.length ? (
            actions.map((a) => (
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
            <li className="text-sm text-gray-600">Geen urgente acties.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
