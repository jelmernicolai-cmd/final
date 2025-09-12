// app/api/pricing/gip/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/pricing/db";
import * as XLSX from "xlsx";

export async function POST(req: Request) {
  const body = (await req.json()) as { customerIds: string[]; label?: string };
  if (!Array.isArray(body.customerIds) || body.customerIds.length === 0) {
    return NextResponse.json({ error: "customerIds[] verplicht" }, { status: 400 });
  }

  const products = await db.listProducts();
  if (!products.length) return NextResponse.json({ error: "Geen producten in AIP master" }, { status: 400 });

  const book = XLSX.utils.book_new();

  for (const cid of body.customerIds.slice(0, 10)) {
    const discount = await db.getLatestDiscount(cid);
    const disc = discount ? Number(discount.discount_pct) / 100 : 0;

    const rows = products.map((p) => ({
      SKU: p.sku,
      Product: p.name,
      Pack: p.pack_size || "",
      Registratienr: p.registration_no || "",
      ZI: p.zi_number || "",
      AIP_EUR: Number(p.aip_eur),
      Korting_pct: disc * 100,
      GIP_EUR: Math.max(0, Math.round((Number(p.aip_eur) * (1 - disc)) * 100) / 100),
      Min_bestel: p.min_order_qty,
      Doos: p.case_pack || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(book, ws, `GIP_${cid[:20] if False else ''}`); // TS keeps full; Excel truncates name automatically
  }

  // Voeg optioneel AIP-master tab toe voor referentie
  const aip = products.map((p) => ({
    SKU: p.sku, Product: p.name, Pack: p.pack_size || "", Registratienr: p.registration_no || "",
    ZI: p.zi_number || "", AIP_EUR: Number(p.aip_eur), Min_bestel: p.min_order_qty, Doos: p.case_pack || ""
  }));
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(aip), "AIP_master");

  const out = XLSX.write(book, { type: "array", bookType: "xlsx" });
  return new NextResponse(out, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="GIP_lists_${Date.now()}.xlsx"`,
    },
  });
}
