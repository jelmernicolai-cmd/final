// app/contact/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Contact | PharmaGtN",
  description:
    "Neem contact op met PharmaGtN voor een demo, licenties en enterprise-opties.",
};

export default function ContactNL() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-b from-sky-50 to-white border-b">
        <div className="mx-auto max-w-5xl px-4 py-12 md:py-16 text-center">
          <h1 className="text-3xl md:text-5xl font-bold">Contact</h1>
          <p className="mt-4 text-gray-700">
            Plan een demo of stel je vraag. We reageren doorgaans binnen één werkdag.
          </p>
        </div>
      </section>

      {/* Cards */}
      <section className="mx-auto max-w-5xl px-4 py-12 grid md:grid-cols-3 gap-6">
        <div className="rounded-2xl border p-6 bg-white">
          <h2 className="font-semibold">E-mail</h2>
          <p className="mt-2 text-sm text-gray-700">
            Voor sales & support:
            <br />
            <a className="text-sky-700 underline break-all" href="mailto:sales@pharmgtn.com">
              sales@pharmgtn.com
            </a>
          </p>
        </div>
        <div className="rounded-2xl border p-6 bg-white">
          <h2 className="font-semibold">Demo inplannen</h2>
          <p className="mt-2 text-sm text-gray-700">
            Krijg een walkthrough van de GtN Portal met je eigen casus.
          </p>
          <div className="mt-4">
            <Link href="/pricing" className="inline-block bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700">
              Bekijk licentie & plan
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border p-6 bg-white">
          <h2 className="font-semibold">Documentatie</h2>
          <p className="mt-2 text-sm text-gray-700">
            Download de Excel-templates en onboarding-handleiding.
          </p>
          <div className="mt-4">
            <Link href="/templates" className="inline-block border px-4 py-2 rounded-lg hover:bg-gray-50">
              Naar templates
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 border-t">
        <div className="mx-auto max-w-5xl px-4 py-12 grid md:grid-cols-2 gap-6">
          {[
            {
              q: "Hoe snel kunnen we live?",
              a: "Self-service: binnen 1–2 dagen met onze templates. Enterprise integraties op aanvraag.",
            },
            {
              q: "Verwerken jullie PII/health data?",
              a: "Nee. Alleen transactie- en prijsgegevens op product/klantsegment niveau (dataminimalisatie).",
            },
            {
              q: "Ondersteunen jullie EU-hosting?",
              a: "Ja, er is een EU-hostingoptie beschikbaar, met encryptie in transit en at rest.",
            },
            {
              q: "Kunnen we een NDA tekenen?",
              a: "Zeker. Stuur je standaard NDA mee; we tekenen doorgaans binnen 2 werkdagen.",
            },
          ].map((item) => (
            <div key={item.q} className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">{item.q}</h3>
              <p className="mt-2 text-sm text-gray-700">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
