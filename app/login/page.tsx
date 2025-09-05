'use client';

import { FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Github, LogIn } from "lucide-react";

type Providers = Record<string, { id: string; name: string; type: string }>;

export default function LoginPage() {
  const [providers, setProviders] = useState<Providers>({});
  const [loading, setLoading] = useState(false);
  const [credError, setCredError] = useState<string | null>(null);
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/app";
  const nextAuthError = sp.get("error"); // bijv. OAuthSignin, OAuthCallback, etc.

  useEffect(() => {
    // Haal de providers op die je in lib/auth-options.ts hebt geconfigureerd
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((data) => setProviders(data || {}))
      .catch(() => setProviders({}));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCredError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    setLoading(false);
    if (res?.error) {
      setCredError("Inloggen mislukt. Controleer je gegevens.");
    } else {
      // bij succes: doorsturen naar de portal
      window.location.href = callbackUrl;
    }
  }

  return (
    <div className="min-h-[70vh] grid place-items-center px-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Log in op PharmaGtN</h1>
        <p className="mt-2 text-sm text-gray-600">
          Log in om toegang te krijgen tot de <strong>GtN Portal</strong>.
        </p>

        {/* Eventuele NextAuth fout (van OAuth) tonen */}
        {nextAuthError && (
          <p className="mt-4 text-sm text-red-600">
            Er ging iets mis bij het inloggen ({nextAuthError}). Probeer het opnieuw.
          </p>
        )}

        <div className="mt-6 space-y-3">
          {/* Toon knoppen alleen als de provider is geconfigureerd */}
          {"google" in providers && (
            <button
              onClick={() => signIn("google", { callbackUrl })}
              className="w-full rounded-lg border px-4 py-2 hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <LogIn className="size-4" />
              Log in met Google
            </button>
          )}

          {"github" in providers && (
            <button
              onClick={() => signIn("github", { callbackUrl })}
              className="w-full rounded-lg border px-4 py-2 hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <Github className="size-4" />
              Log in met GitHub
            </button>
          )}

          {/* Credentials-provider (alleen als geconfigureerd in lib/auth-options.ts) */}
          {"credentials" in providers && (
            <form onSubmit={onSubmit} className="space-y-3 pt-2 border-t">
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="jij@bedrijf.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Wachtwoord</label>
                <input
                  name="password"
                  type="password"
                  required
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="••••••••"
                />
              </div>
              {credError && <p className="text-sm text-red-600">{credError}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg border px-4 py-2 hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <LogIn className="size-4" />
                {loading ? "Bezig..." : "Log in"}
              </button>
              <p className="mt-1 text-xs text-gray-500">
                Demo (lokaal): <code>demo@pharmagtn.local</code> / <code>demo123</code> (via env instelbaar).
              </p>
            </form>
          )}
        </div>

        <p className="mt-6 text-xs text-gray-500">
          Nog geen abonnement? Start via <a className="underline" href="/billing">Billing</a>.
        </p>
      </div>
    </div>
  );
}
