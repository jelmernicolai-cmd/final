'use client';

import React, { useMemo } from 'react';
import { usePortal } from '@/components/portal/PortalProvider';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function fmt(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export default function WaterfallPage() {
  const { waterfall } = usePortal();

  const chartData = useMemo(() => {
    if (!waterfall) return [];
    // bouw cumulatieve Waterfall
    const steps = waterfall.table.filter(r =>
      [
        'Gross Sales',
        'Channel Discounts',
        'Customer Discounts',
        'Product Discounts',
        'Volume Discounts',
        'Value Discounts',
        'Other Sales Discounts',
        'Mandatory Discounts',
        'Local Discount',
        'Invoiced Sales',
        'Direct Rebates',
        'Prompt Payment Rebates',
        'Indirect Rebates',
        'Mandatory Rebates',
        'Local Rebate',
        'Royalty Income*',
        'Other Income*',
        'Net Sales',
      ].includes(r.level)
    ).map(r => ({ name: r.level, value: r.amount }));

    let cum = 0;
    return steps.map(s => {
      const start = cum;
      cum += s.value;
      return { name: s.name, bar: s.value, start, end: cum };
    });
  }, [waterfall]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">Gross-to-Net Waterfall</h1>
        <p className="text-xs text-gray-500 mt-1">Let op: dit rapport kan vertrouwelijke informatie bevatten.</p>
      </header>

      {!waterfall ? (
        <p className="text-sm text-gray-600">Upload data op het Dashboard om de Waterfall te zien.</p>
      ) : (
        <>
          {/* Totals */}
          <section className="grid md:grid-cols-3 gap-4">
            <Card
              title="TOTAL GtN SPEND (€)"
              value={fmt(waterfall.totalGtNSpend)}
              sub=""
            />
            <Card
              title="TOTAL GtN SPEND (%)"
              value={`${waterfall.pctGtN.toFixed(1)}%`}
              sub=""
            />
            <div className="grid grid-cols-2 gap-4">
              <Card title="TOTAL DISCOUNT" value={fmt(waterfall.totalDiscount)} sub={`${waterfall.pctDiscount.toFixed(1)}%`} />
              <Card title="TOTAL REBATE" value={fmt(waterfall.totalRebate)} sub={`${waterfall.pctRebate.toFixed(1)}%`} />
            </div>
          </section>

          {/* Table + Chart + Top-3 */}
          <section className="grid lg:grid-cols-2 gap-6">
            {/* GtN Spend Table */}
            <div className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold">GROSS-TO-NET SPEND TABLE</h2>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2">GtN Level</th>
                    <th className="py-2 text-right">€</th>
                    <th className="py-2 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {waterfall.table.map((r) => (
                    <tr key={r.level} className="border-t">
                      <td className="py-2">{r.level}</td>
                      <td className="py-2 text-right">{fmt(r.amount)}</td>
                      <td className="py-2 text-right">{r.pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Waterfall Overview */}
            <div className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold">GROSS-TO-NET WATERFALL OVERVIEW</h2>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v) => String(Math.round(Number(v) / 1000)) + 'k'} />
                    <Tooltip formatter={(v: any) => fmt(Number(v))} labelFormatter={(l) => l} />
                    <Bar dataKey="bar" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top-3 blokken */}
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div>
                  <h3 className="font-medium">Customer - Highest 3</h3>
                  <table className="mt-2 w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-1">Customer</th>
                        <th className="py-1 text-right">GtN Spend</th>
                        <th className="py-1 text-right">GtN (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waterfall.topCustomers.map(c => (
                        <tr key={c.name} className="border-t">
                          <td className="py-1">{c.name}</td>
                          <td className="py-1 text-right">{fmt(c.gtn)}</td>
                          <td className="py-1 text-right">{c.pct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3 className="font-medium">SKU - Highest 3</h3>
                  <table className="mt-2 w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-1">SKU</th>
                        <th className="py-1 text-right">GtN Spend</th>
                        <th className="py-1 text-right">GtN (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waterfall.topSkus.map(s => (
                        <tr key={s.name} className="border-t">
                          <td className="py-1">{s.name}</td>
                          <td className="py-1 text-right">{fmt(s.gtn)}</td>
                          <td className="py-1 text-right">{s.pct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Card({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
      {sub ? <div className="text-xs text-gray-500">{sub}</div> : null}
    </div>
  );
}
