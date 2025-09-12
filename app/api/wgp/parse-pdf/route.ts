// app/api/wgp/parse-pdf/route.ts
import { NextResponse } from "next/server";

// Belangrijk: Node-runtime (pdf-parse werkt niet op Edge)
export const runtime = "nodejs";
// Forceer altijd server-side (niet prerenderen/cachen bij build)
export const dynamic = "force-dynamic";
// Optioneel: geef meer tijd bij zware PDF’s
export const maxDuration = 60;

type ScPdfRow = {
  reg: string;             // genormaliseerd REG/RVG-nummer
  unit_price_eur: number;  // gevonden eenheidsprijs
  valid_from?: string;     // optioneel
};

// pdf-parse is CJS
// Zorg dat "esModuleInterop": true staat in tsconfig.json
// of vervang dit met: const pdfParse = require("pdf-parse");
import pdfParse from "pdf-parse";

/** -------- Helpers -------- */
function normReg(v: unknown) {
  return String(v ?? "")
    .toUpperCase()
    .replace(/[.\s]/g, "")
    .trim()
    .replace(/^0+/, ""); // strip leading zeros
}

function toNumEU(v: string) {
  // accepteert 1.234,56 of 1234.56
  const s = v.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

function extractRowsFromText(txt: string): ScPdfRow[] {
  const lines = txt
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows: ScPdfRow[] = [];

  const regRegex =
    /\b(?:RVG|REG\.?NR\.?|REGNR|REGISTRATIENUMMER)\s*[:.]?\s*([0-9][0-9.\s]*)\b/i;
  const priceRegex =
    /(?:€\s*|\b)(\d{1,3}(?:[.,]\d{3})*[.,]\d{2,4}|\d+[.,]\d{2,4})(?:\s*(?:euro|EUR))?\b/i;
  const validFromRegex =
    /\b(geldig(?:\s+vanaf)?|inwerkingtreding)\s*[:.]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/i;

  for (const line of lines) {
    const regMatch = line.match(regRegex);
    const priceMatch = line.match(priceRegex);

    if (regMatch && priceMatch) {
      const regRaw = regMatch[1];
      const priceRaw = priceMatch[1];
      const reg = normReg(regRaw);
      const unit = toNumEU(priceRaw);

      if (reg && Number.isFinite(unit)) {
        const vf = line.match(validFromRegex)?.[2];
        rows.push({
          reg,
          unit_price_eur: unit,
          valid_from: vf,
        });
      }
    }
  }

  // Deduplicate op (reg, unit_price_eur)
  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = `${r.reg}::${r.unit_price_eur}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** -------- Handlers -------- */
export async function GET() {
  return NextResponse.json({
    ok: true,
    info: "POST een PDF met form-data veld 'file'.",
  });
}

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

    const name = file.name?.toLowerCase() || "";
    const isPdf = name.endsWith(".pdf") || /pdf/i.test(file.type || "");
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

    const rows = extractRowsFromText(text);

    // Tekst limiteren (om payload te beperken)
    const MAX_TEXT = 150_000;
    const safeText =
      text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) + "…" : text;

    return NextResponse.json({
      ok: true,
      meta: {
        pages: data.numpages,
        info: data.info || null,
      },
      rows,
      text: safeText, // haal dit weg als je ruwe tekst niet terug wil sturen
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "PDF kon niet worden verwerkt." },
      { status: 500 }
    );
  }
}
