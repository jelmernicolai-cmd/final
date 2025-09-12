// app/api/pricing/products/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/pricing/db";
import type { Product } from "@/lib/pricing/types";

export async function GET() {
  const items = await db.listProducts();
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = (await req.json()) as { products: Omit<Product, "id">[] };
  if (!Array.isArray(body.products)) {
    return NextResponse.json({ error: "products[] verplicht" }, { status: 400 });
  }
  const cleaned = body.products.map((p) => ({
    sku: String(p.sku || "").trim(),
    name: String(p.name || "").trim(),
    pack_size: p.pack_size ? String(p.pack_size) : undefined,
    registration_no: p.registration_no ? String(p.registration_no) : undefined,
    zi_number: p.zi_number ? String(p.zi_number) : undefined,
    aip_eur: Number(p.aip_eur) || 0,
    min_order_qty: Number(p.min_order_qty) || 1,
    case_pack: p.case_pack ? String(p.case_pack) : undefined,
    custom: p.custom ?? {},
  }));
  const items = await db.upsertProducts(cleaned);
  return NextResponse.json(items, { status: 201 });
}
