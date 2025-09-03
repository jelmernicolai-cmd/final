// app/en/about/page.tsx
export const metadata = {
  title: "About | PharmaGtN",
  description:
    "Built by pricing & data specialists for manufacturers who want control over gross-to-net.",
};

export default function AboutEN() {
  return (
    <main>
      <section className="bg-gradient-to-b from-white to-gray-50 border-b">
        <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
          <h1 className="text-3xl md:text-5xl font-bold">About PharmaGtN</h1>
          <p className="mt-4 text-gray-700 leading-relaxed">
            We help manufacturers control <strong>gross-to-net</strong>, avoid precedent issues and protect margin
            with a pragmatic toolset and a self-service workflow.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 grid md:grid-cols-3 gap-6">
        {[
          { h: "Domain expertise", p: "Years of pricing & contracting experience in pharma." },
          { h: "Pragmatic", p: "No heavy IT projects. Working dashboards from day one." },
          { h: "Secure", p: "Data minimisation, encryption, and an EU hosting option." },
        ].map((b) => (
          <div key={b.h} className="rounded-xl border bg-white p-6">
            <h3 className="font-semibold">{b.h}</h3>
            <p className="mt-2 text-sm text-gray-700">{b.p}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
