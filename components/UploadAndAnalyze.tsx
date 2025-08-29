'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/browser/esm/sync';

// ---------- Kleine utils ----------
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

const fmt = (n: number) =>
  n.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const sumSafe = (rows: Row[], colAmount: string, colQty?: string) => {
  if (!rows?.length) return 0;
  if (colQty) {
    // gewogen som: bedrag * aantal
    return rows.reduce((acc, r) => acc + toNum(r[colAmount]) * toNum(r[colQty]), 0);
  }
  return rows.reduce((acc, r) => acc + toNum(r[colAmount]), 0);
};

// ---------- Component ----------
export default function UploadAndAnalyze({
  title = 'Upload & Analyse',
  expectedColumns = ['Klant', 'Product', 'Bruto', 'Korting', 'Bonus', 'Fee', 'Aantal'],
}: {
  title?: string;
  expectedColumns?: string[];
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Parsing van XLSX/CSV
  async function handleFile(file: File) {
    setError(null);
    setRows([]);
    setFileName(file.name);

    const buf = await file.arrayBuffer();

    if (file.name.toLowerCase().endsWith('.csv')) {
      // CSV
      const text = new TextDecoder().decode(new Uint8Array(buf));
      const records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        delimiter: /[,;|\t]/, // flexibel
        trim: true,
      }) as Row[];
      setRows(records);
      return;
    }

    // Excel
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Row>(ws, { defval: null });
    setRows(json);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    handleFile(f).catch((err) => {
      console.error(err);
      setError('Bestand kon niet gelezen worden. Controleer het formaat (.xlsx of .csv).');
    });
  }

  // KPI’s en “Gross to Net” quick metrics
  const { metrics, kpis } = useMemo(() => {
    if (!rows.length) return { metrics: [] as string[], kpis: null as null | {
      bruto: number; korting: number; bonus: number; fee: number; netto: number;
    } };

    const bruto   = sumSafe(rows, 'Bruto', 'Aantal');
    const korting = sumSafe(rows, 'Korting', 'Aantal');
    const bonus   = sumSafe(rows, 'Bonus', 'Aantal');
    const fee     = sumSafe(rows, 'Fee', 'Aantal');
    const netto   = bruto - korting - bonus - fee;

    const m: string[] = [];
    m.push(`Bruto omzet (geschat): €${fmt(bruto)}`);
    m.push(`Korting (gewogen): €${fmt(korting)}`);
    m.push(`Bonus (gewogen): €${fmt(bonus)}`);
    m.push(`Fee (gewogen): €${fmt(fee)}`);
    m.push(`Netto omzet (geschat): €${fmt(netto)}`);

    return { metrics: m, kpis: { bruto, korting, bonus, fee, netto } };
  }, [rows]);

  // Validatie: tonen welke kolommen verwacht worden
  const headerSample = useMemo(() => {
    if (!rows.length) return [] as string[];
    const keys = Object.keys(rows[0] || {});
    return keys;
  }, [rows]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h2 className="text-2xl md:text-3xl font-bold mb-4">{title}</h2>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="border rounded p-4">
          <p className="text-sm text-gray-600 mb-3">
            Upload een <strong>.xlsx</strong> of <strong>.csv</strong> volgens het standaard template.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onChange}
            className="block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white hover:file:bg-blue-700"
          />
          {fileName && <p className="mt-2 text-xs text-gray-500">Bestand: {fileName}</p>}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-4">
            <h3 className="font-semibold mb-2">Verwachte kolommen</h3>
            <ul className="text-sm text-gray-700 list-disc pl-5">
              {expectedColumns.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>

          {!!headerSample.length && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Gedetecteerde kolommen (eerste rij)</h3>
              <p className="text-sm text-gray-700 break-words">
                {headerSample.join(' · ')}
              </p>
            </div>
          )}

          <div className="mt-4">
            <a
              href="/templates/pharmgtn-template-nl.xlsx"
              download
              className="text-sm underline text-blue-700 hover:text-blue-900"
            >
              Download NL template
            </a>
            <span className="mx-2 text-gray-400">|</span>
            <a
              href="/templates/pharmgtn-template-en.xlsx"
              download
              className="text-sm underline text-blue-700 hover:text-blue-900"
            >
              Download EN template
            </a>
          </div>
        </div>

        <div className="border rounded p-4">
          <h3 className="font-semibold mb-3">Quick metrics</h3>
          {metrics.length === 0 ? (
            <p className="text-sm text-gray-600">Upload eerst een bestand om resultaten te zien.</p>
          ) : (
            <ul className="text-sm text-gray-800 space-y-1">
              {metrics.map((m, i) => (
                <li key={i}>• {m}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* (optioneel) eenvoudige pseudo-waterfall weergave als tekstbalken */}
      {kpis && (
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-3">Gross → Net (indicatief)</h3>
          <div className="space-y-2 text-sm">
            <Bar label="Bruto" value={kpis.bruto} base={kpis.bruto} />
            <Bar label="– Korting" value={-kpis.korting} base={kpis.bruto} />
            <Bar label="– Bonus" value={-kpis.bonus} base={kpis.bruto} />
            <Bar label="– Fee" value={-kpis.fee} base={kpis.bruto} />
            <Bar label="= Netto" value={kpis.netto} base={kpis.bruto} highlight />
          </div>
        </div>
      )}
    </section>
  );
}

// Eenvoudige horizontale “bar” renderer (zonder externe lib)
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
      <div className={`w-32 text-right ${highlight ? 'font-semibold' : ''}`}>€{fmt(value)}</div>
    </div>
  );
}
