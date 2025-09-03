// components/PortalSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

function NavItem({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`block rounded px-3 py-2 text-sm ${
        active
          ? "bg-sky-600 text-white font-medium"
          : "hover:bg-sky-50 text-gray-700"
      }`}
    >
      {label}
    </Link>
  );
}

export default function PortalSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <aside className="bg-white border-r">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-3">
        <Link href="/" className="text-base font-semibold">
          PharmaGtN
        </Link>
        <span className="text-xs text-gray-400">Portal</span>
        <button
          className="ml-auto md:hidden text-xs px-2 py-1 border rounded"
          onClick={() => setOpen((v) => !v)}
          aria-label="Zijbalk tonen/verbergen"
        >
          Menu
        </button>
      </div>

      {/* Desktop nav */}
      <nav className="hidden md:block p-3 space-y-6">
        <section>
          <div className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Dashboard
          </div>
          <NavItem href="/app" label="Overzicht" />
        </section>

        <section>
          <div className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Analyses
          </div>
          <NavItem href="/app/waterfall" label="GtN Waterfall" />
          <NavItem href="/app/consistency" label="Consistency Tool" />
        </section>

        <section>
          <div className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Acties
          </div>
          <NavItem href="/templates" label="Excel-templates" />
          <NavItem href="/contact" label="Plan demo" />
        </section>
      </nav>

      {/* Mobile nav */}
      {open && (
        <nav className="md:hidden p-3 space-y-6 border-t">
          <section>
            <div className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Dashboard
            </div>
            <NavItem href="/app" label="Overzicht" />
          </section>

          <section>
            <div className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Analyses
            </div>
            <NavItem href="/app/waterfall" label="GtN Waterfall" />
            <NavItem href="/app/consistency" label="Consistency Tool" />
          </section>

          <section>
            <div className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Acties
            </div>
            <NavItem href="/templates" label="Excel-templates" />
            <NavItem href="/contact" label="Plan demo" />
          </section>
        </nav>
      )}
    </aside>
  );
}
