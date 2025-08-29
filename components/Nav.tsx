'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const pathname = usePathname();

  const Item = ({ href, label }: { href: string; label: string }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`px-3 py-2 rounded ${active ? 'font-semibold underline' : 'hover:underline'}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="border-b bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-6">
        <Link href="/" className="text-lg font-semibold">PharmaGtN</Link>

        <nav className="ml-auto flex items-center gap-2 text-sm">
          <Item href="/features" label="Functionaliteit" />
          <Item href="/en/features" label="Features (EN)" />
          <Item href="/pricing" label="Prijzen" />
          <Item href="/about" label="Over" />
          <Item href="/contact" label="Contact" />
          <Item href="/app" label="App" />
        </nav>

        {/* Tijdelijke debug zodat je zéker weet dat deze Nav live is */}
        <div className="text-[10px] text-gray-400">
          NAV v2 • path: {typeof window !== 'undefined' ? window.location.pathname : '(ssr)'}
        </div>
      </div>
    </header>
  );
}
