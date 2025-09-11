// app/api/contracts/export/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import * as XLSX from "xlsx"; // ✅ juiste import
import type { AggRow, TotalRow } from "../../../../lib/contract-analysis";

type Payload = { raw: any[]; agg: AggRow[]; totals: TotalRow[]; latest: AggRow[] };

function aoaToSheet(aoa: any[][]) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const colWidths = (aoa[0]?.map((h) => ({ wch: String(h).length + 2 })) ?? []);
  (ws as any)["!cols"] = colWidths; // ✅ zonder ts-expect-error
  return ws;
}

export async function POST(req: Request) {
  const { raw, agg, totals, latest } = (await req.json()) as Payload;
  const wb = XLSX.utils.book_new();

  const append = (rows: any[][], name: string) => XLSX.utils.book_append_sheet(wb, aoaToSheet(rows), name);
  const asAOA = (arr: any[], headers: string[]) => [headers].concat(arr.map((r: any) => headers.map((h) => r[h] ?? "")));

  // 1) raw_input
  if (Array.isArray(raw) && raw.length) append(asAOA(raw, ["klant","sku","aantal_units","claimbedrag","omzet","periode"]), "raw_input");
  else append([["no data"]], "raw_input");

  // 2) timeseries_contract
  if (Array.isArray(agg) && agg.length) {
    const headers = Object.keys(agg[0]);
    append([headers, ...agg.map((r) => headers.map((h) => (r as any)[h]))], "timeseries_contract");
  } else append([["no data"]], "timeseries_contract");

  // 3) timeseries_total
  if (Array.isArray(totals) && totals.length) {
    const headers = Object.keys(totals[0]);
    append([headers, ...totals.map((r) => headers.map((h) => (r as any)[h]))], "timeseries_total");
  } else append([["no data"]], "timeseries_total");

  // 4) latest_snapshot
  if (Array.isArray(latest) && latest.length) {
    const headers = Object.keys(latest[0]);
    append([headers, ...latest.map((r) => headers.map((h) => (r as any)[h]))], "latest_snapshot");
  } else append([["no data"]], "latest_snapshot");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const fileName = `contract_performance_${Date.now()}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
