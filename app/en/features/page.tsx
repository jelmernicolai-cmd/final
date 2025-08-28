export const metadata = {
  title: 'Features — GTN dashboards, waterfall & consistency analysis',
  description: 'PharmaGtN provides GTN waterfall, consistency checks, portfolio pressure insights, validated templates and governance tools.',
}

export default function Features() {
  return (
    <section className="container px-4 py-12 space-y-8">
      <h1>Features</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3>GTN Waterfall</h3>
          <p className="text-sm opacity-80 mt-1">Gross → Net breakdown into discounts, rebates and fees. Identify leakages and opportunities.</p>
          <img src="/images/waterfall.svg" alt="GTN Waterfall" className="mt-3 w-full h-40 object-contain" />
        </div>
        <div className="card">
          <h3>Consistency Analysis</h3>
          <p className="text-sm opacity-80 mt-1">Discount% vs purchase value per customer group. Spot inconsistencies and unwanted variations.</p>
          <img src="/images/consistency-scatter.svg" alt="Consistency Scatter" className="mt-3 w-full h-40 object-contain" />
        </div>
        <div className="card">
          <h3>Parallel Pressure</h3>
          <p className="text-sm opacity-80 mt-1">Visualize overlap between portfolio products. Support price and discount decisions.</p>
          <img src="/images/heatmap.svg" alt="Parallel Pressure Heatmap" className="mt-3 w-full h-40 object-contain" />
        </div>
        <div className="card">
          <h3>Data templates & validation</h3>
          <p className="text-sm opacity-80 mt-1">Standard upload format, automatic checks and clear error messages.</p>
        </div>
        <div className="card">
          <h3>Governance & Compliance</h3>
          <p className="text-sm opacity-80 mt-1">Traceability, access control and audit trails support internal and external audits.</p>
        </div>
        <div className="card">
          <h3>Integrations</h3>
          <p className="text-sm opacity-80 mt-1">Connect to ERP/CRM/BI tools. Export to financial reporting and planning.</p>
        </div>
      </div>
    </section>
  )
}
