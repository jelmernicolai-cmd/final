// app/api/pricing/gip/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- In-memory demo store (vervang later door DB/portal calls) ---
type Discount = { distFee: number; extra: number };
type Wholesaler = { id: string; label: string };
type StoreRow = { sku: string; discounts: Record<string, Discount> };
type StoreShape = { wholesalers: Wholesaler[]; rows: StoreRow[]; updatedAt?: string };

const mem: { data: StoreShape } = (global as any).__GIP_STORE__ || ((global as any).__GIP_STORE__ = {
  data: { wholesalers: [], rows: [], updatedAt: undefined },
});

// Helpers
function clamp01(x: any) {
  const n = Number.isFinite(x) ? Number(x) : 0;
  return Math.min(Math.max(n, 0), 0.9999);
}

function sanitize(body: any): StoreShape {
  const wholesalers: Wholesaler[] = Array.isArray(body?.wholesalers)
    ? body.wholesalers.map((w: any) => ({
        id: String(w?.id ?? "").trim(),
        label: String(w?.label ?? "").trim(),
      })).filter((w: Wholesaler) => !!w.id)
    : [];

  const rows: StoreRow[] = Array.isArray(body?.rows)
    ? body.rows.map((r: any) => {
        const sku = String(r?.sku ?? "").trim();
        const discounts: Record<string, Discount> = {};
        const src = r?.discounts ?? {};
        for (const [wid, d] of Object.entries(src)) {
          discounts[String(wid)] = {
            distFee: clamp01((d as any)?.distFee),
            extra: clamp01((d as any)?.extra),
          };
        }
        return { sku, discounts };
      }).filter((r: StoreRow) => !!r.sku)
    : [];

  return { wholesalers, rows };
}

// GET: lees snapshot
export async function GET() {
  const { data } = mem;
  return NextResponse.json({ ok: true, wholesalers: data.wholesalers, rows: data.rows, updatedAt: data.updatedAt ?? null });
}

// POST: sla snapshot op
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clean = sanitize(body);

    mem.data = {
      wholesalers: clean.wholesalers,
      rows: clean.rows,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      ok: true,
      rowsCount: mem.data.rows.length,
      wholesalersCount: mem.data.wholesalers.length,
      updatedAt: mem.data.updatedAt,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Opslaan mislukt" }, { status: 400 });
  }
}
