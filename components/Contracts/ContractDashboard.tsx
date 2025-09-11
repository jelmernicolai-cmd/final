"use client";

import { useMemo, useState } from "react";
import KpiCard from "./KpiCard";
import ContractTable from "./ContractTable";
import ContractCharts from "./ContractCharts";
import {
  analyze,
  demoData,
  Row,
  ContractLevel,
  AggRow,
} from "@/lib/contract-analysis";

export default function ContractDashboard() {
  const [level, setLevel] = useState<ContractLevel>("klant_sku");
  const [filterKlant, setFilterKlant] = useState<string>("*");
  const [periode, setPeriode] = useState<string>("auto"); // "auto" => laatste periode

  const { agg, totals, latest } = useMemo(() => analyze(demoData, level), [level]);

  const alleKlanten = useMemo(() => {
    const s = new Set(demoData.map((r) => r.klant));
    return ["*", ...Array.from(s)];
  }, []);

  const periodes = useMemo(() => {
    const p = Array.from(new Set(agg.map((r) => r.periode))).sort();
    return p;
  }, [agg]);

  const lastPeriode = periodes[periodes.length - 1];
  const activePeriode = periode === "auto" ? lastPeriode : periode;

  const filteredLatest = useMemo(() => {
    const rows = agg.filter((r) => r.periode === activePeriode);
    return filterKlant === "*" ? rows : rows.filter((r) => r.contract.startsWith(filterKlant));
  }, [agg, activePeriode, filterKlant]);

  // KPIs
  const kpis = useMemo(() => {
    const lastTotal = totals.find((t) => t.periode === activePeriode);
    const prevTotal = totals[totals.findIndex((t) => t.periode === activePeriode) - 1];
    const totalNetto = lastTotal?.totaal_netto ?? 0;
    const growthPct = lastTotal?.pct_groei_totaal_netto ?? null;
    const outperformCount = filteredLatest.filter((r) => r.outperform_netto === true).length;
    return {
      totalNetto,
      growthPct,
      outperformCount,
      prevNetto: prevTotal?.totaal_netto ?? null,
    };
  }, [totals, activePeriode, filteredLatest]);

  // Charts: top 3 contracts by latest netto groei
  const topContracts = useMemo(() => {
    const lastRows = agg.filter((r) => r.periode === activePeriode);
    const sorted = [...lastRows].sort((a, b) => (b.pct_groei_netto ?? -999) - (a.pct_groei_netto ?? -999));
    return sorted.slice(0, 3).map((r) => r.contract);
  }, [agg, activePeriode]);

  const seriesByContract = useMemo(() => {
    const out: Record<string, { x: string[]; y: number[] }> = {};
    for (const c of topContracts) {
      const rows = agg.filter((r) => r.contract === c).sort((a, b) => a.periode.localeCompare(b.periode));
      out[c] = { x: rows.map((r) => r.periode), y: rows.map((r) => r.netto_omzet) };
    }
    return out;
  }, [agg, topContracts]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div>
          <label className="block text-sm text-gray-600">Niveau</label>
          <select
            className="mt-1 w-48 rounded-md border px-3 py-2"
            value={level}
            onChange={(e) => setLevel(e.target.value as ContractLevel)}
          >
            <option value="klant_sku">Klant + SKU</option>
            <option value="klant">Klant</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600">Klant</label>
          <select
            className="mt-1 w-56 rounded-md border px-3 py-2"
            value={filterKlant}
            onChange={(e) => setFilterKlant(e.target.value)}
          >
            {alleKlanten.map((k) => (
              <option key={k} value={k}>{k === "*" ? "Alle klanten" : k}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600">Periode</label>
          <select
            className="mt-1 w-40 rounded-md border px-3 py-2"
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
          >
            <option value="auto">Laatste maand</option>
            {periodes.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          title="Totaal netto-omzet"
          value={(kpis.totalNetto ?? 0).toLocaleString("nl-NL", { style:"currency", currency:"EUR" })}
          subtitle={`Periode: ${activePeriode}`}
        />
        <KpiCard
          title="Totale groei m/m"
          value={kpis.growthPct == null ? "—" : `${(kpis.growthPct * 100).toFixed(1)}%`}
          subtitle="vs. vorige maand"
        />
        <KpiCard
          title="Aantal outperformers"
          value={String(kpis.outperformCount)}
          subtitle="(netto t.o.v. totaal)"
        />
      </div>

      {/* Charts */}
      <ContractCharts totals={totals} topContracts={topContracts} seriesByContract={seriesByContract} />

      {/* Tabel */}
      <div className="mt-6">
        <div className="mb-2 text-sm font-medium text-gray-700">
          Laatste snapshot — {activePeriode} ({filterKlant === "*" ? "alle klanten" : filterKlant})
        </div>
        <ContractTable rows={filteredLatest} />
      </div>

      {/* Export placeholder */}
      <div className="pt-2 text-right">
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          onClick={() => alert("Export naar Excel: koppel aan API endpoint / implementatie met xlsx")}
        >
          Exporteer naar Excel
        </button>
      </div>
    </div>
  );
}
