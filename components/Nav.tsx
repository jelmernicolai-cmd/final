'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';

type ItemProps = { href: string; label: string; exact?: boolean; onClick?: () => void };

function NavItem({ href, label, exact = false, onClick }: ItemProps) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`px-3 py-2 rounded transition hover:bg-gray-50 ${
        active ? 'font-semibold underline underline-offset-4' : ''
      }`}
    >
      {label}
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Is user in the Portal?
  const inPortal = pathname.startsWith('/app');

  // Simple breadcrumb builder for /app routes
  const breadcrumbs = useMemo(() => {
    if (!inPortal) return [];
    const segments = pathname.replace(/^\/+|\/+$/g, '').split('/'); // e.g. ['app','waterfall']
    const crumbs: { label: string; href: string }[] = [];
    let acc = '';
    for (let i = 0; i < segments.length; i++) {
      acc += `/${segments[i]}`;
      const raw = segments[i];
      const label =
        raw === 'app'
          ? 'Portal'
          : raw
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (m) => m.toUpperCase());
      crumbs.push({ label, href: acc });
    }
    return crumbs;
  }, [pathname, inPortal]);

  // Close mobile menu when a link is clicked
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      {/* Top bar */}
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center gap-2">
          {/* Brand */}
          <Link href="/" className="font-semibold tracking-tight hover:opacity-90" onClick={close}>
            PharmaGtN
          </Link>

          {/* Desktop menu (left) */}
          <nav className="ml-6 hidden md:flex items-center gap-1 text-sm">
            <NavItem href="/features" label="Functionaliteit" />
            <NavItem href="/pricing" label="Prijzen" />
            <NavItem href="/about" label="Over" />
            <NavItem href="/contact" label="Contact" />
            <NavItem href="/app" label="Portal" />
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side: Login button */}
          <div className="hidden md:flex">
            <Link
              href="/app"
              className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              Login
            </Link>
          </div>

          {/* Mobile: hamburger */}
          <button
            aria-label="Open menu"
            className="md:hidden inline-flex items-center justify-center rounded-md border px-2.5 py-2 hover:bg-gray-50"
            onClick={() => setOpen((v) => !v)}
          >
            {/* Simple hamburger icon (no external lib) */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Mobile dropdown */}
        {open && (
          <div className="md:hidden border-t pb-3">
            <nav className="grid gap-1 py-2 text-sm">
              <NavItem href="/features" label="Functionaliteit" onClick={close} />
              <NavItem href="/pricing" label="Prijzen" onClick={close} />
              <NavItem href="/about" label="Over" onClick={close} />
              <NavItem href="/contact" label="Contact" onClick={close} />
              <NavItem href="/app" label="Portal" onClick={close} />
            </nav>
            <div className="mt-2">
              <Link
                href="/app"
                onClick={close}
                className="inline-flex w-full items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                Login
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Portal sub-nav: breadcrumbs + actie-link naar homepage */}
      {inPortal && (
        <div className="border-t bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-2.5 flex items-center gap-3 text-sm">
            {/* Breadcrumbs */}
            <nav className="flex flex-wrap items-center gap-1 text-gray-600">
              {breadcrumbs.map((c, i) => {
                const last = i === breadcrumbs.length - 1;
                return (
                  <span key={c.href} className="flex items-center">
                    {!last ? (
                      <Link href={c.href} className="hover:underline">
                        {c.label}
                      </Link>
                    ) : (
                      <span className="font-medium text-gray-900">{c.label}</span>
                    )}
                    {!last && <span className="mx-2 text-gray-400">/</span>}
                  </span>
                );
              })}
            </nav>

            {/* Spacer */}
            <div className="ml-auto" />

            {/* Actie: terug naar homepage */}
            <Link
              href="/"
              className="inline-flex items-center rounded-md border px-3 py-1.5 hover:bg-white"
              title="Ga terug naar de website"
            >
              {/* left arrow icon (inline svg) */}
              <svg className="mr-1.5" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Naar homepage
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
