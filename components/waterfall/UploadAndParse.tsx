'use client';

import React, {useState} from 'react';
import {useRouter} from 'next/navigation';
import {validateAndNormalize} from './validation';

export const WF_STORE_KEY = 'pharmagtn_waterfall_v1';

type Report = { warnings: string[]; errors: string[]; corrected: number };

export default function UploadAndParse(): JSX.Element {
  const [busy,setBusy] = useState(false);
  const [err,setErr] = useState<string|null>(null);
  const [report,setReport] = useState<Report|null>(null);
  const router = useRouter();

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErr(null);
    setReport(null);
    setBusy(true);

    try {
      const mod: any = await import('xlsx');
      const XLSX = mod.default || mod;

      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheetName: string = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];

      // ✅ Geen generics op untyped functie; cast achteraf
      const raw = XLSX.utils.sheet_to_json(ws, { defval: null }) as unknown as Array<Record<string, any>>;

      const res = validateAndNormalize(raw);
      setReport({ warnings: res.warnings, errors: res.errors, corrected: res.correctedCount });

      if (res.errors.length) {
        throw new Error('Template bevat fouten die upload blokkeren. Corrigeer en probeer opnieuw.');
      }

      localStorage.setItem(
        WF_STORE_KEY,
        JSON.stringify({
          meta: {
            uploadedAt: Date.now(),
            sheet: sheetName,
            rows: res.rows.length,
            validation: { warnings: res.warnings, corrected: res.correctedCount },
          },
          rows: res.rows,
        })
      );

      router.push('/app/waterfall/analyze');
    } catch (ex: any) {
      console.error(ex);
      setErr(ex?.message || 'Kon bestand niet verwerken.');
    } finally {
      setBusy(false);
      try { e.currentTarget.value = ''; } catch {}
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={onFileChange}
        disabled={busy}
        className="block w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border file:bg-gray-50 hover:file:bg-gray-100"
      />

      {busy ? <div className="text-xs text-gray-500">Bezig met verwerken...</div> : null}
      {err ? <div className="text-sm text-red-600">{String(err)}</div> : null}

      {report ? (
        <div className="rounded-lg border bg-white">
          <div className="px-3 py-2 border-b text-sm font-medium">Validatie-rapport</div>
          <div className="p-3 text-sm">
            {report.corrected ? (
              <div classN
