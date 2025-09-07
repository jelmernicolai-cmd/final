// components/portal/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Sidebar() {
  const pathname = usePathname() || "/app";
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Hoofd-items (géén sublinks onder Consistency)
  const items = useMemo(
    () => [
      { href: "/app/waterfall", label: "Waterfall" },
      { href: "/app/consistency", label: "Consistency" }, // /customers /trend blijven tabs op de pagina
      { href: "/app/parallel", label: "Parallel" },
      { href: "/app/gtn", label: "GtN" },
    ],
    []
  );

  // Sluit mobiele nav bij routewissel
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Sluit bij klik-buiten (mobiel)
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  // Sluit met Escape (mobiel)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Label "Sectie: X" (alleen visueel)
  const crumb = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean); // ["app","consistency",...]
    return (parts[1] ?? "Dashboard")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
  }, [pathname]);

  const NavList = (
    <ul className="space-y-1">
      {items.map((it) => {
        const active = isActive(pathname, it.href);
        return (
          <li key={it.href}>
            <Link
              href={it.href}
              onClick={() => setOpen(false)} // mobiel: direct inklappen na keuze
              className={[
                "block rounded px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-400/40",
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
    <aside className="bg-white md:min-h-[calc(100vh-56px)] flex flex-col">
      {/* Sidebar-topbar (sticky op mobiel) */}
      <div className="flex items-center gap-3 p-3 border-b sticky top-0 z-20 bg-white">
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

      {/* Desktop navigatie (altijd zichtbaar) */}
      <nav className="hidden md:block p-3">{NavList}</nav>

      {/* Mobile navigatie (collapsible, klapt in na keuze) */}
      <nav
        id="portal-mobile-menu"
        ref={panelRef}
        className={`md:hidden border-t overflow-hidden transition-[max-height] duration-300 ease-in-out ${
          open ? "max-h-[800px]" : "max-h-0"
        }`}
        aria-hidden={!open}
      >
        <div className="p-3">{NavList}</div>
      </nav>

      {/* Footer */}
      <div className="mt-auto p-3 border-t text-[11px] text-gray-500">
        Ingelogd via GtN Portal •{" "}
        <Link className="underline hover:no-underline" href="/pricing">
          Licentiebeheer
        </Link>
      </div>
    </aside>
  );
}
