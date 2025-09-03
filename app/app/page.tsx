// app/app/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Portal dashboard | PharmaGtN",
};

export default function AppHome() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Dashboard</h1>
      <p className="text-gray-600 text-sm">
        Kies een analyse of upload nieuwe data om direct inzichten te krijgen.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/app/waterfall" className="rounded border p-4 hover:bg-gray-50">
          <div className="font-semibold">GtN Waterfall</div>
          <div className="text-sm text-gray-600">Waterfall van bruto naar netto per kanaal en klanttype.</div>
        </Link>
        <Link href="/app/consistency" className="rounded border p-4 hover:bg-gray-50">
          <div className="font-semibold">Consistency</div>
          <div className="text-sm text-gray-600">Top klanten op incentives en procentuele incentive-last.</div>
        </Link>
      </div>
    </div>
  );
}
