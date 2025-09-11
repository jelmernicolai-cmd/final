"use client";

import { AggRow } from "@/lib/contract-analysis";

function pct(v?: number | null) {
  return v == null ? "—" : `${(v * 100).toFixed(1)}%`;
}

export default function ContractTable({ rows }: { rows: AggRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-3 py-2">Contract</th>
            <th className="px-3 py-2">Periode</th>
            <th className="px-3 py-2 text-right">Omzet</th>
            <th className="px-3 py-2 text-right">Netto</th>
            <th className="px-3 py-2 text-right">Units</th>
            <th className="px-3 py-2 text-right">Groei m/m (Netto)</th>
            <th className="px-3 py-2 text-right">Totaal groei</th>
            <th className="px-3 py-2 text-center">Outperform</th>
            <th className="px-3 py-2 text-right">Contrib. % (Netto)</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r, idx) => {
            const out = r.outperform_netto;
            const chip =
              out == null ? (
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-500">n.v.t.</span>
              ) : out ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-200">
                  Beter
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700 ring-1 ring-rose-200">
                  Slechter
                </span>
              );
            return (
              <tr key={idx} className="odd:bg-white even:bg-gray-50/30">
                <td className="px-3 py-2">{r.contract}</td>
                <td className="px-3 py-2">{r.periode}</td>
                <td className="px-3 py-2 text-right">{r.omzet.toLocaleString("nl-NL",{style:"currency",currency:"EUR"})}</td>
                <td className="px-3 py-2 text-right">{r.netto_omzet.toLocaleString("nl-NL",{style:"currency",currency:"EUR"})}</td>
                <td className="px-3 py-2 text-right">{r.aantal_units.toLocaleString("nl-NL")}</td>
                <td className="px-3 py-2 text-right">{pct(r.pct_groei_netto)}</td>
                <td className="px-3 py-2 text-right">{pct(r.pct_groei_totaal_netto)}</td>
                <td className="px-3 py-2 text-center">{chip}</td>
                <td className="px-3 py-2 text-right">
                  {r.contrib_netto == null ? "—" : `${(r.contrib_netto * 100).toFixed(1)}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
