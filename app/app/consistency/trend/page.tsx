'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { loadWaterfallRows, eur0 } from '@/lib/waterfall-storage';
import type { Row } from '@/lib/waterfall-types';

type OptKey = 'pg' | 'sku';

export default function TrendConsistency() {
  const rows: Row[] = loadWaterfallRows();
  const [by, setBy] = useState<OptKey>('pg');

  if (!rows.length) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Trend & Heatmap</h1>
        <p className="text-gray-600">Geen dataset gevonden. Upload eerst een Excel.</p>
        <Link className="inline-block mt-3 rounded-lg border px-3 py-2 hover:bg-gray-50" href="/app/consistency/upload">
          Uploaden
        </Link>
      </div>
    );
  }

  // Perioden normaliseren (zo nodig aanpassen aan jouw Excel)
  const norm = (p: string) => p; // evt. '2025Q1' -> '2025-01', etc.

  const { periods, keys, matrix, totals } = useMemo(() => {
    const periodsSet = new Set<string>();
    const keySet = new Set<string>();
    const map = new Map<string, number>(); // key|period -> gross

    for (const r of rows) {
      const key = (r[by] as string) || '—';
      const per = norm(r.period || '—');
      periodsSet.add(per);
      keySet.add(key);
      const k = key + '|' + per;
      map.set(k, (map.get(k) || 0) + (r.gross || 0));
    }

    const periods = [...periodsSet].sort();
    const keys = [...keySet].sort();

    const matrix = keys.map((k) =>
      periods.map((p) => map.get(k + '|' + p) || 0)
    );

    const totals = periods.map((_, colIdx) =>
      keys.reduce((s, _, rowIdx) => s + matrix[rowIdx][colIdx], 0)
    );

    return { periods, keys, matrix, totals };
  }, [rows, by]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Trend & Heatmap</h1>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-gray-600">Groeperen op</label>
          <select
            value={by}
            onChange={(e) => setBy(e.target.value as OptKey)}
            className="text-sm border rounded px-2 py-1"
            aria-label="Groeperen op"
          >
            <option value="pg">Productgroep</option>
            <option value="sku">SKU</option>
          </select>
        </div>
      </div>

      {/* Totals per periode */}
      <div className="rounded-2xl border bg-white p-4 overflow-x-auto">
        <table className="min-w-[640px] w-full text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left p-2">Periode</th>
              {periods.map((p) => (
                <th key={p} className="text-right p-2">{p}</th>
              ))}
              <th className="text-right p-2">Totaal</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2 font-medium">Gross</td>
              {totals.map((v, i) => (
                <td key={i} className="p-2 text-right">{eur0(v)}</td>
              ))}
              <td className="p-2 text-right font-semibold">{eur0(totals.reduce((a, b) => a + b, 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Heatmap */}
      <div className="rounded-2xl border bg-white p-4 overflow-x-auto">
        <table className="min-w-[800px] w-full text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left p-2">{by === 'pg' ? 'Productgroep' : 'SKU'}</th>
              {periods.map((p) => (
                <th key={p} className="text-right p-2">{p}</th>
              ))}
              <th className="text-right p-2">Totaal</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k, rowIdx) => {
              const row = matrix[rowIdx];
              const total = row.reduce((a, b) => a + b, 0);
              return (
                <tr key={k} className="border-t">
                  <td className="p-2 font-medium">{k}</td>
                  {row.map((v, i) => (
                    <td key={i} className="p-2 text-right">{eur0(v)}</td>
                  ))}
                  <td className="p-2 text-right font-semibold">{eur0(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Link href="/app/consistency" className="inline-block rounded-lg border px-3 py-2 hover:bg-gray-50">
        ← Terug naar Consistency hub
      </Link>
    </div>
  );
}
