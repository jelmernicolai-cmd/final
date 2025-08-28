export const metadata = {
  title: 'PharmaGtN — Automatisering van Gross‑to‑Net voor farmaceuten',
  description: 'PharmaGtN vereenvoudigt GTN-berekeningen met realtime dashboards, automatische validatie en veilige cloudopslag. Verhoog transparantie, verklein fouten en optimaliseer uw nettomarge.',
}

export default function Home() {
  return (
    <section className="container px-4 py-12 space-y-12">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-5">
          <div className="kicker">Gross‑to‑Net, maar dan simpel</div>
          <h1>Maximaliseer uw nettomarge met GTN‑transparantie</h1>
          <p className="lead">PharmaGtN helpt farmaceutische fabrikanten om GTN‑berekeningen te automatiseren, fouten te verminderen en sneller te beslissen. Volledige zichtbaarheid van korting, rebates, fees en netto‑opbrengst.</p>
          <div className="flex gap-3">
            <a className="btn btn-primary" href="/pricing">Koop licentie</a>
            <a className="btn" href="/features">Bekijk features</a>
          </div>
          <ul className="text-sm text-slate-600 grid sm:grid-cols-2 gap-2 pt-3">
            <li>• ROI‑doelstelling: €100.000</li>
            <li>• Realtime dashboards</li>
            <li>• Datasjablonen & validatie</li>
            <li>• Cloudbeveiliging en compliance</li>
          </ul>
        </div>
        <div className="card">
          <h3 className="mb-2">GTN in één oogopslag</h3>
          <img src="/images/hero-graph.svg" alt="Overzicht GTN dashboard" className="w-full h-48 object-contain" />
          <p className="text-sm text-slate-600 mt-3">Voorbeeldvisual. Echte grafieken worden later toegevoegd.</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2>Waarom PharmaGtN</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {t:'Volledige GTN-transparantie', d:'Van bruto tot netto: alle kortingen, rebates, distributie‑ en servicefees inzichtelijk.'},
            {t:'Automatisering & betrouwbaarheid', d:'Standaardsjablonen, validatie en reproduceerbare berekeningen—minder Excel‑gedoe.'},
            {t:'Snellere besluitvorming', d:'Dashboards en rapportages voor commercie, finance en leadership.'},
          ].map((x,i)=>(
            <div key={i} className="card">
              <div className="font-semibold">{x.t}</div>
              <div className="text-sm opacity-80 mt-1">{x.d}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4">Visuals</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div><img src="/images/waterfall.svg" alt="Waterfall voorbeeld" className="w-full h-40 object-contain" /><div className="text-xs text-slate-500 mt-2">GTN‑waterfall</div></div>
          <div><img src="/images/consistency-scatter.svg" alt="Consistency scatter voorbeeld" className="w-full h-40 object-contain" /><div className="text-xs text-slate-500 mt-2">Consistency scatter</div></div>
          <div><img src="/images/heatmap.svg" alt="Parallelle druk heatmap" className="w-full h-40 object-contain" /><div className="text-xs text-slate-500 mt-2">Parallelle druk (heatmap)</div></div>
        </div>
      </div>
    </section>
  )
}
