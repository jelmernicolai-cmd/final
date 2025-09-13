// app/api/wgp/parse/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // grote PDFs kunnen even duren

type ScUnitRow = { reg: string; unit_price_eur: number; valid_from?: string };
type ParseOk = { ok: true; rows: ScUnitRow[] };
type ParseErr = { ok: false; error: string };

async function fetchPdfBufferFromUrl(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Fetch ${res.status} ${res.statusText}`);
  const ct = res.headers.get("content-type") || "";
  if (!/pdf|octet-stream/i.test(ct)) throw new Error(`Onverwachte content-type: ${ct}`);
  return await res.arrayBuffer();
}

export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    let buf: Buffer | null = null;

    if (ct.includes("application/json")) {
      const body = await req.json();
      const url = String(body?.url || "").trim();
      if (!url) return NextResponse.json<ParseErr>({ ok: false, error: "Ontbrekende 'url' in body" }, { status: 400 });
      buf = Buffer.from(await fetchPdfBufferFromUrl(url));
    } else if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file) return NextResponse.json<ParseErr>({ ok: false, error: "Missing file" }, { status: 400 });
      buf = Buffer.from(await file.arrayBuffer());
    } else {
      return NextResponse.json<ParseErr>({ ok: false, error: "Gebruik JSON {url} of multipart 'file'" }, { status: 400 });
    }

    // Lazy import; werkt alleen in Node runtime
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buf!);

    // ↓↓↓ HIER je eigen extractie naar ScUnitRow[] ↓↓↓
    // Voor nu dummy: elke pagina = 1 rij met alleen text parse je later.
    // Vervang onderstaande met jouw echte parser op parsed.text:
    const rows: ScUnitRow[] = []; // TODO: parse parsed.text naar {reg, unit_price_eur, valid_from}

    return NextResponse.json<ParseOk>({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json<ParseErr>({ ok: false, error: e?.message || "Parse mislukt" }, { status: 400 });
  }
}
