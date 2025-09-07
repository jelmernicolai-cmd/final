"use client";

import { useMemo } from "react";
import { loadWaterfallRows } from "@/lib/waterfall-storage";
import type { Row } from "@/lib/waterfall-types";
import { useBenchmarks } from "@/components/consistency/BenchmarksContext";

export default function ConsistencyTrendPage() {
  const rows: Row[] = loadWaterfallRows();
  const { method } = useBenchmarks();

  const discOf = (r: Row) =>
    (r.d_channel || 0) +
    (r.d_customer || 0) +
    (r.d_product || 0) +
    (r.d_volume || 0) +
    (r.d_other_sales || 0) +
    (r.d_mandatory || 0) +
    (r.d_local || 0);

  const { periods, seriesPct, benchPct } = useMemo(() => {
    const byPeriod = new Map<string, { gross: number; disc: number }>();
    const byCustomerPeriod = new Map<string, Map<string, { gross: number; disc: number }>>();

    for (const r of rows) {
      const g = r.gross || 0;
      const d = discOf(r);
      const p = r.period || "—";
      const cust = r.cust || "—";

      const pp = byPeriod.get(p) || { gross: 0, disc: 0 };
      pp.gross += g; pp.disc += d; byPeriod.set(p, pp);

      const cm = byCustomerPeriod.get(p) || new Map();
      const cc = cm.get(cust) || { gross: 0, disc: 0 };
      cc.gross += g; cc.disc += d; cm.set(cust, cc);
      byCustomerPeriod.set(p, cm);
    }

    const periods = [...byPeriod.keys()].sort();
    const overallPctPerPeriod = periods.map(p => {
      const v = byPeriod.get(p)!;
      return v.gross ? (v.disc / v.gross) * 100 : 0;
    });

    const medianPctPe
