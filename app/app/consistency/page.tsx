'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { loadWaterfallRows, eur0, pct1 } from '@/lib/waterfall-storage';
import type { Row } from '@/lib/waterfall-types';

export default function ConsistencyHub() {
  const rows: Row[] = loadWaterfallRows();

  // Lege state
  if (!rows.length) {
    return (
      <div className="max-w-3xl space-y-4">
        <h1 className="text-xl font-semibold">Consistency</h1>
        <p className="text-gray-600">
          Geen dataset gevonden. Upload eerst een Excel in de Waterfall-module.
        </p>
        <div className="flex gap-3">
          <Link href="/app/waterfall" className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700">
            Naar Waterfall
          </Link>
          <Link href="/app/consistency/upload" className="rounded-lg border px-4 py-2 hover:bg-gray-50">
            Excel uploaden
          </Link>
        </div>
      </div>
    );
  }

  const kpis = useMemo(() => {
    let gross = 0, invoiced = 0, net = 0, disc = 0, rebates = 0;

    for (const r of rows) {
      gross    += r.gross || 0;
      invoiced += r.invoiced || 0;
      net      += r.net || 0;

      disc +=
        (r.d_channel || 0) + (r.d_customer || 0) + (r.d_product || 0) +
        (r.d_volume || 0) + (r.d_other_sales || 0) + (r.d_mandatory || 0) +
        (r.d_local || 0);

      rebates +=
        (r.r_direct || 0) + (r.r_prompt || 0) + (r.r_indirect || 0) +
        (r.r_mandatory || 0) + (r.r_local || 0);
    }

    return { gross, invoiced, net, disc, rebates };
  }, [rows]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Consistency</h1>
        <p className="text-gray-600">Snelle controles en deep-dives op klant- en trendniveau.</p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="Gross" value={eur0(kpis.gross)} />
        <Kpi title="Invoiced" value={eur0(kpis.invoiced)} />
        <Kpi title="Net" value={eur0(kpis.net)} />
        <Kpi title="Discount ratio" value={pct1(kpis.disc, kpis.gross)} />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card
          title="Customers"
          desc="Omzet-consistentie per klant, met outliers en regressielijn."
          href="/app/consistency/customers"
          cta="Open analyse"
        />
        <Card
          title="Trend & Heatmap"
          desc="Maand/kwartaal-trends, heatmap per productgroep of SKU."
          href="/app/consistency/trend"
          cta="Open analyse"
        />
        <Card
          title="Upload/Replace"
          desc="Vervang of upload de dataset die Consistency gebruikt."
          href="/app/consistency/upload"
          cta="Open upload"
        />
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

function Card({ title, desc, href, cta }: { title: string; desc: string; href: string; cta: string }) {
  return (
    <div className="rounded-2xl border bg-white p-6 flex flex-col">
      <div className="font-semibold">{title}</div>
      <p className="text-sm text-gray-600 mt-1 flex-1">{desc}</p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
      >
        {cta}
      </Link>
    </div>
  );
}
