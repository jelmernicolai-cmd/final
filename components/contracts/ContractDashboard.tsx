// components/contracts/ContractDashboard.tsx
"use client";

import { useMemo, useState } from "react";
import KpiCard from "./KpiCard";
import ContractTable from "./ContractTable";
import ContractCharts from "./ContractCharts";
import type { ContractLevel, AggRow, TotalRow } from "../../lib/contract-analysis";

export default function ContractDashboard({ dataOverride }: { dataOverride: { agg: AggRow[]; totals: TotalRow[]; latest: AggRow[] } }) {
  const [level, setLevel] = useState<ContractLevel>("klant_sku");
  const [filterKlant, setFilterKlant] = useState<string>("*");
  const [periode, setPeriode] = useState<string>("auto");

  const { agg, totals } = dataOverride;

  const alleKlanten = useMemo(() => {
    const s = new Set(agg.map((r) => r.contract.split(" | ")[0]));
    return ["*", ...Array.from(s).sort()];
  }, [agg]);

  const periodes = useMemo(() => Array.from(new Set(agg.map(r=>r.periode))).sort(), [agg]);
  const lastPeriode = periodes[periodes.length - 1];
  const activePeriode = periode === "auto" ? lastPeriode : periode;

  const filteredLatest = useMemo(() => {
    const rows = agg.filter(r=>r.periode===activePeriode);
    return filterKlant === "*" ? rows : rows.filter(r=> r.contract.startsWith(filterKlant));
  }, [agg, activePeriode, filterKlant]);

  const kpis = useMemo(() => {
    const i = totals.findIndex(t=>t.periode===activePeriode);
    const last = totals[i];
    return {
      totalNetto: last?.totaal_netto ?? 0,
      growthPct: last?.pct_groei_totaal_netto ?? null,
      outperformCount: filteredLatest.filter(r=>r.outperform_netto===true).length,
      period: activePeriode,
    };
  }, [totals, activePeriode, filteredLatest]);

  const topContracts = useMemo(() => {
    const lastRows = agg.filter(r=>r.periode===activePeriode);
    return [...lastRows].sort((a,b)=>(b.pct_groei_netto??-999)-(a.pct_groei_netto??-999)).slice(0,3).map(r=>r.contract);
  }, [agg, activePeriode]);

  const seriesByContract = useMemo(()=>{
    const out: Record<string,{x:string[]; y:number[]}> = {};
    for (const c of topContracts) {
      const rows = agg.filter(r=>r.contract===c).sort((a,b)=>a.periode.localeCompare(b.periode));
      out[c] = { x: rows.map(r=>r.periode), y: rows.map(r=>r.netto_omzet) };
    }
    return out;
  }, [agg, topContracts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div>
          <label className="block text-sm text-gray-600">Niveau</label>
          <select className="mt-1 w-48 rounded-md border px-3 py-2" value={level} onChange={(e)=>setLevel(e.target.value as ContractLevel)}>
            <option value="klant_sku">Klant + SKU</option>
            <option value="klant">Klant</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600">Klant</label>
          <select className="mt-1 w-56 rounded-md border px-3 py-2" value={filterKlant} onChange={(e)=>setFilterKlant(e.target.value)}>
            {alleKlanten.map(k => <option key={k} value={k}>{k==="*"?"Alle klanten":k}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600">Periode</label>
          <select className="mt-1 w-40 rounded-md border px-3 py-2" value={periode} onChange={(e)=>setPeriode(e.target.value)}>
            <option value="auto">Laatste maand</option>
            {periodes.map(p=> <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard title="Totaal netto-omzet" value={(kpis.totalNetto).toLocaleString("nl-NL",{style:"currency",currency:"EUR"})} subtitle={`Periode: ${kpis.period}`} />
        <KpiCard title="Totale groei m/m" value={kpis.growthPct==null?"—":`${(kpis.growthPct*100).toFixed(1)}%`} subtitle="vs. vorige maand" />
        <KpiCard title="Aantal outperformers" value={String(kpis.outperformCount)} subtitle="(netto t.o.v. totaal)" />
      </div>

      <ContractCharts totals={totals} topContracts={topContracts} seriesByContract={seriesByContract} />

      <div className="mt-6">
        <div className="mb-2 text-sm font-medium text-gray-700">
          Laatste snapshot — {activePeriode} ({filterKlant === "*" ? "alle klanten" : filterKlant})
        </div>
        <ContractTable rows={filteredLatest} />
      </div>
    </div>
  );
}
