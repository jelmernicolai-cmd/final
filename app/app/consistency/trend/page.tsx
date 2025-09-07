'use client';

import { useMemo, useState } from 'react';
import { loadWaterfallRows, eur0 } from '@/lib/waterfall-storage';
import type { Row } from '@/lib/waterfall-types';
import ConsistencyNav from '@/components/consistency/ConsistencyNav';
import Sparkline from '@/components/charts/Sparkline';
import MiniBar from '@/components/charts/MiniBar';
import Badge from '@/components/ui/Badge';
import InfoBlock from '@/components/ui/InfoBlock';

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
    (r.d_channel || 0) +
    (r.d_customer || 0) +
    (r.d_product || 0) +
    (r.d_volume || 0) +
    (r.d_other_sales || 0) +
    (r.d_mandatory || 0) +
    (r.d_local || 0);

  // Perioden & median benchmark
  const { periods, medianDiscPct } = useMemo(() => {
    const map = new Map<string, { gross: number; disc: number }>();
    for (const r of rows) {
      const p = r.period || '—';
      const cur = map.get(p) || { gross: 0, disc: 0 };
      cur.gross += r.gross || 0;
      cur.disc += discOf(r);
      map.set(p, cur);
    }
    const arr = [...map.entries()]
      .map(([period, v]) => ({
        period,
        gross: v.gross,
        discPct: v.gross ? (v.disc / v.gross) * 100 : 0,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const list = arr.map((x) => x.discPct).sort((a, b) => a - b);
    const mid = Math.floor(list.length / 2);
    const medianDiscPct = list.length
      ? list.length % 2
        ? list[mid]
        : (list[mid - 1] + list[mid]) / 2
      : 0;

    return { periods: arr, medianDiscPct };
  }, [rows]);

  // Afwijking tov median per periode (positief = teveel korting)
  const periodTable = useMemo(
    () =>
      periods
        .map((p) => {
          const deviation = p.discPct - medianDiscPct; // pp
          const potential = deviation > 0 ? (deviation / 100) * p.gross : 0;
          return { ...p, deviation, potential };
        })
        .sort((a, b) => b.potential - a.potential),
    [periods, medianDiscPct]
  );

  const lineSeries = periods.map((p) => p.discPct);
  const totalPeriodPotential = periodTable.reduce((s, p) => s + p.potential, 0);

  // Lekkages per PG/SKU tov overall benchmark
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

    const arr = [...map.entries()]
      .map(([key, v]) => {
        const discPct = v.gross ? (v.disc / v.gross) * 100 : 0;
        const deviation = discPct - overallPct; // pp
        const potential = deviation > 0 ? (deviation / 100) * v.gross : 0;
        return { key, gross: v.gross, discPct, deviation, potential, overallPct };
      })
      .sort((a, b) => b.potential - a.potential)
      .slice(0, 15);

    return { arr, overallPct };
  }, [rows, by]);

  const totalKeyPotential = byKey.arr.reduce((s, it) => s + it.potential, 0);

  // Voor de samenvatting/acties kiezen we de top 5 uit beide tabellen
  const topPeriods = periodTable.slice(0, 5);
  const topKeys = byKey.arr.slice(0, 5);

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
          >
            <option value="pg">Productgroep</option>
            <option value="sku">SKU</option>
          </select>
          <Badge>Benchmark: Median (periode) &amp; Overall (PG/SKU)</Badge>
        </div>
      </div>

      <InfoBlock summary="Uitleg in gewone taal">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <b>Periode-benchmark</b> = mediane korting% over alle perioden (robuust tegen
            uitschieters).
          </li>
          <li>
            <b>PG/SKU-benchmark</b> = overall gewogen korting% over alle productgroepen/SKU’s.
          </li>
          <li>
            <b>Potentieel</b> = positieve afwijking × omzet (als je normaliseert naar de benchmark).
          </li>
        </ul>
      </InfoBlock>

      {/* KPI + charts */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Korting% over tijd</div>
          <Sparkline data={lineSeries} />
          <div className="text-xs text-gray-600 mt-1">
            Median (benchmark): {medianDiscPct.toFixed(1)}%
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Potentieel (perioden)</div>
          <div className="text-lg font-semibold mt-1">
            {eur0(totalPeriodPotential)}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">
            Lekkages {by === 'pg' ? 'productgroepen' : 'SKU’s'} (afwijking)
          </div>
          <MiniBar
            values={byKey.arr.slice(0, 10).map((x) => x.deviation)}
            labels={byKey.arr.slice(0, 10).map((x) => x.key)}
            valueFmt={(v) => v.toFixed(1) + 'pp'}
            tooltip={(_, v, l) => `${l}: ${v.toFixed(1)} pp`}
          />
        </div>
      </div>

      {/* Desktop tables */}
      <section className="hidden md:block rounded-2xl border bg-white p-4 overflow-x-auto">
        <h2 className="font-semibold mb-3">
          Perioden met hoogste besparingspotentieel (naar median)
        </h2>
        <table className="min-w-[860px] w-full text-sm">
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
                <td
                  className={`p-2 text-right ${
                    p.deviation > 0 ? 'text-red-600' : p.deviation < 0 ? 'text-amber-700' : ''
                  }`}
                >
                  {p.deviation.toFixed(1)}%
                </td>
                <td className="p-2 text-right">
                  {p.potential > 0 ? eur0(p.potential) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="hidden md:block rounded-2xl border bg-white p-4 overflow-x-auto">
        <h2 className="font-semibold mb-3">
          Top {by === 'pg' ? 'productgroepen' : 'SKU’s'} met hoogste korting% (vs. overall)
        </h2>
        <table className="min-w-[940px] w-full text-sm">
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
                <td
                  className={`p-2 text-right ${
                    it.deviation > 0 ? 'text-red-600' : it.deviation < 0 ? 'text-amber-700' : ''
                  }`}
                >
                  {it.deviation.toFixed(1)}%
                </td>
                <td className="p-2 text-right">
                  {it.potential > 0 ? eur0(it.potential) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Mobile cards */}
      <section className="md:hidden space-y-3">
        <h2 className="font-semibold">Perioden – top potentieel</h2>
        {periodTable.slice(0, 10).map((p) => (
          <div key={p.period} className="rounded-2xl border bg-white p-4">
            <div className="flex items-center">
              <div className="font-medium">{p.period}</div>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full border">
                {p.deviation.toFixed(1)}pp
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-600">Omzet: {eur0(p.gross)}</div>
            <div className="mt-1 text-sm">
              Korting: <b>{p.discPct.toFixed(1)}%</b> • Median: {medianDiscPct.toFixed(1)}%
            </div>
            <div className="mt-1 text-sm">
              Potentieel: <b>{p.potential > 0 ? eur0(p.potential) : '—'}</b>
            </div>
            <MiniBar
              values={[p.deviation]}
              labels={['afw.']}
              width={260}
              height={60}
              valueFmt={(v) => v.toFixed(1) + 'pp'}
            />
          </div>
        ))}
      </section>

      <section className="md:hidden space-y-3">
        <h2 className="font-semibold">Top {by === 'pg' ? 'PG' : 'SKU'} lekkages</h2>
        {byKey.arr.slice(0, 10).map((it) => (
          <div key={it.key} className="rounded-2xl border bg-white p-4">
            <div className="flex items-center">
              <div className="font-medium">{it.key}</div>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full border">
                {it.deviation.toFixed(1)}pp
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-600">Omzet: {eur0(it.gross)}</div>
            <div className="mt-1 text-sm">
              Korting: <b>{it.discPct.toFixed(1)}%</b> • Benchmark: {it.overallPct.toFixed(1)}%
            </div>
            <div className="mt-1 text-sm">
              Potentieel: <b>{it.potential > 0 ? eur0(it.potential) : '—'}</b>
            </div>
            <MiniBar
              values={[it.deviation]}
              labels={['afw.']}
              width={260}
              height={60}
              valueFmt={(v) => v.toFixed(1) + 'pp'}
            />
          </div>
        ))}
      </section>

      {/* Samenvatting in gewone taal */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold mb-2">Samenvatting</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          {topPeriods.map((p) => (
            <li key={p.period}>
              Periode <b>{p.period}</b> ligt <b>{p.deviation.toFixed(1)}pp</b> boven median bij
              omzet {eur0(p.gross)} → potentieel {eur0(p.potential)} door normalisatie.
            </li>
          ))}
          {topKeys.map((k) => (
            <li key={k.key}>
              {by === 'pg' ? 'Productgroep' : 'SKU'} <b>{k.key}</b> heeft{" "}
              <b>{k.deviation.toFixed(1)}pp</b> hogere korting dan overall bij omzet{" "}
              {eur0(k.gross)} → potentieel {eur0(k.potential)} door heronderhandeling.
            </li>
          ))}
        </ul>
      </section>

      {/* Aanbevolen acties */}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold mb-3">Aanbevolen acties om marge te optimaliseren</h2>
        <ul className="space-y-3">
          {topPeriods.map((p) =>
            p.potential > 0 ? (
              <li key={'act-p-' + p.period} className="flex items-start gap-3">
                <span className="text-red-600 font-bold">↑</span>
                <div>
                  <p>
                    <b>Normaliseer korting in {p.period}</b> (boven median met{" "}
                    {p.deviation.toFixed(1)}pp).
                  </p>
                  <p className="text-sm text-gray-600">
                    Potentiële margeverbetering: <b>{eur0(p.potential)}</b>
                  </p>
                </div>
              </li>
            ) : null
          )}
          {topKeys.map((k) =>
            k.potential > 0 ? (
              <li key={'act-k-' + k.key} className="flex items-start gap-3">
                <span className="text-amber-600 font-bold">→</span>
                <div>
                  <p>
                    <b>Herijk {by === 'pg' ? 'productgroep' : 'SKU'} {k.key}</b> (afwijking{" "}
                    {k.deviation.toFixed(1)}pp boven overall). Zet directe korting om naar
                    prestatiebonussen / staffeloptimalisatie.
                  </p>
                  <p className="text-sm text-gray-600">
                    Potentieel: <b>{eur0(k.potential)}</b>
                  </p>
                </div>
              </li>
            ) : null
          )}
        </ul>
      </section>
    </div>
  );
}
