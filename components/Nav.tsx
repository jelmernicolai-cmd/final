// components/Nav.tsx
import Link from "next/link";

const LeftItem = ({ href, label }: { href: string; label: string }) => (
  <Link href={href} className="px-3 py-2 rounded hover:underline">
    {label}
  </Link>
);

export default function Nav() {
  return (
    <header className="border-b bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        <Link href="/" className="text-lg font-semibold">
          PharmaGtN
        </Link>

        {/* Links links */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          <LeftItem href="/features" label="Functionaliteit" />
          <LeftItem href="/pricing" label="Prijzen" />
          <LeftItem href="/about" label="Over" />
          <LeftItem href="/contact" label="Contact" />
          <LeftItem href="/app" label="GtN Portal" />
        </nav>

        {/* Mobile compacte nav */}
        <nav className="md:hidden ml-2 text-sm">
          <LeftItem href="/app" label="Portal" />
        </nav>

        {/* Rechts: Login CTA */}
        <div className="ml-auto">
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg bg-sky-600 text-white text-sm px-4 py-2 hover:bg-sky-700"
          >
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}
