// components/UploadAndAnalyze.tsx
'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

type Mode = 'gtn' | 'consistency';

type Props = {
  mode: Mode;
  title: string;
  helperText?: string;
  defaultStrict?: boolean;
};

type Row = Record<string, string | number | null | undefined>;

/* ----------------------------- utils ----------------------------- */

function parseNum(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  let s = String(v).trim();
  if (!s) return 0;
  // normalize EU/US: remove spaces, turn 1.234,56 -> 1234.56 and 1,234.56 -> 1234.56
  // 1) remove spaces
  s = s.replace(/\s+/g, '');
  // 2) if both , and . exist: assume thousand sep + decimal sep
  if (s.includes(',') && s.includes('.')) {
    // If the last separator is ',' -> decimal is ',', else decimal is '.'
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) {
      // decimal is comma -> remove dots, replace comma with dot
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // decimal is dot -> remove commas
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    // only comma -> assume decimal comma
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    // only dot or none: do nothing (dot as decimal)
  }
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function sumBy(rows: Row[], key: string) {
  return rows.reduce((acc, r) => acc + parseNum(r[key]), 0);
}

function fmtMoney(n: number) {
  return n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function pct(n: number) {
  return (n * 100).toFixed(1) + '%';
}

/* ------------------------- template links ------------------------ */

function TemplatesInline({ mode }: { mode: Mode }) {
  // zet je bestanden hier:
  // /public/templates/PharmaGtN_GtN_Waterfall_Template.xlsx
  // /public/templates/PharmaGtN_Consistency_Template.xlsx
  return (
    <div className="mt-3 text-sm">
      {mode === 'gtn' ? (
        <Link
          href="/templates/PharmaGtN_GtN_Waterfall_Template.xlsx"
          className="underline text-sky-700 hover:text-sky-900"
        >
          Download GtN Waterfall template (.xlsx)
        </Link>
      ) : (
        <Link
          href="/templates/PharmaGtN_Consistency_Template.xlsx"
          className="underline text-sky-700 hover:text-sky-900"
        >
          Download Consistency template (.xlsx)
        </Link>
      )}
    </div>
  );
}

/* ----------------------------- parser ---------------------------- */

async function readFileToRows(file: File): Promise<Row[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  // pick first sheet
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<Row>(sheet, { raw: false });
}

function parseCsvToRows(file: File): Promise<Row[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const text = String(reader.result || '');
      // crude CSV parse using XLSX for stability
      const wb = XLSX.read(text, { type: 'string' });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Row>(sheet, { raw: false });
      resolve(rows);
    };
    reader.readAsText(file);
  });
}

/* ----------------------------- charts ---------------------------- */

// Simple Waterfall bars (positive & negative values)
function WaterfallChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={(v) => v.toLocaleString('nl-NL')} />
          <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
          <Bar dataKey="value" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BarTopChart({
  data,
  xKey,
  yKey,
  label,
}: {
  data: any[];
  xKey: string;
  yKey: string;
  label?: string;
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey={xKey} />
          <YAxis tickFormatter={(v) => v.toLocaleString('nl-NL')} />
          <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
          <Bar dataKey={yKey} name={label} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ScatterPriceChart({
  data,
  xKey,
  yKey,
  zKey,
}: {
  data: any[];
  xKey: string;
  yKey: string;
  zKey?: string;
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid />
          <XAxis dataKey={xKey} name={xKey} />
          <YAxis dataKey={yKey} name={yKey} tickFormatter={(v) => v.toLocaleString('nl-NL')} />
          {zKey ? <ZAxis dataKey={zKey} range={[60, 400]} /> : null}
          <Tooltip />
          <Scatter data={data} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -------------------------- main component ----------------------- */

export default function UploadAndAnalyze({
  mode,
  title,
  helperText,
  defaultStrict = true,
}: Props) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strict, setStrict] = useState<boolean>(defaultStrict);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setRows(null);
    const f = e.target.files?.[0];
    if (!f) return;

    try {
      const ext = f.name.toLowerCase().split('.').pop() || '';
      let parsed: Row[] = [];
      if (ext === 'csv') {
        parsed = await parseCsvToRows(f);
      } else {
        parsed = await readFileToRows(f);
      }
      if (strict && parsed.length === 0) {
        throw new Error('Geen rijen gevonden. Controleer je template en inhoud.');
      }
      setRows(parsed);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Upload/parsen mislukt.');
    } finally {
      // reset value to allow re-upload same file
      e.target.value = '';
    }
  }

  /* ---------------------- GTN computations ---------------------- */

  const gtn = useMemo(() => {
    if (mode !== 'gtn' || !rows || rows.length === 0) return null;

    // kolommen volgens jouw lijst (tolerant op naming)
    const c = (name: string) =>
      name;

    const grossSales = sumBy(rows, c('Sum of Gross Sales'));
    const chDisc = sumBy(rows, c('Sum of Channel Discounts'));
    const custDisc = sumBy(rows, c('Sum of Customer Discounts'));
    const prodDisc = sumBy(rows, c('Sum of Product Discounts'));
    const volDisc = sumBy(rows, c('Sum of Volume Discounts'));
    const valDisc = sumBy(rows, c('Sum of Value Discounts'));
    const otherSalesDisc = sumBy(rows, c('Sum of Other Sales Discounts'));
    const mandDisc = sumBy(rows, c('Sum of Mandatory Discounts'));
    const localDisc = sumBy(rows, c('Sum of Discount Local'));
    const invoicedSales = sumBy(rows, c('Sum of Invoiced Sales'));
    const directReb = sumBy(rows, c('Sum of Direct Rebates'));
    const promptReb = sumBy(rows, c('Sum of Prompt Payment Rebates'));
    const indirectReb = sumBy(rows, c('Sum of Indirect Rebates'));
    const mandReb = sumBy(rows, c('Sum of Mandatory Rebates'));
    const localReb = sumBy(rows, c('Sum of Rebate Local'));
    const royalty = sumBy(rows, c('Sum of Royalty Income'));
    const otherIncome = sumBy(rows, c('Sum of Other Income'));
    const netSales = sumBy(rows, c('Sum of Net Sales'));

    const totalDiscounts = chDisc + custDisc + prodDisc + volDisc + valDisc + otherSalesDisc + mandDisc + localDisc;
    const totalRebates = directReb + promptReb + indirectReb + mandReb + localReb;
    const totalGtnSpend = Math.abs(totalDiscounts) + Math.abs(totalRebates);

    // Waterfall data (very simple)
    const wf = [
      { name: 'Gross', value: grossSales },
      { name: 'Discounts', value: totalDiscounts }, // negative
      { name: 'Invoiced', value: invoicedSales },   // positive
      { name: 'Rebates', value: totalRebates },     // negative
      { name: 'Net', value: netSales },
    ];

    // Top klanten & SKU's (optioneel; hier dummy via aggregatie)
    // We groeperen per Customer Name (Sold-to)
    const byKey = (key: string) => {
      const map = new Map<string, { key: string; gtn: number }>();
      for (const r of rows) {
        const k = String(r[key] ?? '—');
        const d = Math.abs(
          parseNum(r['Sum of Channel Discounts']) +
          parseNum(r['Sum of Customer Discounts']) +
          parseNum(r['Sum of Product Discounts']) +
          parseNum(r['Sum of Volume Discounts']) +
          parseNum(r['Sum of Value Discounts']) +
          parseNum(r['Sum of Other Sales Discounts']) +
          parseNum(r['Sum of Mandatory Discounts']) +
          parseNum(r['Sum of Discount Local']) +
          parseNum(r['Sum of Direct Rebates']) +
          parseNum(r['Sum of Prompt Payment Rebates']) +
          parseNum(r['Sum of Indirect Rebates']) +
          parseNum(r['Sum of Mandatory Rebates']) +
          parseNum(r['Sum of Rebate Local'])
        );
        const cur = map.get(k) || { key: k, gtn: 0 };
        cur.gtn += d;
        map.set(k, cur);
      }
      return Array.from(map.values()).sort((a, b) => b.gtn - a.gtn).slice(0, 5);
    };
    const topCustomers = byKey('Customer Name (Sold-to)');
    const topSkus = byKey('SKU Name');

    // Suggesties (heel basic heuristics)
    const suggestions: string[] = [];
    if (grossSales > 0) {
      const gtnPct = totalGtnSpend / grossSales;
      if (gtnPct > 0.10) suggestions.push('GtN-ratio > 10% — herzie de grootste kortingscomponent of heronderhandel topklanten.');
      if (Math.abs(valDisc) > Math.abs(chDisc) * 2) suggestions.push('Value Discounts domineren — standaardiseer staffels en borg goedkeuring.');
      if (Math.abs(indirectReb) > Math.abs(directReb)) suggestions.push('Indirecte rebates hoger dan directe — check tussenkanalen & leakages.');
      if (topCustomers[0]?.gtn && topCustomers[0].gtn > totalGtnSpend * 0.25) suggestions.push('Topklant heeft >25% van totale GtN — voer gericht scenarioanalyse op nettoprijs en rebate-mix.');
    }

    return {
      grossSales,
      totalDiscounts,
      invoicedSales,
      totalRebates,
      netSales,
      totalGtnSpend,
      wf,
      topCustomers,
      topSkus,
      suggestions,
    };
  }, [mode, rows, strict]);

  /* ------------------- consistency computations ------------------ */

  const cons = useMemo(() => {
    if (mode !== 'consistency' || !rows || rows.length === 0) return null;

    const gross = sumBy(rows, 'Sum of Gross Sales');
    // Prefer a dedicated "Sum of Total GtN Spend" if present, else derive (Gross - Net)
    const totalGtn = rows.some((r) => r['Sum of Total GtN Spend'] != null)
      ? sumBy(rows, 'Sum of Total GtN Spend')
      : Math.max(0, gross - sumBy(rows, 'Sum of Net Sales'));

    // Top klanten op Total incentive
    const map = new Map<string, { customer: string; gross: number; incentive: number }>();
    for (const r of rows) {
      const cust = String(r['Customer Name (Sold-to)'] ?? '—');
      const g = parseNum(r['Sum of Gross Sales']);
      const inc = r['Sum of Total GtN Spend'] != null
        ? parseNum(r['Sum of Total GtN Spend'])
        : Math.max(0, parseNum(r['Sum of Gross Sales']) - parseNum(r['Sum of Net Sales']));
      const cur = map.get(cust) || { customer: cust, gross: 0, incentive: 0 };
      cur.gross += g;
      cur.incentive += inc;
      map.set(cust, cur);
    }
    const top = Array.from(map.values()).sort((a, b) => b.incentive - a.incentive).slice(0, 15);

    // Dummy scatter: prijs vs incentive% per klant (geaggregeerd)
    const scatter = top.map((t) => {
      const avgPrice = t.gross > 0 ? (t.gross - t.incentive) / t.gross : 0; // net/gross approx
      return {
        customer: t.customer,
        incentivePct: t.gross > 0 ? t.incentive / t.gross : 0,
        avgPrice,
      };
    });

    const suggestions: string[] = [];
    if (totalGtn > 0) {
      const incPct = gross > 0 ? totalGtn / gross : 0;
      if (incPct > 0.09) suggestions.push('Totale incentives >9% van bruto omzet — prioriteer klanten met hoogste absolute incentive.');
      if (scatter.some((p) => p.incentivePct > 0.12)) suggestions.push('Outliers met >12% incentive — herijk korting versus inkoopwaarde en marge.');
      if (top.length >= 3 && top[0].incentive > top[2].incentive * 1.5) suggestions.push('Sterk geconcentreerde incentives — differentieer staffels of centraliseer goedkeuring.');
    }

    return { gross, totalGtn, top, scatter, suggestions };
  }, [mode, rows, strict]);

  /* ----------------------------- UI ------------------------------ */

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
      {/* Heading */}
      <header className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
        {helperText ? <p className="text-sm text-gray-600 mt-1">{helperText}</p> : null}

        <div className="flex flex-wrap items-center gap-4 mt-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              checked={strict}
              onChange={(e) => setStrict(e.target.checked)}
            />
            Strict mode (validatie)
          </label>

          <TemplatesInline mode={mode} />
        </div>
      </header>

      {/* Uploader */}
      <div className="rounded-xl border p-4 md:p-6 bg-white">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 justify-between">
          <div>
            <div className="font-medium">Upload data</div>
            <p className="text-xs text-gray-500">
              Ondersteund: .xlsx, .xls, .csv — gebruik de template voor kolomnamen.
            </p>
          </div>
          <label className="inline-flex items-center justify-center px-4 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50">
            Kies bestand
            <input
              type="file"
              onChange={onFile}
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              hidden
            />
          </label>
        </div>

        {error ? (
          <div className="mt-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!rows ? (
          <div className="mt-6 text-sm text-gray-500">
            Nog geen bestand geüpload. Je ziet hier resultaten zodra er data is.
          </div>
        ) : (
          <div className="mt-6 text-sm text-gray-600">{rows.length} rijen geladen.</div>
        )}
      </div>

      {/* Results */}
      {mode === 'gtn' && gtn && (
        <section className="mt-8 space-y-8">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi title="Gross Sales" value={fmtMoney(gtn.grossSales)} />
            <Kpi title="Total Discounts" value={fmtMoney(gtn.totalDiscounts)} />
            <Kpi title="Total Rebates" value={fmtMoney(gtn.totalRebates)} />
            <Kpi title="Net Sales" value={fmtMoney(gtn.netSales)} />
          </div>

          {/* Waterfall */}
          <div className="rounded-xl border bg-white p-4 md:p-6">
            <h3 className="font-semibold mb-3">Gross-to-Net Waterfall</h3>
            <WaterfallChart data={gtn.wf} />
          </div>

          {/* Top customers / SKUs */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border bg-white p-4 md:p-6">
              <h3 className="font-semibold mb-3">Top klanten op GtN-spend</h3>
              <BarTopChart
                data={gtn.topCustomers}
                xKey="key"
                yKey="gtn"
                label="GtN spend"
              />
            </div>
            <div className="rounded-xl border bg-white p-4 md:p-6">
              <h3 className="font-semibold mb-3">Top SKU’s op GtN-spend</h3>
              <BarTopChart
                data={gtn.topSkus}
                xKey="key"
                yKey="gtn"
                label="GtN spend"
              />
            </div>
          </div>

          {/* Suggestions */}
          <SuggestionsBox suggestions={gtn.suggestions} />
        </section>
      )}

      {mode === 'consistency' && cons && (
        <section className="mt-8 space-y-8">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Kpi title="Total Gross Sales" value={fmtMoney(cons.gross)} />
            <Kpi title="Total Incentives" value={fmtMoney(cons.totalGtn)} />
            <Kpi
              title="Incentives %"
              value={pct(cons.gross > 0 ? cons.totalGtn / cons.gross : 0)}
            />
          </div>

          {/* Table (top 15) */}
          <div className="rounded-xl border bg-white p-4 md:p-6 overflow-auto">
            <h3 className="font-semibold mb-3">Consistency overview – top 15 klanten</h3>
            <table className="w-full text-sm border-separate border-spacing-y-1 min-w-[560px]">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-2 px-3">Customer</th>
                  <th className="py-2 px-3">Gross Sales</th>
                  <th className="py-2 px-3">Total incentive</th>
                  <th className="py-2 px-3">Incentive %</th>
                </tr>
              </thead>
              <tbody>
                {cons.top.map((r) => (
                  <tr key={r.customer} className="bg-gray-50">
                    <td className="py-2 px-3">{r.customer}</td>
                    <td className="py-2 px-3">{fmtMoney(r.gross)}</td>
                    <td className="py-2 px-3">{fmtMoney(r.incentive)}</td>
                    <td className="py-2 px-3">
                      {pct(r.gross > 0 ? r.incentive / r.gross : 0)}
                    </td>
                </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Scatter: avg price vs incentive% (indicatief) */}
          <div className="rounded-xl border bg-white p-4 md:p-6">
            <h3 className="font-semibold mb-3">Prijs vs incentive% (indicatief)</h3>
            <ScatterPriceChart
              data={cons.scatter}
              xKey="avgPrice"
              yKey="incentivePct"
            />
          </div>

          {/* Suggestions */}
          <SuggestionsBox suggestions={cons.suggestions} />
        </section>
      )}
    </div>
  );
}

/* ----------------------------- bits ------------------------------ */

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function SuggestionsBox({ suggestions }: { suggestions: string[] }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div className="rounded-xl border bg-white p-4 md:p-6">
      <h3 className="font-semibold mb-2">Optimalisatie-suggesties</h3>
      <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700">
        {suggestions.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
