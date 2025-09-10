// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://www.pharmagtn.com"),
  title: { default: "PharmaGtN – Gross-to-Net software", template: "%s | PharmaGtN" },
  description:
    "Optimaliseer Gross-to-Net, rebates en governance voor farma. EU-hosting, audit trail, exports en scenario’s zonder zwaar IT-traject.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "PharmaGtN",
    description: "Gross-to-Net software voor farma",
    url: "/",
    siteName: "PharmaGtN",
    locale: "nl_NL",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        {/* Plausible (pas domein aan) */}
        <script defer data-domain="pharmagtn.com" src="https://plausible.io/js/script.js"></script>
      </head>
      <body className="min-h-dvh bg-gradient-to-b from-white to-slate-50 text-slate-900 antialiased">
        <header className="border-b bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <a href="/" className="font-semibold">PharmaGtN</a>
            <nav className="flex items-center gap-5 text-sm">
              <a className="hover:underline" href="/features">Features</a>
              <a className="hover:underline" href="/pricing">Pricing</a>
              <a className="hover:underline" href="/about">About</a>
              <a className="rounded-lg border px-3 py-1.5 hover:bg-slate-50" href="/contact">Contact</a>
            </nav>
          </div>
        </header>

        {/* SEO: Organization JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "PharmaGtN",
              url: process.env.SITE_URL || "https://www.pharmagtn.com",
              description: "Gross-to-Net & contract governance voor farma",
              areaServed: "EU",
            }),
          }}
        />

        <main>{children}</main>

        <footer className="mt-20 border-t bg-white">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-3">
            <div>
              <div className="font-semibold">PharmaGtN</div>
              <p className="mt-2 text-sm text-slate-600">
                Heldere GtN-analyses, scenario’s en governance — gebouwd voor farma.
              </p>
            </div>
            <div className="text-sm">
              <div className="font-medium">Product</div>
              <ul className="mt-2 space-y-1">
                <li><a className="hover:underline" href="/features">Features</a></li>
                <li><a className="hover:underline" href="/pricing">Pricing</a></li>
                <li><a className="hover:underline" href="/about#security">Security</a></li>
              </ul>
            </div>
            <div className="text-sm">
              <div className="font-medium">Contact</div>
              <ul className="mt-2 space-y-1">
                <li><a className="hover:underline" href="/contact">Neem contact op</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t py-4 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} PharmaGtN. Alle rechten voorbehouden.
          </div>
        </footer>
      </body>
    </html>
  );
}
