import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

/**
 * Reflectivity chart with optional overlay of previous test.
 * Displays the raw reflectivity curve across frequency.
 */
export default function TympanogramChart({
  reflectivityData,
  overlayData = null,
  overlayLabel = 'Previous',
  height = 250,
}) {
  if (!reflectivityData) return null;

  const { frequencies, reflectivity } = reflectivityData;

  // Build chart data, sampling every few points to keep it smooth
  const chartData = [];
  const step = Math.max(1, Math.floor(frequencies.length / 80));

  // Build overlay lookup if present
  let overlayMap = null;
  if (overlayData) {
    overlayMap = new Map();
    const oStep = Math.max(1, Math.floor(overlayData.frequencies.length / 80));
    for (let i = 0; i < overlayData.frequencies.length; i += oStep) {
      overlayMap.set(
        Math.round(overlayData.frequencies[i]),
        Number((overlayData.reflectivity[i] * 100).toFixed(1))
      );
    }
  }

  for (let i = 0; i < frequencies.length; i += step) {
    const freq = Math.round(frequencies[i]);
    const point = {
      frequency: freq,
      reflectivity: Number((reflectivity[i] * 100).toFixed(1)),
    };
    if (overlayMap) {
      point.previous = overlayMap.get(freq) ?? null;
    }
    chartData.push(point);
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
              formatter={(value, name) => [
                `${value}%`,
                name === 'previous' ? overlayLabel : 'Current',
              ]}
              labelFormatter={(label) => `${label} Hz`}
            />
            {overlayData && (
              <Legend
                wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }}
              />
            )}
            {/* Previous test overlay (behind current) */}
            {overlayData && (
              <Line
                type="monotone"
                dataKey="previous"
                name={overlayLabel}
                stroke="#6b7280"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}
            {/* Current test */}
            <Line
              type="monotone"
              dataKey="reflectivity"
              name="Current"
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
