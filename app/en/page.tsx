import Link from 'next/link'

export default function HomePage(){
  return (
    <section className="container px-4 py-12 space-y-8">
      <h1 className="text-3xl md:text-5xl font-semibold leading-tight">Maximize your Gross‑to‑Net</h1>
      <p className="text-lg opacity-80">Standard ROI target: <strong>€100,000</strong> by optimizing discounts, rebates and terms.</p>
      <div className="flex gap-3">
        <Link className="btn btn-primary" href="/en/pricing">Buy license</Link>
        <Link className="btn" href="/en/features">See features</Link>
        <Link className="btn" href="/en/app">Go to dashboard</Link>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {['Waterfall','Consistency','Parallel pressure'].map((t,i)=>(
          <div key={i} className="card">
            <div className="font-semibold">{t}</div>
            <div className="text-sm opacity-70">Placeholder visual (chart coming soon)</div>
            <div className="mt-3 h-24 bg-slate-100 rounded-xl border border-dashed"></div>
          </div>
        ))}
      </div>
    </section>
  )
}
