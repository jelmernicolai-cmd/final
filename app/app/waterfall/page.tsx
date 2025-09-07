'use client';

import Link from 'next/link';
import { useMemo, useRef } from 'react';
import { loadWaterfallRows, eur0 } from '@/lib/waterfall-storage';
import type { Row } from '@/lib/waterfall-types';
import Waterfall from '@/components/charts/Waterfall';

export default function WaterfallPage() {
  const rows: Row[] = loadWaterfallRows();
  const chartRef = useRef<HTMLDivElement>(null);

  // ======= Geen data: Upload CTA =======
  if (!rows.length) {
    return (
      <div className="space-y-6">
        <header className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Waterfall</h1>
          <span className="ml-2 text-xs px-2 py-1 rounded-full border bg-amber-50 text-amber-800 border-amber-200">
            Geen dataset gevonden
          </span>
        </header>

        <section className="rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-semibold">Start met je data</h2>
          <p className="text-gray-600 mt-1">
            Upload een Excel (template) om de Waterfall te tonen en aanbevelingen te genereren.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/app/waterfall#upload"
              className="inline-flex items-center rounded-lg bg-sky-600 text-white text-sm px-4 py-2 hover:bg-sky-700"
            >
              Naar upload
            </Link>
            <Link
              href="/app/waterfall#templates"
              className="inline-flex items-center rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Templates & datamapping
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // ======= Helpers =======
  const discOf = (r: Row) =>
    (r.d_channel || 0) +
    (r.d_customer || 0) +
    (r.d_product || 0) +
    (r.d_volume || 0) +
    (r.d_other_sales || 0) +
    (r.d_mandatory || 0) +
    (r.d_local || 0);

  const {
    grossTotal,
    comp,
    netTotal,
    avgDiscountPct,
    topLeakCustomers,
  } = useMemo(() => {
    let grossTotal = 0;
    let d_channel = 0, d_customer = 0, d_product = 0, d_volume = 0,
      d_other_sales = 0, d_mandatory = 0, d_local = 0;

    const byCustomer = new Map<string, { gross: number; disc: number }>();

    for (const r of rows) {
      const g = r.gross || 0;
      const d = discOf(r);
      grossTotal += g;

      d_channel += r.d_channel || 0;
      d_customer += r.d_customer || 0;
      d_product += r.d_product || 0;
      d_volume += r.d_volume || 0;
      d_other_sales += r.d_other_sales || 0;
      d_mandatory += r.d_mandatory || 0;
      d_local += r.d_local || 0;

      const c = byCustomer.get(r.cust) || { gross: 0, disc: 0 };
      c.gross += g;
      c.disc += d;
      byCustomer.set(r.cust, c);
    }

    const discTotal =
      d_channel + d_customer + d_product + d_volume + d_other_sales + d_mandatory + d_local;
    const netTotal = grossTotal - discTotal;
    const avgDiscountPct = grossTotal ? (discTotal / grossTotal) * 100 : 0;

    const comp = [
      { label: 'Kanaal', delta: -d_channel },
      { label: 'Klant', delta: -d_customer },
      { label: 'Product', delta: -d_product },
      { label: 'Volume', delta: -d_volume },
      { label: 'Overig', delta: -d_other_sales },
      { label: 'Mandatory', delta: -d_mandatory },
      { label: 'Local', delta: -d_local },
    ];

    const bench = avgDiscountPct;
    const topLeakCustomers = [...byCustomer.entries()]
      .map(([cust, v]) => {
        const pct = v.gross ? (v.disc / v.gross) * 100 : 0;
        const deviation = pct - bench;
        const potential = deviation > 0 ? (deviation / 100) * v.gross : 0;
        return { cust, gross: v.gross, discPct: pct, deviation, potential };
      })
      .sort((a, b) => b.potential - a.potential)
      .slice(0, 6);

    return { grossTotal, comp, netTotal, avgDiscountPct, topLeakCustomers };
  }, [rows]);

  // ======= Export helpers =======
  function exportComponentsCSV() {
    const header = ['Component', 'Bedrag (EUR)'];
    const content = [
      ['Gross', Math.round(grossTotal).toString()],
      ...comp.map((s) => [s.label, Math.round(Math.abs(s.delta)).toString()]),
      ['Net', Math.round(netTotal).toString()],
    ];
    const csv = [header, ...content].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'waterfall_components.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function exportChartPNG() {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            const pngUrl = URL.createObjectURL(pngBlob);
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = 'waterfall_chart.png';
            a.click();
            URL.revokeObjectURL(pngUrl);
          }
        });
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  // ======= Render =======
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end gap-2">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Waterfall</h1>
          <p className="text-gray-600">
            Van Gross naar Net: componenten van korting en directe quick-wins.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportComponentsCSV}
            className="text-sm rounded border px-3 py-2 hover:bg-gray-50"
          >
            Export CSV
          </button>
          <button
            onClick={exportChartPNG}
            className="text-sm rounded border px-3 py-2 hover:bg-gray-50"
          >
            Download chart PNG
          </button>
          <Link
            href="/app/consistency"
            className="text-sm rounded border px-3 py-2 hover:bg-gray-50"
          >
            Naar Consistency
          </Link>
        </div>
      </header>

      {/* KPI’s */}
      <section className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Totaal Gross</div>
          <div className="text-lg font-semibold mt-1">{eur0(grossTotal)}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Gem. korting (gewogen)</div>
          <div className="text-lg font-semibold mt-1">
            {avgDiscountPct.toFixed(1)}%
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Netto omzet</div>
          <div className="text-lg font-semibold mt-1">{eur0(netTotal)}</div>
        </div>
      </section>

      {/* Waterfall chart */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold mb-3">Gross → Net (Waterfall)</h2>
        <div ref={chartRef} className="w-full">
          <Waterfall start={grossTotal} steps={comp} height={280} currencyFmt={(v) => eur0(v)} />
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Groen = totalen (Gross/Net). Rood = neerwaartse componenten. Blauw = opwaartse componenten.
        </p>
      </section>

      {/* Aanbevolen acties */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold">Aanbevolen acties (quick wins)</h2>
        <ul className="mt-2 grid md:grid-cols-3 gap-3 text-sm">
          {topLeakCustomers.slice(0, 3).map((c) => (
            <li key={c.cust} className="rounded-xl border p-3">
              <div className="font-medium">Heronderhandel {c.cust}</div>
              <p className="text-gray-700 mt-1">
                {c.deviation.toFixed(1)}pp boven benchmark bij omzet {eur0(c.gross)}.
              </p>
              <div className="mt-2">
                Potentiële margeverbetering: <b>{eur0(c.potential)}</b>
              </div>
              <div className="mt-3">
                <Link
                  href="/app/consistency"
                  className="inline-flex items-center rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                >
                  Bekijk klantdetails →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
