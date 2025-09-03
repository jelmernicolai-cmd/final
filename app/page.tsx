// app/page.tsx
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="bg-white text-gray-900">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:py-24">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              PharmaGtN — optimaliseer je <span className="whitespace-nowrap">Gross-to-Net</span>
            </h1>
            <p className="mt-5 max-w-xl text-blue-100">
              Inzicht in kortingen, bonussen, fees en claims. PharmaGtN helpt
              farma-fabrikanten hun commerciële beleid aan te scherpen en de marge
              te beschermen — volledig self-service, veilig en schaalbaar.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/features"
                className="rounded-md bg-white px-5 py-2.5 font-semibold text-blue-900 shadow hover:bg-gray-100"
              >
                Ontdek de functionaliteit
              </Link>
              <Link
                href="/public/templates/claims.xlsx"
                className="rounded-md border border-white/70 px-5 py-2.5 font-semibold text-white hover:bg-white/10"
              >
                Download claims-template
              </Link>
              <Link
                href="/app"
                className="rounded-md bg-blue-600/30 px-5 py-2.5 font-semibold text-white ring-1 ring-white/20 hover:bg-blue-600/40"
              >
                Log in op de GtN Portal
              </Link>
            </div>

            <ul className="mt-8 grid max-w-xl grid-cols-2 gap-4 text-sm text-blue-100 sm:grid-cols-3">
              <li className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-2xl font-bold text-white">€100k+</div>
                <div className="mt-1">ROI-doel per klant</div>
              </li>
              <li className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-2xl font-bold text-white">Self-service</div>
                <div className="mt-1">Upload & analyse</div>
              </li>
              <li className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-2xl font-bold text-white">Veilig</div>
                <div className="mt-1">Role-based access</div>
              </li>
            </ul>
          </div>

          <div className="relative aspect-[4/3] w-full">
            <Image
              src="/images/hero.jpg"
              alt="PharmaGtN — data-gedreven GTN optimalisatie"
              fill
              priority
              className="rounded-xl object-cover shadow-2xl ring-1 ring-black/10"
              sizes="(max-width: 1024px) 100vw, 640px"
            />
          </div>
        </div>
      </section>

      {/* PROBLEEM → OPLOSSING */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Van verspreide kortingen naar transparante <span className="whitespace-nowrap">Gross-to-Net</span>
            </h2>
            <p className="mt-4 text-lg text-gray-700">
              Kortingen aan ziekenhuizen, apothekers en groothandels stapelen zich op.
              Zonder consistent beleid verdampt marge. PharmaGtN structureert je data,
              visualiseert de waterfall en signaleert inconsistenties — zodat je gericht
              kunt bijsturen.
            </p>
            <ul className="mt-6 space-y-3 text-gray-800">
              <li>• GTN-waterfall: bruto → net, uitgesplitst per kanaal en type korting</li>
              <li>• Consistency-analyse: korting vs. inkoopwaarde per klant/segment</li>
              <li>• Parallel-druk heatmap: signaleer kannibalisatie tussen SKU’s</li>
              <li>• Scenario’s: “what-if” met drempels, caps & voorwaarden</li>
            </ul>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/public/templates/discounts.xlsx"
                className="rounded-md bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
              >
                Download kortings-template
              </Link>
              <Link
                href="/features"
                className="rounded-md border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                Bekijk alle features
              </Link>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src="/images/analytics.jpg"
                alt="Voorbeeld analytics en dashboards"
                fill
                className="rounded-xl object-cover shadow-lg ring-1 ring-gray-200"
                sizes="(max-width: 1024px) 100vw, 640px"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-3xl font-bold">Wat je direct krijgt</h2>
          <p className="mt-3 max-w-3xl text-gray-700">
            Een veilige portal met upload-tools, dashboards en export. Multi-taal (NL/EN). SSO-klaar.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                img: "/images/features.jpg",
                title: "GTN-Waterfall",
                desc: "Volledige bruto-naar-net afleiding per prijskanaal en kortingstype."
              },
              {
                img: "/images/analytics.jpg",
                title: "Consistency-analyse",
                desc: "Korting vs. inkoopwaarde per klant; flag outliers en inconsistentie."
              },
              {
                img: "/images/pricing.jpg",
                title: "Scenario’s & drempels",
                desc: "Test caps, staffels en voorwaarden — zie impact op marge."
              },
              {
                img: "/images/portal-login.jpg",
                title: "GtN Portal",
                desc: "Role-based toegang, audit-trail en export naar Excel/CSV."
              },
              {
                img: "/images/hero.jpg",
                title: "Datakwaliteit",
                desc: "Standaard templates, validatie en logging bij upload."
              },
              {
                img: "/images/analytics.jpg",
                title: "Support",
                desc: "Onboarding, best-practices en optionele expert review."
              },
            ].map((f, i) => (
              <div key={i} className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="relative mb-4 aspect-[16/9] w-full overflow-hidden rounded-lg">
                  <Image
                    src={f.img}
                    alt={f.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 400px"
                  />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 p-8 text-white shadow-lg">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Start vandaag met PharmaGtN
          </h2>
          <p className="mt-2 max-w-2xl text-blue-100">
            Upload je data, draai de analyses en zie waar marge lekt. Ons ROI-motto:
            minimaal €100.000 terugverdiend door optimalisatie van je commerciële beleid.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="rounded-md bg-white px-5 py-2.5 font-semibold text-blue-900 hover:bg-gray-100"
            >
              Bekijk prijzen
            </Link>
            <Link
              href="/app"
              className="rounded-md bg-blue-700 px-5 py-2.5 font-semibold text-white ring-1 ring-white/20 hover:bg-blue-800"
            >
              Log in op de GtN Portal
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
