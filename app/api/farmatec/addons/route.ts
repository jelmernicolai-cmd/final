import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { load } from "cheerio";

const DEFAULT_LISTING = "https://www.farmatec.nl/erkenningen/geneesmiddelen/add-on-geneesmiddelen";
export const revalidate = 3600; // 1 uur

export async function GET() {
  try {
    const direct = process.env.FARMATEC_ADDON_URL?.trim();
    let xlsxUrl: string | undefined = direct;

    if (!xlsxUrl) {
      const htmlRes = await fetch(DEFAULT_LISTING, { headers: { "user-agent": "PharmGtN/1.0" }, cache: "no-store" });
      if (!htmlRes.ok) throw new Error(`Farmatec pagina gaf ${htmlRes.status}`);
      const html = await htmlRes.text();
      const $ = load(html);
      const cand = $('a[href$=".xlsx"], a[href$=".xls"]').first().attr("href");
      if (cand) xlsxUrl = cand.startsWith("http") ? cand : new URL(cand, DEFAULT_LISTING).toString();
      else throw new Error("Geen Excel-link gevonden op Farmatec.");
    }

    const fileRes = await fetch(xlsxUrl!, { headers: { "user-agent": "PharmGtN/1.0" }, cache: "no-store" });
    if (!fileRes.ok) throw new Error(`Excel download gaf ${fileRes.status}`);
    const ab = await fileRes.arrayBuffer();

    const wb = XLSX.read(ab, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

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

      if (typeof keys.maxTariff === "string") {
        const norm = keys.maxTariff.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
        const n = parseFloat(norm);
        keys.maxTariff = isFinite(n) ? n : undefined;
      }
      return keys;
    }).filter((r) => r.zi && r.name);

    return NextResponse.json(parsed, { headers: { "cache-control": "public, max-age=300, s-maxage=3600" } });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Scrape/parsing error", { status: 500 });
  }
}
