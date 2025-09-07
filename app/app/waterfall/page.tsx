'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { loadWaterfallRows, eur0 } from '@/lib/waterfall-storage';
import type { Row } from '@/lib/waterfall-types';
import Sparkline from '@/components/charts/Sparkline';
import MiniBar from '@/components/charts/MiniBar';
import Donut from '@/components/charts/Donut';

export default function WaterfallPage() {
  const rows: Row[] = loadWaterfallRows();

  // ======= GEEN DATA: Upload Hero =======
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
            Upload een Excel volgens het template. Daarna verschijnen hier de waterfall‐analyse,
            KPI’s en aanbevelingen.
          </p>

          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div id="upload" className="rounded-xl border p-4">
              <h3 className="font-medium">Upload / Replace dataset</h3>
              <p className="text-sm text-gray-600 mt-1">
                Vervang de huidige dataset of voeg een nieuwe periode toe (Excel).
              </p>
              <div className="mt-3 flex items-center gap-2">
                {/* Koppel deze knop aan jouw bestaande upload-flow/route of dropzone */}
                <Link
                  href="/api/docs#upload" // <- Pas dit aan naar jouw echte upload-endpoint of -pagina
                  className="inline-flex items-center rounded-lg bg-sky-600 text-white text-sm px-4 py-2 hover:bg-sky-700"
                >
                  Uploaden
                </Link>
                <Link
                  href="/app/waterfall#templates"
                  className="inline-flex items-center rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Template bekijken
                </Link>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Tip: test snel met onze{' '}
                <Link href="/app/waterfall#templates" className="underline">
                  dummy dataset
                </Link>
                .
              </p>
            </div>

            <div id="templates" className="rounded-xl border p-4">
              <h3 className="font-medium">Templates &amp; Datamapping</h3>
              <p className="text-sm text-gray-600 mt-1">
                Download het Excel-template en bekijk de kolomdefinities.
              </p>
              <ul className="mt-2 text-sm list-disc pl-4 text-gray-700">
                <li>Kolommen: <code>period, cust, pg, sku, gross, d_channel, d_customer, d_product, d_volume, d_other_sales, d_mandatory, d_local</code></li>
                <li><code>period</code> in <code>YYYY-MM</code>; bedragen in EUR.</li>
              </ul>
              <div className="mt-3 flex items-center gap-2">
                {/* Laatste bericht bevatte een gegenereerde dummy – link blijft werken als je die gebruikt */}
                <a
                  href="sandbox:/mnt/data/dummy_sales_waterfall.xlsx"
                  className="inline-flex items-center rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Download dummy.xlsx
                </a>
                <Link
                  href="/app/waterfall#upload"
                  className="inline-flex items-center rounded-lg bg-sky-600 text-white text-sm px-4 py-2 hover:bg-sky-700"
                >
                  Klaar? Upload →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ======= MET DATA: KPI's, compacte grafieken + breakdown =======
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
    discTotal,
    avgDiscountPct,
    netTotal,
    periodPctSeries,
    compShare,
    topCustLeakage,
  } = useMemo(() => {
    let grossTotal = 0, discTotal = 0;
    const byPeriod = new Map<string, { gross: number; disc: number }>();
    const byCustomer = new Map<string, { gross: number; disc: number }>();

    // Componenten-accu
    let d_channel = 0, d_customer = 0, d_product = 0, d_volume = 0, d_other_sales = 0, d_mandatory = 0, d_local = 0;

    for (const r of rows) {
      const g = r.gross || 0;
      const d = discOf(r);
      grossTotal += g;
      discTotal += d;

      d_channel += r.d_channel || 0;
      d_customer += r.d_customer || 0;
      d_product += r.d_product || 0;
      d_volume += r.d_volume || 0;
      d_other_sales += r.d_other_sales || 0;
      d_mandatory += r.d_mandatory || 0;
      d_local += r.d_local || 0;

      const p = r.period || '—';
      const pp = byPeriod.get(p) || { gross: 0, disc: 0 };
      pp.gross += g; pp.disc += d; byPeriod.set(p, pp);

      const cc = byCustomer.get(r.cust) || { gross: 0, disc: 0 };
      cc.gross += g; cc.disc += d; byCustomer.set(r.cust, cc);
    }

    const avgDiscountPct = grossTotal ? (discTotal / grossTotal) * 100 : 0;
    const netTotal = grossTotal - discTotal;

    const periods = [...byPeriod.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const periodPctSeries = periods.map(([_, v]) => (v.gross ? (v.disc / v.gross) * 100 : 0));

    // Component shares (percentagepunten t.o.v. Gross)
    const compShare = [
      { key: 'Kanaal', value: (d_channel / grossTotal) * 100 },
      { key: 'Klant', value: (d_customer / grossTotal) * 100 },
      { key: 'Product', value: (d_product / grossTotal) * 100 },
      { key: 'Volume', value: (d_volume / grossTotal) * 100 },
      { key: 'Overig', value: (d_other_sales / grossTotal) * 100 },
      { key: 'Mandatory', value: (d_mandatory / grossTotal) * 100 },
      { key: 'Local', value: (d_local / grossTotal) * 100 },
    ];

    // Top klant-leakage t.o.v. overall benchmark (dashboard-quickview)
    const bench = avgDiscountPct;
    const topCustLeakage = [...byCustomer.entries()]
      .map(([cust, v]) => {
        const pct = v.gross ? (v.disc / v.gross) * 100 : 0;
        const deviation = pct - bench;
        const potential = deviation > 0 ? (deviation / 100) * v.gross : 0;
        return { cust, gross: v.gross, discPct: pct, deviation, potential };
      })
      .sort((a, b) => b.potential - a.potential)
      .slice(0, 8);

    return {
      grossTotal,
      discTotal,
      avgDiscountPct,
      netTotal,
      periodPctSeries,
      compShare,
      topCustLeakage,
    };
  }, [rows]);

  const totalPotential = topCustLeakage.reduce((s, c) => s + c.potential, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end gap-2">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Waterfall</h1>
          <p className="text-gray-600">
            Uitsplitsing van korting-componenten en snelle signalen voor marge-optimalisatie.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/app/consistency" className="text-sm rounded border px-3 py-2 hover:bg-gray-50">
            Naar Consistency
          </Link>
        </div>
      </header>

      {/* KPI’s + charts */}
      <section className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Totaal Gross</div>
            <div className="text-lg font-semibold mt-1">{eur0(grossTotal)}</div>
            <div className="text-xs text-gray-600 mt-1">Netto: {eur0(netTotal)}</div>
          </div>
          <Donut value={avgDiscountPct} label="Gem. korting (overall)" />
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Korting% over tijd</div>
          <Sparkline data={periodPctSeries} />
          <div className="text-xs text-gray-600 mt-1">Detail-benchmarks: zie Consistency.</div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Besparingssignaal (Top klanten)</div>
          <div className="text-lg font-semibold mt-1">{eur0(totalPotential)}</div>
          <div className="mt-2">
            <MiniBar
              values={topCustLeakage.map((x) => x.deviation)}
              labels={topCustLeakage.map((x) => x.cust)}
              valueFmt={(v) => v.toFixed(1) + 'pp'}
              tooltip={(_, v, l) => `${l}: ${v.toFixed(1)} pp`}
            />
          </div>
        </div>
      </section>

      {/* Component-breakdown */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold">Korting-componenten (pp t.o.v. gross)</h2>
        <div className="mt-2 overflow-x-auto">
          <MiniBar
            values={compShare.map((c) => c.value)}
            labels={compShare.map((c) => c.key)}
            valueFmt={(v) => v.toFixed(1) + 'pp'}
            tooltip={(_, v, l) => `${l}: ${v.toFixed(1)} pp`}
          />
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Gebruik dit om snel te zien waar de korting vooral vandaan komt en waar normalisatie mogelijk is.
        </p>
      </section>

      {/* Aanbevolen acties – waterfalldriven, kort & krachtig */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold">Aanbevolen acties (quick wins)</h2>
        <ul className="mt-2 grid md:grid-cols-3 gap-3 text-sm">
          {topCustLeakage.slice(0, 3).map((c) => (
            <li key={c.cust} className="rounded-xl border p-3">
              <div className="font-medium">Heronderhandel {c.cust}</div>
              <p className="text-gray-700 mt-1">
                {c.deviation.toFixed(1)}pp boven benchmark bij omzet {eur0(c.gross)}.
              </p>
              <div className="mt-2">Potentiële margeverbetering: <b>{eur0(c.potential)}</b></div>
              <div className="mt-3">
                <Link href="/app/consistency" className="inline-flex items-center rounded-lg border px-3 py-1.5 hover:bg-gray-50">
                  Bekijk klantdetails →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Data & Upload (ankers die ook via dashboard gelinkt worden) */}
      <section id="upload" className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold">Upload / Replace dataset</h2>
        <p className="text-sm text-gray-600 mt-1">
          Vervang de huidige dataset of voeg een nieuwe periode toe. Zorg dat kolommen overeenkomen met het template.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Link
            href="/api/docs#upload" // <- Pas dit aan naar jouw daadwerkelijke upload route of UI
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
          Download het Excel-template en bekijk de kolomdefinities. Je kunt ook onze dummy gebruiken om snel te testen.
        </p>
        <ul className="mt-2 text-sm list-disc pl-4 text-gray-700">
          <li>Vereiste kolommen: <code>period, cust, pg, sku, gross, d_channel, d_customer, d_product, d_volume, d_other_sales, d_mandatory, d_local</code>.</li>
          <li><code>period</code> in <code>YYYY-MM</code>, bedragen in EUR.</li>
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
