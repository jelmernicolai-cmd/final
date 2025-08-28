export async function POST(request: Request) {
  try {
    // In productie: stuur door naar e-mail / CRM / webhook
    const form = await request.formData()
    const name = String(form.get('name')||'')
    const email = String(form.get('email')||'')
    const message = String(form.get('message')||'')
    if(!name || !email || !message) throw new Error('Missing fields')
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type':'application/json' } })
  } catch (e:any) {
    return new Response(JSON.stringify({ ok: false, message: e?.message || 'Failed' }), { status: 400, headers: { 'content-type':'application/json' } })
  }
}
