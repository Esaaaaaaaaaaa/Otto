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

export default function WaveformChart({
  audioEngine,
  live = false,
  staticData = null,
  title = 'Waveform',
  height = 160,
  color = '#d97706',
}) {
  const [chartData, setChartData] = useState([]);
  const animFrameRef = useRef(null);
  const frameCountRef = useRef(0);

  useEffect(() => {
    if (!live || !audioEngine?.isInitialized) return;

    const update = () => {
      frameCountRef.current++;
      if (frameCountRef.current % 2 === 0) {
        const data = audioEngine.getRealtimeTimeDomainData();
        if (data) {
          const sampleRate = audioEngine.getSampleRate();
          const points = [];
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
    <div className="space-y-1.5">
      <h4 className="text-xs font-medium text-clinical-muted uppercase tracking-wide">{title}</h4>
      <div className="bg-clinical-surface rounded p-2 border border-clinical-border">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e5ea" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#7c8494', fontSize: 10 }}
              tickFormatter={(v) => `${parseFloat(v).toFixed(0)}ms`}
              stroke="#e2e5ea"
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#7c8494', fontSize: 10 }}
              stroke="#e2e5ea"
              domain={[-1, 1]}
              tickFormatter={(v) => v.toFixed(1)}
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
