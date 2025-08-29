import Link from 'next/link';

export const metadata = {
  title: 'Gross-to-Net dashboard',
  description: 'Overzicht van tools en analyses binnen PharmaGtN.',
};

export default function AppHome() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Gross-to-Net dashboard</h1>
        <p className="text-gray-700 mt-2">
          Upload je data en start met analyseren. Gebruik de standaard templates voor een vliegende start.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        <ToolCard title="Tool 1: GTN-waterfall" href="/app/gtn" />
        <ToolCard title="Tool 2: Consistentie-analyse" href="/app/consistency" />
        <ToolCard title="Tool 3: Paralleldruk" href="/app/parallel-pressure" />
        <ToolCard title="Tool 4: (TBD)" href="/app/tbd1" />
        <ToolCard title="Tool 5: (TBD)" href="/app/tbd2" />
      </div>
    </section>
  );
}

function ToolCard({ title, href }: { title: string; href: string }) {
  return (
    <Link href={href} className="rounded border p-5 block hover:shadow-md transition">
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-gray-500">Upload → Valideer → Analyseer</div>
    </Link>
  );
}
