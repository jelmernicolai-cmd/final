// app/features/page.tsx
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Functionaliteit | PharmaGtN",
  description:
    "Alle tools van PharmaGtN voor farmafabrikanten: GTN-waterfall, consistentie-analyse, paralleldruk en self-service data-upload met validatie.",
};

export default function FeaturesNL() {
  return (
    <>
      {/* Hero / Intro */}
      <section className="bg-gradient-to-b from-sky-50 to-white border-b">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold">Functionaliteit</h1>
            <p className="mt-4 text-gray-700">
              De <strong>GtN Portal</strong> bundelt al je pricing- en kortingsinzichten.
              Upload gestandaardiseerde Excel-templates, krijg direct dashboards en exporteer
              actiegerichte rapportages.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/pricing" className="bg-sky-600 text-white px-5 py-3 rounded-lg hover:bg-sky-700">
                Bekijk licentie (€2.500/jaar)
              </Link>
              <Link href="/app" className="px-5 py-3 rounded-lg border hover:bg-gray-50">
                Naar de GtN Portal
              </Link>
            </div>
          </div>
          <div>
            <Image
              src="/images/feature-hero.png"
              alt="Overzicht GtN Portal"
              width={1200}
              height={800}
              className="w-full rounded-xl border shadow-sm"
              priority
            />
          </div>
        </div>
      </section>

      {/* Tools grid */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-bold">Tools in de GtN Portal</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {[
            {
              t: "GTN-waterfall",
              d: "Van bruto naar netto per kanaal en klanttype. Lokaliseer margeruis en heronderhandel gericht.",
              img: "/images/feat-waterfall.png",
            },
            {
              t: "Consistentie-analyse",
              d: "Zet korting% af tegen inkoopwaarde per klantsegment. Voorkom precedentwerking en uitbijters.",
              img: "/images/feat-scatter.png",
            },
            {
              t: "Paralleldruk-heatmap",
              d: "Detecteer producten met cross-country prijsdruk en optimaliseer je kortingmix.",
              img: "/images/feat-heatmap.png",
            },
          ].map((card) => (
            <div key={card.t} className="rounded-xl border p-5 hover:shadow-sm transition">
              <Image
                src={card.img}
                alt={card.t}
                width={800}
                height={500}
                className="w-full rounded-lg border bg-white"
              />
              <h3 className="mt-4 font-semibold">{card.t}</h3>
              <p className="mt-2 text-sm text-gray-600">{card.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="bg-gray-50 border-y">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold">Workflow: van data naar besluit</h2>
          <div className="mt-8 grid md:grid-cols-4 gap-6">
            {[
              { n: "1", h: "Upload", p: "Gebruik onze Excel-templates. Basisvelden: product, klant, volume, bruto/netto, korting/bonus/fees, periode." },
              { n: "2", h: "Validatie", p: "Automatische schema-controle, ontbrekende velden, outliers en dubbele records." },
              { n: "3", h: "Analyse", p: "Dashboards, KPI’s en scenario’s (what-if) voor discountmix en nettoprijs." },
              { n: "4", h: "Actie", p: "Exporteer slides en beslisregels. Optional: integratie met BI/ERP." },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border bg-white p-5">
                <div className="text-sm text-gray-500">Stap {s.n}</div>
                <h3 className="mt-2 font-semibold">{s.h}</h3>
                <p className="mt-2 text-sm text-gray-700">{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Compliance */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-bold">Security & compliance</h2>
        <div className="mt-6 grid md:grid-cols-3 gap-6">
          {[
            { h: "Toegangsbeheer", p: "Rol- en rechtenmodel per entiteit. 2FA mogelijk." },
            { h: "Versleuteling", p: "Encryptie in transit en at rest. Audit logging." },
            { h: "EU-hosting", p: "EU-cloudoptie en dataminimalisatie. ISO-ready werkwijze." },
          ].map((b) => (
            <div key={b.h} className="rounded-xl border p-5">
              <h3 className="font-semibold">{b.h}</h3>
              <p className="mt-2 text-sm text-gray-700">{b.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-2xl border bg-white p-8 md:p-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">Aan de slag met de GtN Portal</h2>
          <p className="mt-3 text-gray-700">
            Start self-service, bewijs je ROI en leg een consistent discountbeleid vast.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link href="/pricing" className="bg-sky-600 text-white px-5 py-3 rounded-lg hover:bg-sky-700">
              Koop licentie
            </Link>
            <Link href="/contact" className="px-5 py-3 rounded-lg border hover:bg-gray-50">
              Plan demo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
