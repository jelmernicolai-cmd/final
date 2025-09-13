import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import pdfParse from "pdf-parse";

type WgpRow = {
  regnr: string;
  artikelnaam: string;
  maxprijs_eur: number;
  eenheid: string; // bijv. STUK, ML, G
};

function normReg(v: unknown) {
  return String(v ?? "").toUpperCase().replace(/[.\s]/g, "").trim();
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Geen bestand (verwacht veld 'file')." }, { status: 400 });
    }
    const name = (file.name || "").toLowerCase();
    const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";
    if (!isPdf) {
      return NextResponse.json({ error: "Alleen PDF wordt ondersteund." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdfParse(buffer);
    const text = data.text || "";
    if (!text.trim()) {
      return NextResponse.json({ error: "Kon geen tekst uit PDF halen." }, { status: 422 });
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // Voorbeelden uit PDF:
    // "117120  ABACAVIR ACCORD TABLET FILMOMHULD 300MG 3,575915 STUK"
    // "EU/1/14/944/007  ABASAGLAR INJVLST 100E/ML PEN 3ML 2,502257 ML"
    const rowRe = /^(?<reg>(?:EU\/\d+(?:\/\d+)+|\d{2,}))\s{2,}(?<name>.+?)\s(?<price>\d{1,3}(?:\.\d{3})*,\d{2,6}|\d+,\d{2,6})\s(?<unit>[A-Zµ/().%+\-]+)$/;

    const rows: WgpRow[] = [];
    for (const ln of lines) {
      if (/^regnr\b/i.test(ln) || /^per eenheid\b/i.test(ln)) continue;
      const m = ln.match(rowRe);
      if (!m) continue;
      const regnr = normReg(m.groups!.reg);
      const artikelnaam = m.groups!.name.trim();
      const maxprijs_eur = parseFloat(m.groups!.price.replace(/\./g, "").replace(",", "."));
      const eenheid = m.groups!.unit.trim();
      if (Number.isFinite(maxprijs_eur)) {
        rows.push({ regnr, artikelnaam, maxprijs_eur, eenheid });
      }
    }

    // Dedup
    const seen = new Set<string>();
    const dedup = rows.filter(r => {
      const k = `${r.regnr}::${r.artikelnaam}::${r.maxprijs_eur}::${r.eenheid}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    return NextResponse.json({
      ok: true,
      meta: { pages: data.numpages ?? null },
      rows: dedup,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "PDF kon niet worden verwerkt." }, { status: 500 });
  }
}
