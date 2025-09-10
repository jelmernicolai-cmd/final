import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "PharmaGtN — Functionaliteit voor Pricing & Contracting",
  description:
    "Scenario-planning (LOE & tender), GTN-waterfall en consistentie-analyses — ontworpen voor Nederlandse farma. EU-hosting, dataminimalisatie en strakke toegangsborging.",
};

export default function FeaturesNL() {
  return (
    <>
      {/* HERO */}
      <section className="bg-gradient-to-b from-sky-50 to-white border-b">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16 grid md:grid-cols-2 gap-10 items-center">
          <div className="min-w-0">
            <h1 className="text-3xl md:text-5xl font-semibold leading-tight">
              Inzicht, controle en zekerheid over kortingen en netto-prijzen 
            </h1>
            <p className="mt-4 text-gray-700">
              PharmGtN ondersteunt pricing- en contractingteams met scenario’s, heldere KPI’s en een gestructureerde werkwijze.
              Gericht op de Nederlandse geneesmiddelen markt. Slim met data. Direct resultaat.
            </p>

            {/* Vertrouwens-badges */}
            <div className="mt-5 flex flex-wrap gap-2 text-[12px]">
              {[
                "EU-hosting (NL/EU)",
                "Dataminimalisatie",
                "Geen modeltraining op klantdata",
                "Rol-gebaseerde toegang (4-ogen)",
                "Audit trail & export",
              ].map((t) => (
                <span key={t} className="px-2 py-1 rounded-full border bg-white">{t}</span>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/pricing" className="bg-sky-700 text-white px-5 py-3 rounded-lg hover:bg-sky-800">
                Licentie & tarieven
              </Link>
              <Link href="/contact" className="px-5 py-3 rounded-lg border hover:bg-gray-50">
                Plan demo
              </Link>
            </div>
          </div>

          {/* Hero visual */}
          <div>
            <Image
              src="/images/feature-hero.png"
              alt="Overzicht van de GtN Portal (dashboard en scenario’s)"
              width={1200}
              height={800}
              className="w-full rounded-xl border shadow-sm bg-white"
              priority
            />
          </div>
        </div>
      </section>

      {/* MODULES (kort en zakelijk) */}
      <section className="mx-auto max-w-6xl px-4">
        <h2 className="text-2xl md:text-3xl font-semibold">Wat u mag verwachten</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {[
            {
              t: "Loss of Exclusivity & Tender Scenario’s",
              d: "Vergelijk twee scenario’s (A/B), inclusief tender-ramp-down. Duidelijke KPI’s en onderbouwing.",
              img: "/images/feat-scenarios.png",
              link: "/app/loe",
            },
            {
              t: "GTN-Waterfall",
              d: "Van bruto naar netto per kanaal/klanttype. Transparante GTN-waterfalls tonen precies waar korting weglekt. Inzicht in verbeterpunten voordat u onderhandelt.",
              img: "/images/feat-waterfall.png",
              link: "/app/waterfall",
            },
            {
              t: "Consistentie-analyse",
              d: "Controle op de consistentie van uw kortingsbeleid. Voorkom margeverlies en scherp uw beleid direct aan.",
              img: "/images/feat-scatter.png",
              link: "/app/consistency",
            },
          ].map((card) => (
            <Link key={card.t} href={card.link} className="rounded-xl border p-5 hover:shadow-sm transition block bg-white">
              <Image
                src={card.img}
                alt={card.t}
                width={900}
                height={560}
                className="w-full rounded-lg border bg-white"
              />
              <h3 className="mt-4 font-medium">{card.t}</h3>
              <p className="mt-2 text-sm text-gray-700">{card.d}</p>
              <span className="mt-3 inline-block text-sm text-sky-700">Open module →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* VISUAL GALLERY (extra visuals voor overtuiging) */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-semibold">Zo ziet het eruit in de praktijk</h2>
        <div className="mt-8 grid md:grid-cols-4 gap-6">
          {[
            { img: "/images/gal-loe.png", alt: "Scenario A/B met KPI’s", c: "Scenario A/B met KPI’s" },
            { img: "/images/gal-waterfall.png", alt: "GTN-waterfall per kanaal", c: "GTN-waterfall per kanaal" },
            { img: "/images/gal-consistency.png", alt: "Consistentie-scatter", c: "Consistentie-scatter" },
            { img: "/images/gal-security.png", alt: "Beveiliging en audit", c: "Beveiliging en audit" },
          ].map((g) => (
            <figure key={g.alt} className="rounded-xl border bg-white p-3">
              <Image
                src={g.img}
                alt={g.alt}
                width={800}
                height={500}
                className="w-full rounded-lg border bg-white"
              />
              <figcaption className="mt-2 text-xs text-gray-600">{g.c}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* WERKWIJZE (duidelijk en beknopt) */}
      <section className="bg-gray-50 border-y">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-semibold">Van data naar besluit</h2>
          <div className="mt-8 grid md:grid-cols-4 gap-6">
            {[
              { n: "1", h: "Upload", p: "Gebruik de Excel-template (zonder PII/PHI). Snel klaar, direct bruikbaar." },
              { n: "2", h: "Validatie", p: "Automatische controles op volledigheid en uitbijters. U houdt regie." },
              { n: "3", h: "Analyse", p: "Dashboards en scenario’s met KPI’s. Herleidbare aannames en rationale." },
              { n: "4", h: "Besluit", p: "Exporteer onderbouwing voor Finance/Legal en borg de afspraak." },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border bg-white p-6">
                <div className="text-sm text-gray-500">Stap {s.n}</div>
                <h3 className="mt-2 font-medium">{s.h}</h3>
                <p className="mt-2 text-gray-700">{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY (kort, zakelijk, geruststellend) */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="rounded-2xl border bg-white p-6 md:p-8 grid md:grid-cols-2 gap-8 items-center">
          <div className="min-w-0">
            <h2 className="text-2xl md:text-3xl font-semibold">Veiligheid, privacy en controle/h2>
            <ul className="mt-4 text-gray-700 space-y-2">
              <li>• EU-hosting (NL/EU) en dataminimalisatie.</li>
              <li>• Geüploade bestanden worden alleen in je eigen browser verwerkt.</li>
               <li>• Alleen jij hebt toegang tot je data zolang je ingelogd bent in de portal.</li>
              <li>• We slaan niets op onze servers op. Je data wordt dus niet gedeeld met derden en ook niet gebruikt om modellen te trainen.</li>
            </ul>
          </div>
          <div>
            <Image
              src="/images/feat-security.png"
              alt="Overzicht van beveiliging, rollen en logging"
              width={1200}
              height={800}
              className="w-full rounded-xl border bg-white"
            />
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="rounded-2xl border bg-white p-8 text-center">
          <p className="text-lg text-gray-800 max-w-3xl mx-auto italic">
            “Binnen één sessie lagen de scenario’s en onderbouwing klaar. Duidelijk voor Finance, werkbaar voor Sales.”
          </p>
          <div className="mt-3 text-sm text-gray-600">— Commercieel Directeur, farma (NL)</div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-2xl border bg-white p-8 md:p-10 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">Klaar voor meer grip en minder risico?</h2>
          <p className="mt-3 text-gray-700">
            Start met een licentie en gebruik de modules in uw eerstvolgende tender of heronderhandeling.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link href="/pricing" className="bg-sky-700 text-white px-5 py-3 rounded-lg hover:bg-sky-800">
              Koop licentie
            </Link>
            <Link href="/contact" className="px-5 py-3 rounded-lg border hover:bg-gray-50">
              Plan een demo
            </Link>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            Eigen data • EU-hosting • Herleidbare onderbouwing
          </div>
        </div>
      </section>
    </>
  );
}
