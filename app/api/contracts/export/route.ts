// app/api/contracts/export/route.ts
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import type { AggRow, TotalRow } from "../../../../lib/contract-analysis";

export async function POST(req: Request) {
  const { raw, agg, totals, latest } = await req.json() as {
    raw: any[]; agg: AggRow[]; totals: TotalRow[]; latest: AggRow[];
  };

  const wb = new ExcelJS.Workbook();
  const rawWs = wb.addWorksheet("raw_input");
  rawWs.columns = [
    { header:"klant", key:"klant" },{ header:"sku", key:"sku" },
    { header:"aantal_units", key:"aantal_units" },{ header:"claimbedrag", key:"claimbedrag" },
    { header:"omzet", key:"omzet" },{ header:"periode", key:"periode" },
  ];
  rawWs.addRows(raw);

  const aggWs = wb.addWorksheet("timeseries_contract");
  if (agg?.length) { aggWs.columns = Object.keys(agg[0]).map(k=>({header:k,key:k})); aggWs.addRows(agg); }

  const totWs = wb.addWorksheet("timeseries_total");
  if (totals?.length) { totWs.columns = Object.keys(totals[0]).map(k=>({header:k,key:k})); totWs.addRows(totals); }

  const lastWs = wb.addWorksheet("latest_snapshot");
  if (latest?.length) { lastWs.columns = Object.keys(latest[0]).map(k=>({header:k,key:k})); lastWs.addRows(latest); }

  const buf = await wb.xlsx.writeBuffer();
  const fileName = `contract_performance_${Date.now()}.xlsx`;
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
