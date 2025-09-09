// components/portal/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Item = { href: string; label: string };

function isActive(pathname: string, href: string) {
  // Fix: Dashboard alleen actief op exact /app (of /app/)
  if (href === "/app") return pathname === "/app" || pathname === "/app/";
  return pathname === href || pathname.startsWith(href + "/");
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="px-3 pt-4 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
        {title}
      </div>
      {children}
    </div>
  );
}

function NavList({
  pathname,
  items,
  onItemClick,
}: {
  pathname: string;
  items: Item[];
  onItemClick?: () => void;
}) {
  return (
    <ul className="space-y-1">
      {items.map((it) => {
        const active = isActive(pathname, it.href);
        return (
          <li key={it.href}>
            <Link
              href={it.href}
              onClick={onItemClick}
              aria-current={active ? "page" : undefined}
              className={[
                "block rounded px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-400/40",
                active ? "bg-gray-100 text-gray-900 border-l-2 border-sky-600" : "text-gray-700",
              ].join(" ")}
            >
              {it.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function Sidebar() {
  const pathname = usePathname() || "/app";
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Sluit mobiel paneel na navigatie (route change)
  useEffect(() => { setOpen(false); }, [pathname]);

  // Klik buiten/ESC → sluiten (mobiel)
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(t) && btnRef.current && !btnRef.current.contains(t)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const crumb = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    return (parts[1] ?? "Dashboard").replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  }, [pathname]);

  const ANALYSES: Item[] = [
    { href: "/app", label: "Dashboard" },
    { href: "/app/waterfall", label: "Waterfall" },
    { href: "/app/consistency", label: "Consistency" },
    { href: "/app/parallel", label: "Parallel" },
    { href: "/app/supply", label: "Stock Management" },
    { href: "/app/loe", label: "LoE Scenario's" }, 
    // Voeg je LOE-tool toe als je die route hebt:
    // { href: "/app/loe", label: "LOE Scenario's" },
  ];

  const DATA_UPLOAD: Item[] = [
    { href: "/app/upload", label: "Upload masterfile" },
    { href: "/templates", label: "Templates" }, // << nieuw
  ];

  const SETTINGS_SUPPORT: Item[] = [
    { href: "/app/settings", label: "Instellingen" },
    { href: "/contact", label: "Contact & Support" },
  ];

  return (
    <aside className="bg-white md:min-h-[calc(100vh-56px)] flex flex-col">
      <div className="flex items-center gap-3 p-3 border-b sticky top-0 z-20 bg-white">
        <Link href="/" className="text-sm text-gray-600 hover:underline">← Terug naar website</Link>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden md:inline text-xs text-gray-400">Sectie:</span>
          <span className="text-xs font-medium text-gray-700">{crumb}</span>
          <button
            ref={btnRef}
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

      {/* Desktop */}
      <div className="hidden md:block p-3 space-y-4">
        <Section title="Analyses"><NavList pathname={pathname} items={ANALYSES} /></Section>
        <Section title="Data & Upload"><NavList pathname={pathname} items={DATA_UPLOAD} /></Section>
        <Section title="Instellingen & Support"><NavList pathname={pathname} items={SETTINGS_SUPPORT} /></Section>
      </div>

      {/* Mobiel */}
      <nav
        id="portal-mobile-menu"
        ref={panelRef}
        className={`md:hidden border-t overflow-hidden transition-[max-height] duration-300 ease-in-out ${open ? "max-h-[80vh]" : "max-h-0"}`}
        aria-hidden={!open}
      >
        <div className="p-3 space-y-4">
          <Section title="Analyses"><NavList pathname={pathname} items={ANALYSES} onItemClick={() => setOpen(false)} /></Section>
          <Section title="Data & Upload"><NavList pathname={pathname} items={DATA_UPLOAD} onItemClick={() => setOpen(false)} /></Section>
          <Section title="Instellingen & Support"><NavList pathname={pathname} items={SETTINGS_SUPPORT} onItemClick={() => setOpen(false)} /></Section>
        </div>
      </nav>

      <div className="mt-auto p-3 border-t text-[11px] text-gray-500">
        Ingelogd via GtN Portal • <Link className="underline hover:no-underline" href="/pricing">Licentiebeheer</Link>
      </div>
    </aside>
  );
}
