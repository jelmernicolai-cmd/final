// components/contracts/ContractDashboard.tsx
"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList,
} from "recharts";
import type { AnalyzeResult, LatestPerf } from "@/lib/contract-analysis";

function eur0(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
}
function pct(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `${(v * 100).toFixed(1)}%`;
}

export default function ContractDashboard({ dataOverride }: { dataOverride: AnalyzeResult }) {
  const data = dataOverride;

  const top = useMemo(() => {
    const arr = [...data.latest].sort((a, b) => b.deltaVsTotal - a.deltaVsTotal);
    return arr.slice(0, 5);
  }, [data.latest]);

  const bottom = useMemo(() => {
    const arr = [...data.latest].sort((a, b) => a.deltaVsTotal - b.deltaVsTotal);
    return arr.slice(0, 5);
  }, [data.latest]);

  const bars = useMemo(() => {
    // toon 12 grootste afwijkingen (positief/negatief)
    const top6 = [...data.latest].sort((a, b) => b.deltaVsTotal - a.deltaVsTotal).slice(0, 6);
    const bot6 = [...data.latest].sort((a, b) => a.deltaVsTotal - b.deltaVsTotal).slice(0, 6);
    const pick = [...top6, ...bot6];
    return pick.map((r) => ({
      name: r.sku ? `${r.klant} • ${r.sku}` : r.klant,
      growth: Math.round((r.growthPct || 0) * 1000) / 1000,
      delta: Math.round((r.deltaVsTotal || 0) * 1000) / 1000,
      revenue: r.revenue,
    }));
  }, [data.latest]);

  const k = data.kpis;

  return (
    <div className="space-y-6">
      {/* KPI’s */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title={`Omzet ${k.latestPeriod}`} value={eur0(k.totalRevenue)} help="Totaal in laatste periode" />
        <Kpi title="Totale groei" value={pct(k.totalGrowthPct)} help="t.o.v. vorige periode (zelfde frequentie)" />
        <Kpi title="Aandeel top-5" value={pct(k.topSharePct)} help="Top-5 contracts in omzet (laatste periode)" />
        <Kpi title="Aantal vergeleken" value={String(data.latest.length)} help="Contracts met vergelijking last vs. prev" />
      </section>

      {/* Bar-chart: delta vs totaal-groei */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Top & underperformers — groei vs. totaal</h3>
          <div className="text-xs text-gray-600">
            Referentielijn = totale groei ({pct(k.totalGrowthPct)})
          </div>
        </div>
        <div className="mt-3" style={{ width: "100%", height: 360 }}>
          <ResponsiveContainer>
            <BarChart data={bars} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip formatter={(v: any, n: any) => (n === "growth" || n === "delta" ? pct(v as number) : eur0(v as number))} />
              <ReferenceLine y={k.totalGrowthPct} stroke="#0ea5e9" strokeDasharray="4 4" />
              <Bar dataKey="growth" fill="#0ea5e9">
                <LabelList dataKey="name" position="insideTop" className="text-[10px] fill-white" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-gray-600">Balk = groeipercentage van contract; blauwe streep = totale groei.</p>
        </div>
      </section>

      {/* Lijsten top/bottom met acties */}
      <section className="grid gap-4 lg:grid-cols-2">
        <CardList title="Top 5 — boven benchmark" items={top.map(toActionRow("top"))} />
        <CardList title="Bottom 5 — onder benchmark" items={bottom.map(toActionRow("bottom"))} />
      </section>
    </div>
  );
}

/* ===== helpers ===== */
function Kpi({ title, value, help }: { title: string; value: string; help?: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
      {help ? <div className="text-[11px] text-gray-500 mt-1">{help}</div> : null}
    </div>
  );
}

function toActionRow(kind: "top" | "bottom") {
  return (r: LatestPerf) => {
    const name = r.sku ? `${r.klant} • ${r.sku}` : r.klant;
    const action =
      kind === "top"
        ? "Bestendigen: bonuscondities koppelen aan realisatie; uitbreiden naar vergelijkbare accounts."
        : "Interventie: heronderhandel (front-end → bonus), prijs/pack herijking of kanaalcondities aligneren.";
    return {
      title: name,
      right: eur0(r.revenue),
      lines: [`Groei: ${pct(r.growthPct)} • Δ vs totaal: ${pct(r.deltaVsTotal)}`],
      action,
    };
  };
}

function CardList({
  title,
  items,
}: {
  title: string;
  items: { title: string; right: string; lines: string[]; action: string }[];
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <ul className="space-y-2 text-sm">
        {items.map((it) => (
          <li key={it.title} className="border rounded-xl p-3 hover:shadow-sm transition">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium truncate">{it.title}</div>
              <div className="text-gray-700 shrink-0">{it.right}</div>
            </div>
            <div className="mt-1 text-gray-600">{it.lines.join(" • ")}</div>
            <div className="mt-2 text-gray-700">
              <span className="font-medium">Actie:</span> {it.action}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
