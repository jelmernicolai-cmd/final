// components/Nav.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

const LeftItem = ({ href, label }: { href: string; label: string }) => (
  <Link href={href} className="px-3 py-2 rounded hover:underline">
    {label}
  </Link>
);

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b bg-white/70 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        <Link href="/" className="text-lg font-semibold">
          PharmaGtN
        </Link>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-1">
          <LeftItem href="/features" label="Features" />
          <LeftItem href="/pricing" label="Pricing" />
          <LeftItem href="/about" label="Over ons" />
          <LeftItem href="/contact" label="Contact" />
          <LeftItem href="/portal" label="Portal" />
        </nav>

        {/* Spacer */}
        <div className="ml-auto" />

        {/* Desktop CTA */}
        <div className="hidden md:block">
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg bg-sky-600 text-white text-sm px-4 py-2 hover:bg-sky-700"
          >
            Login
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden inline-flex items-center justify-center rounded-lg border px-3 py-2"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Open menu</span>
