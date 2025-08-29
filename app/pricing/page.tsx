import Link from 'next/link';

export const metadata = {
  title: 'Prijzen',
  description: 'Eenvoudig licentiemodel: €2.500 per jaar per tenant.',
};

export default function Pricing() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Prijzen</h1>
      <p className="text-gray-700 mt-2 max-w-3xl">
        Eén transparant tarief per jaar. Inclusief updates, support en toegang tot alle analyses.
      </p>

      <div className="mt-8 grid md:grid-cols-3 gap-6">
        <div className="rounded border p-6">
          <h3 className="font-semibold text-xl">PharmaGtN Licentie</h3>
          <p className="text-gray-700 mt-2">€2.500 per jaar</p>
          <ul className="text-sm mt-4 space-y-1 list-disc pl-5">
            <li>GTN-waterfall</li>
            <li>Consistentie-analyse</li>
            <li>Paralleldruk heatmap</li>
            <li>Template upload + validatie</li>
          </ul>
          <Link href="/contact" className="inline-block mt-6 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Vraag demo aan
          </Link>
        </div>
      </div>
    </section>
  );
}
