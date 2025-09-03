// components/PortalSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";

/** Kleine inline icon helpers (geen extra deps) */
function ArrowLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}
function GaugeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 14l4-4" />
      <path d="M6.7 6.7A9 9 0 1 1 17.3 6.7" />
    </svg>
  );
}
function ChartBarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 3v18h18" />
      <path d="M7 15v-6" />
      <path d="M12 19v-10" />
      <path d="M17 11v-2" />
    </svg>
  );
}
function ScatterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
      <circle cx="6" cy="17" r="2" />
      <circle cx="10" cy="11" r="2" />
      <circle cx="15" cy="15" r="2" />
      <circle cx="19" cy="7" r="2" />
    </svg>
  );
}
function DownloadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}
function PhoneIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.64 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.16a2 2 0 0 1 2.11-.45c.85.31 1.73.52 2.63.64A2 2 0 0 1 22 16.92z"/>
    </svg>
  );
}

function NavItem({
  href,
  label,
  icon,
  badge,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/app" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-2 rounded px-3 py-2 text-sm transition
        ${active ? "bg-sky-600 text-white font-medium" : "hover:bg-sky-50 text-gray-700"}`}
    >
      {icon && <span className={active ? "opacity-100" : "text-gray-500 group-hover:text-gray-700"}>{icon}</span>}
      <span className="truncate">{label}</span>
      {badge && (
        <span
          className={`ml-auto inline-block rounded-full px-2 py-0.5 text-[10px] leading-4
            ${active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function PortalSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Eenvoudige breadcrumb uit /app/... (alleen weergave — echte breadcrumbs in Nav kunnen ook)
  const crumb = useMemo(() => {
    const parts = pathname?.split("/").filter(Boolean) ?? [];
    // ["app", "waterfall"] -> "waterfall"
    const last = parts[1] ?? "overzicht";
    return last.charAt(0).toUpperCase() + last.slice(1);
  }, [pathname]);

  const Sections = (
    <>
      <section>
        <div className="px-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Dashboard
        </div>
        <NavItem href="/app" label="Overzicht" icon={<GaugeIcon />} />
      </section>

      <section>
        <div className="px-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Analyses
        </div>
        <NavItem href="/app/waterfall" label="GtN Waterfall" icon={<ChartBarIcon />} badge="NEW" />
        <NavItem href="/app/consistency" label="Consistency Tool" icon={<ScatterIcon />} />
      </section>

      <section>
        <div className="px-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Acties
        </div>
        <NavItem href="/templates" label="Excel-templates" icon={<DownloadIcon />} />
        <NavItem href="/contact" label="Plan demo" icon={<PhoneIcon />} />
      </section>
    </>
  );

  return (
    <aside className="bg-white border-r">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <Link href="/" className="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900">
          <ArrowLeftIcon />
          <span>Terug naar website</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden md:inline text-xs text-gray-400">Sectie:</span>
          <span className="text-xs font-medium text-gray-700">{crumb}</span>
          <button
            className="md:hidden text-xs px-2 py-1 border rounded"
            onClick={() => setOpen(v => !v)}
            aria-expanded={open}
            aria-controls="portal-mobile-menu"
            aria-label="Zijbalk tonen/verbergen"
          >
            Menu
          </button>
        </div>
      </div>

      {/* Desktop nav */}
      <nav className="hidden md:block p-3 space-y-6">{Sections}</nav>

      {/* Mobile nav */}
      <nav
        id="portal-mobile-menu"
        className={`md:hidden border-t transition-[max-height] duration-200 overflow-hidden ${open ? "max-h-[1000px]" : "max-h-0"}`}
      >
        <div className="p-3 space-y-6">
          {Sections}
        </div>
      </nav>

      {/* Footer note in sidebar */}
      <div className="mt-auto p-3 border-t text-[11px] text-gray-500">
        Ingelogd via GtN Portal • <Link className="underline hover:no-underline" href="/pricing">Licentiebeheer</Link>
      </div>
    </aside>
  );
}
