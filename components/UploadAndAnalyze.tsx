'use client';

import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { parse as parseCsvSync } from 'csv-parse/browser/esm/sync';

type ToolKind = 'gtn' | 'consistency' | 'parallel';

type Props = {
  tool: ToolKind;
  title?: string;
  helperText?: string;
  defaultStrict?: boolean; // true = harde kolomvalidatie
};

const REQUIRED_COLUMNS: Record<ToolKind, string[]> = {
  gtn: ['Product', 'Klant', 'BrutoPrijs', 'Korting', 'Bonus', 'Fee', 'Aantal'],
  consistency: ['Klant', 'InkoopWaarde', 'KortingPerc'],
  parallel: ['Product', 'Klant', 'NettoPrijs', 'Volume'],
};

function normalizeHeader(h: string) {
  return h?.trim();
}

function objectKeysCaseSensitive(obj: Record<string, any>) {
  return Object.keys(obj || {}).map((k) => k.trim());
}

export default function UploadAndAnalyze({
  tool,
  title,
  helperText,
  defaultStrict = true,
}: Props) {
  const [strict, setStrict] = useState<boolean>(defaultStrict);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [preview, setPreview] = useState<Record<string, any>[]>([]);
  const [missingCols, setMissingCols] = useState<string[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const required = useMemo(() => REQUIRED_COLUMNS[tool], [tool]);

  async function handleFile(file: File) {
    setLoading(true);
    setMessages([]);
    setMissingCols([]);
    setRows([]);
    setPreview([]);

    try {
      const ext = file.name.toLowerCase().split('.').pop();
      let data: Record<string, any>[] = [];

      if (ext === 'xlsx' || ext === 'xls') {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
        data = json.map((r) => {
          const out: Record<string, any> = {};
          for (const k of Object.keys(r)) {
            out[normalizeHeader(k)] = r[k];
          }
          return out;
        });
      } else if (ext === 'csv') {
        const txt = await file.text();
        const parsed = parseCsvSync(txt, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }) as Record<string, any>[];
        data = parsed.map((r) => {
          const out: Record<string, any> = {};
          for (const k of Object.keys(r)) {
            out[normalizeHeader(k)] = r[k];
          }
          return out;
        });
      } else {
        setMessages((m) => [...m, 'Ongeldig bestandstype. Gebruik .xlsx of .csv']);
        setLoading(false);
        return;
      }

      if (!data.length) {
        setMessages((m) => [...m, 'Geen rijen gevonden in het bestand.']);
        setLoading(false);
        return;
      }

      // Kolomvalidatie
      const first = data[0];
      const headers = objectKeysCaseSensitive(first);
      const missing = required.filter((c) => !headers.includes(c));
      setMissingCols(missing);

      if (strict && missing.length) {
        setMessages((m) => [
          ...m,
          `Kolommen ontbreken: ${missing.join(', ')}. Upload een bestand met exact deze kolommen.`,
        ]);
        setLoading(false);
        return;
      }

      // OK — zet data en sample preview (eerste 10)
      setRows(data);
      setPreview(data.slice(0, 10));

      // Eenvoudige "analyse": een paar signaalmetingen zodat er meteen zicht is
      const metrics: string[] = [];
      try {
        if (tool === 'gtn') {
          const bruto = sumSafe(data, 'BrutoPrijs', 'Aantal');
          const korting = sumSafe(data, 'Korting', 'Aantal');
          const bonus = sumSafe(data, 'Bonus', 'Aantal');
          const fee = sumSafe(data, 'Fee', 'Aantal');
          metrics.push(`Bruto omzet (geschat): €${fmt(bruto)}`);
          metrics.push(`Korting (gewogen): €${fmt(korting)}`);
          metrics.push(`Bonus (gewogen): €${fmt(bonus)}`);
          metrics.push(`Fee (gewogen): €${fmt(fee)}`);
          metrics.push(`Indicatieve GTN: €${fmt(bruto - korting - bonus - fee)}`);
        } else if (tool === 'consistency') {
          const avgDisc = avgSafe(data, 'KortingPerc');
          metrics.push(`Gemiddelde korting: ${fmt(avgDisc)}%`);
          const minDisc = minSafe(data, 'KortingPerc');
          const maxDisc = maxSafe(data, 'KortingPerc');
          metrics.push(`Range korting: ${fmt(minDisc)}% – ${fmt(maxDisc)}%`);
        } else if (tool === 'parallel') {
          const avgNet = avgSafe(data, 'NettoPrijs');
          metrics.push(`Gem. netto prijs: €${fmt(avgNet)}`);
          const totalVol = sumSafe(data, 'Volume');
          metrics.push(`Totaal volume: ${fmt(totalVol)}`);
        }
      } catch {
        // Wees stil bij analysefouten—data kan non-numeriek zijn
      }

      if (missing.length && !strict) {
        metrics.unshift(
          `⚠️ Strict-mode uit: ontbrekende kolommen (${missing.join(
            ', '
          )}) genegeerd. Resultaten kunnen onvolledig zijn.`
        );
      }

      setMessages(metrics);
    } catch (e: any) {
      console.error(e);
      setMessages((m) => [...m, `Fout bij verwerken: ${e?.message || 'onbekend'}`]);
    } finally {
      setLoading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  return (
    <section className="max-w-5xl mx-auto p-4 space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            {title || labelFor(tool)} — Upload & Validatie
          </h1>
          <p className="text-sm text-gray-600">
            Vereiste kolommen: <code>{required.join(' | ')}</code>
            {helperText ? <> — {helperText}</> : null}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">Strict-mode</label>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={strict}
            onChange={(e) => setStrict(e.target.checked)}
            title="Wanneer aan: upload wordt geweigerd als kolommen ontbreken."
          />
        </div>
      </header>

      <div className="border rounded p-4 space-y-3">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onFileChange}
          className="block w-full text-sm"
        />
        <p className="text-xs text-gray-500">
          Gebruik de template:{" "}
          <a className="underline" href="/templates/gtn-template.xlsx">GTN</a>{" · "}
          <a className="underline" href="/templates/consistency-template.xlsx">Consistency</a>{" · "}
          <a className="underline" href="/templates/parallel-template.xlsx">Parallel</a>
        </p>
      </div>

      {loading ? (
        <div className="text-sm">Bestand verwerken…</div>
      ) : (
        <>
          {!!messages.length && (
            <ul className="text-sm space-y-1">
              {messages.map((m, i) => (
                <li key={i} className={m.startsWith('⚠️') ? 'text-amber-700' : 'text-gray-800'}>
                  {m}
                </li>
              ))}
            </ul>
          )}

          {!!missingCols.length && strict && (
            <div className="text-sm text-red-700">
              Ontbrekende kolommen (strict-mode): {missingCols.join(', ')}
            </div>
          )}

          {!!preview.length && (
            <div className="overflow-auto border rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(preview[0]).map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx} className="odd:bg-white even:bg-gray-50">
                      {Object.keys(preview[0]).map((h) => (
                        <td key={h} className="px-3 py-2">
                          {String(row[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-2 text-xs text-gray-600">
                Voorbeeld toont de eerste {preview.length} rijen. Totaal ingelezen rijen: {rows.length}.
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ---------- helpers ---------- */

function labelFor(tool: ToolKind) {
  if (tool === 'gtn') return 'Gross-to-Net';
  if (tool === 'consistency') return 'Consistency';
  return 'Parallel Pressure';
}

function num(val: any): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const v = val.replace(',', '.');
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function sumSafe(data: Record<string, any>[], key: string, weightKey?: string) {
  if (!weightKey) return data.reduce((acc, r) => acc + num(r[key]), 0);
  return data.reduce((acc, r) => acc + num(r[key]) * num(r[weightKey]), 0);
}

function avgSafe(data: Record<string, any>[], key: string) {
  if (!data.length) return 0;
  const s = sumSafe(data, key);
  return s / data.length;
}

function minSafe(data: Record<string, any>[], key: string) {
  let m = Number.POSITIVE_INFINITY;
  for (const r of data) m = Math.min(m, num(r[key]));
  return m === Number.POSITIVE_INFINITY ? 0 : m;
}

function maxSafe(data: Record<string, any>[], key: string) {
  let m = Number.NEGATIVE_INFINITY;
  for (const r of data) m = Math.max(m, num(r[key]));
  return m === Number.NEGATIVE_INFINITY ? 0 : m;
}
