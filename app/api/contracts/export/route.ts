// app/api/contracts/export/route.ts
export const runtime = "nodejs"; // SheetJS draait in Node, niet in Edge

import { NextResponse } from "next/server";
import XLSX from "xlsx";
import type { AggRow, TotalRow } from "../../../../lib/contract-analysis";

type Payload = {
  raw: any[];
  agg: AggRow[];
  totals: TotalRow[];
  latest: AggRow[];
};

function aoaToSheet(aoa: any[][]) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // optioneel: auto width
  const colWidths = aoa[0]?.map((h) => ({ wch: String(h).length + 2 })) ?? [];
  // @ts-expect-error SheetJS type
  ws["!cols"] = colWidths;
  return ws;
}

export async function POST(req: Request) {
  const { raw, agg, totals, latest } = (await req.json()) as Payload;

  // Workbook aanmaken
  const wb = XLSX.utils.book_new();

  // 1) raw_input
  if (Array.isArray(raw) && raw.length) {
    const headers = ["klant","sku","aantal_units","claimbedrag","omzet","periode"];
    const rows = [headers].concat(
      raw.map((r: any) => headers.map((h) => r[h] ?? ""))
    );
    XLSX.utils.book_append_sheet(wb, aoaToSheet(rows), "raw_input");
  } else {
    XLSX.utils.book_append_sheet(wb, aoaToSheet([["no data"]]), "raw_input");
  }

  // 2) timeseries_contract
  if (Array.isArray(agg) && agg.length) {
    const headers = Object.keys(agg[0]);
    const rows = [headers].concat(agg.map((r) => headers.map((h) => (r as any)[h])));
    XLSX.utils.book_append_sheet(wb, aoaToSheet(rows), "timeseries_contract");
  } else {
    XLSX.utils.book_append_sheet(wb, aoaToSheet([["no data"]]), "timeseries_contract");
  }

  // 3) timeseries_total
  if (Array.isArray(totals) && totals.length) {
    const headers = Object.keys(totals[0]);
    const rows = [headers].concat(totals.map((r) => headers.map((h) => (r as any)[h])));
    XLSX.utils.book_append_sheet(wb, aoaToSheet(rows), "timeseries_total");
  } else {
    XLSX.utils.book_append_sheet(wb, aoaToSheet([["no data"]]), "timeseries_total");
  }

  // 4) latest_snapshot
  if (Array.isArray(latest) && latest.length) {
    const headers = Object.keys(latest[0]);
    const rows = [headers].concat(latest.map((r) => headers.map((h) => (r as any)[h])));
    XLSX.utils.book_append_sheet(wb, aoaToSheet(rows), "latest_snapshot");
  } else {
    XLSX.utils.book_append_sheet(wb, aoaToSheet([["no data"]]), "latest_snapshot");
  }

  // Buffer genereren (xlsx)
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const fileName = `contract_performance_${Date.now()}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
