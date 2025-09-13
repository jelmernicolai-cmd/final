import { NextResponse } from "next/server";
import pdf from "pdf-parse";

export const revalidate = 86400; // 24h

export async function POST(req: Request) {
  try {
    const { url } = (await req.json().catch(()=>({}))) as { url?: string };
    const src = (url ?? process.env.VWS_BIJLAGE_URL)?.trim();
    if (!src) return new NextResponse("Geef 'url' of stel VWS_BIJLAGE_URL in.", { status: 400 });
    if (!/^https?:\/\/.+\.pdf$/i.test(src)) return new NextResponse("URL moet naar een PDF wijzen.", { status: 400 });

    const res = await fetch(src, { headers: { "user-agent": "PharmGtN/1.0" } });
    if (!res.ok) return new NextResponse(`Download mislukt (${res.status})`, { status: 502 });
    const ab = await res.arrayBuffer();
    const data = await pdf(Buffer.from(ab));

    const yearMatch = data.text.match(/20\d{2}/g);
    const year = yearMatch ? parseInt(yearMatch.slice(-1)[0], 10) : new Date().getFullYear();

    const lines = data.text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const headerIdx = lines.findIndex((l) =>
      /geneesmiddel/i.test(l) && /uitgaven/i.test(l) && /zonder/i.test(l) && /gerealiseerd/i.test(l)
    );
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

    if (!rows.length) return new NextResponse("Geen rijen gevonden. Is dit de juiste bijlage?", { status: 422 });

    return NextResponse.json({ year, rows }, { headers: { "cache-control": "public, max-age=600, s-maxage=86400" } });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Parserfout", { status: 500 });
  }
}
