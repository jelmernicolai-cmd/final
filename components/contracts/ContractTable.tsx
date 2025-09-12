// components/contracts/ContractTable.tsx
"use client";
import type { AggRow } from "../../lib/contract-analysis";

function pct(n?: number | null, d = 1) {
  const v = Number.isFinite(n as number) ? (n as number) : 0;
  return `${v.toFixed(d)}%`;
}
function eur(n?: number | null) {
  const v = Number.isFinite(n as number) ? (n as number) : 0;
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

export default function ContractTable({ rows }: { rows: AggRow[] }) {
  return (
    <div className="rounded-2xl border bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="px-3 py-2 text-left">Contract</th>
              <th className="px-3 py-2 text-right">Netto omzet</th>
              <th className="px-3 py-2 text-right">Groei (contract)</th>
              <th className="px-3 py-2 text-right">Groei (totaal)</th>
              <th className="px-3 py-2 text-right">Δ vs totaal (pp)</th>
              <th className="px-3 py-2 text-right">Bijdrage</th>
              <th className="px-3 py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r, i) => {
              // Afleiden “beter/slechter”: positieve delta_pp = outperform
              const delta = Number.isFinite(r.delta_pp as number) ? (r.delta_pp as number) : 0;
              const chip =
                !Number.isFinite(r.delta_pp as number) ? (
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-500">n.v.t.</span>
                ) : delta > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-200">
                    Beter
                  </span>
                ) : delta < 0 ? (
                  <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700 ring-1 ring-rose-200">
                    Lager
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 ring-1 ring-amber-200">
                    Neutraal
                  </span>
                );

              return (
                <tr key={i} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{r.contract}</div>
                    {r.subLabel ? <div className="text-xs text-gray-500">{r.subLabel}</div> : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{eur(r.totaal_netto)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{pct(r.groei_contract_pct)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{pct(r.groei_totaal_pct)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {Number.isFinite(r.delta_pp as number) ? (r.delta_pp! >= 0 ? "+" : "") + (r.delta_pp as number).toFixed(1) + " pp" : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{pct(r.bijdrage_pp, 1)}</td>
                  <td className="px-3 py-2 text-right">{chip}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobiele hint */}
      <div className="md:hidden p-3 border-t text-[11px] text-gray-500">
        Tip: veeg horizontaal om alle kolommen te zien.
      </div>
    </div>
  );
}
