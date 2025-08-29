export const metadata = {
  title: 'Over PharmaGtN',
  description: 'Onze missie: meetbare ROI via datagedreven optimalisatie van kortingen en GTN.',
};

export default function About() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 space-y-6">
      <h1 className="text-3xl font-semibold">Over PharmaGtN</h1>
      <p className="text-gray-700 max-w-3xl">
        PharmaGtN is ontwikkeld voor commerciële teams in farma. We combineren branche-jargon met
        pragmatische datamodellen zodat u sneller beslissingen neemt met minder ruis.
      </p>
      <ul className="list-disc pl-5 text-gray-700 space-y-1">
        <li>Privacy by design — u behoudt controle over de data</li>
        <li>Standaard templates (XLSX/CSV) en geautomatiseerde validatie</li>
        <li>Focus op marge-behoud en consistente korting</li>
      </ul>
    </section>
  );
}
