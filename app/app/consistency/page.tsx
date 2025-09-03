'use client';

import React from 'react';
import { usePortal } from '@/components/portal/PortalProvider';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function fmt(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export default function ConsistencyPage() {
  const { consistency } = usePortal();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">Consistency analysis</h1>
        <p className="text-xs text-gray-500 mt-1">Please mind that this report contains confidential information.</p>
      </header>

      {!consistency ? (
        <p className="text-sm text-gray-600">Upload data op het Dashboard om deze analyse te zien.</p>
      ) : (
        <>
          {/* Totals */}
          <section className="grid md:grid-cols-3 gap-4">
            <Card title="TOTAL GROSS SALES" value={fmt(consistency.totalGrossSales)} />
            <Card title="TOTAL INCENTIVES" value={fmt(consistency.totalIncentives)} />
            <Card title="TOTAL INCENTIVES (%)" value={`${consistency.pctIncentives.toFixed(1)}%`} />
          </section>

          {/* Tabel + Evolution */}
          <section className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold">CONSISTENCY OVERVIEW TABLE - HIGHEST 15 CUSTOMERS IN TERMS OF TOTAL INCENTIVE</h2>
              <p className="text-xs text-gray-500">sorted by Total incentive (high → low)</p>

              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2">Customer Name</th>
                    <th className="py-2 text-right">Gross Sales (€)</th>
                    <th className="py-2 text-right">Total Incentive (€)</th>
                    <th className="py-2 text-right">Total Incentive (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {consistency.topCustomers.map((c) => (
                    <tr key={c.name} className="border-t">
                      <td className="py-1">{c.name}</td>
                      <td className="py-1 text-right">{fmt(c.gross)}</td>
                      <td className="py-1 text-right">{fmt(c.incentive)}</td>
                      <td className="py-1 text-right">{c.pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                  <tr className="border-t font-medium">
                    <td className="py-1">TOTAL</td>
                    <td className="py-1 text-right">{fmt(consistency.totalGrossSales)}</td>
                    <td className="py-1 text-right">{fmt(consistency.totalIncentives)}</td>
                    <td className="py-1 text-right">{consistency.pctIncentives.toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold">SALES & PRICE EVOLUTION</h2>
              <p className="text-xs text-gray-500">Placeholder – specifieke PX/NS evolutie kan worden toegevoegd zodra tijdserie-kolommen consistent zijn.</p>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={buildDummySeries(consistency)}>
                    <XAxis dataKey="label" />
                    <YAxis />
