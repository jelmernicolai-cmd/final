// app/login/page.tsx
'use client';

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/app";
  const initialErr = sp.get("error") ? "Inloggen mislukt. Controleer je gegevens." : null;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(initialErr);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");

    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    setLoading(false);

    if (res?.error) {
      setErr("Inloggen mislukt. Controleer je e-mail en wachtwoord.");
      return;
    }
    window.location.href = callbackUrl;
  }

  return (
    <div className="min-h-[70vh] grid place-items-center px-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Log in op PharmaGtN</h1>
        <p className="mt-2 text-sm text-gray-600">
          Log in om toegang te krijgen tot de <strong>GtN Portal</strong>.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div>
            <label className="block text-sm font-medium">E-mail</label>
            <input name="email" type="email" required className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="jij@bedrijf.com" autoComplete="email" />
          </div>
          <div>
            <label className="block text-sm font-medium">Wachtwoord</label>
            <input name="password" type="password" required className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="••••••••" autoComplete="current-password" />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-lg border px-4 py-2 hover:bg-gray-50 flex items-center justify-center gap-2">
            <LogIn className="size-4" /> {loading ? "Bezig..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-500">
          Nog geen abonnement? Start via <a className="underline" href="/billing">Billing</a>.
        </p>
      </div>
    </div>
  );
}
