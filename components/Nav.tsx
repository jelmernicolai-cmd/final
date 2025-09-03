"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const Item = ({ href, label }: { href: string; label: string }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`block px-3 py-2 rounded ${
          active ? "font-semibold underline" : "hover:underline"
        }`}
        onClick={() => setOpen(false)}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-lg font-bold text-sky-700">
          PharmaGtN
        </Link>

        {/* Desktop menu */}
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <Item href="/features" label="Functionaliteit" />
          <Item href="/en/features" label="Features (EN)" />
          <Item href="/pricing" label="Prijzen" />
          <Item href="/about" label="Over" />
          <Item href="/contact" label="Contact" />
          <Item href="/app" label="GtN Portal" />
          <Link
            href="/login"
            className="ml-2 bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700"
          >
            Login
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t bg-white px-4 py-3 space-y-2">
          <Item href="/features" label="Functionaliteit" />
          <Item href="/en/features" label="Features (EN)" />
          <Item href="/pricing" label="Prijzen" />
          <Item href="/about" label="Over" />
          <Item href="/contact" label="Contact" />
          <Item href="/app" label="GtN Portal" />
          <Link
            href="/login"
            className="block bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 text-center"
            onClick={() => setOpen(false)}
          >
            Login
          </Link>
        </div>
      )}
    </header>
  );
}
