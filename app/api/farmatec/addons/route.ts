import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { load } from "cheerio";
import { ofetch } from "ofetch";

/**
 * Scraper zoekt op Farmatec pagina naar de meest recente Excel met add-ons.
 * Vangt 2 strategieën:
 *  1) Environment override: process.env.FARMATEC_ADDON_URL (directe .xlsx)
 *  2) Scrape op /erkenningen/geneesmiddelen/add-on-geneesmiddelen* en pak eerste .xlsx-link
 */
const DEFAULT_LISTING = "https://www.farmatec.nl/erkenningen/geneesmiddelen/add-on-geneesmiddelen";

export const revalidate = 3600; // 1 uur cache bij ISR

export async function GET() {
  try {
    const direct = process.env.FARMATEC_ADDON_URL?.trim();
    let xlsxUrl: string | undefined = direct;

    if (!xlsxUrl) {
      const html = await ofetch<string>(DEFAULT_LISTING, { headers: { "user-agent": "PharmGtN/1.0" } });
      const $ = load(html);
      // zoek eerste link die eindigt op xlsx of xls
      const cand = $('a[href$=".xlsx"], a[href$=".xls"]').first().attr("href");
      if (cand) {
        xlsxUrl = cand.startsWith("http") ? cand : new URL(cand, DEFAULT_LISTING).toString();
      } else {
        throw new Error("Geen Excel-link gevonden op Farmatec pagina.");
      }
    }

    // Download Excel als ArrayBuffer
    const ab = await ofetch<ArrayBuffer>(xlsxUrl!, { responseType: "arrayBuffer" });
    const wb = XLSX.read(ab, { type: "array" });
    // Zoek eerste relevante sheet (heuristiek)
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

    // Normaliseer kolomnamen heuristisch (ZI, Naam, Indicatie, Max tarief, Status)
    const parsed = rows.map((r: any) => {
      const keys = Object.keys(r).reduce((acc: any, k: string) => {
        const lk = k.toLowerCase().trim();
        if (lk.includes("zi")) acc.zi = r[k];
        else if (lk.includes("indic")) acc.indication = r[k];
        else if (lk.includes("max") && (lk.includes("tarief") || lk.includes("bedrag"))) acc.maxTariff = r[k];
        else if (lk.includes("status")) acc.status = r[k];
        else if (!acc.name && (lk.includes("naam") || lk.includes("product"))) acc.name = r[k];
        return acc;
      }, { zi: "", name: "", indication: "", maxTariff: undefined as number|undefined, status: "Actief" });

      // Parse getal
      if (typeof keys.maxTariff === "string") {
        const norm = keys.maxTariff.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
        const n = parseFloat(norm);
        keys.maxTariff = isFinite(n) ? n : undefined;
      }
      return keys;
    })
    // Filter lege regels / dubbele koppen
    .filter((r) => r.zi && r.name);

    return NextResponse.json(parsed, { headers: { "cache-control": "public, max-age=300, s-maxage=3600" } });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Scrape/parsing error", { status: 500 });
  }
}
