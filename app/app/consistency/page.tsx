'use client';

import { useMemo } from 'react';
import { loadWaterfallRows, eur0, pct1 } from '@/lib/waterfall-storage';
import type { Row } from '@/lib/waterfall-types';
import ConsistencyNav from '@/components/consistency/ConsistencyNav';

export default function ConsistencyHub() {
  const rows: Row[] = loadWaterfallRows();

  if (!rows.length) {
    return (
      <div className="max-w-3xl space-y-4">
        <ConsistencyNav />
        <h1 className="text-xl font-semibold mt-4">Consistency</h1>
        <p className="text-gray-600">
          Geen dataset gevonden. Upload eerst een Excel in de Waterfall-module.
        </p>
      </div>
    );
  }

  const { grossTotal, avgDiscountPct, customers } = useMemo(() => {
    let grossTotal = 0;
    let discTotal = 0;

    const byCust = new Map<string, { gross: number; discount: number }>();

    for (const r of rows) {
      const gross = r.gross || 0;
      const discount =
        (r.d_channel || 0) + (r.d_customer || 0) + (r.d_product || 0) +
        (r.d_volume || 0) + (r.d_other_sales || 0) + (r.d_mandatory || 0) +
        (r.d_local || 0);

      grossTotal += gross;
      discTotal += discount;

      const cur = byCust.get(r.cust) || { gross: 0, discount: 0 };
      cur.gross += gross;
      cur.discount += discount;
      byCust.set(r.cust, cur);
    }

    const avgDiscountPct = grossTotal ? (discTotal / grossTotal) * 100 : 0;

    const customers = [...byCust.entries()].map(([cust, v]) => {
      const pct = v.gross ? (v.discount / v.gross) * 100 : 0;
      const deviation = pct - avgDiscountPct;
      const potential = deviation > 0 ? (deviation / 100) * v.gross : 0;

      let suggestion = '';
      if (deviation > 3) {
        suggestion = `Te hoge korting t.o.v. benchmark. Heronderhandel contract.`;
      } else if (deviation < -3) {
        suggestion = `Relatief lage korting bij hoge omzet. Kans op ontevredenheid.`;
      }

      return {
        cust,
        gross: v.gross,
        discountPct: pct,
        deviation,
        potential,
        suggestion,
      };
    });

    return { grossTotal, avgDiscountPct, customers };
  }, [rows]);

  const topCustomers = [...customers].sort((a, b) => b.gross - a.gross).slice(0, 10);

  return (
    <div className="space-y-6">
      <ConsistencyNav />

      <header className="mt-4">
        <h1 className="text-xl font-semibold">Consistency Analyse</h1>
        <p className="text-gray-600">
          Vergelijk kortingen per klant t.o.v. omzetbenchmark. Vind kansen voor besparing of retentie.
        </p>
      </header>

      <div className="grid sm:grid-cols-3 gap-4">
        <Kpi title="Totaal Gross" value={eur0(grossTotal)} />
        <Kpi title="Gemiddelde korting%" value={pct1(avgDiscountPct, 100)} />
        <Kpi
          title="Potentieel besparingsbedrag (Top-10)"
          value={eur0(topCustomers.reduce((s, c) => s + c.potential, 0))}
        />
      </div>

      <div className="rounded-2xl border bg-white p-4 overflow-x-auto">
        <table className="min-w-[800px] w-full text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left p-2">Klant</th>
              <th className="text-right p-2">Omzet</th>
              <th className="text-right p-2">Korting%</th>
              <th className="text-right p-2">Afwijking tov benchmark</th>
              <th className="text-right p-2">Potentieel</th>
              <th className="text-left p-2">Suggestie</th>
            </tr>
          </thead>
          <tbody>
            {topCustomers.map((c) => (
              <tr key={c.cust} className="border-t">
                <td className="p-2 font-medium">{c.cust}</td>
                <td className="p-2 text-right">{eur0(c.gross)}</td>
                <td className="p-2 text-right">{c.discountPct.toFixed(1)}%</td>
                <td className={`p-2 text-right ${c.deviation > 0 ? 'text-red-600' : c.deviation < 0 ? 'text-amber-700' : ''}`}>
                  {c.deviation.toFixed(1)}%
                </td>
                <td className="p-2 text-right">
                  {c.potential > 0 ? eur0(c.potential) : '—'}
                </td>
                <td className="p-2">{c.suggestion || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
