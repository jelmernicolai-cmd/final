// app/api/wgp/parse/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";            // pdf-parse werkt niet op Edge
export const dynamic = "force-dynamic";     // voorkom enige prerender/statische evaluatie

export async function POST(req: Request) {
  try {
    const pdfParse = (await import("pdf-parse")).default;

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdfParse(buffer);

    return NextResponse.json({
      text: data.text,
      numpages: data.numpages,
      info: data.info ?? null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "PDF parse failed" },
      { status: 500 }
    );
  }
}
