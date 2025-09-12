// app/api/wgp/parse-pdf/route.ts
import { NextResponse } from "next/server";

// Belangrijk: dit moet de Node-runtime zijn (pdf-parse werkt niet op Edge).
export const runtime = "nodejs";
// Zorg dat de route telkens server-side verwerkt wordt (geen caching op build).
export const dynamic = "force-dynamic";

type ScPdfRow = {
  reg: string;             // genormaliseerd REG/RVG-nummer
  unit_price_eur: number;  // gevonden eenheidsprijs
  valid_from?: string;     // optioneel (niet altijd in de Staatscourant per regel)
};

// pdf-parse is CJS; met esModuleInterop kun je default importen.
// Als je TS compile error krijgt, zet "esModuleInterop": true in tsconfig
// of gebruik: const pdfParse = require("pdf-parse");
import pdfParse from "pdf-parse";

/** -------- Helpers -------- */
function normReg(v: unknown) {
  return String(v ?? "")
    .toUpperCase()
    .replace(/[.\s]/g, "")
    .trim();
}

function toNumEU(v: string) {
  // accepteert 1.234,56 of 1234.56
  const s = v.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Hele simpele extractor voor Staatscourant-tekst:
 * - Zoekt patronen als "RVG 12345" / "Reg.nr. 12.345" / "registratienummer 12345"
 * - Zoekt eenheidsprijzen met € of bedrag (met , of . als decimalen)
 *
 * NB: De Staatscourant-opmaak varieert; dit is een pragmatische start.
 * Je kunt de regexen hier fijnslijpen zodra je paar echte PDF’s hebt getest.
 */
function extractRowsFromText(txt: string): ScPdfRow[] {
  const lines = txt
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows: ScPdfRow[] = [];

  // Bv. regels waarin zowel een REGNR/RVG als een prijs voorkomt
  // Voorbeeldpatronen:
  //   "RVG 12345 — Eenheidsprijs € 1,2345"
  //   "Reg.nr. 12.345 €0,123"
  //   "Registratienummer 12345 Eenheidsprijs 0,1234 euro"
  const regRegex =
    /\b(?:RVG|REG\.?NR\.?|REGNR|REGISTRATIENUMMER)\s*[:.]?\s*([0-9][0-9.\s]*)\b/i;
  const priceRegex =
    /(?:€\s*|\b)(\d{1,3}(?:[.,]\d{3})*[.,]\d{2,4}|\d+[.,]\d{2,4})(?:\s*(?:euro|EUR))?/i;

  for (const line of lines) {
    const regMatch = line.match(regRegex);
    const priceMatch = line.match(priceRegex);

    if (regMatch && priceMatch) {
      const regRaw = regMatch[1];
      const priceRaw = priceMatch[1];
      const reg = normReg(regRaw);
      const unit = toNumEU(priceRaw);
      if (reg && Number.isFinite(unit)) {
        rows.push({
          reg,
          unit_price_eur: unit,
        });
      }
    }
  }

  // Deduplicate op (reg, unit_price_eur) om ruis te verminderen
  const seen = new Set<string>();
  const dedup = rows.filter((r) => {
    const k = `${r.reg}::${r.unit_price_eur}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return dedup;
}

/** -------- POST handler -------- */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Geen bestand ontvangen (verwacht veldnaam 'file')." },
        { status: 400 }
      );
    }

    // Alleen pdf verwerken in deze route
    const name = file.name?.toLowerCase() || "";
    const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";
    if (!isPdf) {
      return NextResponse.json(
        { error: "Alleen PDF wordt hier ondersteund." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdfParse(buffer);

    const text = data?.text || "";
    if (!text.trim()) {
      return NextResponse.json(
        { error: "Kon geen tekst uit PDF halen." },
        { status: 422 }
      );
    }

    // Probeer rijen te extraheren
    const rows = extractRowsFromText(text);

    // Stuur zowel ruwe tekst (handig voor debug) als gevonden rows terug
    return NextResponse.json({
      ok: true,
      meta: {
        pages: data.numpages,
        info: data.info || null,
      },
      rows, // [{ reg, unit_price_eur, valid_from? }]
      text, // optioneel: kun je verwijderen als je dit niet wil retourneren
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "PDF kon niet worden verwerkt." },
      { status: 500 }
    );
  }
}
