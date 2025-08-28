'use client'
import { useState } from 'react'

export default function PricingPage(){
  const [busy,setBusy] = useState(false)
  async function buy(){
    setBusy(true)
    try{
      const res = await fetch('/api/stripe/create-checkout-session', { method:'POST' })
      const json = await res.json()
      if(json.ok && json.url) window.location.href = json.url
      else alert(json.message || 'Could not start Stripe session')
    }catch(e){ alert('Network error'); }
    setBusy(false)
  }
  return (
    <section className="container px-4 py-12 space-y-6">
      <h1 className="text-3xl font-semibold">Pricing</h1>
      <div className="card space-y-3 max-w-xl">
        <div className="text-xl font-semibold">PharmaGtN License</div>
        <div className="text-sm opacity-75">€2,500 / year — full access</div>
        <button className="btn btn-primary" onClick={buy} disabled={busy}>{busy?'Processing…':'Buy license'}</button>
        <div className="text-xs opacity-60">Set STRIPE_SECRET_KEY & NEXT_PUBLIC_STRIPE_PRICE_ID in Vercel env.</div>
      </div>
    </section>
  )
}
