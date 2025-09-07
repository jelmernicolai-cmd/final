'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { loadWaterfallRows } from '@/lib/waterfall-storage';
import type { Row } from '@/lib/waterfall-types';
import ScatterChartSVG from '@/components/consistency/ScatterChartSVG.client';

export default function CustomersConsistency() {
  const rows: Row[] = loadWaterfallRows();

  if (!rows.length) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Customers</h1>
        <p className="text-gray-600">Geen dataset gevonden. Upload eerst een Excel.</p>
        <Link className="inline-block mt-3 rounded-lg border px-3 py-2 hover:bg-gray-50" href="/app/consistency/upload">
          Uploaden
        </Link>
      </div>
    );
  }

  const points = useMemo(() => {
    const totalGross = rows.reduce((s, r) => s + (r.gross || 0), 0) || 1;

    const byCust = new Map<string, { gross: number; discounts: number }>();
    for (const r of rows) {
      const disc =
        (r.d_channel || 0) + (r.d_customer || 0) + (r.d_product || 0) +
        (r.d_volume || 0) + (r.d_other_sales || 0) + (r.d_mandatory || 0) +
        (r.d_local || 0);

      const cur = byCust.get(r.cust) || { gross: 0, discounts: 0 };
      cur.gross += r.gross || 0;
      cur.discounts += disc;
      byCust.set(r.cust, cur);
    }

    return [...byCust.entries()].map(([cust, v]) => ({
      label: cust,
      x: (v.gross / totalGross) * 100,                  // omzet-aandeel %
      y: v.gross ? (v.discounts / v.gross) * 100 : 0,   // discount %
      size: Math.max(0.4, Math.min(3, (v.gross / totalGross) * 6)),
    }));
  }, [rows]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Customers – Consistency</h1>
      <p className="text-gray-600">Omzet-aandeel vs. discount% per klant met trendlijn.</p>

      <div className="rounded-2xl border bg-white p-4 overflow-x-auto">
        <ScatterChartSVG
          points={points}
          width={960}
          height={360}
          xLabel="Omzet-aandeel (%)"
          yLabel="Discount / Gross (%)"
          decimals={1}
        />
      </div>

      <Link href="/app/consistency" className="inline-block rounded-lg border px-3 py-2 hover:bg-gray-50">
        ← Terug naar Consistency hub
      </Link>
    </div>
  );
}
