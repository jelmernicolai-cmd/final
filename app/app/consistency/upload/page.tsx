'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UploadAndParse, { WF_STORE_KEY } from '@/components/waterfall/UploadAndParse';

export default function ConsistencyUploadPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = () => {
      try {
        const raw =
          sessionStorage.getItem(WF_STORE_KEY) ||
          localStorage.getItem(WF_STORE_KEY);
        setReady(Boolean(raw));
      } catch {
        setReady(false);
      }
    };
    check();
    const id = setInterval(check, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Upload Excel voor Consistency</h1>
            <p className="text-sm text-gray-600">
              Verwerking gebeurt volledig <strong>in je browser</strong>. Er wordt niets naar de server gestuurd.
            </p>
          </div>
          <Link href="/app" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
            Terug naar dashboard
          </Link>
        </div>
      </div>

      {/* Privacy */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        <strong>Privacy-modus:</strong> bestanden blijven lokaal. Alleen sessie-opslag in je browser.
      </div>

      {/* Uploader */}
      <div className="rounded-2xl border bg-white p-6">
        <div className="font-medium mb-2">Upload Excel</div>
        <UploadAndParse />
        <div className="mt-3 text-xs text-gray-500">
          Vereiste kolommen (eerste tabblad): <em>Product Group Name</em>, <em>SKU Name</em>, <em>Customer Name (Sold-to)</em>,
          <em> Fiscal year / period</em>, en alle <em>Sum of …</em>-velden (Gross Sales, Discounts, Rebates, Income, Net Sales).
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => router.push('/app/consistency')}
            disabled={!ready}
            className="rounded-lg px-4 py-2 text-white disabled:opacity-50 bg-sky-600 hover:bg-sky-700"
          >
            {ready ? 'Ga naar Consistency' : 'Upload eerst een Excel'}
          </button>
          <Link
            href="/app/consistency/customers"
            className="rounded-lg border px-4 py-2 hover:bg-gray-50 text-sm"
          >
            (of direct naar Customers)
          </Link>
        </div>
      </div>

      {/* Tip */}
      <div className="rounded-lg border bg-white p-4 text-sm text-gray-700">
        Tip: stem de template af met je financial business partner. Consequente periodisering en kolomnamen verbeteren de analyse.
      </div>
    </div>
  );
}
