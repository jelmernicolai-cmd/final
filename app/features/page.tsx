export const metadata = {
  title: 'Features — GTN dashboards, waterfall en consistentieanalyse',
  description: 'PharmaGtN biedt GTN‑waterfall, consistentieanalyse, parallelle‑druk inzichten, datasjablonen met validatie en governance‑tools.',
}

export default function Features() {
  return (
    <section className="container px-4 py-12 space-y-8">
      <h1>Features</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3>GTN‑Waterfall</h3>
          <p className="text-sm opacity-80 mt-1">Bruto → netto uitgesplitst in kortingen, rebates en fees. Identificeer waar de grootste lekken en kansen zitten.</p>
          <img src="/images/waterfall.svg" alt="GTN Waterfall" className="mt-3 w-full h-40 object-contain" />
        </div>
        <div className="card">
          <h3>Consistency Analyse</h3>
          <p className="text-sm opacity-80 mt-1">Korting% vs inkoopwaarde per klantgroep. Opsporen van inconsistenties en ongewenste variaties.</p>
          <img src="/images/consistency-scatter.svg" alt="Consistency Scatter" className="mt-3 w-full h-40 object-contain" />
        </div>
        <div className="card">
          <h3>Parallelle Druk</h3>
          <p className="text-sm opacity-80 mt-1">Overlap tussen producten in het portfolio zichtbaar maken. Richting geven aan prijs‑ en kortingsbeslissingen.</p>
          <img src="/images/heatmap.svg" alt="Parallel Pressure Heatmap" className="mt-3 w-full h-40 object-contain" />
        </div>
        <div className="card">
          <h3>Datasjablonen & Validatie</h3>
          <p className="text-sm opacity-80 mt-1">Gestandaardiseerd upload‑formaat, automatische controles en duidelijke foutmeldingen.</p>
        </div>
        <div className="card">
          <h3>Governance & Compliance</h3>
          <p className="text-sm opacity-80 mt-1">Traceerbaarheid, toegangsbeheer en audit‑trails ondersteunen interne en externe controles.</p>
        </div>
        <div className="card">
          <h3>Integraties</h3>
          <p className="text-sm opacity-80 mt-1">Koppeling met ERP/CRM/BI‑tools. Export naar financiële rapportages en planning.</p>
        </div>
      </div>
    </section>
  )
}
