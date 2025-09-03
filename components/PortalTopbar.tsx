// components/PortalTopbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PortalTopbar() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean).slice(1); // na "app"

  const crumbs = [
    { href: "/app", label: "Dashboard" },
    ...parts.map((p, i) => {
      const href = "/app/" + parts.slice(0, i + 1).join("/");
      return { href, label: p.charAt(0).toUpperCase() + p.slice(1) };
    }),
  ];

  return (
    <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3 text-sm">
        <nav className="flex items-center gap-2 text-gray-600">
          {crumbs.map((c, i) => (
            <span key={c.href} className="flex items-center gap-2">
              <Link href={c.href} className="hover:underline">{c.label}</Link>
              {i < crumbs.length - 1 && <span className="text-gray-400">/</span>}
            </span>
          ))}
        </nav>
        <span className="ml-auto" />
        <Link
          href="/"
          className="rounded border px-3 py-1.5 hover:bg-gray-50"
          title="Terug naar website"
        >
          ← Terug naar website
        </Link>
      </div>
    </div>
  );
}
