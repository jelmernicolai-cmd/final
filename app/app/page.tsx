// app/app/page.tsx
'use client';

import Uploader from '@/components/portal/Uploader';
import { usePortal } from '@/components/portal/PortalProvider';
import Link from 'next/link';

function fmtEUR(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export default function PortalDashboard() {
  const { rows, waterfall, consistency } = usePortal();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">GtN Portal • Dashboard</h1>
        <p className="text-sm text-gray-600">Upload je dataset en navigeer snel naar de belangrijkste analyses.</p>
      </header>

      {/* Uploader */}
      <Uploader />

      {/* Quick stats */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Records" value={String(rows.length)} />
        <Card label="GtN Spend" value={waterfall ? fmtEUR(waterfall.totalGtNSpend) : '—'} />
        <Card label="GtN (%)" value={waterfall ? `${waterfall.pctGtN.toFixed(1)}%` : '—'} />
        <Card label="Incentives (%)" value={consistency ? `${consistency.pctIncentives.toFixed(1)}%` : '—'} />
      </section>

      {/* Next steps */}
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Volgende stappen</h2>
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <Link
            href="/app/waterfall"
            className="block rounded-lg border px-4 py-3 hover:bg-gray-50"
          >
            <div className="font-medium">Analyse • GtN Waterfall</div>
            <div className="text-sm text-gray-600">Overzicht van bruto → netto met bijdrage per component.</div>
          </Link>
          <Link
            href="/app/consistency"
            className="block rounded-lg border px-4 py-3 hover:bg-gray-50"
          >
            <div className="font-medium">Analyse • Consistency</div>
            <div className="text-sm text-gray-600">Top-15 klanten op incentives + ratio’s t.o.v. omzet.</div>
          </Link>
        </div>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
