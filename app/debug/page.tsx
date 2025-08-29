export const dynamic = 'force-dynamic';

export default function Debug() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-2 text-sm">
      <h1 className="text-xl font-semibold">Debug</h1>
      <div>Now: {new Date().toISOString()}</div>
      <div>Env NEXT_PUBLIC_BUILD_ID: {process.env.NEXT_PUBLIC_BUILD_ID ?? '(not set)'}</div>
      <div>Features flags: NL v2 / EN v2</div>
      <div>Nav: expects “NAV v2” label in header</div>
    </div>
  );
}
