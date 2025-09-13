import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

/**
 * Haalt de meest recente Farmatec add-on Excel op en parse't ZI/naam/indicatie/max-tarief.
 * Geen cheerio nodig; we zoeken de eerste .xlsx/.xls link met een simpele regex.
 */

export const revalidate = 3600; // 1 uur

const DEFAULT_LISTING =
  "https://www.farmatec.nl/erkenningen/geneesmiddelen/add-on-geneesmiddelen";

// Vercel Node runtime (niet edge), ivm Buffer/XLSX
export const runtime = "nodejs";

function findFirstExcelLink(html: string, base: string): string | undefined {
  // Zoek <a ... href="...xlsx|xls">
  const re =
    /<a\b[^>]*href\s*=\s*["']([^"']+\.(?:xlsx|xls))["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1].trim();
    try {
      // Resolve relative -> absolute
      const url = new URL(href, base).toString();
      return url;
    } catch {
      continue;
    }
  }
  return undefined;
}

function toNumberNL(v: any): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return isFinite(v) ? v : undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const norm = s.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const n = parseFloat(norm);
  return isFinite(n) ? n : undefined;
}

export async function GET() {
  try {
    // 1) Vind Excel URL (env override of scrape)
    const direct = process.env.FARMATEC_ADDON_URL?.trim();
    let xlsxUrl = direct;

    if (!xlsxUrl) {
      const resp = await fetch(DEFAULT_LISTING, {
        headers: { "user-agent": "PharmGtN/1.0" },
        cache: "no-store",
      });
      if (!resp.ok) {
        return new NextResponse(
          `Farmatec pagina gaf status ${resp.status}`,
          { status: 502 }
        );
      }
      const html = await resp.text();
      const found = findFirstExcelLink(html, DEFAULT_LISTING);
      if (!found) {
        return new NextResponse("Geen Excel-link gevonden op Farmatec.", {
          status: 502,
        });
      }
      xlsxUrl = found;
    }

    // 2) Download Excel
    const fileRes = await fetch(xlsxUrl!, {
      headers: { "user-agent": "PharmGtN/1.0" },
      cache: "no-store",
    });
    if (!fileRes.ok) {
      return new NextResponse(`Excel download gaf ${fileRes.status}`, {
        status: 502,
      });
    }
    const ab = await fileRes.arrayBuffer();

    // 3) Parse met XLSX
    const wb = XLSX.read(ab, { type: "array" });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

    // 4) Normaliseer kolommen heuristisch
    const parsed = rows
      .map((r: any) => {
        const out: {
          zi: string;
          name: string;
          indication: string;
          maxTariff?: number;
          status: string;
        } = { zi: "", name: "", indication: "", status: "Actief" };

        for (const key of Object.keys(r)) {
          const lk = key.toLowerCase().trim();
          const val = r[key];
          if (!out.zi && /(^|\s)zi($|\s)/.test(lk)) out.zi = String(val).trim();
          else if (!out.name && /(naam|product)/.test(lk)) out.name = String(val).trim();
          else if (!out.indication && /(indic)/.test(lk)) out.indication = String(val).trim();
          else if (/max/.test(lk) && /(tarief|bedrag|prijs)/.test(lk)) {
            const n = toNumberNL(val);
            if (n != null) out.maxTariff = n;
          } else if (/status/.test(lk)) {
            out.status = String(val).trim() || "Actief";
          }
        }
        return out;
      })
      .filter((r) => r.zi && r.name); // verwijder lege/headers

    return NextResponse.json(parsed, {
      headers: { "cache-control": "public, max-age=300, s-maxage=3600" },
    });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Scrape/parsing error", { status: 500 });
  }
}
