import React, { useState } from 'react';
import { RotateCcw, ArrowRight, Activity, Clock, Layers, Filter } from 'lucide-react';
import TympanogramChart from './TympanogramChart';
import WaveformChart from './WaveformChart';

export default function ResultsPanel({
  results,
  sessionHistory = [],
  onTestAgain,
  onTestOtherEar,
  onRecalibrate,
}) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryIdx, setSelectedHistoryIdx] = useState(null);

  if (!results) return null;

  const { reflectivity, bands, ear, adaptiveFilter, lastCaptureWaveform, lastEmittedWaveform, sampleRate } = results;

  const previousTests = sessionHistory.filter(
    (r) => r.timestamp < results.timestamp && r.ear === ear
  );
  const previousTest = previousTests.length > 0
    ? previousTests[previousTests.length - 1]
    : null;

  const overlayData = showOverlay && previousTest
    ? previousTest.reflectivity
    : null;

  const historyItem = selectedHistoryIdx !== null
    ? sessionHistory[selectedHistoryIdx]
    : null;

  return (
    <div className="panel-enter space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="mx-auto w-16 h-16 rounded-lg flex items-center justify-center bg-clinical-accent/8">
          <Activity className="w-8 h-8 text-clinical-accent" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-clinical-heading">
            Results
          </h2>
          <p className="text-sm text-clinical-muted mt-1 capitalize">
            {ear} ear
          </p>
        </div>
      </div>

      {/* Adaptive filter convergence badge */}
      {adaptiveFilter && (
        <div className={`flex items-center gap-2 justify-center text-xs ${
          adaptiveFilter.converged ? 'text-clinical-success' : 'text-clinical-warning'
        }`}>
          <Filter className="w-3.5 h-3.5" />
          <span>
            Adaptive filter {adaptiveFilter.converged ? 'converged' : 'adapting'}
            {' '}— MSE: {adaptiveFilter.finalMSE.toExponential(1)}
          </span>
        </div>
      )}

      {/* Overlay toggle */}
      {previousTest && (
        <button
          onClick={() => setShowOverlay(!showOverlay)}
          className={`w-full py-2 px-3 rounded-md border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
            showOverlay
              ? 'border-clinical-accent bg-clinical-accent/8 text-clinical-accent'
              : 'border-clinical-border bg-clinical-surface text-clinical-muted hover:border-clinical-muted'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          {showOverlay ? 'Overlay: ON' : 'Compare with previous test'}
        </button>
      )}

      {/* Reflectivity Chart */}
      <TympanogramChart
        reflectivityData={reflectivity}
        overlayData={overlayData}
        overlayLabel="Previous"
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
            className="bg-clinical-surface border border-clinical-border rounded-md p-3 text-center"
          >
            <p className="text-[10px] text-clinical-muted uppercase tracking-wide">{band.label}</p>
            <p className="text-lg font-semibold text-clinical-heading mt-0.5">
              {Math.round(band.value * 100)}%
            </p>
            <p className="text-[10px] text-clinical-muted">{band.sublabel}</p>
          </div>
        ))}
      </div>

      {/* Captured waveform */}
      {lastCaptureWaveform && lastCaptureWaveform.length > 0 && (
        <WaveformChart
          staticData={{
            samples: lastCaptureWaveform,
            sampleRate: sampleRate || 44100,
          }}
          title="Captured Waveform"
          height={120}
          color="#d97706"
        />
      )}

      {/* Emitted waveform */}
      {lastEmittedWaveform && lastEmittedWaveform.length > 0 && (
        <WaveformChart
          staticData={{
            samples: lastEmittedWaveform,
            sampleRate: sampleRate || 44100,
          }}
          title="Emitted Chirp"
          height={100}
          color="#7c3aed"
        />
      )}

      {/* Session History */}
      {sessionHistory.length > 1 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full py-2 px-3 rounded-md border border-clinical-border bg-clinical-surface text-xs font-medium flex items-center justify-center gap-2 text-clinical-muted hover:border-clinical-muted transition-all"
          >
            <Clock className="w-3.5 h-3.5" />
            Session History ({sessionHistory.length} tests)
          </button>

          {showHistory && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sessionHistory.map((item, idx) => {
                const isSelected = selectedHistoryIdx === idx;
                const isCurrent = item.timestamp === results.timestamp;
                const time = new Date(item.timestamp).toLocaleTimeString();

                return (
                  <button
                    key={item.timestamp}
                    onClick={() => {
                      if (isCurrent) return;
                      setSelectedHistoryIdx(isSelected ? null : idx);
                    }}
                    disabled={isCurrent}
                    className={`w-full text-left p-3 rounded-md border text-xs transition-all ${
                      isCurrent
                        ? 'border-clinical-accent/30 bg-clinical-accent/5 text-clinical-accent'
                        : isSelected
                          ? 'border-clinical-accent bg-clinical-accent/8 text-clinical-accent'
                          : 'border-clinical-border bg-clinical-surface text-clinical-muted hover:border-clinical-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">
                        {item.ear} ear — {item.speculaType}
                        {isCurrent && ' (current)'}
                      </span>
                      <span>{time}</span>
                    </div>
                    <div className="flex gap-3 mt-1 text-[10px]">
                      <span>Low: {Math.round(item.bands.lowBand * 100)}%</span>
                      <span>Mid: {Math.round(item.bands.midBand * 100)}%</span>
                      <span>High: {Math.round(item.bands.highBand * 100)}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {historyItem && (
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-clinical-muted text-center">
                Comparing with {new Date(historyItem.timestamp).toLocaleTimeString()} — {historyItem.ear} ear
              </h4>
              <TympanogramChart
                reflectivityData={historyItem.reflectivity}
                overlayData={reflectivity}
                overlayLabel="Current"
                height={180}
              />
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onTestAgain}
            className="py-3 px-4 bg-clinical-accent hover:bg-clinical-accent-dim text-white font-medium rounded-md transition-colors text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Test Again
          </button>
          <button
            onClick={onTestOtherEar}
            className="py-3 px-4 bg-clinical-surface border border-clinical-accent text-clinical-accent hover:bg-clinical-accent/5 font-medium rounded-md transition-colors text-sm flex items-center justify-center gap-2"
          >
            Other Ear
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onRecalibrate}
          className="w-full py-2.5 px-4 border border-clinical-border text-clinical-muted hover:text-clinical-text hover:border-clinical-muted rounded-md transition-colors text-sm"
        >
          New Calibration
        </button>
      </div>
    </div>
  );
}
