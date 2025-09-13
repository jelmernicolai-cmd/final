import { NextResponse } from "next/server";
import pdf from "pdf-parse";
import { ofetch } from "ofetch";

/**
 * Verwacht een PDF met tabellen:
 *  - "Uitgaven zonder arrangement" en "Gerealiseerde uitgaven" per geneesmiddel (in mln €)
 * Parser zoekt regels: <NAAM>  <zonder>  <gerealiseerd>
 * en zet komma/ puntnotatie NL → getal.
 */

export const revalidate = 86400; // 24h

export async function POST(req: Request) {
  try {
    const { url } = (await req.json().catch(()=>({}))) as { url?: string };
    const src = (url ?? process.env.VWS_BIJLAGE_URL)?.trim();
    if (!src) return new NextResponse("Geef 'url' of stel VWS_BIJLAGE_URL in.", { status: 400 });
    if (!/^https?:\/\/.+\.pdf$/i.test(src)) return new NextResponse("URL moet naar een PDF wijzen.", { status: 400 });

    // Download PDF
    const ab = await ofetch<ArrayBuffer>(src, { responseType: "arrayBuffer", headers: { "user-agent": "PharmGtN/1.0" } });
    const data = await pdf(Buffer.from(ab));

    // Heuristisch jaartal
    const yearMatch = data.text.match(/20\d{2}/g);
    const year = yearMatch ? parseInt(yearMatch.slice(-1)[0], 10) : new Date().getFullYear();

    const lines = data.text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    // Zoek heading posities (robust voor variaties)
    const headerIdx = lines.findIndex((l) =>
      /geneesmiddel/i.test(l) && /uitgaven/i.test(l) && /zonder/i.test(l) && /gerealiseerd/i.test(l)
    );

    // Regex: <Naam...> <zonder> <gerealiseerd>
    // Bedragen kunnen "1.234,5" of "123,4" zijn; soms met "€" of "mln"
    const rowRegex = /^(.+?)\s+([\d\.\,]+)\s+([\d\.\,]+)(?:\s*(?:mln|€|euro))?$/i;

    const rows: { name: string; withoutArr: number; realized: number }[] = [];
    for (let i = Math.max(0, headerIdx); i < lines.length; i++) {
      const m = lines[i].match(rowRegex);
      if (!m) continue;
      const name = m[1].replace(/\s{2,}/g, " ").trim();
      const parseNL = (s: string) => {
        const norm = s.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
        const n = parseFloat(norm);
        return isFinite(n) ? n : NaN;
      };
      const withoutArr = parseNL(m[2]);
      const realized = parseNL(m[3]);
      if (isFinite(withoutArr) && isFinite(realized) && withoutArr > 0 && realized >= 0) {
        rows.push({ name, withoutArr, realized });
      }
    }

    if (!rows.length) {
      return new NextResponse("Geen rijen gevonden. Controleer of dit de juiste bijlage is.", { status: 422 });
    }

    return NextResponse.json(
      { year, rows },
      { headers: { "cache-control": "public, max-age=600, s-maxage=86400" } }
    );
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Parserfout", { status: 500 });
  }
}
