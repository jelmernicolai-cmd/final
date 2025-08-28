export default function Footer(){
  return (
    <footer className="mt-20 border-t">
      <div className="container px-4 py-10 text-sm text-slate-600 grid md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <div className="font-semibold">PharmaGtN</div>
          <p>Gross‑to‑Net analyse en optimalisatie voor farmaceutische fabrikanten.</p>
        </div>
        <div className="space-y-2">
          <div className="font-semibold">Product</div>
          <ul className="space-y-1">
            <li><a className="underline" href="/features">Features</a></li>
            <li><a className="underline" href="/pricing">Pricing</a></li>
            <li><a className="underline" href="/app">Dashboard</a></li>
          </ul>
        </div>
        <div className="space-y-2">
          <div className="font-semibold">Contact</div>
          <ul className="space-y-1">
            <li><a className="underline" href="/contact">Neem contact op</a></li>
          </ul>
        </div>
      </div>
      <div className="container px-4 pb-8 text-xs text-slate-500">© {new Date().getFullYear()} PharmaGtN — Alle rechten voorbehouden.</div>
    </footer>
  )
}
