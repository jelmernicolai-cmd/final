// app/api/wgp/parse/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // pdf-parse vereist Node runtime

// Optionele demo (geen filesystem!): /api/wgp/parse?sample=1
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("sample") === "1") {
    return NextResponse.json({
      rows: [
        { reg: "RVG12345", unit_price_eur: 1.2345, valid_from: "2025-01-01" },
        { reg: "RVG67890", unit_price_eur: 0.9876, valid_from: "2025-01-01" },
      ],
    });
  }
  return NextResponse.json(
    { error: "Gebruik POST met multipart/form-data (veld 'file') of voeg ?sample=1 toe voor demo." },
    { status: 405 },
  );
}

export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Upload als multipart/form-data met veld 'file'." }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Veld 'file' ontbreekt of is ongeldig." }, { status: 400 });
    }

    // 👉 Lazy import zodat pdf-parse niet eagerly bundled/gerund wordt bij build
    const pdfParse = (await import("pdf-parse")).default as (data: Buffer) => Promise<{ text: string }>;
    const buf = Buffer.from(await file.arrayBuffer());
    const { text } = await pdfParse(buf);

    // Heuristische extractie
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const rows: { reg: string; unit_price_eur: number; valid_from?: string }[] = [];

    const regRe = /\b(?:RVG|REGNR|REG\.?NR\.?)\s*[:\-]?\s*([A-Z0-9]{3,10}|\d{3,10})\b/i;
    const priceRe = /(?:€|\bEUR\b)\s*([0-9]{1,3}(?:[\.\s][0-9]{3})*(?:,[0-9]+)?|[0-9]+(?:\.[0-9]+)?)/i;
    const dateRe = /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})\b/;

    let currentReg: string | null = null;

    for (const ln of lines) {
      const r = regRe.exec(ln);
      if (r) {
        currentReg = normalizeReg(r[1]);
        const p0 = extractPrice(ln, priceRe);
        if (currentReg && p0 !== null) {
          rows.push({ reg: currentReg, unit_price_eur: p0, valid_from: extractDate(ln, dateRe) || undefined });
          currentReg = null;
        }
        continue;
      }
      if (currentReg) {
        const price = extractPrice(ln, priceRe);
        if (price !== null) {
          rows.push({ reg: currentReg, unit_price_eur: price, valid_from: extractDate(ln, dateRe) || undefined });
          currentReg = null;
        }
      }
    }

    const clean = rows.filter(r => r.reg && Number.isFinite(r.unit_price_eur));

    if (!clean.length) {
      return NextResponse.json(
        { error: "Kon geen REGNR/RVG + €-prijzen vinden in PDF-tekst." },
        { status: 422 },
      );
    }

    return NextResponse.json({ rows: clean }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "PDF verwerken mislukt" }, { status: 500 });
  }
}

// ===== helpers =====
function normalizeReg(v: string) {
  return String(v || "").toUpperCase().replace(/[.\s]/g, "").trim();
}
function extractPrice(line: string, priceRe: RegExp): number | null {
  const m = priceRe.exec(line);
  if (!m) return null;
  const s = m[1].replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
function extractDate(line: string, dateRe: RegExp): string | null {
  const m = dateRe.exec(line);
  return m ? m[1] : null;
}
