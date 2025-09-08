import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Waarom PharmaGtN | Voor Pricing & Contracting",
  description:
    "PharmaGtN helpt farma-teams sneller beslissen, marges beschermen en tenderresultaat verbeteren — met EU-hosting en dataminimalisatie.",
};

export default function FeaturesNL() {
  return (
    <>
      {/* HERO */}
      <section className="bg-gradient-to-b from-sky-50 to-white border-b">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16 grid md:grid-cols-2 gap-10 items-center">
          <div className="min-w-0">
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">
              Meer grip op netto prijs & tenders. Minder gedoe.
            </h1>
            <p className="mt-4 text-gray-700 text-lg">
              Met <strong>PharmaGtN</strong> zie je in minuten wat anders weken kost: wat er met je marge gebeurt, welk
              tender-scenario verstandig is en welke afspraken wél werken. Zó neem je met vertrouwen beslissingen.
            </p>

            {/* Proof chips: korte, niet-technische garanties */}
            <div className="mt-5 flex flex-wrap gap-2 text-[12px]">
              {[
                "EU-hosting (NL/EU)",
                "Geen modeltraining op klantdata",
                "Dataminimalisatie",
                "Toegang op rol (4-ogen mogelijk)",
                "Audit trail & export",
              ].map((t) => (
                <span key={t} className="px-2 py-1 rounded-full border bg-white">{t}</span>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/pricing" className="bg-sky-700 text-white px-5 py-3 rounded-lg hover:bg-sky-800">
                Bekijk licentie (vanaf €2.500/jaar)
              </Link>
              <Link href="/contact" className="px-5 py-3 rounded-lg border hover:bg-gray-50">
                Plan een demo
              </Link>
            </div>
          </div>

          <div>
            <Image
              src="/images/feature-hero.png"
              alt="PharmaGtN overzicht"
              width={1200}
              height={800}
              className="w-full rounded-xl border shadow-sm"
              priority
            />
          </div>
        </div>
      </section>

      {/* RESULTATEN (value first) */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-bold">Wat je wint met PharmaGtN</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {[
            {
              h: "Snel helderheid",
              p: "Binnen één sessie duidelijkheid over netto prijs, volume-effect en tender-impact. Minder geharrewar, sneller akkoord.",
            },
            {
              h: "Bescherm je marge",
              p: "Zie precies waar korting weglekt en stuur bij. Voorkom onnodige concessies en houd de business case overeind.",
            },
            {
              h: "Beter tenderresultaat",
              p: "Vergelijk scenario’s naast elkaar en kies wat realistisch is. Geen verrassingen meer na gunning.",
            },
          ].map((c) => (
            <div key={c.h} className="rounded-xl border p-6 bg-white">
              <h3 className="font-semibold text-lg">{c.h}</h3>
              <p className="mt-2 text-gray-700">{c.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MODULEN – kort & duidelijk */}
      <section className="mx-auto max-w-6xl px-4 pb-4">
        <h2 className="text-2xl md:text-3xl font-bold">De modules die je dagelijks gebruikt</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {[
            {
              t: "LOE & Tender Scenario’s",
              d: "Test 2 scenario’s (A/B), zie omzet/EBITDA en marktaandeel, en exporteer één duidelijke onderbouwing.",
              img: "/images/feat-scenarios.png",
              link: "/app/loe",
              tag: "Sneller besluit",
            },
            {
              t: "GTN-Waterfall",
              d: "Van bruto naar netto per categorie. Herken meteen waar het weglekt en waar je kunt terugpakken.",
              img: "/images/feat-waterfall.png",
              link: "/app/waterfall",
              tag: "Marge in beeld",
            },
            {
              t: "Consistentie-analyse",
              d: "Zijn je afspraken netjes in lijn? Voorkom precedentwerking en leg je beleid vast.",
              img: "/images/feat-scatter.png",
              link: "/app/consistency",
              tag: "Rust & controle",
            },
          ].map((card) => (
            <Link key={card.t} href={card.link} className="rounded-xl border p-5 hover:shadow-sm transition block bg-white">
              <Image
                src={card.img}
                alt={card.t}
                width={800}
                height={500}
                className="w-full rounded-lg border bg-white"
              />
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full border">{card.tag}</span>
                <h3 className="font-semibold">{card.t}</h3>
              </div>
              <p className="mt-2 text-sm text-gray-700">{card.d}</p>
              <span className="mt-3 inline-block text-sm text-sky-700">Open module →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* HOE HET WERKT – in 4 duidelijke stappen */}
      <section className="bg-gray-50 border-y">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold">Van data naar besluit — zonder gedoe</h2>
          <div className="mt-8 grid md:grid-cols-4 gap-6">
            {[
              { n: "1", h: "Upload", p: "Vul onze eenvoudige Excel in (zonder patiëntgegevens). Klaar in een paar minuten." },
              { n: "2", h: "Check", p: "Wij controleren op ontbrekende velden en uitbijters. Jij houdt de regie." },
              { n: "3", h: "Inzicht", p: "Je ziet direct wat er gebeurt met netto prijs, marge en tender-kansen." },
              { n: "4", h: "Actie", p: "Kies het best passende scenario en exporteer een net dossier voor Finance/Legal." },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border bg-white p-6">
                <div className="text-sm text-gray-500">Stap {s.n}</div>
                <h3 className="mt-2 font-semibold">{s.h}</h3>
                <p className="mt-2 text-gray-700">{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VEILIGHEID – kort maar geruststellend */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="rounded-2xl border bg-white p-6 md:p-8 grid md:grid-cols-2 gap-8 items-center">
          <div className="min-w-0">
            <h2 className="text-2xl md:text-3xl font-bold">Zekerheid over je data</h2>
            <ul className="mt-4 text-gray-700 space-y-2">
              <li>• <strong>EU-hosting</strong> (NL/EU) en <strong>dataminimalisatie</strong>.</li>
              <li>• <strong>Geen modeltraining</strong> op jouw data.</li>
              <li>• <strong>Toegang op rol</strong> en 4-ogen-goedkeuring mogelijk.</li>
              <li>• <strong>Audit trail</strong> en export voor interne controles.</li>
            </ul>
          </div>
          <div>
            <Image
              src="/images/feat-security.png"
              alt="Veiligheid en vertrouwen"
              width={1200}
              height={800}
              className="w-full rounded-xl border"
            />
          </div>
        </div>
      </section>

      {/* KORTE SOCIAL PROOF / QUOTE (placeholder of vervang door echte quote) */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="rounded-2xl border bg-white p-8 text-center">
          <p className="text-lg text-gray-800 max-w-3xl mx-auto italic">
            “Binnen één week hadden we onze tenderstrategie rond — en eindelijk één versie van de waarheid
            voor Finance en Sales.”
          </p>
          <div className="mt-3 text-sm text-gray-600">— Commercieel Directeur, middelgroot farma-bedrijf (NL)</div>
        </div>
      </section>

      {/* PRICING CTA – helder en laagdrempelig */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-2xl border bg-white p-8 md:p-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">Klaar om grip te krijgen op je netto prijs?</h2>
          <p className="mt-3 text-gray-700">
            Start met een licentie en bewijs de waarde in je eerstvolgende tender of heronderhandeling.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link href="/pricing" className="bg-sky-700 text-white px-5 py-3 rounded-lg hover:bg-sky-800">
              Koop licentie (vanaf €2.500/jaar)
            </Link>
            <Link href="/contact" className="px-5 py-3 rounded-lg border hover:bg-gray-50">
              Plan een demo
            </Link>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            Maandelijks opzegbaar in het eerste jaar • Geen patiëntgegevens nodig • EU-hosting
          </div>
        </div>
      </section>
    </>
  );
}
