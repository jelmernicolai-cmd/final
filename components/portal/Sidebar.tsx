// components/portal/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePortal } from './PortalProvider';

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`block px-3 py-2 rounded-lg text-sm ${
        active ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
      }`}
    >
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const { waterfall, consistency, rows } = usePortal();

  // simpele heuristiek voor tips
  const tips: string[] = [];
  if (waterfall) {
    if (waterfall.pctGtN > 10) tips.push('GtN% is hoog — prioriteer kanalen met grootste korting- en rebatebijdrage.');
    if (waterfall.totalDiscount > waterfall.totalRebate)
      tips.push('Discounts > Rebates — evalueer verschuiving naar rebates voor betere prijssturing.');
    if (waterfall.topCustomers.length)
      tips.push('Onderhandel gericht met Top-3 klanten op basis van GtN-bijdrage.');
  }
  if (consistency) {
    if (consistency.pctIncentives > 8)
      tips.push('Incentives% > 8% — check inconsistenties tussen vergelijkbare klanten.');
    if (consistency.topCustomers.length >= 5)
      tips.push('Focusreview: top-5 klanten met hoogste absolute incentives.');
  }
  if (!rows.length) tips.push('Upload eerst je dataset (Excel/CSV) op het Dashboard.');

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-4">
        <div className="text-xs font-medium text-gray-500 mb-2">Navigatie</div>
        <nav className="space-y-1">
          <NavItem href="/app" label="Dashboard" />
          <NavItem href="/app/waterfall" label="Analyse • GtN Waterfall" />
          <NavItem href="/app/consistency" label="Analyse • Consistency" />
          <NavItem href="/templates" label="Templates (download)" />
        </nav>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="text-xs font-medium text-gray-500 mb-2">Data-status</div>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>Records: <strong>{rows.length}</strong></li>
          <li>GtN%: <strong>{waterfall ? `${waterfall.pctGtN.toFixed(1)}%` : '—'}</strong></li>
          <li>Incentives%: <strong>{consistency ? `${consistency.pctIncentives.toFixed(1)}%` : '—'}</strong></li>
        </ul>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="text-xs font-medium text-gray-500 mb-2">Optimalisatie-opties</div>
        {tips.length ? (
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            {tips.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Tips verschijnen zodra er data is.</p>
        )}
      </div>
    </div>
  );
}
