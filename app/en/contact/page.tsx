export const metadata = {
  title: 'Contact — Request a demo or quote',
  description: 'Get in touch with PharmaGtN for a demo, a quote, or any question about Gross-to-Net optimization. Response within 1 business day.',
}

export default function Contact() {
  return (
    <section className="container px-4 py-12 space-y-8">
      <h1>Contact</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <p className="lead">Questions or want to schedule a demo? Email us at <a className="underline" href="mailto:info@pharmgtn.com">info@pharmgtn.com</a>. We usually reply within 1 business day.</p>
          <form className="space-y-3" onSubmit={(e)=>e.preventDefault()}>
            <input className="w-full border rounded-xl p-3" placeholder="Name" required />
            <input className="w-full border rounded-xl p-3" placeholder="Email" type="email" required />
            <textarea className="w-full border rounded-xl p-3" rows={4} placeholder="Message"></textarea>
            <button className="btn btn-primary" type="submit">Send</button>
          </form>
          <p className="text-xs text-slate-500">This form is a placeholder. Please email us directly for a quick response.</p>
        </div>
        <div className="card">
          <h3>Address & info</h3>
          <ul className="text-sm opacity-80 space-y-2 mt-2">
            <li>Email: info@pharmgtn.com</li>
            <li>Website: www.pharmgtn.com</li>
          </ul>
          <img src="/images/logo.svg" alt="PharmaGtN logo" className="mt-3 h-10 w-10" />
        </div>
      </div>
    </section>
  )
}
