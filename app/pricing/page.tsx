// app/pricing/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Prijzen | PharmaGtN",
  description:
    "Eén heldere licentie: €3.900 per jaar per entiteit. Inclusief GtN Portal, templates, validatie en dashboards.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Prijzen | PharmaGtN",
    description:
      "Eén heldere licentie. Geen verrassingen. Inclusief templates, validatie en dashboards.",
    url: "/pricing",
    type: "website",
  },
};

export default function PricingNL() {
  const faqs = [
    {
      q: "Wat valt onder “entiteit”?",
      a: "Een juridische entiteit (bijv. landorganisatie). Meerdere entiteiten? Neem contact op voor bundelkorting.",
    },
    {
      q: "Zijn er implementatiekosten?",
      a: "Self-service onboarding is inbegrepen. Begeleide implementatie & data-ops zijn optioneel.",
    },
    {
      q: "Hoe zit het met support?",
      a: "E-mail support, template-updates en best practices zijn inbegrepen in de licentie.",
    },
    {
      q: "Enterprise opties?",
      a: "SSO, datalake-connectors en maatwerk dashboards op aanvraag.",
    },
  ];

  return (
    <main>
      {/* HERO */}
      <section className="bg-gradient-to-b from-white to-sky-50 border-b">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-indigo-600 px-3 py-1 text-xs font-medium text-white">
            <Dot /> Eén licentie — geen verborgen kosten
          </span>
          <h1 className="mt-4 text-3xl md:text-5xl font-bold">Prijzen</h1>
          <p className="mt-4 text-gray-700">
            Eén heldere licentie. Schaalbaar met enterprise-opties.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {/* Stripe checkout */}
            <form action="/api/stripe/create-checkout-session" method="POST">
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-3 text-white hover:opacity-95"
              >
                Start nu
              </button>
            </form>
            <Link
              href="/contact"
              className="rounded-xl border px-5 py-3 hover:bg-white"
            >
              Plan een demo
            </Link>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Betalingen via Stripe. Na betaling log je in met hetzelfde e-mailadres.
          </p>
        </div>
      </section>

      {/* HIGHLIGHTS */}
      <section className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Highlight icon="check" title="Één prijs" sub="€3.900 / jaar / entiteit" />
          <Highlight icon="support" title="Support inbegrepen" sub="onboarding & updates" />
          <Highlight icon="shield" title="EU-hosting" sub="encryptie in transit/at rest" />
          <Highlight icon="nohidden" title="Geen verborgen kosten" sub="duidelijk & transparant" />
        </div>
      </section>

      {/* PLAN CARD */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-6 lg:grid-cols-3 items-stretch">
          <article className="lg:col-span-2 rounded-2xl border bg-white p-6 md:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-bold">GtN Portal – Jaarlicentie</h2>
                <p className="mt-1 text-sm text-gray-600">Per juridische entiteit. Inclusief updates & support.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                Direct beschikbaar
              </span>
            </div>

            <div className="mt-6 flex items-baseline gap-2">
              <div className="text-4xl font-bold">€3.900</div>
              <div className="text-gray-500">/ jaar / entiteit</div>
            </div>

            <ul className="mt-6 grid gap-2 md:grid-cols-2 text-sm text-gray-700">
              <Feature>Waterfall, Consistency & Parallelanalyses</Feature>
              <Feature>Excel-templates & automatische validatie</Feature>
              <Feature>KPI’s en export (CSV/PDF)</Feature>
              <Feature>Rollen & rechten, logging</Feature>
              <Feature>EU-hosting optie; encryptie in transit/at rest</Feature>
              <Feature>Support & onboarding guidelines</Feature>
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <form action="/api/stripe/create-checkout-session" method="POST">
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-3 text-white hover:opacity-95"
                >
                  Start nu
                </button>
              </form>
              <Link href="/contact" className="rounded-xl border px-5 py-3 hover:bg-gray-50">
                Vraag enterprise-opties aan
              </Link>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Betaalpagina opent in Stripe. Nog geen account? Log na betaling in met hetzelfde e-mailadres.
            </p>
          </article>

          {/* SIDE INFO (zonder AI-visual; zuiver, zakelijk) */}
          <aside className="rounded-2xl border bg-white p-6 md:p-8">
            <h3 className="text-lg font-semibold">Wat je krijgt</h3>
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <BadgeLine icon="spark">Snelle start met templates</BadgeLine>
              <BadgeLine icon="chart">Transparante GtN-waterfall</BadgeLine>
              <BadgeLine icon="kpi">KPI’s & exports voor rapportage</BadgeLine>
              <BadgeLine icon="shield">EU-hosting & dataminimalisatie</BadgeLine>
            </div>
            <div className="mt-6 rounded-xl border bg-slate-50 p-4 text-xs text-gray-600">
              <strong>Indicatieve ROI:</strong> teams besparen uren per analysecyclus en voorkomen dure fouten in kortingmix.
            </div>
          </aside>
        </div>
      </section>

      {/* VERGELIJKING */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="rounded-2xl border bg-white p-6 md:p-8">
          <h2 className="text-xl font-semibold">Waarom niet Excel of maatwerk IT?</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <CompareCard
              title="Excel"
              points={["Foutgevoelig", "Geen audit/logging", "Geen consistente versie"]}
            />
            <CompareCard
              title="Maatwerk IT"
              points={["Duur & traag", "Lange implementatie", "Lastig aanpasbaar"]}
            />
            <CompareCard
              title="PharmaGtN"
              brand
              points={["Direct inzicht", "Governance & export", "Schaalbaar per entiteit"]}
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 border-t">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold">Veelgestelde vragen</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-xl border bg-white p-5">
                <h3 className="font-semibold">{f.q}</h3>
                <p className="mt-2 text-sm text-gray-700">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* JSON-LD: Product/Offer + FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Product",
              name: "PharmaGtN – GtN Portal (jaarlicentie)",
              description:
                "Gross-to-Net analyses, scenario’s, KPI’s en exports. Inclusief templates, validatie en support.",
              brand: { "@type": "Brand", name: "PharmaGtN" },
              offers: {
                "@type": "Offer",
                price: "3900",
                priceCurrency: "EUR",
                priceValidUntil: "2099-12-31",
                availability: "https://schema.org/InStock",
                url: (process.env.SITE_URL || "https://www.pharmagtn.com") + "/pricing",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ]),
        }}
      />
    </main>
  );
}

/* ===== Kleine UI helpers & iconen (inline, geen deps) ===== */
function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
      <span>{children}</span>
    </li>
  );
}

function Highlight({ icon, title, sub }: { icon: IconName; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-slate-50 px-4 py-3">
      <Icon name={icon} className="h-5 w-5 text-sky-700" />
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-slate-600">{sub}</div>
      </div>
    </div>
  );
}

function CompareCard({ title, points, brand }: { title: string; points: string[]; brand?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-5 ${brand ? "bg-gradient-to-br from-sky-50 to-indigo-50 ring-1 ring-sky-100/60" : "bg-white"}`}
    >
      <div className={`text-sm font-semibold ${brand ? "text-sky-800" : ""}`}>{title}</div>
      <ul className="mt-3 space-y-1 text-sm text-slate-700">
        {points.map((p) => (
          <li key={p} className="flex gap-2">
            <span>•</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type IconName = "check" | "support" | "shield" | "nohidden" | "spark" | "chart" | "kpi";

function Icon({ name, className }: { name: IconName; className?: string }) {
  switch (name) {
    case "check":
      return <Check className={className} />;
    case "support":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M12 2a8 8 0 0 0-8 8v2a3 3 0 0 0 3 3h1v-6H7a5 5 0 0 1 10 0h-1v6h1a3 3 0 0 0 3-3v-2a8 8 0 0 0-8-8zm-2 15h4v3h-4v-3z"/>
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M12 2l8 4v6c0 5-3.4 9.7-8 10-4.6-.3-8-5-8-10V6l8-4z"/>
        </svg>
      );
    case "nohidden":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M3 12h18v2H3zM3 7h18v2H3zM3 17h18v2H3z"/>
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M12 2l1.7 3.8L18 7.5l-3.8 1.7L12 13l-2.2-3.8L6 7.5l4.3-1.7L12 2z"/>
        </svg>
      );
    case "chart":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M3 20h18v1H3v-1zM6 11h3v7H6v-7zm5-4h3v11h-3V7zm5 2h3v9h-3V9z"/>
        </svg>
      );
    case "kpi":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path fill="currentColor" d="M3 20h18v1H3v-1zM6 11h3v7H6v-7zm5-4h3v11h-3V7zm5 2h3v9h-3V9z"/>
        </svg>
      );
  }
}

function BadgeLine({ icon, children }: { icon: "spark" | "chart" | "kpi" | "shield"; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon name={icon as IconName} className="h-4 w-4 text-sky-700" />
      <span>{children}</span>
    </div>
  );
}

function Check(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.2 7.2a1 1 0 01-1.4 0L3.3 9.1a1 1 0 011.4-1.4l3 3 6.5-6.5a1 1 0 011.4 0z" clipRule="evenodd" />
    </svg>
  );
}

function Spark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props} className={"h-4 w-4 " + (props.className || "")}>
      <path fill="currentColor" d="M12 2l1.7 3.8L18 7.5l-3.8 1.7L12 13l-2.2-3.8L6 7.5l4.3-1.7L12 2z"/>
    </svg>
  );
}

function Dot(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 8 8" aria-hidden {...props} className={"h-2 w-2 fill-white " + (props.className || "")}>
      <circle cx="4" cy="4" r="4" />
    </svg>
  );
}
