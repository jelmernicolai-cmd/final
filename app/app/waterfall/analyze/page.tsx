"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import WaterfallChart from "@/components/waterfall/WaterfallChart.client";
import { WF_STORE_KEY } from "@/components/waterfall/UploadAndParse.client";

type Row = {
  pg: string; sku: string; cust: string; period: string;
  gross: number;
  d_channel: number; d_customer: number; d_product: number; d_volume: number; d_value: number; d_other_sales: number; d_mandatory: number; d_local: number;
  invoiced: number;
  r_direct: number; r_prompt: number; r_indirect: number; r_mandatory: number; r_local: number;
  inc_royalty: number; inc_other: number;
  net: number;
};

function sum(rows: Row[], key: keyof Row) {
  return rows.reduce((a, r) => a + (Number(r[key]) || 0), 0);
}

function pct(n: number, d: number) {
  if (!d) return "—";
  return (100 * n / d).toFixed(1) + "%";
}

export default function Analyze() {
  const [data, setData] = useState<{ meta: any; rows: Row[] } | null>(null);
  const [pg, setPg] = useState("All");
  const [sku, setSku] = useState("All");
  const [cust, setCust] = useState("All");

  useEffect(() => {
    const raw = localStorage.getItem(WF_STORE_KEY);
    if (raw) setData(JSON.parse(raw));
  }, []);

  const rows = data?.rows || [];

  const pgs = useMemo(() => Array.from(new Set(rows.map(r => r.pg))).sort(), [rows]);
  const skus = useMemo(() => Array.from(new Set(rows.filter(r => pg === "All" || r.pg === pg).map(r => r.sku))).sort(), [rows, pg]);
  const custs = useMemo(() => Array.from(new Set(rows.map(r => r.cust))).sort(), [rows]);

  const filtered = rows.filter(r =>
    (pg === "All" || r.pg === pg) &&
    (sku === "All" || r.sku === sku) &&
    (cust === "All" || r.cust === cust)
  );

  const gross = sum(filtered, "gross");
  const d_channel = sum(filtered, "d_channel");
  const d_customer = sum(filtered, "d_customer");
  const d_product = sum(filtered, "d_product");
  const d_volume = sum(filtered, "d_volume");
  const d_value = sum(filtered, "d_value");
  const d_other_sales = sum(filtered, "d_other_sales");
  const d_mandatory = sum(filtered, "d_mandatory");
  const d_local = sum(filtered, "d_local");
  const invoiced = sum(filtered, "invoiced");
  const r_direct = sum(filtered, "r_direct");
  const r_prompt = sum(filtered, "r_prompt");
  const r_indirect = sum(filtered, "r_indirect");
  const r_mandatory = sum(filtered, "r_mandatory");
  const r_local = sum(filtered, "r_local");
  const inc_royalty = sum(filtered, "inc_royalty");
  const inc_other = sum(filtered, "inc_other");
  const net = sum(filtered, "net");

  const steps = [
    { label: "Gross Sales", amount: gross, color: "#0ea5e9" },       // blauw voor start
    { label: "Channel Disc.", amount: -d_channel },
    { label: "Customer Disc.", amount: -d_customer },
    { label: "Product Disc.", amount: -d_product },
    { label: "Volume Disc.", amount: -d_volume },
    { label: "Value Disc.", amount: -d_value },
    { label: "Other Sales Disc.", amount: -d_other_sales },
    { label: "Mandatory Disc.", amount: -d_mandatory },
    { label: "Local Disc.", amount: -d_local },
    { label: "Invoiced Sales", amount: 0, color: "#6366f1" },        // marker
    { label: "Direct Rebates", amount: -r_direct },
    { label: "Prompt Pay Reb.", amount: -r_prompt },
    { label: "Indirect Rebates", amount: -r_indirect },
    { label: "Mandatory Reb.", amount: -r_mandatory },
    { label: "Local Reb.", amount: -r_local },
    { label: "Royalty Income", amount: inc_royalty },
    { label: "Other Income", amount: inc_other },
    { label: "Net Sales", amount: 0, color: "#0ea5e9" },             // marker
  ];

  const totalDiscounts = d_channel + d_customer + d_product + d_volume + d_value + d_other_sales + d_mandatory + d_local;
  const totalRebates = r_direct + r_prompt + r_indirect + r_mandatory + r_local;
  const incomes = inc_royalty + inc_other;

  // Simpele optimalisatie-schatting: 10% reductie op Value Discounts
  const valueDiscUplift = 0.10 * d_value;
  const netIfOptimized = net + valueDiscUplift;
  const upliftPctGross = gross ? (100 * valueDiscUplift / gross).toF*
