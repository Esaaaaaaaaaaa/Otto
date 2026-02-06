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

export default function TympanogramChart({
  reflectivityData,
  overlayData = null,
  overlayLabel = 'Previous',
  height = 250,
}) {
  if (!reflectivityData) return null;

  const { frequencies, reflectivity } = reflectivityData;

  const chartData = [];
  const step = Math.max(1, Math.floor(frequencies.length / 80));

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
    <div className="space-y-1.5">
      <h4 className="text-xs font-medium text-clinical-muted uppercase tracking-wide">Reflectivity Curve</h4>
      <div className="bg-clinical-surface rounded p-2 border border-clinical-border">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e5ea" />
            <XAxis
              dataKey="frequency"
              tick={{ fill: '#7c8494', fontSize: 10 }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
              stroke="#e2e5ea"
              label={{
                value: 'Frequency (Hz)',
                position: 'bottom',
                offset: -5,
                style: { fill: '#7c8494', fontSize: 10 },
              }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#7c8494', fontSize: 10 }}
              stroke="#e2e5ea"
              label={{
                value: 'Reflectivity (%)',
                angle: -90,
                position: 'insideLeft',
                offset: 15,
                style: { fill: '#7c8494', fontSize: 10 },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e5ea',
                borderRadius: '4px',
                color: '#374151',
                fontSize: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
              formatter={(value, name) => [
                `${value}%`,
                name === 'previous' ? overlayLabel : 'Current',
              ]}
              labelFormatter={(label) => `${label} Hz`}
            />
            {overlayData && (
              <Legend
                wrapperStyle={{ fontSize: '11px', color: '#7c8494' }}
              />
            )}
            {overlayData && (
              <Line
                type="monotone"
                dataKey="previous"
                name={overlayLabel}
                stroke="#9ca3af"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}
            <Line
              type="monotone"
              dataKey="reflectivity"
              name="Current"
              stroke="#0f766e"
              strokeWidth={2}
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
