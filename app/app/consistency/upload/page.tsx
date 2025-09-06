'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// Hergebruik je bestaande uploader:
import UploadAndParse from '@/components/waterfall/UploadAndParse';

const STORE_KEY = 'pharmagtn_wf_session'; // zelfde key als Waterfall

export default function ConsistencyUploadPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Activeer "Ga verder" zodra de dataset in sessionStorage staat
    const check = () => {
      try {
        const raw = sessionStorage.getItem(STORE_KEY) || localStorage.getItem(STORE_KEY);
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
              Deze upload wordt volledig <strong>in de browser</strong> verwerkt. Er wordt niets naar de server gestuurd.
            </p>
          </div>
          <Link href="/app" className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Terug naar dashboard</Link>
        </div>
      </div>

      {/* Privacy banner */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        <strong>Privacy-modus:</strong> alle verwerking gebeurt lokaal in jouw browser. Bestanden worden <em>niet</em> geüpload.
      </div>

      {/* Uploader */}
      <div className="rounded-2xl border bg-white p-6">
        <div className="font-medium mb-2">Upload Excel</div>
        <UploadAndParse />
        <div className="mt-3 text-xs text-gray-500">
          Vereiste kolommen (eerste tabblad): <em>Product Group Na
