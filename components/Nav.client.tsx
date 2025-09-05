// components/Nav.client.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

type LeftItemProps = { href: string; label: string };
function LeftItem({ href, label }: LeftItemProps) {
  return (
    <Link href={href} className="px-3 py-2 rounded hover:underline">
      {label}
    </Link>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();

  return (
    <header className="border-b bg-white/70 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        <Link href="/" className="text-lg font-semibold">PharmaGtN</Link>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-1">
          <LeftItem href="/features" label="Features" />
          <LeftItem href="/pricing" label="Pricing" />
          <LeftItem href="/about" label="Over ons" />
          <LeftItem href="/contact" label="Contact" />
          <LeftItem href="/portal" label="Portal" />
        </nav>

        <div className="ml-auto" />

        {/* Rechts: login status */}
        <div className="hidden md:flex items-center gap-3">
          {status === "authenticated" ? (
            <>
              <span className="text-sm text-gray-600">{session?.user?.email}</span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="inline-flex items-center rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Log uit
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center rounded-lg bg-sky-600 text-white text-sm px-4 py-2 hover:bg-sky-700"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center rounded-lg border px-3 py-2"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Open menu</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </div>

      {/* Mobile panel */}
      <div
        id="mobile-nav"
        className={`md:hidden overflow-hidden border-t transition-[max-height] duration-300 ease-in-out ${
          open ? "max-h-96" : "max-h-0"
        }`}
      >
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-2">
          <LeftItem href="/features" label="Features" />
          <LeftItem href="/pricing" label="Pricing" />
          <LeftItem href="/about" label="Over ons" />
          <LeftItem href="/contact" label="Contact" />
          <LeftItem href="/portal" label="Portal" />

          {status === "authenticated" ? (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="mt-2 inline-flex items-center w-fit rounded-lg border px-4 py-2 hover:bg-gray-50"
            >
              Log uit
            </button>
          ) : (
            <Link
              href="/login"
              className="mt-2 inline-flex items-center w-fit rounded-lg bg-sky-600 text-white text-sm px-4 py-2 hover:bg-sky-700"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
