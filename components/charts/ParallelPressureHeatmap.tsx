'use client';

import { HeatMapGrid } from 'react-grid-heatmap'; // alternatief: simpele eigen grid (maar dit is klein & clientside)

type Heat = { rows: string[]; cols: string[]; values: number[][] };

export default function ParallelPressureHeatmap({ data }: { data: Heat }) {
  // no handlers out, pure view
  return (
    <div className="rounded border p-4 overflow-x-auto">
      <h3 className="font-semibold mb-2">Paralleldruk heatmap</h3>
      <div className="min-w-[560px]">
        <HeatMapGrid
          data={data.values}
          xLabels={data.cols}
          yLabels={data.rows}
          cellHeight="2rem"
          cellWidth="2.5rem"
          cellStyle={(_x, _y, ratio) => ({
            background: `rgba(37, 99, 235, ${ratio})`,
            color: ratio > 0.5 ? '#fff' : '#111',
            fontSize: '0.8rem',
          })}
          cellRender={(_x, _y, value) => <div>{value}</div>}
        />
      </div>
    </div>
  );
}
