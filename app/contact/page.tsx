// app/contact/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Contact | PharmaGtN",
  description:
    "Neem contact op met PharmaGtN voor een demo, licenties en enterprise-opties. We reageren doorgaans binnen één werkdag.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact | PharmaGtN",
    description:
      "Plan een demo of stel je vraag over Gross-to-Net, scenario’s en governance. Reactie binnen één werkdag.",
    url: "/contact",
    type: "website",
  },
};

export default function ContactNL() {
  // FAQ bron voor zowel render als JSON-LD
  const faqs = [
    {
      q: "Hoe snel kunnen we live?",
      a: "Self-service: binnen 1–2 dagen met onze templates. Enterprise-integraties op aanvraag.",
    },
    {
      q: "Verwerken jullie PII/health data?",
      a: "Nee. We werken met dataminimalisatie: transactie- en prijsgegevens op product/klantsegmentniveau, geen PII/gezondheidsdata.",
    },
    {
      q: "Ondersteunen jullie EU-hosting?",
      a: "Ja, er is EU-hosting met encryptie ‘in transit’ en ‘at rest’.",
    },
    {
      q: "Kunnen we een NDA tekenen?",
      a: "Zeker. Stuur je standaard NDA mee; doorgaans tekenen we binnen 2 werkdagen.",
    },
  ];

  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-b from-sky-50 to-white border-b">
        <div className="mx-auto max-w-5xl px-4 py-12 md:py-16 text-center">
          <h1 className="text-3xl md:text-5xl font-bold">Contact</h1>
          <p className="mt-4 text-gray-700">
            Plan een demo of stel je vraag. We reageren doorgaans binnen <strong>één werkdag</strong>.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            EU-hosting • Dataminimalisatie • Audit trail
          </p>
        </div>
      </section>

      {/* Cards */}
      <section className="mx-auto max-w-5xl px-4 py-12 grid md:grid-cols-3 gap-6">
        {/* E-mail */}
        <div className="rounded-2xl border p-6 bg-white">
          <h2 className="font-semibold">E-mail</h2>
          <p className="mt-2 text-sm text-gray-700">
            Voor sales & support:
            <br />
            <a
              className="text-sky-700 underline break-all"
              href="mailto:sales@pharmagtn.com?subject=Aanvraag%20demo%20PharmaGtN&body=Naam%3A%0ABedrijf%3A%0ADoel%3A%20(bijv.%20GtN%20waterfall%2C%20scenario%E2%80%99s%2C%20governance)%0A"
            >
              sales@pharmagtn.com
            </a>
          </p>
          <p className="mt-3 text-xs text-gray-500">
            Tip: vermeld kort je casus zodat we gericht kunnen meedenken.
          </p>
        </div>

        {/* Demo inplannen */}
        <div className="rounded-2xl border p-6 bg-white">
          <h2 className="font-semibold">Demo inplannen</h2>
          <p className="mt-2 text-sm text-gray-700">
            Krijg een walkthrough van de GtN Portal met je eigen casus.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href="mailto:sales@pharmagtn.com?subject=Plan%20demo%20PharmaGtN&body=Wens%20datum%2Ftijd%3A%0AAantal%20deelnemers%3A%0AUse%20case%3A%0A"
              className="inline-block bg-sky-600 text-white px-4 py-2 rounded-lg text-center hover:bg-sky-700"
            >
              Plan demo via e-mail
            </a>
            <Link
              href="/pricing"
              className="inline-block border px-4 py-2 rounded-lg text-center hover:bg-gray-50"
            >
              Bekijk licentie & ROI
            </Link>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Liever NDA vooraf? Vermeld dit in het onderwerp.
          </p>
        </div>

        {/* Documentatie */}
        <div className="rounded-2xl border p-6 bg-white">
          <h2 className="font-semibold">Documentatie</h2>
          <p className="mt-2 text-sm text-gray-700">
            Download de Excel-templates en onboarding-handleiding.
          </p>
          <div className="mt-4">
            <Link
              href="/templates"
              className="inline-block border px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              Naar templates
            </Link>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Start snel met dummy-data en schaal later op.
          </p>
        </div>
      </section>

      {/* Ingebouwd formulier (optioneel, direct werkend met /api/contact) */}
      <section aria-labelledby="contact-form" className="mx-auto max-w-5xl px-4 pb-12">
        <div className="rounded-2xl border bg-white p-6">
          <h2 id="contact-form" className="font-semibold text-lg">Stuur ons een bericht</h2>
          <p className="mt-1 text-sm text-gray-700">
            Liever via formulier? Vul je gegevens in — we mailen je terug.
          </p>
          <form
            className="mt-6 grid gap-4"
            action="/api/contact"
            method="post"
            aria-label="Contactformulier"
          >
            {/* Honeypot voor spam */}
            <input type="text" name="company_website" className="hidden" tabIndex={-1} autoComplete="off" />
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm" htmlFor="name">Naam</label>
                <input id="name" name="name" required className="mt-1 w-full rounded-lg border px-3 py-2" />
              </div>
              <div>
                <label className="text-sm" htmlFor="email">E-mail</label>
                <input id="email" type="email" name="email" required className="mt-1 w-full rounded-lg border px-3 py-2" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm" htmlFor="company">Bedrijf</label>
                <input id="company" name="company" className="mt-1 w-full rounded-lg border px-3 py-2" />
              </div>
              <div>
                <label className="text-sm" htmlFor="usecase">Use case</label>
                <select id="usecase" name="usecase" className="mt-1 w-full rounded-lg border px-3 py-2">
                  <option>Gross-to-Net waterfall</option>
                  <option>Scenario-analyse</option>
                  <option>Governance / audit trail</option>
                  <option>Anders</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm" htmlFor="message">Bericht</label>
              <textarea id="message" name="message" rows={5} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <input id="consent" name="consent" type="checkbox" required className="rounded" />
              <label htmlFor="consent">Ik geef toestemming om mijn gegevens te gebruiken om mijn aanvraag te behandelen.</label>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="rounded-lg border px-4 py-2 hover:bg-gray-50" type="submit">Verzenden</button>
              <a
                className="rounded-lg border px-4 py-2 hover:bg-gray-50"
                href="mailto:sales@pharmagtn.com?subject=Contact%20via%20formulier"
              >
                Of mail direct
              </a>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              We bewaren informatie niet langer dan nodig. Geen marketing zonder opt-in.
            </p>
          </form>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 border-t">
        <div className="mx-auto max-w-5xl px-4 py-12 grid md:grid-cols-2 gap-6">
          {faqs.map((item) => (
            <div key={item.q} className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">{item.q}</h3>
              <p className="mt-2 text-sm text-gray-700">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* JSON-LD: ContactPage + FAQPage + contactPoint */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "ContactPage",
              "name": "Contact | PharmaGtN",
              "url": (process.env.SITE_URL || "https://www.pharmagtn.com") + "/contact",
              "description":
                "Plan een demo of stel je vraag. Reactie binnen één werkdag.",
            },
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "PharmaGtN",
              "url": process.env.SITE_URL || "https://www.pharmagtn.com",
              "contactPoint": [
                {
                  "@type": "ContactPoint",
                  "contactType": "sales",
                  "email": "sales@pharmagtn.com",
                  "areaServed": "NL/EU",
                  "availableLanguage": ["nl", "en"]
                }
              ]
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": faqs.map((f) => ({
                "@type": "Question",
                "name": f.q,
                "acceptedAnswer": { "@type": "Answer", "text": f.a }
              }))
            }
          ]),
        }}
      />
    </main>
  );
}
