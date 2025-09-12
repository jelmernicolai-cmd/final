// app/api/wgp/parse-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // verplicht voor pdf-parse (Node context)

type Row = { reg: string; unit_price_eur: number; valid_from?: string };

function normReg(s: string) {
  return (s || "").toUpperCase().replace(/[.\s]/g, "").trim();
}
function toNumEU(s: string) {
  const v = String(s ?? "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : NaN;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (!(f instanceof File)) {
      return NextResponse.json({ error: "Geen bestand ontvangen." }, { status: 400 });
    }
    if (!/\.pdf$/i.test(f.name)) {
      return NextResponse.json({ error: "Upload een PDF-bestand." }, { status: 400 });
    }

    // Dynamic import: voorkomt bundling errors tijdens build
    const { default: pdfParse } = await import("pdf-parse");

    const buf = Buffer.from(await f.arrayBuffer());
    const data = await pdfParse(buf);

    const text = (data?.text || "").replace(/\u00A0/g, " "); // non-breaking spaces
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    // Heel simpele heuristiek: zoek regels met RVG/REG + prijs
    // Voorbeeldpatronen: "RVG 12345 | € 1,2345", "REGNR: 12345  Eenheidsprijs: 0,5678"
    const rows: Row[] = [];
    const dateHint = (text.match(/\b(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})\b/) || [])[0];

    for (const ln of lines) {
      // Regnr vinden
      const mReg = ln.match(/\b(RVG|REG(?:NR)?)[^\d]*(\d{4,7})\b/i);
      // Prijs vinden (neemt eerste €-bedrag of getal met komma)
      const mPrice =
        ln.match(/€\s*([\d\.,]+)/) ||
        ln.match(/\b(\d{1,3}(?:\.\d{3})*,\d+)\b/) ||
        ln.match(/\b(\d+\.\d+)\b/);

      if (mReg && mPrice) {
        const reg = normReg(mReg[2]);
        const unit = toNumEU(mPrice[1]);
        if (reg && Number.isFinite(unit)) {
          rows.push({ reg, unit_price_eur: unit, valid_from: dateHint });
        }
      }
    }

    // Indien niets gevonden: geef duidelijke melding
    if (!rows.length) {
      return NextResponse.json(
        { rows: [], warning: "Geen regels met RVG/REG + prijs herkend. Controleer PDF of upload XLSX/CSV." },
        { status: 200 }
      );
    }

    return NextResponse.json({ rows }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "PDF kon niet worden verwerkt." },
      { status: 500 }
    );
  }
}
