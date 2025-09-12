// app/api/pricing/gip/route.ts
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getProducts, getCustomers, type Product, type Customer } from "@/lib/pricing/db";

export const dynamic = "force-dynamic";

function safeSheetName(input: string) {
  // Excel: max 31 chars, no []:*?/\ and no leading/trailing apostrophe
  const banned = /[\[\]\:\*\?\/\\]/g;
  let s = (input || "Sheet").replace(banned, " ").trim();
  if (s.startsWith("'")) s = s.slice(1);
  if (s.endsWith("'")) s = s.slice(0, -1);
  if (!s) s = "Sheet";
  if (s.length > 31) s = s.slice(0, 31);
  return s;
}

function computeGIP(aip: number, discountPct: number) {
  const d = Math.max(0, Math.min(100, Number(discountPct) || 0));
  const v = Math.max(0, Number(aip) || 0) * (1 - d / 100);
  // 2 decimals typical for EUR prices
  return Math.round(v * 100) / 100;
}

export async function POST(req: Request) {
  try {
    // Body is optioneel; als niet meegegeven, nemen we in-memory DB
    const body = (await req.json().catch(() => ({}))) as {
      products?: Product[];
      customers?: Customer[];
      includeMasterTab?: boolean;
    };

    const products = Array.isArray(body?.products) && body.products!.length ? body.products! : await getProducts();
    const customers = Array.isArray(body?.customers) && body.customers!.length ? body.customers! : await getCustomers();
    const includeMasterTab = Boolean(body?.includeMasterTab);

    if (!products.length) {
      return NextResponse.json({ ok: false, error: "Geen producten in database of payload." }, { status: 400 });
    }
    if (!customers.length) {
      return NextResponse.json({ ok: false, error: "Geen klanten in database of payload." }, { status: 400 });
    }

    const book = XLSX.utils.book_new();

    for (const c of customers) {
      const rows = products.map((p) => ({
        Klant: c.name,
        "Korting %": c.discountPct,
        SKU: p.sku,
        "Product naam": p.productName,
        "Verpakkingsgrootte": p.packSize,
        Registratienummer: p.registration,
        "ZI-nummer": p.zi,
        "AIP (EUR)": p.aip,
        "GIP (EUR)": computeGIP(p.aip, c.discountPct),
        "Minimale bestelgrootte": p.minOrder,
        Doosverpakking: p.casePack,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const tabName = safeSheetName(`GIP_${c.name || c.id}`);
      XLSX.utils.book_append_sheet(book, ws, tabName);
    }

    if (includeMasterTab) {
      const wsMaster = XLSX.utils.json_to_sheet(
        products.map((p) => ({
          SKU: p.sku,
          "Product naam": p.productName,
          "Verpakkingsgrootte": p.packSize,
          Registratienummer: p.registration,
          "ZI-nummer": p.zi,
          "AIP (EUR)": p.aip,
          "Minimale bestelgrootte": p.minOrder,
          Doosverpakking: p.casePack,
        }))
      );
      XLSX.utils.book_append_sheet(book, wsMaster, "AIP_master");
    }

    const wbout = XLSX.write(book, { type: "array", bookType: "xlsx" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="GIP_lists.xlsx"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Export mislukt" }, { status: 500 });
  }
}
