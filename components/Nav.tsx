// components/Nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded ${active ? 'font-semibold underline' : 'hover:underline'}`}
    >
      {label}
    </Link>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        <Link href="/" className="text-lg font-semibold">PharmaGtN</Link>

        {/* Mobile burger */}
        <button
          className="ml-auto md:hidden rounded border px-3 py-2 text-sm"
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu"
        >
          Menu
        </button>

        {/* Desktop menu */}
        <nav className="ml-auto hidden md:flex items-center gap-2 text-sm">
          <NavItem href="/features" label="Functionaliteit" />
          <NavItem href="/en/features" label="Features (EN)" />
          <NavItem href="/pricing" label="Prijzen" />
          <NavItem href="/about" label="Over" />
          <NavItem href="/contact" label="Contact" />
          <NavItem href="/app" label="GtN Portal" />
          <NavItem href="/login" label="Login" />
        </nav>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t bg-white">
          <nav className="mx-auto max-w-6xl px-4 py-3 grid gap-2 text-sm">
            <NavItem href="/features" label="Functionaliteit" />
            <NavItem href="/en/features" label="Features (EN)" />
            <NavItem href="/pricing" label="Prijzen" />
            <NavItem href="/about" label="Over" />
            <NavItem href="/contact" label="Contact" />
            <NavItem href="/app" label="GtN Portal" />
            <NavItem href="/login" label="Login" />
          </nav>
        </div>
      )}
    </header>
  );
}
