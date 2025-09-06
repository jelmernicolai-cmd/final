'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Item = { href: string; label: string };

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: 'Navigatie',
    items: [
      { href: '/app', label: 'Dashboard' },
    ],
  },
  {
    title: 'Analyses',
    items: [
      { href: '/app/waterfall/analyze', label: 'Waterfall' },
      { href: '/app/consistency', label: 'Consistency (Hub)' },
      { href: '/app/consistency/customers', label: 'Consistency — Customers' },
      { href: '/app/consistency/trend', label: 'Consistency — Trend & Heatmap' },
    ],
  },
  {
    title: 'Data',
    items: [
      { href: '/app/consistency/upload', label: 'Upload/Replace Excel' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-r bg-white">
      <div className="p-3 space-y-4">
        {SECTIONS.map((s) => (
          <div key={s.title} className="space-y-2">
            <div className="px-2 text-xs uppercase tracking-wide text-gray-500">{s.title}</div>
            <nav className="grid gap-1">
              {s.items.map((it) => {
                const active = pathname === it.href || pathname?.startsWith(it.href + '/');
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={[
                      'rounded-lg px-3 py-2 text-sm transition',
                      active
                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                        : 'hover:bg-gray-50 border border-transparent text-gray-700',
                    ].join(' ')}
                  >
                    {it.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
}
