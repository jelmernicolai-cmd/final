'use client';

import { signIn } from "next-auth/react";
import { Github, LogIn } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-[70vh] grid place-items-center px-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Log in op PharmaGtN</h1>
        <p className="mt-2 text-sm text-gray-600">
          Log in om toegang te krijgen tot de <strong>GtN Portal</strong>.
        </p>

        <div className="mt-6 space-y-3">
          {/* Toon knoppen alleen voor providers die je geconfigureerd hebt */}
          {process.env.NEXT_PUBLIC_GOOGLE_ENABLED !== "false" && (
            <button
              onClick={() => signIn("google", { callbackUrl: "/app" })}
              className="w-full rounded-lg border px-4 py-2 hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <LogIn className="size-4" />
              Log in met Google
            </button>
          )}
          <button
            onClick={() => signIn("github", { callbackUrl: "/app" })}
            className="w-full rounded-lg border px-4 py-2 hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            <Github className="size-4" />
            Log in met GitHub
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-500">
          Nog geen abonnement? Start via <a className="underline" href="/billing">Billing</a>.
        </p>
      </div>
    </div>
  );
}
