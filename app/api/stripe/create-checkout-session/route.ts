export async function POST() {
  const secret = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID
  if(!secret || !priceId){
    return new Response(JSON.stringify({ ok:false, message:'Missing STRIPE_SECRET_KEY or NEXT_PUBLIC_STRIPE_PRICE_ID' }), {
      headers: {'content-type':'application/json'}, status: 200
    })
  }
  // Lazy import only when env present, to avoid bundling issues.
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(secret, { apiVersion: '2024-06-20' as any })
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/app` : 'https://example.com/app',
    cancel_url: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/pricing` : 'https://example.com/pricing',
  })
  return new Response(JSON.stringify({ ok:true, url: session.url }), { headers:{'content-type':'application/json'} })
}
