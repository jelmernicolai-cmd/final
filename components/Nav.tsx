'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type Item = { href: string; label: string };

const NAV_LEFT: Item[] = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Functionaliteit' },
  { href: '/pricing', label: 'Prijzen' },
  { href: '/about', label: 'Over' },
  { href: '/contact', label: 'Contact' },
  // Optioneel: Engelstalige features
  { href: '/en/features', label: 'Features (EN)' },
];

function NavLink({
  href,
  label,
  onSelect,
}: Item & { onSelect?: () => void }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
  return (
    <Link
      href={href}
      onClick={onSelect}
      className={[
        'px-3 py-2 rounded transition',
        active
          ? 'font-semibold underline underline-offset-4'
          : 'hover:underline text-gray-700',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Sluit mobiele menu zodra de route wijzigt
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center gap-4">
          {/* Brand */}
          <Link href="/" className="text-base md:text-lg font-semibold">
            PharmaGtN
          </Link>

          {/* Desktop nav */}
          <nav className="ml-4 hidden md:flex items-center gap-1 text-sm">
            {NAV_LEFT.map((it) => (
              <NavLink key={it.href} {...it} />
            ))}
          </nav>

          {/* Spacer */}
          <div className="ml-auto" />

          {/* Desktop CTA: Login → GtN Portal */}
          <Link
            href="/app"
            className="hidden md:inline-flex items-center rounded-full border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
            aria-label="Login naar GtN Portal"
            title="Login naar GtN Portal"
          >
            Login
          </Link>

          {/* Mobile toggle */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 outline-none ring-0 hover:bg-gray-100"
            aria-label="Open navigatie"
            aria-expanded={open ? 'true' : 'false'}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              // Close icon
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              // Hamburger icon
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-nav"
        className={[
          'md:hidden border-t',
          open ? 'block' : 'hidden',
        ].join(' ')}
      >
        <nav className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-1 text-sm">
          {NAV_LEFT.map((it) => (
            <NavLink key={it.href} {...it} onSelect={() => setOpen(false)} />
          ))}

          <Link
            href="/app"
            onClick={() => setOpen(false)}
            className="mt-1 inline-flex w-full items-center justify-center rounded-md border border-blue-600 px-3 py-2 font-medium text-blue-700 hover:bg-blue-50"
            aria-label="Login naar GtN Portal"
            title="Login naar GtN Portal"
          >
            Login
          </Link>
        </nav>
      </div>

      {/* Skip link voor toegankelijkheid */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-black text-white px-3 py-2 rounded"
      >
        Naar hoofdinhoud
      </a>
    </header>
  );
}
