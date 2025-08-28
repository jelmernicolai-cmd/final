export const metadata = {
  title: 'Pricing — License €2,500 per year | PharmaGtN',
  description: 'One license, all features. Includes dashboards, analyses and updates. ROI target €100,000 via optimization of discounts and terms.',
}

export default function Pricing() {
  return (
    <section className="container px-4 py-12 space-y-8">
      <h1>License & Pricing</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card space-y-2">
          <div className="text-xl font-semibold">PharmaGtN License</div>
          <div className="text-3xl font-bold">€2,500<span className="text-base font-medium"> / year</span></div>
          <ul className="list-disc pl-5 text-sm opacity-80 space-y-1">
            <li>Access to all tools (waterfall, consistency, portfolio pressure)</li>
            <li>Standard templates & automatic validation</li>
            <li>Regular updates & improvements</li>
            <li>Email support</li>
          </ul>
          <a className="btn btn-primary" href="/en/contact">Request quote</a>
        </div>
        <div className="card">
          <h3>ROI target</h3>
          <p className="text-sm opacity-80 mt-1">We aim for at least €100,000 ROI through optimization of commercial policy and discounts. Results depend on data quality and implementation.</p>
          <img src="/images/hero-graph.svg" alt="ROI visual" className="mt-3 w-full h-32 object-contain" />
        </div>
      </div>
    </section>
  )
}
