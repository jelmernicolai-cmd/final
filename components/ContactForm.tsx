'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [status, setStatus] = useState<'idle'|'sending'|'ok'|'error'>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get('name') || ''),
      email: String(fd.get('email') || ''),
      company: String(fd.get('company') || ''),
      message: String(fd.get('message') || ''),
      locale: 'nl',
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed');
      setStatus('ok');
      e.currentTarget.reset();
    } catch {
      setStatus('error');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <div>
        <label className="block text-sm font-medium">Naam</label>
        <input name="name" required className="mt-1 w-full rounded border p-2" />
      </div>
      <div>
        <label className="block text-sm font-medium">E-mail</label>
        <input name="email" type="email" required className="mt-1 w-full rounded border p-2" />
      </div>
      <div>
        <label className="block text-sm font-medium">Bedrijf</label>
        <input name="company" className="mt-1 w-full rounded border p-2" />
      </div>
      <div>
        <label className="block text-sm font-medium">Bericht</label>
        <textarea name="message" rows={5} required className="mt-1 w-full rounded border p-2" />
      </div>
      <button type="submit" disabled={status==='sending'} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
        {status==='sending' ? 'Verzenden…' : 'Verstuur'}
      </button>
      {status==='ok' && <p className="text-green-700">Dank! We nemen snel contact op.</p>}
      {status==='error' && <p className="text-red-700">Er ging iets mis. Probeer later opnieuw.</p>}
    </form>
  );
}
