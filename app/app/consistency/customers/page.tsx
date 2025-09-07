"use client";

import { useMemo, useState } from "react";
import { loadWaterfallRows, eur0 } from "@/lib/waterfall-storage";
import type { Row } from "@/lib/waterfall-types";
import { useBenchmarks } from "@/components/consistency/BenchmarksContext";

export default function ConsistencyCustomersPage() {
  const rows: Row[] = loadWaterfallRows();
  const { method, majorPP, minorPP } = useBenchmarks();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"potential" | "deviation" | "name">("potential");

  const discOf = (r: Row) =>
    (r.d_channel || 0) +
    (r.d_customer || 0) +
    (r.d_product || 0) +
    (r.d_volume || 0) +
    (r.d_other_sales || 0) +
    (r.d_mandatory || 0) +
    (r.d_local || 0);

  const { bench, list } = useMemo(() => {
    let grossTotal = 0, discTotal = 0;
    const byCustomer = new Map<string, { gross: number; disc: number }>();

    for (const r of rows) {
      const g = r.gross || 0;
      const d = discOf(r);
      grossTotal += g; discTotal += d;

      const c = byCustomer.get(r.cust) || { gross: 0, disc: 0 };
      c.gross += g; c.disc += d; byCustomer.set(r.cust, c);
    }

    const overallPct = grossTotal ? (discTotal / grossTotal) * 100 : 0;
    const custPcts = [...byCustomer.values()].map(v => (v.gross ? (v.disc / v.gross) * 100 : 0)).sort((a,b)=>a-b);
    const mid = Math.floor(custPcts.length / 2);
    const medianPct = custPcts.length ? (custPcts.length % 2 ? custPcts[mid] : (custPcts[mid-1]+custPcts[mid])/2) : 0;
    const bench = method === "median" ? medianPct : overallPct;

    const list = [...byCustomer.entries()].map(([cust, v]) => {
      const pct = v.gross ? (v.disc / v.gross) * 100 : 0;
      const deviation = pct - bench;
      const p
