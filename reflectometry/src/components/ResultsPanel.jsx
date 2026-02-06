import React from 'react';
import { RotateCcw, ArrowRight, Activity } from 'lucide-react';
import TympanogramChart from './TympanogramChart';

/**
 * Step 3: Results panel.
 * Displays the classification, reflectivity curve, and clinical notes.
 */
export default function ResultsPanel({
  results,
  onTestAgain,
  onTestOtherEar,
  onRecalibrate,
}) {
  if (!results) return null;

  const { classification, reflectivity, bands, ear } = results;

  return (
    <div className="panel-enter space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div
          className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: `${classification.color}15` }}
        >
          <Activity className="w-10 h-10" style={{ color: classification.color }} />
        </div>
        <div>
          <h2
            className="text-2xl font-bold"
            style={{ color: classification.color }}
          >
            {classification.description}
          </h2>
          <p className="text-sm text-clinical-muted mt-1 capitalize">
            {ear} ear
          </p>
        </div>
      </div>

      {/* Confidence */}
      <div className="bg-clinical-surface border border-clinical-border rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-clinical-muted">Confidence</span>
          <span className="font-medium text-clinical-text">
            {Math.round(classification.confidence * 100)}%
          </span>
        </div>
        <div className="h-2 bg-clinical-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${classification.confidence * 100}%`,
              backgroundColor: classification.color,
            }}
          />
        </div>
      </div>

      {/* Reflectivity Chart */}
      <TympanogramChart
        reflectivityData={reflectivity}
        classification={classification}
        height={220}
      />

      {/* Band Reflectivity */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Low', sublabel: '200-1kHz', value: bands.lowBand },
          { label: 'Mid', sublabel: '1-4kHz', value: bands.midBand },
          { label: 'High', sublabel: '4-8kHz', value: bands.highBand },
        ].map((band) => (
          <div
            key={band.label}
            className="bg-clinical-surface border border-clinical-border rounded-xl p-3 text-center"
          >
            <p className="text-xs text-clinical-muted">{band.label}</p>
            <p className="text-lg font-bold text-clinical-heading mt-0.5">
              {Math.round(band.value * 100)}%
            </p>
            <p className="text-[10px] text-clinical-muted">{band.sublabel}</p>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onTestAgain}
            className="py-3 px-4 bg-clinical-accent hover:bg-clinical-accent-dim text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Test Again
          </button>
          <button
            onClick={onTestOtherEar}
            className="py-3 px-4 bg-clinical-surface border border-clinical-accent text-clinical-accent hover:bg-clinical-accent/10 font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            Other Ear
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onRecalibrate}
          className="w-full py-2.5 px-4 border border-clinical-border text-clinical-muted hover:text-clinical-text hover:border-clinical-muted rounded-xl transition-colors text-sm"
        >
          New Calibration
        </button>
      </div>
    </div>
  );
}
