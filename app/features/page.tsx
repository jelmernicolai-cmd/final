// app/features/page.tsx
import Link from "next/link";
import Script from "next/script";

export const metadata = {
  title: "Features | PharmGtN",
  description:
    "Concreet: scenario-vergelijking, GTN-waterfall, kanaalconsistentie en gevalideerde templates. Gemaakt voor NL-farma-teams.",
  alternates: { canonical: "/features" },
  openGraph: {
    title: "PharmGtN Features",
    description:
      "Concreet: scenario-vergelijking, GTN-waterfall, kanaalconsistentie en gevalideerde templates.",
    url: "https://www.pharmgtn.com/features",
    images: ["/og-default.png"],
    type: "website",
    siteName: "PharmGtN",
  },
  twitter: { card: "summary_large_image", images: ["/og-default.png"] },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "PharmGtN Features",
  url: "https://www.pharmgtn.com/features",
  description:
    "Overzicht van functies voor Nederlandse farmaceutische fabrikanten en commerciële teams.",
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.pharmgtn.com/" },
      { "@type": "ListItem", position: 2, name: "Features", item: "https://www.pharmgtn.com/features" },
    ],
  },
};

export default function FeaturesPage() {
  const cards: FeatureCard[] = [
    {
      icon: "abtest",
      title: "Scenario-analyse (A/B/C)",
      bullets: [
        "Vergelijk prijs/korting-scenario’s per kanaal (WH, ZH, direct)",
        "Impact in € en % op bruto→netto incl. volumeveronderstellingen",
        "Versiebeheer met naam, datum en notities; export PDF/CSV",
      ],
      cta: { href: "/pricing", label: "Bekijk licentie" },
    },
    {
      icon: "waterfall",
      title: "GTN-waterfall met validaties",
      bullets: [
        "Transparant per stap: fees, rebates, claims, clawbacks",
        "Automatische teken- en som-checks (∑ stappen = netto)",
        "Audit-ready weergave met datum/tijd en bron data",
      ],
      cta: { href: "/app", label: "Bekijk in portal" },
    },
    {
      icon: "consistency",
      title: "Kanaalconsistentie & paralleldruk",
      bullets: [
        "Regelset per kanaal/account (kortingsmatrix, floor/ceiling)",
        "Detecteer outliers en cross-kanaal inconsistenties",
        "Signaleer paralleldruk op prijslijnen vóór livegang",
      ],
      cta: { href: "/contact", label: "Plan een demo" },
    },
    {
      icon: "template",
      title: "Templates & upload-validatie",
      bullets: [
        "NL-Excel templates: sales, kortingen, claims, parallel",
        "Schema-checks, required kolommen en heldere foutmeldingen",
        "Dummy-data meegeleverd voor snelle onboarding",
      ],
      cta: { href: "/templates", label: "Download templates" },
    },
  ];

  return (
    <main>
      <Script
        id="ld-features"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* HERO */}
      <section className="border-b bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white">
              <Dot className="h-2 w-2" /> Gemaakt voor NL-farma-teams
            </span>
            <h1 className="mt-4 text-3xl md:text-5xl font-semibold leading-tight">
              Concreet en controleerbaar: <span className="underline decoration-brand-300/60">GtN-analyses</span> zonder ruis
            </h1>
            <p className="mt-4 text-slate-700">
              Vergelijk scenario’s, bereken de waterfall, check kanaalconsistentie en exporteer besluitklare output — zonder
              zware IT-trajecten.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/pricing" className="btn btn-primary">Bekijk pricing</Link>
              <Link href="/contact" className="btn">Plan een demo</Link>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              EU-hosting • Dataminimalisatie • Exports naar Excel/PDF • RBAC & logging
            </p>
          </div>
        </div>
      </section>

      {/* FEATURE GRID – max 4 cards, responsief: 1 / 2 / 4 */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <article key={c.title} className="card group h-full">
              <div className="inline-flex items-center justify-center rounded-xl bg-brand-50 ring-1 ring-brand-100 p-3">
                <Icon name={c.icon} className="h-6 w-6 text-brand-700" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">{c.title}</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {c.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <Link
                  href={c.cta.href}
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                >
                  {c.cta.label} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FLOW – kort en concreet */}
      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="card">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: "1", title: "Upload", text: "Gebruik NL-templates (sales, kortingen, claims, parallel)." },
              { step: "2", title: "Controle", text: "Schema-/som-checks, outliers en kanaalregels." },
              { step: "3", title: "Besluit", text: "Waterfall + scenario-vergelijking; export PDF/CSV." },
            ].map((s) => (
              <div key={s.step}>
                <p className="kicker">Stap {s.step}</p>
                <h3>{s.title}</h3>
                <p className="mt-2 text-slate-700 text-sm">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-gradient-to-r from-brand-600 to-brand-700">
        <div className="mx-auto max-w-7xl px-4 py-10 text-center text-white">
          <h4 className="text-2xl font-semibold">Klaar voor duidelijke GtN-analyses?</h4>
          <p className="mt-2 text-white/90">Start met de templates of plan een demo met je eigen casus.</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/pricing" className="rounded-xl bg-white px-4 py-2 text-slate-900 hover:bg-slate-100">
              Bekijk pricing
            </Link>
            <Link href="/contact" className="rounded-xl border border-white/30 px-4 py-2 hover:bg-white/10">
              Plan demo
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ===== Types ===== */
type FeatureCard = {
  icon: IconName;
  title: string;
  bullets: string[];
  cta: { href: string; label: string };
};

/* ===== Inline icons (geen sparkles) ===== */
type IconName = "abtest" | "waterfall" | "consistency" | "template";

function Icon({ name, className }: { name: IconName; className?: string }) {
  switch (name) {
    case "abtest":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
        </svg>
      );
    case "waterfall":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M3 20h18v1H3v-1zM6 11h3v7H6v-7zm5-4h3v11h-3V7zm5 2h3v9h-3V9z" />
        </svg>
      );
    case "consistency":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M4 6h16v2H4V6zm0 5h10v2H4v-2zm0 5h16v2H4v-2z" />
        </svg>
      );
    case "template":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M4 4h16v4H4V4zm0 6h10v10H4V10zm12 0h4v10h-4V10z" />
        </svg>
      );
  }
}

function Check(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 010 1.4l-7.2 7.2a1 1 0 01-1.4 0L3.3 9.1a1 1 0 011.4-1.4l3 3 6.5-6.5a1 1 0 011.4 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ArrowRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path d="M10.293 3.293a1 1 0 011.414 0L17 8.586a2 2 0 010 2.828l-5.293 5.293a1 1 0 01-1.414-1.414L13.586 12H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 010-1.414z" />
    </svg>
  );
}

function Dot(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 8 8" aria-hidden {...props}>
      <circle cx="4" cy="4" r="4" fill="currentColor" />
    </svg>
  );
}
