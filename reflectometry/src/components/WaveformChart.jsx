import React, { useEffect, useRef, useState } from 'react';
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
 * Real-time waveform (time-domain) visualization.
 * Shows the raw audio waveform from the microphone.
 * Separate from FrequencyChart — this is one of the "two sep graphs".
 */
export default function WaveformChart({
  audioEngine,
  live = false,
  staticData = null,
  title = 'Waveform',
  height = 160,
  color = '#f59e0b',
}) {
  const [chartData, setChartData] = useState([]);
  const animFrameRef = useRef(null);
  const frameCountRef = useRef(0);

  // Live mode: read time-domain data at ~15fps
  useEffect(() => {
    if (!live || !audioEngine?.isInitialized) return;

    const update = () => {
      frameCountRef.current++;
      if (frameCountRef.current % 2 === 0) {
        const data = audioEngine.getRealtimeTimeDomainData();
        if (data) {
          const sampleRate = audioEngine.getSampleRate();
          const points = [];
          // Downsample to ~200 points for chart performance
          const step = Math.max(1, Math.floor(data.length / 200));
          for (let i = 0; i < data.length; i += step) {
            points.push({
              time: ((i / sampleRate) * 1000).toFixed(2),
              amplitude: data[i],
            });
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

  // Static mode: format provided waveform data
  useEffect(() => {
    if (staticData && !live) {
      const { samples, sampleRate } = staticData;
      const points = [];
      const step = Math.max(1, Math.floor(samples.length / 200));
      for (let i = 0; i < samples.length; i += step) {
        points.push({
          time: ((i / sampleRate) * 1000).toFixed(2),
          amplitude: Number(samples[i].toFixed(4)),
        });
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
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f293755" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickFormatter={(v) => `${parseFloat(v).toFixed(0)}ms`}
              stroke="#1f2937"
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 10 }}
              stroke="#1f2937"
              domain={[-1, 1]}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '8px',
                color: '#e5e7eb',
                fontSize: '12px',
              }}
              formatter={(value) => [`${Number(value).toFixed(4)}`, 'Amplitude']}
              labelFormatter={(label) => `${label} ms`}
            />
            <Line
              type="monotone"
              dataKey="amplitude"
              stroke={color}
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
