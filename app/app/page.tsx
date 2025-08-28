import Link from 'next/link'
export default function AppLanding(){
  return (
    <section className="container px-4 py-12 space-y-6">
      <h1 className="text-3xl font-semibold">Uw Gross‑to‑Net dashboard</h1>
      <p className="opacity-80">Samenvatting en toegang tot analyses.</p>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          {t:'Waterfall', href:'/app/waterfall'},
          {t:'Consistency', href:'/app/consistency'},
          {t:'Parallelle druk', href:'/app/parallel'}
        ].map((it,i)=>(
          <Link key={i} href={it.href} className="card hover:shadow-md transition">
            <div className="font-semibold">{it.t}</div>
            <div className="text-sm opacity-70">Upload → Validatie → Inzicht</div>
          </Link>
        ))}
      </div>
    </section>
  )
}
