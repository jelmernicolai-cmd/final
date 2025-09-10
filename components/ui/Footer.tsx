// components/ui/Footer.tsx
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24">
      {/* CTA-band */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div>
            <h3 className="text-2xl font-semibold leading-snug">
              Zien hoe PharmaGtN jouw marge optimaliseert?
            </h3>
            <p className="mt-1 text-white/90 text-sm">
              Korte demo met eigen casus — zonder verplichtingen.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:sales@pharmagtn.com?subject=Plan%20demo%20PharmaGtN&body=Bedrijf%3A%0AUse%20case%3A%0AWens%20datum%2Ftijd%3A%0A"
              className="rounded-xl bg-white/10 backdrop-blur border border-white/30 px-4 py-2 text-sm hover:bg-white/15"
            >
              Plan demo
            </a>
            <a
              href="/pricing"
              className="rounded-xl bg-white text-slate-900 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Bekijk pricing
            </a>
          </div>
        </div>
      </section>

      {/* Hoofdfooter */}
      <div className="mt-10 border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 md:grid-cols-5">
          {/* Brand + badges */}
          <div className="md:col-span-2">
            <a href="/" className="text-lg font-semibold">PharmaGtN</a>
            <p className="mt-3 text-sm text-slate-600">
              Helder inzicht in Gross-to-Net, scenario’s en governance — gebouwd voor farma.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-700">
              <span className="rounded-full border px-3 py-1">EU-hosting</span>
              <span className="rounded-full border px-3 py-1">Dataminimalisatie</span>
              <span className="rounded-full border px-3 py-1">Audit logging</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <div className="text-sm font-medium">Product</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li><a className="hover:underline" href="/features">Features</a></li>
              <li><a className="hover:underline" href="/pricing">Pricing</a></li>
              <li><a className="hover:underline" href="/templates">Templates</a></li>
              <li><a className="hover:underline" href="/login">Portal login</a></li>
            </ul>
          </div>

          {/* Bedrijf */}
          <div>
            <div className="text-sm font-medium">Bedrijf</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li><a className="hover:underline" href="/about">Over ons</a></li>
              <li><a className="hover:underline" href="/about#security">Security</a></li>
              <li><a className="hover:underline" href="/contact">Contact</a></li>
            </ul>
          </div>

          {/* Volg ons */}
          <div>
            <div className="text-sm font-medium">Volg ons</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>
                <a
                  className="inline-flex items-center gap-2 hover:underline"
                  href="https://www.linkedin.com/company/pharmagtn"
                  target="_blank"
                  rel="noopener"
                >
                  <LinkedInIcon className="h-4 w-4" />
                  LinkedIn
                </a>
              </li>
              {/* Voeg indien gewenst meer kanalen toe */}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>© {year} PharmaGtN. Alle rechten voorbehouden.</div>
            <div className="flex items-center gap-3">
              <a href="/terms" className="hover:underline">Voorwaarden</a>
              <span>•</span>
              <a href="/privacy" className="hover:underline">Privacy</a>
              <span>•</span>
              <a href="/cookies" className="hover:underline">Cookies</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* Inline LinkedIn pictogram (geen extra dependency) */
function LinkedInIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.05-1.86-3.05-1.86 0-2.15 1.45-2.15 2.95v5.67H9.32V9h3.41v1.56h.05c.47-.9 1.62-1.85 3.34-1.85 3.57 0 4.23 2.35 4.23 5.4v6.34zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );
}
