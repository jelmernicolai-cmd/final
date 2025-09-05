'use client';

import { FormEvent, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";

// Koppel domeinen aan provider-id's zoals ze in NextAuth bekend zijn.
// Standaard-id's: 'azure-ad' en 'okta' (NextAuth v4). Als je meerdere tenants gebruikt,
// geef elke provider een custom id in auth-options en map die hier.
const DOMAIN_TO_PROVIDER: Record<string, string> = {
  "contoso.com": "azure-ad",
  "bedrijf.com": "okta",
  // "acme.com": "contoso-azuread-tenant" // voorbeeld custom id
};

export default function LoginPage() {
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/app";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<"sso" | "cred" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const domain = useMemo(() => {
    const d = email.split("@")[1]?.toLowerCase().trim() || "";
    return d;
  }, [email]);

  async function onSso(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!domain) { setErr("Vul je zakelijke e-mail in."); return; }

    const provider = DOMAIN_TO_PROVIDER[domain];
    if (!provider) {
      setErr("Je domein is (nog) niet gekoppeld aan SSO. Neem contact op met je admin.");
      return;
    }
    setLoading("sso");
    await signIn(provider, { callbackUrl });
  }

  // Alleen voor lokaal/dev als je ENABLE_CREDENTIALS_DEV=true hebt gezet:
  async function onCred(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading("cred");
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    setLoading(null);
    if (res?.error) setErr("Inloggen mislukt.");
    else window.location.href = callbackUrl;
  }

  return (
    <div className="min-h-[70vh] grid place-items-center px-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">SSO Login</h1>
        <p className="mt-2 text-sm text-gray-600">
          Log in met je <strong>zakelijke e-mail</strong>. We leiden je door naar je SSO-provider.
        </p>

        {/* SSO via domein-discovery */}
        <form onSubmit={onSso} className="mt-6 space-y-3">
          <div>
            <label className="block text-sm font-medium">Zakelijke e-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              placeholder="jij@bedrijf.com"
              autoComplete="email"
            />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <button
            type="submit"
            disabled={loading === "sso"}
            className="w-full rounded-lg border px-4 py-2 hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            <LogIn className="size-4" />
            {loading === "sso" ? "Bezig..." : "Ga verder met SSO"}
          </button>
        </form>

        {/* Optionele dev-credentials */}
        {process.env.NEXT_PUBLIC_SHOW_DEV_CREDENTIALS === "true" && (
          <form onSubmit={onCred} className="mt-6 space-y-3 border-t pt-4">
            <p className="text-xs text-gray-500">Alleen voor lokale demo/tests.</p>
            <div>
              <label className="block text-sm font-medium">E-mail (dev)</label>
              <input name="email" type="email" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Wachtwoord (dev)</label>
              <input name="password" type="password" className="mt-1 w-full rounded-lg border px-3 py-2" />
            </div>
            <button
              type="submit"
              disabled={loading === "cred"}
              className="w-full rounded-lg border px-4 py-2 hover:bg-gray-50"
            >
              {loading === "cred" ? "Bezig..." : "Login (dev credentials)"}
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-gray-500">
          Nog geen abonnement? Start via <a className="underline" href="/billing">Billing</a>.
        </p>
      </div>
    </div>
  );
}
