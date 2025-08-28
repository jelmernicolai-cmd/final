export const metadata = {
  title: 'Prijs — Licentie €2.500 per jaar | PharmaGtN',
  description: 'Eén licentie, alle features. Inclusief dashboards, analyses en updates. ROI‑doelstelling €100.000 via optimalisatie van kortingen en voorwaarden.',
}

export default function Pricing() {
  return (
    <section className="container px-4 py-12 space-y-8">
      <h1>Licentie & prijzen</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card space-y-2">
          <div className="text-xl font-semibold">PharmaGtN Licentie</div>
          <div className="text-3xl font-bold">€2.500<span className="text-base font-medium"> / jaar</span></div>
          <ul className="list-disc pl-5 text-sm opacity-80 space-y-1">
            <li>Toegang tot alle tools (waterfall, consistentie, parallelle druk)</li>
            <li>Datasjablonen en automatische validatie</li>
            <li>Regelmatige updates & verbeteringen</li>
            <li>Email support</li>
          </ul>
          <a className="btn btn-primary" href="/contact">Offerte / Inkoop</a>
        </div>
        <div className="card">
          <h3>ROI‑doelstelling</h3>
          <p className="text-sm opacity-80 mt-1">Ons motto: minimaal €100.000 ROI door optimalisatie van het commerciële beleid en kortingen. Resultaten zijn afhankelijk van datakwaliteit en implementatie.</p>
          <img src="/images/hero-graph.svg" alt="ROI visual" className="mt-3 w-full h-32 object-contain" />
        </div>
      </div>
    </section>
  )
}
