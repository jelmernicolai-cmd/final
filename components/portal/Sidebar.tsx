// components/PortalSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useEffect } from "react";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export default function PortalSidebar() {
  const pathname = usePathname() || "/app";
  const [open, setOpen] = useState(false);

  // Klapt de mobiele nav automatisch in zodra de route wijzigt
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Kruimel (alleen voor weergave)
  const crumb = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean); // ["app","consistency",...]
    return (parts[1] ?? "Dashboard")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
  }, [pathname]);

  // Enkel hoofditem: Consistency
  const sections = [
    { href: "/app/consistency", label: "Consistency" },
  ];

  const Sections = (
    <ul className="space-y-1">
      {sections.map((it) => {
        const active = isActive(pathname, it.href);
        return (
          <li key={it.href}>
            <Link
              href={it.href}
              // Op mobiel direct inklappen bij klik
              onClick={() => setOpen(false)}
              className={[
                "block rounded px-3 py-2 text-sm hover:bg-gray-50",
                active
                  ? "bg-gray-100 text-gray-900 border-l-2 border-sky-600"
                  : "text-gray-700",
              ].join(" ")}
            >
              {it.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside className="border-r bg-white/70 backdrop-blur md:min-h-[calc(100vh-56px)] flex flex-col">
      {/* Topbar binnen de sidebar */}
      <div className="flex items-center gap-3 p-3 border-b">
        <Link href="/" className="text-sm text-gray-600 hover:underline">
          ← Terug naar website
        </Link>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden md:inline text-xs text-gray-400">Sectie:</span>
          <span className="text-xs font-medium text-gray-700">{crumb}</span>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-xs px-2 py-1 border rounded"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="portal-mobile-menu"
            aria-label="Zijbalk tonen/verbergen"
          >
            Menu
          </button>
        </div>
      </div>

      {/* Desktop nav – alleen hoofd “Consistency” */}
      <nav className="hidden md:block p-3 space-y-6">{Sections}</nav>

      {/* Mobile nav (collapsible) */}
      <nav
        id="portal-mobile-menu"
        className={`md:hidden border-t overflow-hidden transition-[max-height] duration-300 ease-in-out ${
          open ? "max-h-[1000px]" : "max-h-0"
        }`}
      >
        <div className="p-3 space-y-6">{Sections}</div>
      </nav>

      {/* Footer note */}
      <div className="mt-auto p-3 border-t text-[11px] text-gray-500">
        Ingelogd via GtN Portal •{" "}
        <Link className="underline hover:no-underline" href="/pricing">
          Licentiebeheer
        </Link>
      </div>
    </aside>
  );
}
