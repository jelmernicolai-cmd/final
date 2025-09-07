'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { loadWaterfallRows, eur0 } from '@/lib/waterfall-storage';
import type { Row } from '@/lib/waterfall-types';
import Waterfall from '@/components/charts/Waterfall';

export default function WaterfallPage() {
  const rows: Row[] = loadWaterfallRows();

  // Geen data → upload call-to-action
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

  // Helpers
  const discOf = (r: Row) =>
    (r.d_channel || 0) +
    (r.d_customer || 0) +
    (r.d_product || 0) +
    (r.d_volume || 0) +
    (r.d_other_sales || 0) +
    (r.d_mandatory || 0) +
    (r.d_local || 0);

  // Aggregaties voor Waterfall en KPI's
  const {
    grossTotal,
    comp,
    netTotal,
    avgDiscountPct,
    topLeakCustomers
  } = useMemo(() => {
    let grossTotal = 0;
    let d_channel = 0, d_customer = 0, d_product = 0, d_volume = 0, d_other_sales = 0, d_mandatory = 0, d_local = 0;

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

    const discTotal = d_channel + d_customer + d_product + d_volume + d_other_sales + d_mandatory + d_local;
    const netTotal = grossTotal - discTotal;
    const avgDiscountPct = grossTotal ? (discTotal / grossTotal) * 100 : 0;

    // Waterfall componenten (negatieve deltas)
    const comp = [
      { label: 'Kanaal', value: d_channel },
      { label: 'Klant', value: d_customer },
      { label: 'Product', value: d_product },
      { label: 'Volume', value: d_volume },
      { label: 'Overig', value: d_other_sales },
      { label: 'Mandatory', value: d_mandatory },
      { label: 'Local', value: d_local },
    ].map(x => ({ label: x.label, delta: -x.value }));

    // Snel: top lekkage t.o.v. overall benchmark
    const bench = avgDiscountPct;
    const topLeakCustomers = [...byCustomer.entries()]
      .map(([cust, v]) => {
        const pct = v.gross ? (v.disc / v.gross) * 100 : 0;
        const deviation = pct - bench; // pp
        const potential = deviation > 0 ? (deviation / 100) * v.gross : 0;
        return { cust, gross: v.gross, discPct: pct, deviation, potential };
      })
      .sort((a, b) => b.potential - a.potential)
      .slice(0, 6);

    return { grossTotal, comp, netTotal, avgDiscountPct, topLeakCustomers };
  }, [rows]);

  // CSV export van (geaggregeerde) waterfall componenten
  function exportComponentsCSV() {
    const header = ["Component", "Bedrag (EUR)"];
    const content = [
      ["Gross", Math.round(grossTotal).toString()],
      ...comp.map(s => [s.label, Math.round(Math.abs(s.delta)).toString()]),
      ["Net", Math.round(netTotal).toString()],
    ];
    const csv = [header, ...content].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "waterfall_components.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end gap-2">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Waterfall</h1>
          <p className="text-gray-600">Van Gross naar Net: componenten van korting en directe quick-wins.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportComponentsCSV} className="text-sm rounded border px-3 py-2 hover:bg-gray-50">
            Export components CSV
          </button>
          <Link href="/app/consistency" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">
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
          <div className="text-lg font-semibold mt-1">{avgDiscountPct.toFixed(1)}%</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Netto omzet</div>
          <div className="text-lg font-semibold mt-1">{eur0(netTotal)}</div>
        </div>
      </section>

      {/* Waterfall chart */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold mb-3">Gross → Net (Waterfall)</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <Waterfall
              start={grossTotal}
              steps={comp}
              width={760}
              height={300}
              currencyFmt={(v) => eur0(v)}
            />
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Groen = totaalkolommen (start/eind). Rood = neerwaartse componenten (kortingen). Blauw = opwaartse componenten.
        </p>
      </section>

      {/* Breakdown tabel (desktop) + cards (mobiel) */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold mb-3">Componenten overzicht</h2>

        {/* Desktop tabel */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-[680px] w-full text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left p-2">Component</th>
                <th className="text-right p-2">Bedrag</th>
                <th className="text-right p-2">% van Gross</th>
              </tr>
            </thead>
            <tbody>
              {comp.map((s) => {
                const v = Math.abs(s.delta);
                const pct = grossTotal ? (v / grossTotal) * 100 : 0;
                return (
                  <tr key={s.label} className="border-t">
                    <td className="p-2">{s.label}</td>
                    <td className="p-2 text-right">{eur0(v)}</td>
                    <td className="p-2 text-right">{pct.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden grid gap-3">
          {comp.map((s) => {
            const v = Math.abs(s.delta);
            const pct = grossTotal ? (v / grossTotal) * 100 : 0;
            return (
              <div key={s.label} className="rounded-xl border p-3">
                <div className="font-medium">{s.label}</div>
                <div className="text-sm text-gray-600 mt-1">Bedrag: {eur0(v)}</div>
                <div className="text-sm">Aandeel: {pct.toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Aanbevolen acties (quick wins) */}
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

      {/* Ankers voor upload/template zodat andere pagina's hierheen kunnen linken */}
      <section id="upload" className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold">Upload / Replace dataset</h2>
        <p className="text-sm text-gray-600 mt-1">
          Vervang de huidige dataset of voeg een nieuwe periode toe (Excel). Zorg dat kolommen overeenkomen met het template.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Link
            href="/api/docs#upload" // ⬅️ vervang door jouw daadwerkelijke upload UI/route
            className="inline-flex items-center rounded-lg bg-sky-600 text-white text-sm px-4 py-2 hover:bg-sky-700"
          >
            Uploaden
          </Link>
          <Link
            href="#templates"
            className="inline-flex items-center rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Naar templates
          </Link>
        </div>
      </section>

      <section id="templates" className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold">Templates &amp; Datamapping</h2>
        <p className="text-sm text-gray-600 mt-1">
          Download het Excel-template en bekijk kolomdefinities. Je kunt ook een dummy gebruiken om snel te testen.
        </p>
        <ul className="mt-2 text-sm list-disc pl-4 text-gray-700">
          <li>Vereiste kolommen: <code>period, cust, pg, sku, gross, d_channel, d_customer, d_product, d_volume, d_other_sales, d_mandatory, d_local</code></li>
          <li><code>period</code> in <code>YYYY-MM</code>; bedragen in EUR.</li>
        </ul>
        <div className="mt-3 flex items-center gap-2">
          <a
            href="sandbox:/mnt/data/dummy_sales_waterfall.xlsx"
            className="inline-flex items-center rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Download dummy.xlsx
          </a>
          <Link
            href="#upload"
            className="inline-flex items-center rounded-lg bg-sky-600 text-white text-sm px-4 py-2 hover:bg-sky-700"
          >
            Klaar? Upload →
          </Link>
        </div>
      </section>
    </div>
  );
}
