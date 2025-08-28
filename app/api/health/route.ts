export async function GET() {
  return new Response(JSON.stringify({ ok: true, service: 'pharmgtn', ts: Date.now() }), {
    headers: { 'content-type': 'application/json' },
  })
}
