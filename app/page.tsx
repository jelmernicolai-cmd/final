// app/page.tsx
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Optimaliseer Gross-to-Net & kortingsbeleid | PharmaGtN",
  description:
    "PharmaGtN helpt farmafabrikanten hun commerciële beleid te optimaliseren: inzicht in kortingen per kanaal, consistentiecontrole, paralleldruk en ROI-verbetering.",
};

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">
              Maak <span className="underline decoration-sky-300/70">Gross-to-Net</span>{" "}
              transparant. Stuur gericht op rendement.
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Eén portal voor pricing & discounts over ziekenhuizen, apotheken en groothandels.
              Upload je data, krijg direct bruikbare inzichten en verhoog je ROI.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-3 text-white font-medium hover:opacity-95"
              >
                Probeer PharmaGtN
              </Link>
              <Link
                href="/features"
                className="rounded-xl border px-5 py-3 hover:bg-white"
              >
                Bekijk functionaliteit
              </Link>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              ROI-belofte: minimaal €100.000 extra waarde bij optimalisatie van je kortingsbeleid.
            </p>
          </div>

          <div className="relative">
            <Image
              src="/images/hero-dashboard.png"
              alt="PharmaGtN dashboard-overzicht"
              width={1200}
              height={800}
              className="w-full rounded-xl border shadow-sm"
              priority
            />
          </div>
        </div>
      </section>

      {/* Cred-bar / metrics */}
      <section className="border-y bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { v: "€100k+", l: "Gemiddelde ROI per jaar" },
            { v: "3–6 mnd", l: "Typische implementatietijd" },
            { v: "Self-service", l: "Upload & analyseer direct" },
            { v: "ISO-ready", l: "Privacy & security-first" },
          ].map((m) => (
            <div key={m.l} className="rounded-xl border bg-slate-50 px-4 py-3 text-center">
              <div className="text-xl font-semibold">{m.v}</div>
              <div className="text-xs text-gray-500">{m.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Kernvoordelen */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-bold">Wat je meteen wint</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {[
            {
              t: "Volledige GTN-transparantie",
              d: "Waterfall van bruto naar netto per kanaal en klanttype. Zie in één oogopslag waar marge lekt.",
              img: "/images/benefit-waterfall.png",
            },
            {
              t: "Consistent beleid",
              d: "Benchmark korting versus inkoopwaarde. Voorkom inconsistenties en ongewenste precedentwerking.",
              img: "/images/benefit-scatter.png",
            },
            {
              t: "Paralleldruk managen",
              d: "Detecteer producten met cross-country prijsdruk en stel kortingen gericht bij.",
              img: "/images/benefit-heatmap.png",
            },
          ].map((b) => (
            <article key={b.t} className="rounded-xl border bg-white p-5 hover:shadow-sm transition">
              <Image
                src={b.img}
                alt={b.t}
                width={800}
                height={500}
                className="w-full rounded-lg border"
              />
              <h3 className="mt-4 font-semibold">{b.t}</h3>
              <p className="mt-2 text-sm text-gray-600">{b.d}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Use cases + visuals */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-14 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">
              Van inzicht naar actie in de <span className="whitespace-nowrap">GtN Portal</span>
            </h2>
            <ul className="mt-6 space-y-3 text-gray-700">
              <li>• Upload gestandaardiseerde Excel-templates voor snelle kwaliteitscontrole.</li>
              <li>• Ontvang direct KPI’s: bruto/netto, rabat-mix, fee/bonus, kanaalimpact.</li>
              <li>• Scenario’s: “wat als” bij kortingen, bonus, fees en nettoprijs.</li>
              <li>• Exporteer management-slides en deelbare inzichten.</li>
            </ul>
            <div className="mt-6 flex gap-3">
              <Link href="/app" className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-3 text-white hover:opacity-95">
                Naar de GtN Portal
              </Link>
              <Link href="/templates" className="rounded-xl border px-5 py-3 hover:bg-white">
                Download templates
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            <Image
              src="/images/screen-waterfall.png"
              alt="GTN Waterfall"
              width={1200}
              height={800}
              className="w-full rounded-xl border"
            />
            <Image
              src="/images/screen-consistency.png"
              alt="Consistency scatter"
              width={1200}
              height={800}
              className="w-full rounded-xl border"
            />
          </div>
        </div>
      </section>

      {/* ROI claim */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="rounded-2xl border bg-white p-8 md:p-10">
          <h2 className="text-2xl md:text-3xl font-bold">ROI-garantie</h2>
          <p className="mt-3 text-gray-700">
            Ons motto is helder: <strong>minimaal €100.000 extra waarde</strong> via optimalisatie van je commerciële beleid.
            We helpen prioriteiten te kiezen en zorgen dat beslissingen worden vastgelegd.
          </p>
          <div className="mt-6">
            <Link
              href="/pricing"
              className="inline-block rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-3 text-white hover:opacity-95"
            >
              Bekijk licentie (€3.900/jaar)
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold">Wat klanten waarderen</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {[
              { q: "Eindelijk één GTN-waarheid over alle kanalen, zonder spreadsheet-chaos.", a: "Director Market Access" },
              { q: "De consistentie-analyse gaf ons een helder kader voor discounts.", a: "Head of Commercial" },
              { q: "We zagen binnen weken paralleldruk op top-SKU’s — en stuurden direct bij.", a: "Pricing Manager" },
            ].map((t) => (
              <figure key={t.q} className="rounded-xl border bg-gray-50 p-6">
                <blockquote className="italic">“{t.q}”</blockquote>
                <figcaption className="mt-3 text-sm text-gray-600">— {t.a}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold">Veelgestelde vragen</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">Welke data heb ik nodig?</h3>
              <p className="mt-2 text-sm text-gray-700">
                Minimale set: product, klant, volume, bruto/netto prijs, korting/bonus/fees en periode.
                Gebruik onze Excel-templates voor snelle onboarding.
              </p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">Hoe waarborgen jullie security?</h3>
              <p className="mt-2 text-sm text-gray-700">
                Strikte toegangscontrole, versleutelde opslag en audit logging. On-prem of EU-cloud mogelijk.
              </p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">Wat kost het?</h3>
              <p className="mt-2 text-sm text-gray-700">
                Licentie €3.900/jaar per entiteit. Enterprise-opties beschikbaar.
              </p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">Hoe snel zijn we live?</h3>
              <p className="mt-2 text-sm text-gray-700">
                Vaak binnen 3–6 maanden inclusief datastandaardisatie en validatie.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl border bg-white p-8 md:p-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">Klaar om te optimaliseren?</h2>
          <p className="mt-3 text-gray-700">
            Start met de GtN Portal en maak je kortingsbeleid aantoonbaar consistenter en winstgevender.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link
              href="/pricing"
              className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-3 text-white hover:opacity-95"
            >
              Koop licentie
            </Link>
            <Link
              href="/contact"
              className="rounded-xl border px-5 py-3 hover:bg-white"
            >
              Plan demo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
