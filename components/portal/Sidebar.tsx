// components/portal/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

/** ---------- Kleine icon-set (inline SVG, geen libs) ---------- */
function cx(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}
// --- vervang alleen je Icons-const (en helper cx/iconBase mag je laten staan) ---

const iconBase = "h-4 w-4 shrink-0";

const common = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  vectorEffect: "non-scaling-stroke" as const,
};

const Icons = {
  dashboard: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={`${iconBase} ${className || ""}`}>
      {/* 2x2 tiles met ronde hoeken */}
      <rect x="3.5" y="3.5" width="8" height="8" rx="2.5" {...common} />
      <rect x="12.5" y="3.5" width="8" height="5" rx="2.5" {...common} />
      <rect x="3.5" y="12.5" width="5" height="8" rx="2.5" {...common} />
      <rect x="10.5" y="12.5" width="10" height="8" rx="2.5" {...common} />
    </svg>
  ),

  waterfall: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={`${iconBase} ${className || ""}`}>
      {/* basislijn */}
      <path d="M3 20.5H21" {...common} />
      {/* bars met zachte top/onderkant */}
      <path d="M6.5 8.5v8" {...common} />
      <path d="M12 11v5.5" {...common} />
      <path d="M17.5 5.5v11" {...common} />
      {/* kleine capjes */}
      <path d="M5 8.5h3" {...common} />
      <path d="M10.5 11h3" {...common} />
      <path d="M16 5.5h3" {...common} />
    </svg>
  ),

  scatter: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={`${iconBase} ${className || ""}`}>
      {/* assen */}
      <path d="M3.5 20.5H20.5M3.5 20.5V3.5" {...common} />
      {/* zachte punten */}
      <circle cx="8" cy="15" r="2.3" {...common} />
      <circle cx="12.5" cy="10" r="2.3" {...common} />
      <circle cx="17" cy="7" r="2.3" {...common} />
      {/* hint: regressiestreepje */}
      <path d="M5 18.5L19 6.5" strokeDasharray="4 4" {...common} />
    </svg>
  ),

  arrows: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={`${iconBase} ${className || ""}`}>
      {/* bidirectionele zachte pijlen (parallel) */}
      <path d="M7 8h8.5" {...common} />
      <path d="M15.5 8l-2.5-2.5" {...common} />
      <path d="M15.5 8l-2.5 2.5" {...common} />
      <path d="M17 16H8.5" {...common} />
      <path d="M9.5 16l2.5-2.5" {...common} />
      <path d="M9.5 16l2.5 2.5" {...common} />
    </svg>
  ),

  boxes: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={`${iconBase} ${className || ""}`}>
      {/* 2x2 voorraadblokjes met rx */}
      <rect x="3.5" y="3.5" width="8" height="8" rx="2.2" {...common} />
      <rect x="12.5" y="3.5" width="8" height="8" rx="2.2" {...common} />
      <rect x="3.5" y="12.5" width="8" height="8" rx="2.2" {...common} />
      <rect x="12.5" y="12.5" width="8" height="8" rx="2.2" {...common} />
    </svg>
  ),

  loe: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={`${iconBase} ${className || ""}`}>
      {/* “policy lines” + marker (vriendelijk plusje) */}
      <path d="M4 7.5h10M4 12h16M4 16.5h12" {...common} />
      <path d="M18 6v3M16.5 7.5H19.5" {...common} />
    </svg>
  ),

  upload: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={`${iconBase} ${className || ""}`}>
      <path d="M12 16V6" {...common} />
      <path d="M8.5 9.5L12 6l3.5 3.5" {...common} />
      <path d="M4 18.5h16" {...common} />
    </svg>
  ),

  template: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={`${iconBase} ${className || ""}`}>
      <rect x="4" y="4" width="16" height="16" rx="3" {...common} />
      <path d="M8 9h8M8 12h8M8 15h6" {...common} />
    </svg>
  ),

  settings: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={`${iconBase} ${className || ""}`}>
      {/* gear met afgeronde “tanden” */}
      <circle cx="12" cy="12" r="3.2" {...common} />
      <path
        d="M19 13.5a7.5 7.5 0 0 0 0-3l1.5-1a1 1 0 0 0 .3-1.3l-1.1-1.9a1 1 0 0 0-1.2-.4l-1.7.6a7.5 7.5 0 0 0-2.6-1.5l-.3-1.7a1 1 0 0 0-1-.8h-2.2a1 1 0 0 0-1 .8l-.3 1.7a7.5 7.5 0 0 0-2.6 1.5l-1.7-.6a1 1 0 0 0-1.2.4L3.2 8.2a1 1 0 0 0 .3 1.3L5 10.5a7.5 7.5 0 0 0 0 3l-1.5 1a1 1 0 0 0-.3 1.3l1.1 1.9a1 1 0 0 0 1.2.4l1.7-.6a7.5 7.5 0 0 0 2.6 1.5l.3 1.7a1 1 0 0 0 1 .8h2.2a1 1 0 0 0 1-.8l.3-1.7a7.5 7.5 0 0 0 2.6-1.5l1.7.6a1 1 0 0 0 1.2-.4l1.1-1.9a1 1 0 0 0-.3-1.3L19 13.5Z"
        {...common}
      />
    </svg>
  ),

  support: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={`${iconBase} ${className || ""}`}>
      {/* headset maar zacht */}
      <path d="M6 10a6 6 0 1 1 12 0v5a4 4 0 0 1-4 4" {...common} />
      <path d="M6 12v3M18 12v3" {...common} />
      <path d="M11 20h2" {...common} />
    </svg>
  ),

  external: ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 ${className || ""}`}>
      <path d="M14 4h6M20 4v6M20 4l-9 9" {...common} />
      <path d="M20 14v4a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2h4" {...common} />
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
