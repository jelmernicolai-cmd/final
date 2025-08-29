import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function AppHome() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">PharmaGtN — Tools</h1>
      <p className="text-gray-600">Kies een analyse om te starten.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card href="/app/gtn" title="Gross-to-Net Waterfall" />
        <Card href="/app/consistency" title="Consistency Analyse" />
        <Card href="/app/parallel-pressure" title="Parallel Pressure" />
      </div>
    </section>
  );
}

function Card({ href, title }: { href: string; title: string }) {
  return (
    <Link href={href} className="block rounded-lg border p-4 hover:shadow-sm">
      <div className="font-medium">{title}</div>
      <div className="text-xs text-gray-500">Upload → Validatie → Inzicht</div>
    </Link>
  );
}
