// app/app/waterfall/page.tsx
export default function WaterfallLanding() {
  return (
    <div className="rounded-2xl border bg-white p-6">
      <h1 className="text-xl font-semibold">Waterfall</h1>
      <p className="text-sm text-gray-600 mt-1">
        Upload een Excel via het dashboard, of ga direct naar de analyse als je al geüpload hebt.
      </p>
      <div className="mt-4 flex gap-3">
        <a href="/app" className="rounded-lg border px-4 py-2 hover:bg-gray-50">Naar dashboard</a>
        <a href="/app/waterfall/analyze" className="rounded-lg bg-sky-600 text-white px-4 py-2 hover:bg-sky-700">Open analyse</a>
      </div>
    </div>
  );
}
