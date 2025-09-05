'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateAndNormalize } from './validation';

export const WF_STORE_KEY = 'pharmagtn_waterfall_v1';

export default function UploadAndParse(): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<{ warnings: string[]; errors: string[]; corrected: number } | null>(null);
  const router = useRouter();

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErr(null);
    setReport(null);
    setBusy(true);

    try {
      // Lazy import of xlsx (no SSR impact)
      const mod: any = await import('xlsx');
      const XLSX = mod.default || mod;

      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheetName: string = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null });

      const res = validateAndNormalize(raw);
      setReport({ warnings: res.warnings, errors: res.errors, corrected: res.correctedCount });

      if (res.errors.length) {
        throw new Error('Template bevat fouten die upload blokkeren. Corrigeer en probeer opnieuw.');
      }

      const p
