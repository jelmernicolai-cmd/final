export const metadata = {
  title: 'Contact — Vraag een demo of offerte aan',
  description: 'Neem contact op met PharmaGtN voor een demo, offerte of inhoudelijke vraag over Gross‑to‑Net optimalisatie. Reactie binnen 1 werkdag.',
}

export default function Contact() {
  return (
    <section className="container px-4 py-12 space-y-8">
      <h1>Contact</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <p className="lead">Vragen of een demo plannen? Stuur een e‑mail naar <a className="underline" href="mailto:info@pharmgtn.com">info@pharmgtn.com</a>. We reageren doorgaans binnen 1 werkdag.</p>
          <form className="space-y-3" onSubmit={(e)=>e.preventDefault()}>
            <input className="w-full border rounded-xl p-3" placeholder="Naam" required />
            <input className="w-full border rounded-xl p-3" placeholder="E‑mail" type="email" required />
            <textarea className="w-full border rounded-xl p-3" rows={4} placeholder="Uw bericht"></textarea>
            <button className="btn btn-primary" type="submit">Versturen</button>
          </form>
          <p className="text-xs text-slate-500">Dit formulier is een placeholder. E‑mail ons rechtstreeks voor snelle reactie.</p>
        </div>
        <div className="card">
          <h3>Adres & info</h3>
          <ul className="text-sm opacity-80 space-y-2 mt-2">
            <li>E‑mail: info@pharmgtn.com</li>
            <li>Website: www.pharmgtn.com</li>
          </ul>
          <img src="/images/logo.svg" alt="PharmaGtN logo" className="mt-3 h-10 w-10" />
        </div>
      </div>
    </section>
  )
}
