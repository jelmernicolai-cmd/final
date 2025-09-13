// app/api/wgp/parse/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// optioneel: parsing van grote PDFs kan even duren
export const maxDuration = 60;

type ParseOk = { ok: true; numpages: number; text: string; info?: any };
type ParseErr = { ok: false; error: string };

async function fetchPdfBufferFromUrl(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Fetch ${res.status} ${res.statusText}`);
  const ct = res.headers.get("content-type") || "";
  if (!/pdf/i.test(ct)) {
    // Staatscourant geeft soms octet-stream terug; laat dat ook toe
    if (!/octet-stream/i.test(ct)) {
      throw new Error(`Onverwachte content-type: ${ct}`);
    }
  }
  // (optioneel) size check om al te grote files te blokkeren
  const len = res.headers.get("content-length");
  if (len && Number(len) > 35 * 1024 * 1024) {
    // 35MB safeguard; pas aan naar wens
    throw new Error(`PDF te groot (${Math.round(Number(len) / (1024 * 1024))} MB)`);
  }
  return await res.arrayBuffer();
}

export async function POST(req: Request) {
  try {
    // twee modi:
    // 1) JSON: { url: "https://..." }
    // 2) multipart/form-data met field "file" (fallback)
    const ct = req.headers.get("content-type") || "";

    let buffer: Buffer | null = null;

    if (ct.includes("application/json")) {
      const body = await req.json();
      const url = String(body?.url || "").trim();
      if (!url) {
        return NextResponse.json<ParseErr>({ ok: false, error: "Ontbrekende 'url' in body" }, { status: 400 });
      }
      const ab = await fetchPdfBufferFromUrl(url);
      buffer = Buffer.from(ab);
    } else if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file) {
        return NextResponse.json<ParseErr>({ ok: false, error: "Missing file" }, { status: 400 });
      }
      const ab = await file.arrayBuffer();
      buffer = Buffer.from(ab);
    } else {
      return NextResponse.json<ParseErr>({ ok: false, error: "Gebruik JSON {url} of multipart 'file'" }, { status: 400 });
    }

    // lazy import om edge-bundling te vermijden
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer!);

    const payload: ParseOk = {
      ok: true,
      numpages: result.numpages,
      text: result.text ?? "",
      info: result.info ?? null,
    };
    return NextResponse.json(payload);
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "Parse mislukt";
    return NextResponse.json<ParseErr>({ ok: false, error: msg }, { status: 400 });
  }
}
