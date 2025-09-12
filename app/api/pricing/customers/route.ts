// app/api/pricing/customers/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/pricing/db";

export async function GET() {
  const customers = await db.listCustomers();
  return NextResponse.json(customers);
}

export async function POST(req: Request) {
  const body = (await req.json()) as { customers: { name: string; code?: string }[] };
  if (!Array.isArray(body.customers)) return NextResponse.json({ error: "customers[] verplicht" }, { status: 400 });
  const items = await db.upsertCustomers(body.customers.map((c) => ({ name: c.name.trim(), code: c.code?.trim() })));
  return NextResponse.json(items, { status: 201 });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as { customerId: string; discount_pct: number };
  if (!body.customerId || body.discount_pct == null) return NextResponse.json({ error: "customerId & discount_pct verplicht" }, { status: 400 });
  const set = await db.setCustomerDiscount(body.customerId, Number(body.discount_pct));
  return NextResponse.json(set);
}
