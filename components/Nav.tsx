'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Menu, LogIn } from "lucide-react";

function Item({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded text-sm ${active ? "font-semibold underline" : "hover:underline"}`}
    >
      {label}
    </Link>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        <Link href="/" className="text-base font-semibold">PharmaGtN</Link>

        {/* Desktop left menu */}
        <nav className="hidden md:flex items-center gap-1">
          <Item href="/features" label="Functionaliteit" />
          <Item href="/pricing" label="Prijzen" />
          <Item href="/about" label="Over" />
          <Item href="/contact" label="Contact" />
          <Item href="/templates" label="Templates" />
          <Item href="/app" label="GtN Portal" />
        </nav>

        {/* Right side */}
        <div className="ml-auto hidden md:flex items-center gap-2">
          {!session ? (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              <LogIn className="size-4" />
              Login
            </Link>
          ) : (
            <>
              <span className="text-sm text-gray-600">Hi, {session.user?.name ?? session.user?.email}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Log uit
              </button>
            </>
          )}
        </div>

        {/* Mobile */}
        <button
          className="md:hidden ml-auto rounded border p-2"
          onClick={() => setOpen(v => !v)}
          aria-label="Menu"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t bg-white">
          <nav className="mx-auto max-w-6xl px-4 py-3 grid gap-2">
            <Item href="/features" label="Functionaliteit" />
            <Item href="/pricing" label="Prijzen" />
            <Item href="/about" label="Over" />
            <Item href="/contact" label="Contact" />
            <Item href="/templates" label="Templates" />
            <Item href="/app" label="GtN Portal" />
            {!session ? (
              <Link href="/login" className="mt-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white text-center">
                Login
              </Link>
            ) : (
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="mt-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 text-left"
              >
                Log uit
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
