'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

type Props = {
  analysis: 'gtn' | 'consistency' | 'parallel';
  templateHref: string;   // alleen string props → veilig te serialiseren
  helpText?: string;
};

export default function UploadAndAnalyze({ analysis, templateHref, helpText }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const columns = useMemo(() => {
    if (analysis === 'gtn') return ['Product','Klant','BrutoPrijs','Korting','Bonus','Fee','Aantal'];
    if (analysis === 'consistency') return ['Klant','InkoopWaarde','KortingPerc'];
    return ['Product','Klant','NettoPrijs','Volume'];
  }, [analysis]);

  async function handleFile(file: File) {
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      let data: any[] = [];
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = new TextDecoder().decode(new Uint8Array(buf));
        const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
        const headers = headerLine.split(',').map(h => h.trim());
        data = lines.map(line => {
          const vals = line.split(',').map(v => v.trim());
          const obj: any = {};
          headers.forEach((h, i) => obj[h] = vals[i]);
          return obj;
        });
      } else {
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(ws, { defval: '' });
      }
      // check verplichte kolommen
      const missing = columns.filter(c => !(c in (data[0] || {})));
      if (missing.length) {
        throw new Error(`Ontbrekende kolommen: ${missing.join(', ')}`);
      }
      setRows(data.slice(0, 5000)); // eenvoudige limiet
    } catch (e: any) {
      setRows([]);
      setError(e?.message || 'Onbekende fout bij het inlezen.');
    }
  }

  return (
    <div className="rounded border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <a href={templateHref} className="rounded border px-3 py-2 hover:bg-gray-50" download>Download template</a>
        <label className="rounded border px-3 py-2 cursor-pointer hover:bg-gray-50">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) handleFile(f);
            }}
          />
          Upload CSV/XLSX
        </label>
        <span className="text-xs text-gray-500">Verplichte kolommen: {columns.join(', ')}</span>
      </div>
      {helpText && <p className="text-sm text-gray-600 mt-2">{helpText}</p>}
      {error && <p className="mt-3 text-red-700">{error}</p>}
      {!!rows.length && (
        <p className="mt-3 text-green-700">{rows.length} rijen ingelezen. De visualisaties hieronder gebruiken deze data of sampledata.</p>
      )}
    </div>
  );
}
