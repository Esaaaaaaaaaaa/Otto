import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';

/**
 * Tympanogram-style reflectivity chart.
 * Displays the reflectivity curve across frequency with reference zones.
 */
export default function TympanogramChart({ reflectivityData, classification, height = 250 }) {
  if (!reflectivityData) return null;

  const { frequencies, reflectivity } = reflectivityData;

  // Build chart data, sampling every few points to keep it smooth
  const chartData = [];
  const step = Math.max(1, Math.floor(frequencies.length / 80));
  for (let i = 0; i < frequencies.length; i += step) {
    chartData.push({
      frequency: frequencies[i],
      reflectivity: Number((reflectivity[i] * 100).toFixed(1)),
    });
  }

  const typeColor = classification?.color || '#14b8a6';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-clinical-muted">Reflectivity Curve</h4>
        {classification && (
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: `${typeColor}20`,
              color: typeColor,
              border: `1px solid ${typeColor}40`,
            }}
          >
            {classification.type}
          </span>
        )}
      </div>
      <div className="bg-clinical-bg rounded-lg p-2 border border-clinical-border">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f293755" />

            {/* Normal range reference area */}
            <ReferenceArea
              y1={15}
              y2={45}
              fill="#10b981"
              fillOpacity={0.05}
              stroke="none"
            />

            {/* Effusion threshold */}
            <ReferenceLine
              y={60}
              stroke="#ef444480"
              strokeDasharray="5 5"
              label={{
                value: 'Effusion threshold',
                position: 'right',
                fill: '#ef444480',
                fontSize: 10,
              }}
            />

            <XAxis
              dataKey="frequency"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
              stroke="#1f2937"
              label={{
                value: 'Frequency (Hz)',
                position: 'bottom',
                offset: -5,
                style: { fill: '#6b7280', fontSize: 10 },
              }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#6b7280', fontSize: 10 }}
              stroke="#1f2937"
              label={{
                value: 'Reflectivity (%)',
                angle: -90,
                position: 'insideLeft',
                offset: 15,
                style: { fill: '#6b7280', fontSize: 10 },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '8px',
                color: '#e5e7eb',
                fontSize: '12px',
              }}
              formatter={(value) => [`${value}%`, 'Reflectivity']}
              labelFormatter={(label) => `${label} Hz`}
            />
            <Line
              type="monotone"
              dataKey="reflectivity"
              stroke={typeColor}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={true}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
