import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

/**
 * Reflectivity chart.
 * Displays the raw reflectivity curve across frequency.
 */
export default function TympanogramChart({ reflectivityData, height = 250 }) {
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

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-clinical-muted">Reflectivity Curve</h4>
      <div className="bg-clinical-bg rounded-lg p-2 border border-clinical-border">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f293755" />
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
              stroke="#14b8a6"
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
