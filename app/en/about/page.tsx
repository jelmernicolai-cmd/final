export const metadata = {
  title: 'About PharmaGtN — Mission, approach & security',
  description: 'PharmaGtN is built by experts in finance and data analytics. We combine market expertise with modern cloud technology to deliver GTN transparency.',
}

export default function About() {
  return (
    <section className="container px-4 py-12 space-y-8">
      <h1>About us</h1>
      <p className="lead">We believe GTN calculations should not be complex or error-prone. Our mission is to deliver an intuitive, secure, and scalable solution that brings financial transparency and accelerates commercial decision-making.</p>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          {t:'Domain expertise', d:'Experience in pharma finance, pricing and data analytics.'},
          {t:'Technology', d:'Modern cloud stack focused on reliability and performance.'},
          {t:'Security', d:'Encryption in transit & at rest, role-based access, auditability.'},
        ].map((x,i)=>(
          <div key={i} className="card">
            <div className="font-semibold">{x.t}</div>
            <div className="text-sm opacity-80 mt-1">{x.d}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="mb-2">Our approach</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm">
          <li>Map GTN components and data flows</li>
          <li>Align on standard templates and validation rules</li>
          <li>Set up dashboards and reporting</li>
          <li>Scale and integrate with existing systems</li>
        </ol>
      </div>
    </section>
  )
}
