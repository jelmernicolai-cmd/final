import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import pdfParse from "pdf-parse";

type ScUnitRow = {
  reg: string;
  unit_price_eur: number;
  artikelnaam?: string;
  eenheid?: string;
  valid_from?: string;
};

function normReg(v: unknown) {
  return String(v ?? "").toUpperCase().replace(/[.\s]/g, "").trim();
}
function toNumEU(v: string) {
  const s = v.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "Geen bestand ontvangen (veld: 'file')." },
        { status: 400 }
      );
    }

    const isPdf =
      file.type === "application/pdf" ||
      (file.name || "").toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json(
        { error: "Alleen PDF wordt hier ondersteund." },
        { status: 400 }
      );
    }

    // BELANGRIJK: gebruik Uint8Array i.p.v. Buffer
    const ab = await file.arrayBuffer();
    const uint8 = new Uint8Array(ab);
    const data = await pdfParse(uint8 as unknown as ArrayBuffer);

    const text = data?.text || "";
    if (!text.trim()) {
      return NextResponse.json(
        { error: "Kon geen tekst uit PDF halen." },
        { status: 422 }
      );
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // Voorbeelden:
    // "117120  ABACAVIR ACCORD TABLET FILMOMHULD 300MG 3,575915 STUK"
    // "EU/1/14/944/007  ABASAGLAR INJVLST 100E/ML PEN 3ML 2,502257 ML"
    const rowRe =
      /^(?<reg>(?:EU\/\d+(?:\/\d+)+|\d{5,8}))\s{2,}(?<name>.+?)\s(?<price>\d{1,3}(?:\.\d{3})*,\d{2,6}|\d+,\d{2,6})\s(?<unit>[A-Zµ/().%+\-]+)$/;

    const rows: ScUnitRow[] = [];
    for (const ln of lines) {
      if (/^regnr\b/i.test(ln) || /^pereenheid\b/i.test(ln) || /^per eenheid\b/i.test(ln)) continue;
      const m = ln.match(rowRe);
      if (!m) continue;
      const reg = normReg(m.groups!.reg);
      const artikelnaam = m.groups!.name.trim();
      const unit_price_eur = toNumEU(m.groups!.price);
      const eenheid = m.groups!.unit.trim();
      if (reg && Number.isFinite(unit_price_eur)) {
        rows.push({ reg, unit_price_eur, artikelnaam, eenheid });
      }
    }

    // Dedup
    const seen = new Set<string>();
    const dedup = rows.filter(r => {
      const k = `${r.reg}::${r.unit_price_eur}::${r.artikelnaam ?? ""}::${r.eenheid ?? ""}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    return NextResponse.json({
      ok: true,
      meta: { pages: data.numpages ?? null, count: dedup.length },
      rows: dedup,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "PDF kon niet worden verwerkt." },
      { status: 500 }
    );
  }
}
