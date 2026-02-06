import React, { useEffect, useRef, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

/**
 * Real-time frequency spectrum visualization.
 * Can show either live mic data or static spectrum data.
 */
export default function FrequencyChart({
  audioEngine,
  live = false,
  staticData = null,
  title = 'Frequency Spectrum',
  height = 200,
  color = '#14b8a6',
}) {
  const [chartData, setChartData] = useState([]);
  const animFrameRef = useRef(null);
  const frameCountRef = useRef(0);

  // Live mode: read from analyser at ~15fps
  useEffect(() => {
    if (!live || !audioEngine?.isInitialized) return;

    const update = () => {
      frameCountRef.current++;
      // Throttle to ~15fps
      if (frameCountRef.current % 2 === 0) {
        const data = audioEngine.getRealtimeFrequencyData();
        if (data) {
          const sampleRate = audioEngine.getSampleRate();
          const binWidth = sampleRate / (data.length * 2);
          const points = [];

          // Sample every 4th bin to reduce data points
          for (let i = 1; i < data.length; i += 4) {
            const freq = i * binWidth;
            if (freq >= 100 && freq <= 10000) {
              points.push({
                frequency: Math.round(freq),
                magnitude: Math.max(-100, data[i]) + 100, // Shift to positive range
              });
            }
          }
          setChartData(points);
        }
      }
      animFrameRef.current = requestAnimationFrame(update);
    };

    animFrameRef.current = requestAnimationFrame(update);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [live, audioEngine?.isInitialized]);

  // Static mode: format provided data
  useEffect(() => {
    if (staticData && !live) {
      const { frequencies, magnitudes } = staticData;
      const points = [];
      for (let i = 0; i < frequencies.length; i += 4) {
        if (frequencies[i] >= 100 && frequencies[i] <= 10000) {
          points.push({
            frequency: Math.round(frequencies[i]),
            magnitude: Math.max(-100, magnitudes[i]) + 100,
          });
        }
      }
      setChartData(points);
    }
  }, [staticData, live]);

  if (chartData.length === 0 && !live) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-clinical-muted">{title}</h4>
      <div className="bg-clinical-bg rounded-lg p-2 border border-clinical-border">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f293755" />
            <XAxis
              dataKey="frequency"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              stroke="#1f2937"
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 10 }}
              stroke="#1f2937"
              domain={[0, 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '8px',
                color: '#e5e7eb',
                fontSize: '12px',
              }}
              formatter={(value) => [`${value.toFixed(1)} dB`, 'Magnitude']}
              labelFormatter={(label) => `${label} Hz`}
            />
            <Area
              type="monotone"
              dataKey="magnitude"
              stroke={color}
              fill={`${color}40`}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
