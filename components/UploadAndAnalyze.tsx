'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/browser/esm/sync';

type Row = Record<string, number | string | null | undefined>;

const toNum = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = Number(String(v).replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
  return 0;
};

const fmt = (n: number) => new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }).format(Math.round(n));

function sumSafe(rows: Row[], colAmount: string, colQty?: string) {
  if (colQty && rows.some(r => r[colQty] !== undefined)) {
    return rows.reduce((acc, r) => acc + toNum(r[colAmount]) * toNum(r[colQty]), 0);
  }
  return rows.reduce((acc, r) => acc + toNum(r[colAmount]), 0);
}

export default function UploadAndAnalyze({
  tool,
  title = 'Upload & Analyse',
  helperText,
  expectedColumns = ['Klant', 'Product', 'Bruto', 'Korting', 'Bonus', 'Fee', 'Aantal'],
  defaultStrict = true,
}: {
  tool: 'gtn' | 'consistency' | 'parallel';
  title?: string;
  helperText?: string;
  expectedColumns?: string[];
  defaultStrict?: boolean;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [strict] = useState<boolean>(defaultStrict);

  async function handleFile(file: File) {
    setError(null);
    setRows([]);
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    if (file.name.toLowerCase().endsWith('.csv')) {
      const text = new TextDecoder().decode(new Uint8Array(buf));
      const records = parse(text, { columns: true, skip_empty_lines: true });
      setRows(records as Row[]);
      return;
    }
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Row>(ws, { defval: null });
    setRows(json);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    handleFile(f).catch(() => {
      setError('Bestand kon niet gelezen worden. Controleer het formaat (.xlsx of .csv).');
    });
  }

  const { kpis, metrics, headerSample } = useMemo(() => {
    const header = rows[0] ? Object.keys(rows[0]) : [];
    const bruto   = sumSafe(rows, 'Bruto', 'Aantal');
    const korting = sumSafe(rows, 'Korting', 'Aantal');
    const bonus   = sumSafe(rows, 'Bonus', 'Aantal');
    const fee     = sumSafe(rows, 'Fee', 'Aantal');
    const netto   = bruto - korting - bonus - fee;
    const metrics = [
      { label: 'Bruto', value: bruto },
      { label: 'Korting', value: -korting },
      { label: 'Bonus', value: -bonus },
      { label: 'Fee', value: -fee },
      { label: 'Netto', value: netto },
    ];
    const kpis = [
      { label: 'Bruto omzet (geschat)', value: `€${fmt(bruto)}` },
      { label: 'Kortingen (gewogen)', value: `€${fmt(korting)}` },
      { label: 'Bonussen (gewogen)', value: `€${fmt(bonus)}` },
      { label: 'Fees (gewogen)', value: `€${fmt(fee)}` },
      { label: 'Netto omzet', value: `€${fmt(netto)}` },
    ];
    return { kpis, metrics, headerSample: header };
  }, [rows]);

  const templateHref = tool === 'gtn' ? '/templates/gtn-template.xlsx'
                     : tool === 'consistency' ? '/templates/consistency-template.xlsx'
                     : '/templates/parallel-template.xlsx';

  const base = Math.max(Math.abs(metrics.reduce((m, s) => Math.max(m, Math.abs(s.value)), 0)), 1);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold">{title}</h1>
        {helperText && <p className="mt-2 text-gray-600">{helperText}</p>}
      </header>

      <div className="rounded border p-4 bg-white">
        <label className="block text-sm font-medium">Upload .xlsx of .csv</label>
        <input type="file" accept=".xlsx,.csv" onChange={onChange} className="mt-2 block" />
        {fileName && <p className="text-xs text-gray-500 mt-1">Bestand: {fileName}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-3 text-sm">
          <a href={templateHref} download className="underline text-blue-700 hover:text-blue-900">
            Download sjabloon
          </a>
          <span className="mx-2 text-gray-400">|</span>
          <a href="/api/health" className="underline">API health</a>
        </div>
      </div>

      {!!rows.length && (
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">KPI’s</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-3">
              {kpis.map((k) => (
                <div key={k.label} className="rounded border p-3">
                  <div className="text-xs text-gray-500">{k.label}</div>
                  <div className="text-lg font-semibold">{k.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Gross to Net</h3>
            <div className="space-y-2">
              {metrics.map((m) => <Bar key={m.label} label={m.label} value={m.value} base={base} highlight={m.label==='Netto'} />)}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-semibold mb-2">Gedetecteerde kolommen (eerste rij)</h3>
            <p className="text-sm text-gray-700 break-words">{headerSample.join(' · ')}</p>
          </div>
        </div>
      )}

      {strict && !rows.length && (
        <div className="text-sm text-gray-600">
          <h3 className="font-semibold mb-2">Verwachte kolommen</h3>
          <ul className="list-disc pl-5">
            {expectedColumns.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}

function Bar({ label, value, base, highlight }: { label: string; value: number; base: number; highlight?: boolean }) {
  const pct = Math.max(0, Math.min(100, (Math.abs(value) / (base || 1)) * 100));
  const positive = value >= 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-36 shrink-0">{label}</div>
      <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
        <div
          className={`h-4 ${highlight ? 'bg-emerald-600' : positive ? 'bg-blue-600' : 'bg-red-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`w-32 text-right ${highlight ? 'font-semibold' : ''}`}>{value >= 0 ? '€' : '€'}{new Intl.NumberFormat('nl-NL').format(Math.round(value))}</div>
    </div>
  );
}
