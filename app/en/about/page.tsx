export const metadata = {
  title: 'About PharmaGtN',
  description: 'Our mission: measurable ROI via data-driven discount & GTN optimization.',
};

export default function AboutEn() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 space-y-6">
      <h1 className="text-3xl font-semibold">About PharmaGtN</h1>
      <p className="text-gray-700 max-w-3xl">
        Built for pharma commercial teams. We blend domain language with pragmatic data models,
        enabling faster, cleaner decision-making.
      </p>
      <ul className="list-disc pl-5 text-gray-700 space-y-1">
        <li>Privacy by design — you remain in control of data</li>
        <li>Standard templates (XLSX/CSV) and automated validation</li>
        <li>Focus on margin protection and consistent discounting</li>
      </ul>
    </section>
  );
}
