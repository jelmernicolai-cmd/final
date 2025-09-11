// app/api/contracts/export/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import XLSX from "xlsx";
import type { AggRow, TotalRow } from "../../../../lib/contract-analysis";

type Payload = { raw: any[]; agg: AggRow[]; totals: TotalRow[]; latest: AggRow[] };

function aoaToSheet(aoa: any[][]) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const colWidths = aoa[0]?.map((h) => ({ wch: String(h).length + 2 })) ?? [];
  // @ts-expect-error SheetJS column width
  ws["!cols"] = colWidths;
  return ws;
}

export async function POST(req: Request) {
  const { raw, agg, totals, latest } = (await req.json()) as Payload;
  const wb = XLSX.utils.book_new();

  const sheetFrom = (rows: any[][], name: string) => XLSX.utils.book_append_sheet(wb, aoaToSheet(rows), name);
  const aoa = (arr: any[], headers: string[]) => [headers].concat(arr.map((r: any) => headers.map((h) => r[h] ?? "")));

  if (Array.isArray(raw) && raw.length) sheetFrom(aoa(raw, ["klant","sku","aantal_units","claimbedrag","omzet","periode"]), "raw_input");
  else sheetFrom([["no data"]], "raw_input");

  if (Array.isArray(agg) && agg.length) {
    const headers = Object.keys(agg[0]);
    const rows = [headers].concat(agg.map(r => headers.map(h => (r as any)[h])));
    sheetFrom(rows, "timeseries_contract");
  } else sheetFrom([["no data"]], "timeseries_contract");

  if (Array.isArray(totals) && totals.length) {
    const headers = Object.keys(totals[0]);
    const rows = [headers].concat(totals.map(r => headers.map(h => (r as any)[h])));
    sheetFrom(rows, "timeseries_total");
  } else sheetFrom([["no data"]], "timeseries_total");

  if (Array.isArray(latest) && latest.length) {
    const headers = Object.keys(latest[0]);
    const rows = [headers].concat(latest.map(r => headers.map(h => (r as any)[h])));
    sheetFrom(rows, "latest_snapshot");
  } else sheetFrom([["no data"]], "latest_snapshot");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const fileName = `contract_performance_${Date.now()}.xlsx`;
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
