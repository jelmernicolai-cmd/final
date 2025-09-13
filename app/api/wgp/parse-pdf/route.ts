// app/api/wgp/parse-pdf/route.ts
import { NextResponse } from "next/server";

// Belangrijk: forceer Node.js runtime (pdf-parse werkt niet in Edge)
export const runtime = "nodejs";

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

    // Lazy import zodat bundling kleiner blijft
    const pdfParse = (await import("pdf-parse")).default as (data: Buffer) => Promise<{ text: string }>;

    const buf = Buffer.from(await file.arrayBuffer());
    const { text } = await pdfParse(buf);

    // =========================
    // Heuristische extractor:
    // - REGNR/RVG: reeks cijfers (3–7) alfanum, vaak “RVG 12345” of “REGNR 12345”
    // - Eenheidsprijs: getal met , of . als decimaal en €-teken in buurt
    // - Geldig vanaf: datum-achtige strings
    // Pas regex naar wens aan voor jouw Staatscourant layout.
    // =========================

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    const rows: { reg: string; unit_price_eur: number; valid_from?: string }[] = [];

    // Regex-helpers
    const regRe = /\b(?:RVG|REGNR|REG\.?NR\.?)\s*[:\-]?\s*([A-Z0-9]{3,10}|\d{3,10})\b/i;
    const priceRe = /(?:€|\bEUR\b)\s*([0-9]{1,3}(?:[\.\s][0-9]{3})*(?:,[0-9]+)?|[0-9]+(?:\.[0-9]+)?)/i;
    const dateRe = /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})\b/;

    // We lopen per regel, bewaren “laatst geziene” reg en proberen prijs + datum te koppelen
    let currentReg: string | null = null;
    for (const ln of lines) {
      const r = regRe.exec(ln);
      if (r) {
        currentReg = normalizeReg(r[1]);
        // direct in deze zelfde regel al prijs?
        const p0 = extractPrice(ln, priceRe);
        if (currentReg && p0 !== null) {
          rows.push({ reg: currentReg, unit_price_eur: p0, valid_from: extractDate(ln, dateRe) || undefined });
          currentReg = null; // reset na succesvolle rij
          continue;
        }
        // anders: wacht tot we prijs in volgende regels tegenkomen
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

    // Valideer minimale output
    const clean = rows
      .filter(r => r.reg && Number.isFinite(r.unit_price_eur))
      .map(r => ({ ...r, reg: normalizeReg(r.reg) }));

    if (!clean.length) {
      return NextResponse.json(
        { error: "Kon geen rijen vinden. Controleer of REGNR/RVG en €-prijzen in de PDF tekstueel staan." },
        { status: 422 }
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
  // EU -> decimaalpunt
  const s = m[1].replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
function extractDate(line: string, dateRe: RegExp): string | null {
  const m = dateRe.exec(line);
  return m ? m[1] : null;
}
