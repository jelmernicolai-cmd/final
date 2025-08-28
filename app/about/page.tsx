export const metadata = {
  title: 'Over PharmaGtN — Missie, aanpak en security',
  description: 'PharmaGtN is gebouwd door experts in finance en data analytics. Wij combineren marktexpertise met moderne cloud‑technologie om GTN‑transparantie te leveren.',
}

export default function About() {
  return (
    <section className="container px-4 py-12 space-y-8">
      <h1>Over ons</h1>
      <p className="lead">Wij geloven dat GTN‑berekeningen niet complex of foutgevoelig hoeven te zijn. Onze missie is een intuïtieve, veilige en schaalbare oplossing te leveren die financiële transparantie brengt en commerciële beslissingen versnelt.</p>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          {t:'Domeinkennis', d:'Ervaring met farmaceutische finance, pricing en data‑analyse.'},
          {t:'Technologie', d:'Moderne cloud‑stack met focus op betrouwbaarheid en performance.'},
          {t:'Security', d:'Encryptie in transit & at rest, rol‑gebaseerde toegang, auditability.'},
        ].map((x,i)=>(
          <div key={i} className="card">
            <div className="font-semibold">{x.t}</div>
            <div className="text-sm opacity-80 mt-1">{x.d}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="mb-2">Aanpak</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm">
          <li>Inventarisatie van GTN‑componenten en datastromen</li>
          <li>Standaardsjablonen en validatieregels afstemmen</li>
          <li>Dashboards en rapportage opzetten</li>
          <li>Opschalen en integreren met bestaande systemen</li>
        </ol>
      </div>
    </section>
  )
}
