export const metadata = {
  title: 'PharmaGtN — Automating Gross‑to‑Net for pharma',
  description: 'PharmaGtN simplifies GTN with real-time dashboards, automated validation, and secure cloud storage. Increase transparency, reduce errors, and optimize net margin.',
}

export default function Home() {
  return (
    <section className="container px-4 py-12 space-y-12">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-5">
          <div className="kicker">Gross‑to‑Net made simple</div>
          <h1>Maximize net margin with GTN transparency</h1>
          <p className="lead">PharmaGtN helps pharmaceutical manufacturers automate GTN calculations, reduce errors, and speed up decisions. Full visibility across discounts, rebates, fees, and net revenue.</p>
          <div className="flex gap-3">
            <a className="btn btn-primary" href="/en/pricing">Buy license</a>
            <a className="btn" href="/en/features">See features</a>
          </div>
          <ul className="text-sm text-slate-600 grid sm:grid-cols-2 gap-2 pt-3">
            <li>• ROI target: €100,000</li>
            <li>• Real-time dashboards</li>
            <li>• Data templates & validation</li>
            <li>• Cloud security & compliance</li>
          </ul>
        </div>
        <div className="card">
          <h3 className="mb-2">GTN at a glance</h3>
          <img src="/images/hero-graph.svg" alt="GTN overview dashboard" className="w-full h-48 object-contain" />
          <p className="text-sm text-slate-600 mt-3">Demo visualization. Real charts to be added later.</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2>Why PharmaGtN</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {t:'Full GTN transparency', d:'From gross to net: all discounts, rebates, distribution and service fees visible.'},
            {t:'Automation & reliability', d:'Standard templates, validation and reproducible calculations — less Excel hassle.'},
            {t:'Faster decision-making', d:'Dashboards and reports for commercial, finance and leadership.'},
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
          <div><img src="/images/waterfall.svg" alt="Waterfall example" className="w-full h-40 object-contain" /><div className="text-xs text-slate-500 mt-2">GTN waterfall</div></div>
          <div><img src="/images/consistency-scatter.svg" alt="Consistency scatter example" className="w-full h-40 object-contain" /><div className="text-xs text-slate-500 mt-2">Consistency scatter</div></div>
          <div><img src="/images/heatmap.svg" alt="Parallel pressure heatmap" className="w-full h-40 object-contain" /><div className="text-xs text-slate-500 mt-2">Parallel pressure (heatmap)</div></div>
        </div>
      </div>
    </section>
  )
}
