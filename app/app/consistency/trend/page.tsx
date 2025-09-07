'use client';

import { useMemo, useState } from 'react';
import { loadWaterfallRows, eur0 } from '@/lib/waterfall-storage';
import type { Row } from '@/lib/waterfall-types';
import ConsistencyNav from '@/components/consistency/ConsistencyNav';

type GroupBy = 'pg' | 'sku';

export default function TrendConsistency() {
  const rows: Row[] = loadWaterfallRows();
  const [by, setBy] = useState<GroupBy>('pg');

  if (!rows.length) {
    return (
      <div>
        <ConsistencyNav />
        <h1 className="text-xl font-semibold mt-4">Trend & Lekkages</h1>
        <p className="text-gray-600">Geen dataset gevonden. Upload eerst een Excel in de Waterfall-module.</p>
      </div>
    );
  }

  const discOf = (r: Row) =>
    (r.d_channel || 0) + (r.d_customer || 0) + (r.d_product || 0) +
    (r.d_volume || 0) + (r.d_other_sales || 0) + (r.d_mandatory || 0) +
    (r.d_local || 0);

  const periods = useMemo(() => {
    const map = new Map<string, { gross: number; disc: number }>();
    for (const r of rows) {
      const p = r.period || '—';
      const cur = map.get(p) || { gross: 0, disc: 0 };
      cur.gross += r.gross || 0;
      cur.disc += discOf(r);
      map.set(p, cur);
    }
    const arr = [...map.entries()].map(([period, v]) => ({
      period,
      gross: v.gross,
      discPct: v.gross ? (v.disc / v.gross) * 100 : 0,
    }));
    return arr.sort((a, b) => a.period.localeCompare(b.period));
  }, [rows]);

  const medianDiscPct = useMemo(() => {
    const list = periods.map((p) => p.discPct).sort((a, b) => a - b);
    if (!list.length) return 0;
    const mid = Math.floor(list.length / 2);
    return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
  }, [periods]);

  const periodTable = useMemo(() => {
    return periods
      .map((p) => {
        const deviation = p.discPct - medianDiscPct;
        const potential = deviation > 0 ? (deviation / 100) * p.gross : 0;
        return { ...p, deviation, potential };
      })
      .sort((a, b) => b.potential - a.potential);
  }, [periods, medianDiscPct]);

  const totalPeriodPotential = periodTable.reduce((s, p) => s + p.potential, 0);

  const byKey = useMemo(() => {
    const map = new Map<string, { gross: number; disc: number }>();
    for (const r of rows) {
      const key = (r[by] as string) || '—';
      const cur = map.get(key) || { gross: 0, disc: 0 };
      cur.gross += r.gross || 0;
      cur.disc += discOf(r);
      map.set(key, cur);
    }
    const overallGross = [...map.values()].reduce((s, v) => s + v.gross, 0) || 1;
    const overallDisc = [...map.values()].reduce((s, v) => s + v.disc, 0);
    const overallPct = (overallDisc / overallGross) * 100;

    const arr = [...map.entries()].map(([key, v]) => {
      const discPct = v.gross ? (v.disc / v.gross) * 100 : 0;
      const deviation = discPct - overallPct;
      const potential = deviation > 0 ? (deviation / 100) * v.gross : 0;
      return { key, gross: v.gross, discPct, deviation, potential, overallPct };
    });

    return { arr: arr.sort((a, b) => b.potential - a.potential).slice(0, 20), overallPct };
  }, [rows, by]);

  const totalKeyPotential = byKey.arr.reduce((s, it) => s + it.potential, 0);

  return (
    <div className="space-y-6">
      <ConsistencyNav />

      <div className="flex items-center gap-3 mt-4">
        <h1 className="text-xl font-semibold">Trend & Lekkages</h1>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-gray-600">Groeperen op</label>
          <select
            value={by}
            onChange={(e) => setBy(e.target.value as GroupBy)}
            className="text-sm border rounded px-2 py-1"
            aria-label="Groeperen op"
          >
            <option value="pg">Productgroep</option>
            <option value="sku">SKU</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Kpi title="Totaal potentieel (perioden)" value={eur0(totalPeriodPotential)} />
        <Kpi title="Totaal potentieel (lekkages)" value={eur0(totalKeyPotential)} />
        <Kpi title="Median korting% (periode)" value={medianDiscPct.toFixed(1) + '%'} />
      </div>

      <section className="rounded-2xl border bg-white p-4 overflow-x-auto">
        <h2 className="font-semibold mb-3">Perioden met hoogste besparingspotentieel (naar median)</h2>
        <table className="min-w-[800px] w-full text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left p-2">Periode</th>
              <th className="text-right p-2">Omzet</th>
              <th className="text-right p-2">Korting%</th>
              <th className="text-right p-2">Afwijking t.o.v. median</th>
              <th className="text-right p-2">Potentieel</th>
            </tr>
          </thead>
          <tbody>
            {periodTable.slice(0, 20).map((p) => (
              <tr key={p.period} className="border-t">
                <td className="p-2 font-medium">{p.period}</td>
                <td className="p-2 text-right">{eur0(p.gross)}</td>
                <td className="p-2 text-right">{p.discPct.toFixed(1)}%</td>
                <td className={`p-2 text-right ${p.deviation > 0 ? 'text-red-600' : p.deviation < 0 ? 'text-amber-700' : ''}`}>
                  {p.deviation.toFixed(1)}%
                </td>
                <td className="p-2 text-right">{p.potential > 0 ? eur0(p.potential) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border bg-white p-4 overflow-x-auto">
        <h2 className="font-semibold mb-3">Top {by === 'pg' ? 'productgroepen' : 'SKU’s'} met hoogste korting% (t.o.v. overall)</h2>
        <table className="min-w-[900px] w-full text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left p-2">{by === 'pg' ? 'Productgroep' : 'SKU'}</th>
              <th className="text-right p-2">Omzet</th>
              <th className="text-right p-2">Korting%</th>
              <th className="text-right p-2">Benchmark%</th>
              <th className="text-right p-2">Afwijking (pp)</th>
              <th className="text-right p-2">Potentieel</th>
            </tr>
          </thead>
          <tbody>
            {byKey.arr.map((it) => (
              <tr key={it.key} className="border-t">
                <td className="p-2 font-medium">{it.key}</td>
                <td className="p-2 text-right">{eur0(it.gross)}</td>
                <td className="p-2 text-right">{it.discPct.toFixed(1)}%</td>
                <td className="p-2 text-right">{it.overallPct.toFixed(1)}%</td>
                <td className={`p-2 text-right ${it.deviation > 0 ? 'text-red-600' : it.deviation < 0 ? 'text-amber-700' : ''}`}>
                  {it.deviation.toFixed(1)}%
                </td>
                <td className="p-2 text-right">{it.potential > 0 ? eur0(it.potential) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Tips />
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

function Tips() {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <h2 className="font-semibold">Actie-adviezen</h2>
      <ul className="list-disc pl-5 text-sm text-gray-700 mt-2 space-y-1">
        <li><b>Normalizeer korting per periode</b> richting de mediane korting% om pieken af te vlakken.</li>
        <li><b>Triggerregels</b>: alert als korting% &gt; median + 2pp in een periode met hoge omzet.</li>
        <li><b>Productgroep-review</b>: heronderhandel PG’s/SKU’s met structureel hoge korting% t.o.v. overall benchmark.</li>
        <li><b>Prijs-/staffel herijking</b>: verplaats korting naar <i>terugverdienbare</i> bonussen (mix, volumes, loyalty).</li>
      </ul>
    </div>
  );
}
