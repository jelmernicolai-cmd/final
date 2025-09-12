// app/api/pricing/customers/route.ts
import { NextResponse } from "next/server";
import { getCustomers, setCustomers, type Customer } from "@/lib/pricing/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await getCustomers();
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { rows: Customer[] };
    if (!Array.isArray(body?.rows)) {
      return NextResponse.json({ ok: false, error: "Body must be { rows: Customer[] }" }, { status: 400 });
    }
    await setCustomers(body.rows);
    return NextResponse.json({ ok: true, count: body.rows.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Invalid JSON" }, { status: 400 });
  }
}
