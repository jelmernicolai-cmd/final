'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

type Step = { name: string; value: number };

export default function GrossToNetWaterfall({ data }: { data: Step[] }) {
  return (
    <div className="rounded border p-4">
      <h3 className="font-semibold mb-2">GTN-waterfall</h3>
      <div className="h-72">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
