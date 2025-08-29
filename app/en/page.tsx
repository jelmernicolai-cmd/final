import Link from 'next/link';

export const metadata = {
  title: 'Data-driven GTN optimization',
  description: 'Optimize discounts and contracts across hospitals, pharmacies and wholesalers. Target ROI: €100,000+.',
};

export default function HomeEn() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl font-semibold leading-tight">
            Maximize <span className="text-blue-600">Gross-to-Net</span> with transparent discounts
          </h1>
          <p className="mt-4 text-lg text-gray-700">
            PharmaGtN streamlines commercial policy for pharma manufacturers: consistent discounting,
            fair pricing and reduced margin leakage—in one platform.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/en/pricing" className="rounded bg-blue-600 px-5 py-3 text-white hover:bg-blue-700">See pricing</Link>
            <Link href="/en/features" className="rounded border px-5 py-3 hover:bg-gray-50">Explore features</Link>
          </div>
          <p className="mt-3 text-sm text-gray-500">Target ROI: €100,000+ per year via discount and GTN optimization.</p>
        </div>
        <div className="relative">
          <img src="/images/hero-graph.svg" alt="GTN dashboard visual" className="w-full h-auto" />
        </div>
      </div>
    </section>
  );
}
