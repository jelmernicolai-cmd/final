// components/portal/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

/** ---------- Kleine icon-set (inline SVG, geen libs) ---------- */
function cx(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}
const iconBase = "h-4 w-4 shrink-0";

const Icons = {
  dashboard: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cx(iconBase, p.className)}>
      <path d="M3 12h8V3H3v9Zm10 9h8v-9h-8v9Zm0-11h8V3h-8v7ZM3 21h8v-7H3v7Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  waterfall: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cx(iconBase, p.className)}>
      <path d="M4 6h4v12M12 10h4v8M20 4v14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 20h18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  scatter: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cx(iconBase, p.className)}>
      <circle cx="7" cy="15" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="7" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 21 21 3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
    </svg>
  ),
  arrows: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cx(iconBase, p.className)}>
      <path d="M7 7h10M7 17h10M17 7l-3-3m3 3-3 3M7 17l3-3m-3 3 3 3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  boxes: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cx(iconBase, p.className)}>
      <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4Zm0 9h7v7h-7v-7ZM4 13h7v7H4v-7Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  loe: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cx(iconBase, p.className)}>
      <path d="M4 6h10M4 12h16M4 18h12" stroke="currentColor" strokeWidth="1.5" />
      <path d="M18 5v4M16 7h4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  upload: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cx(iconBase, p.className)}>
      <path d="M12 16V6m0 0-4 4m4-4 4 4M4 18h16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  template: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cx(iconBase, p.className)}>
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  settings: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cx(iconBase, p.className)}>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M19.4 15a1 1 0 0 1 .2 1.1l-.7 1.2a1 1 0 0 1-1.1.5l-1.3-.4a6.6 6.6 0 0 1-1 .6l-.2 1.3a1 1 0 0 1-1 .8h-1.4a1 1 0 0 1-1-.8l-.2-1.3a6.6 6.6 0 0 1-1-.6l-1.3.4a1 1 0 0 1-1.1-.5l-.7-1.2a1 1 0 0 1 .2-1.1l1-1a6.6 6.6 0 0 1-.2-1.1l-1-.8a1 1 0 0 1-.3-1.1l.5-1.2c.2-.4.6-.6 1-.5l1.3.3c.3-.2.6-.4 1-.6l.2-1.3c.1-.5.5-.8 1-.8h1.4c.5 0 .9.3 1 .8l.2 1.3c.3.2.6.4 1 .6l1.3-.3c.4-.1.8.1 1 .5l.5 1.2c.2.4 0 .9-.3 1.1l-1 .8c0 .4-.1.7-.2 1.1l1 .9Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  support: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cx(iconBase, p.className)}>
      <path d="M6 8a6 6 0 1 1 12 0v8a4 4 0 0 1-4 4h-1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 14v-4M18 14v-4M9 19h3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  external: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cx("h-3.5 w-3.5", p.className)}>
      <path d="M14 4h6m0 0v6m0-6L10 14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M20 14v4a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
} as const;

/** ---------- Types ---------- */
type IconKey = keyof typeof Icons;
type Item = { href: string; label: string; icon?: IconKey; external?: boolean; badge?: string };

/** ---------- Helpers ---------- */
function isActive(pathname: string, href: string) {
  // Dashboard alleen actief op exact /app
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
        const Icon = it.icon ? Icons[it.icon] : null;
        return (
          <li key={it.href}>
            <Link
              href={it.href}
              onClick={onItemClick}
              aria-current={active ? "page" : undefined}
              className={cx(
                "group flex items-center gap-2 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/40",
                active
                  ? "bg-sky-50 text-sky-900 border-l-2 border-sky-600"
                  : "text-gray-700 hover:bg-gray-50 border-l-2 border-transparent"
              )}
            >
              {/* icoon */}
              {Icon ? (
                <Icon className={cx(active ? "text-sky-700" : "text-gray-500 group-hover:text-gray-700")} />
              ) : null}

              {/* label */}
              <span className="flex-1 truncate">{it.label}</span>

              {/* badge / external */}
              {it.badge ? (
                <span className="ml-2 rounded-full bg-sky-100 text-sky-800 text-[10px] px-2 py-0.5">
                  {it.badge}
                </span>
              ) : null}
              {it.external ? <Icons.external className="text-gray-400" /> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** ---------- Component ---------- */
export default function Sidebar() {
  const pathname = usePathname() || "/app";
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Sluit mobiel paneel na navigatie
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

  // -------- Nav data --------
  const ANALYSES: Item[] = [
    { href: "/app", label: "Dashboard", icon: "dashboard" },
    { href: "/app/waterfall", label: "Waterfall", icon: "waterfall" },
    { href: "/app/consistency", label: "Consistency", icon: "scatter" },
    { href: "/app/parallel", label: "Parallel", icon: "arrows" },
    { href: "/app/supply", label: "Stock Management", icon: "boxes" },
    { href: "/app/loe", label: "LoE Scenario's", icon: "loe" },
  ];

  const DATA_UPLOAD: Item[] = [
    { href: "/app/upload", label: "Upload masterfile", icon: "upload" },
    { href: "/templates", label: "Templates", icon: "template" },
  ];

  const SETTINGS_SUPPORT: Item[] = [
    { href: "/app/settings", label: "Instellingen", icon: "settings" },
    { href: "/contact", label: "Contact & Support", icon: "support" },
  ];

  return (
    <aside className="bg-white md:min-h-[calc(100vh-56px)] flex flex-col">
      {/* Top-bar */}
      <div className="flex items-center gap-3 p-3 border-b sticky top-0 z-20 bg-white">
        <Link href="/" className="text-sm text-gray-600 hover:underline">← Terug naar website</Link>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden md:inline text-xs text-gray-400">Sectie:</span>
          <span className="text-xs font-medium text-gray-700">{crumb}</span>
          <button
            ref={btnRef}
            className="md:hidden text-xs px-2 py-1 border rounded hover:bg-gray-50"
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
        className={cx(
          "md:hidden border-t overflow-hidden transition-[max-height] duration-300 ease-in-out",
          open ? "max-h-[80vh]" : "max-h-0"
        )}
        aria-hidden={!open}
      >
        <div className="p-3 space-y-4">
          <Section title="Analyses">
            <NavList pathname={pathname} items={ANALYSES} onItemClick={() => setOpen(false)} />
          </Section>
          <Section title="Data & Upload">
            <NavList pathname={pathname} items={DATA_UPLOAD} onItemClick={() => setOpen(false)} />
          </Section>
          <Section title="Instellingen & Support">
            <NavList pathname={pathname} items={SETTINGS_SUPPORT} onItemClick={() => setOpen(false)} />
          </Section>
        </div>
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
