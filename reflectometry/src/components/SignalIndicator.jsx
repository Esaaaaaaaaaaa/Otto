import React, { useEffect, useRef, useState } from 'react';

/**
 * Real-time audio level meter.
 * Shows the current microphone input level as a horizontal bar.
 */
export default function SignalIndicator({ audioEngine, active = false }) {
  const [level, setLevel] = useState(0);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!active || !audioEngine?.isInitialized) {
      setLevel(0);
      return;
    }

    const update = () => {
      const data = audioEngine.getRealtimeTimeDomainData();
      if (data) {
        // Compute RMS level
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += data[i] * data[i];
        }
        const rms = Math.sqrt(sum / data.length);
        // Convert to 0-1 scale (with some gain for visibility)
        const normalized = Math.min(1, rms * 5);
        setLevel(normalized);
      }
      animFrameRef.current = requestAnimationFrame(update);
    };

    animFrameRef.current = requestAnimationFrame(update);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [active, audioEngine?.isInitialized]);

  const getColor = () => {
    if (level < 0.3) return 'bg-clinical-accent';
    if (level < 0.7) return 'bg-clinical-success';
    if (level < 0.9) return 'bg-clinical-warning';
    return 'bg-clinical-danger';
  };

  const getLabel = () => {
    if (!active) return 'Inactive';
    if (level < 0.05) return 'No signal';
    if (level < 0.3) return 'Low';
    if (level < 0.7) return 'Good';
    if (level < 0.9) return 'Strong';
    return 'Clipping!';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className="text-clinical-muted">Mic Level</span>
        <span className={`font-medium ${level > 0.9 ? 'text-clinical-danger' : 'text-clinical-text'}`}>
          {getLabel()}
        </span>
      </div>
      <div className="h-3 bg-clinical-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-75 ${getColor()}`}
          style={{ width: `${Math.max(2, level * 100)}%` }}
        />
      </div>
    </div>
  );
}
