// app/api/pricing/products/route.ts
import { NextResponse } from "next/server";
import { getProducts, setProducts, type Product } from "@/lib/pricing/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await getProducts();
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { rows: Product[] };
    if (!Array.isArray(body?.rows)) {
      return NextResponse.json({ ok: false, error: "Body must be { rows: Product[] }" }, { status: 400 });
    }
    await setProducts(body.rows);
    return NextResponse.json({ ok: true, count: body.rows.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Invalid JSON" }, { status: 400 });
  }
}
