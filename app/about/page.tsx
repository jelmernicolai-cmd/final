// app/about/page.tsx
export const metadata = {
  title: "Over | PharmaGtN",
  description:
    "PharmaGtN is gebouwd door pricing- en data-experts voor farmafabrikanten die hun gross-to-net willen beheersen.",
};

export default function AboutNL() {
  return (
    <main>
      <section className="bg-gradient-to-b from-white to-gray-50 border-b">
        <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
          <h1 className="text-3xl md:text-5xl font-bold">Over PharmaGtN</h1>
          <p className="mt-4 text-gray-700 leading-relaxed">
            Wij helpen farmafabrikanten hun <strong>gross-to-net</strong> te beheersen, precedentwerking te voorkomen
            en marge te beschermen, met een pragmatische toolset en een self-service workflow.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 grid md:grid-cols-3 gap-6">
        {[
          { h: "Domeinkennis", p: "Jaren praktijkervaring in pricing & contracting binnen farma." },
          { h: "Pragmatisch", p: "Geen zware IT-trajecten. Werkende dashboards vanaf dag één." },
          { h: "Veilig", p: "Dataminimalisatie, encryptie en EU-hostingoptie." },
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
