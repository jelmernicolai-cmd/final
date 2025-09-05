// app/app/waterfall/analyze/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import WaterfallChart from "@/components/waterfall/WaterfallChart.client";
import { WF_STORE_KEY } from "@/components/waterfall/UploadAndParse.client";

type Row = {
  pg: string; sku: string; cust: string; period: string;
  gross: number;
  d_channel: number; d_customer: number; d_product: number; d_volume: number; d_value: number; d_other_sales: number; d_mandatory: number; d_local: number;
  invoiced: number;
  r_direct: number; r_prompt: number; r_indirect: number; r_mandatory: number; r_local: number;
  inc_royalty: number; inc_other: number;
  net: number;
};

function sum(rows: Row[], key: keyof Row) {
  return rows.reduce((a, r) => a + (Number(r[key]) || 0), 0);
}
function pct(n: number, d: number) {
  if (!d) return "—";
  return (100 * n / d).toFixed(1) + "%";
}

export default function Analyze() {
  const [data, setData] = useState<{ meta: any; rows: Row[] } | null>(null);
  const [pg, setPg] = useState("All");
  const [sku, setSku] = useState("All");
  const [cust, setCust] = useState("All");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WF_STORE_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {
      // ignore parse errors
    }
  }, []);

  const rows = data?.rows || [];
  const validation = data?.meta?.validation || { warnings: [], corrected: 0 };

  const pgs = useMemo(() => Array.from(new Set(rows.map(r => r.pg))).sort(), [rows]);
  const skus = useMemo(
    () => Array.from(new Set(rows.filter(r => pg === "All" || r.pg === pg).map(r => r.sku))).sort(),
    [rows, pg]
  );
  const custs = useMemo(() => Array.from(new Set(rows.map(r => r.cust))).sort(), [rows]);

  const filtered = rows.filter(r =>
    (pg === "All" || r.pg === pg) &&
    (sku === "All" || r.sku === sku) &&
    (cust === "All" || r.cust === cust)
  );

  const gross = sum(filtered, "gross");
  const d_channel = sum(filtered, "d_channel");
  const d_customer = sum(filtered, "d_customer");
  const d_product = sum(filtered, "d_product");
  const d_volume = sum(filtered, "d_volume");
  const d_value = sum(filtered, "d_value");
  const d_other_sales = sum(filtered, "d_other_sales");
  const d_mandatory = sum(filtered, "d_mandatory");
  const d_local = sum(filtered, "d_local");
  const invoiced = sum(filtered, "invoiced");
  const r_direct = sum(filtered, "r_direct");
  const r_prompt = sum(filtered, "r_prompt");
  const r_indirect = sum(filtered, "r_indirect");
  const r_mandatory = sum(filtered, "r_mandatory");
  const r_local = sum(filtered, "r_local");
  const inc_royalty = sum(filtered, "inc_royalty");
  const inc_other = sum(filtered, "inc_other");
  const net = sum(filtered, "net");

  const steps = [
    { label: "Gross Sales", amount: gross, color: "#0ea5e9" },       // start
    { label: "Channel Disc.", amount: -d_channel },
    { label: "Customer Disc.", amount: -d_customer },
    { label: "Product Disc.", amount: -d_product },
    { label: "Volume Disc.", amount: -d_volume },
    { label: "Value Disc.", amount: -d_value },
    { label: "Other Sales Disc.", amount: -d_other_sales },
    { label: "Mandatory Disc.", amount: -d_mandatory },
    { label: "Local Disc.", amount: -d_local },
    { label: "Invoiced Sales", amount: 0, color: "#6366f1" },        // marker
    { label: "Direct Rebates", amount: -r_direct },
    { label: "Prompt Pay Reb.", amount: -r_prompt },
    { label: "Indirect Rebates", amount: -r_indirect },
    { label: "Mandatory Reb.", amount: -r_mandatory },
    { label: "Local Reb.", amount: -r_local },
    { label: "Royalty Income", amount: inc_royalty },
    { label: "Other Income", amount: inc_other },
    { label: "Net Sales", amount: 0, color: "#0ea5e9" },             // marker
  ];

  const totalDiscounts = d_channel + d_customer + d_product + d_volume + d_value + d_other_sales + d_mandatory + d_local;
  const totalRebates = r_direct + r_prompt + r_indirect + r_mandatory + r_local;
  const incomes = inc_royalty + inc_other;

  // Eenvoudig optimalisatie-scenario: 10% reductie op Value Discounts
  const valueDiscUplift = 0.10 * d_value;
  const netIfOptimized = net + valueDiscUplift;
  const upliftPctGross = gross ? (100 * valueDiscUplift / gross).toFixed(2) + "%" : "—";

  if (!rows.length) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-xl font-semibold">Waterfall analyse</h1>
        <p className="text-sm text-gray-600 mt-1">
          Er is nog geen dataset geladen. Ga terug naar het dashboard om een Excel te uploaden.
        </p>
        <Link className="inline-block mt-4 rounded-lg border px-4 py-2 hover:bg-gray-50" href="/app">
          Terug naar dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* VALIDATIE-BANNER */}
      {(validation.corrected || (validation.warnings?.length ?? 0) > 0) && (
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm">
            {validation.corrected ? (
              <div className="text-amber-700">
                Auto-correcties toegepast: <strong>{validation.corrected}</strong> (negatieve kortingen → positief, valuta/parsing).
              </div>
            ) : null}
            {(validation.warnings?.length ?? 0) > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer">
                  {validation.warnings.length} waarschuwing(en) bekijken
                </summary>
                <ul className="list-disc ml-5 mt-1 max-h-40 overflow-auto text-gray-700">
                  {validation.warnings.map((m: string, i: number) => <li key={i}>{m}</li>)}
                </ul>
              </details>
            )}
          </div>
        </div>
      )}

      {/* Header + filters */}
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div>
            <h1 className="text-xl font-semibold">Waterfall analyse</h1>
            <p className="text-sm text-gray-600">
              Kies een Product Group / SKU / Customer om te aggregeren.
            </p>
          </div>
          <div className="md:ml-auto grid grid-cols-1 md:grid-cols-3 gap-2">
            <select
              value={pg}
              onChange={e => { setPg(e.target.value); setSku("All"); }}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="All">Alle productgroepen</option>
              {pgs.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select
              value={sku}
              onChange={e => setSku(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="All">Alle SKU’s</option>
              {skus.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select
              value={cust}
              onChange={e => setCust(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="All">Alle klanten</option>
              {custs.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPI’s */}
      <div className="grid md:grid-cols-4 gap-4">
        <KpiCard label="Discounts / Gross" value={pct(totalDiscounts, gross)} hint={`Totaal: €${Math.round(totalDiscounts).toLocaleString("nl-NL")}`} />
        <KpiCard label="Rebates / Invoiced" value={pct(totalRebates, invoiced)} hint={`Totaal: €${Math.round(totalRebates).toLocaleString("nl-NL")}`} />
        <KpiCard label="Incomes / Invoiced" value={pct(incomes, invoiced)} hint={`Totaal: €${Math.round(incomes).toLocaleString("nl-NL")}`} />
        <KpiCard label="Net / Gross" value={pct(net, gross)} hint={`Net: €${Math.round(net).toLocaleString("nl-NL")}`} />
      </div>

      {/* Chart */}
      <div className="rounded-2xl border bg-white p-4">
        <WaterfallChart steps={steps} />
      </div>

      {/* Optimalisatie-scenario */}
      <div className="rounded-2xl border bg-white p-6">
        <div className="font-medium">Schatting marge-uplift (scenario)</div>
        <p className="text-sm text-gray-600">
          Als je <strong>Value Discounts</strong> met 10% verlaagt: +{upliftPctGross} van Gross Sales
          ({valueDiscUplift.toLocaleString("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}).
        </p>
        <div className="text-sm text-gray-600 mt-1">
          Nieuwe Net Sales ≈ {netIfOptimized.toLocaleString("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}.
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}
