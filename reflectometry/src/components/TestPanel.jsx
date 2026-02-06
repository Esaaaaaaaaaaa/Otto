import React, { useState } from 'react';
import { Ear, Loader2, AlertCircle } from 'lucide-react';
import { SPECULA_PRESETS } from '../lib/audio/speculaCompensation';
import SignalIndicator from './SignalIndicator';
import FrequencyChart from './FrequencyChart';
import WaveformChart from './WaveformChart';

/**
 * Step 2: Test panel.
 * Select ear + speculum type, then test with dual real-time viz.
 */
export default function TestPanel({
  audioEngine,
  analysis,
  onComplete,
  onRecalibrate,
}) {
  const [ear, setEar] = useState('left');
  const [specula, setSpecula] = useState('4mm');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | testing | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleTest = async () => {
    try {
      setStatus('testing');
      setProgress(0);

      const results = await analysis.runTest(audioEngine, (p) => {
        setProgress(p);
      }, ear, null, specula);

      onComplete(results);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Test failed');
    }
  };

  return (
    <div className="panel-enter space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-clinical-accent/10 flex items-center justify-center">
          <Ear className="w-8 h-8 text-clinical-accent" />
        </div>
        <h2 className="text-xl font-bold text-clinical-heading">Ear Canal Test</h2>
        <p className="text-sm text-clinical-muted max-w-sm mx-auto">
          Attach the speculum, position against the ear canal, and tap test.
        </p>
      </div>

      {/* Noise info badge */}
      {analysis.noiseProfile && (
        <div className="flex items-center justify-center gap-2 text-xs text-clinical-muted">
          <span className={`inline-block w-2 h-2 rounded-full ${
            analysis.noiseProfile.quality === 'excellent' || analysis.noiseProfile.quality === 'good'
              ? 'bg-clinical-success'
              : analysis.noiseProfile.quality === 'acceptable'
                ? 'bg-clinical-warning'
                : 'bg-clinical-danger'
          }`} />
          <span>Adaptive filtering active — noise: {analysis.noiseProfile.quality}</span>
        </div>
      )}

      {/* Ear selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-clinical-text">Select Ear</label>
        <div className="grid grid-cols-2 gap-3">
          {['left', 'right'].map((side) => (
            <button
              key={side}
              onClick={() => setEar(side)}
              disabled={status === 'testing'}
              className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all capitalize
                ${ear === side
                  ? 'border-clinical-accent bg-clinical-accent/10 text-clinical-accent'
                  : 'border-clinical-border bg-clinical-surface text-clinical-muted hover:border-clinical-muted'
                }
                disabled:opacity-50`}
            >
              {side} Ear
            </button>
          ))}
        </div>
      </div>

      {/* Speculum selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-clinical-text">Speculum Size</label>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(SPECULA_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => setSpecula(key)}
              disabled={status === 'testing'}
              className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all
                ${specula === key
                  ? 'border-clinical-accent bg-clinical-accent/10 text-clinical-accent'
                  : 'border-clinical-border bg-clinical-surface text-clinical-muted hover:border-clinical-muted'
                }
                disabled:opacity-50`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {status === 'error' && (
        <div className="bg-clinical-danger/10 border border-clinical-danger/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-clinical-danger flex-shrink-0 mt-0.5" />
          <p className="text-sm text-clinical-danger">{errorMsg}</p>
        </div>
      )}

      {/* Testing progress + dual viz */}
      {status === 'testing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-clinical-accent">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">
              Testing... {Math.round(progress * 100)}%
            </span>
          </div>
          <div className="h-2 bg-clinical-border rounded-full overflow-hidden">
            <div
              className="h-full bg-clinical-accent rounded-full transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <SignalIndicator audioEngine={audioEngine} active={true} />
          {/* Dual real-time viz: waveform + frequency as two separate graphs */}
          <WaveformChart audioEngine={audioEngine} live={true} title="Waveform" height={120} />
          <FrequencyChart audioEngine={audioEngine} live={true} title="Frequency Spectrum" height={120} />
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-3">
        {/* Big test button */}
        <div className="flex justify-center">
          <button
            onClick={handleTest}
            disabled={status === 'testing'}
            className="relative w-24 h-24 rounded-full bg-clinical-accent hover:bg-clinical-accent-dim disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg transition-all active:scale-95"
          >
            {status === 'testing' && (
              <span className="absolute inset-0 rounded-full border-2 border-clinical-accent pulse-ring" />
            )}
            {status === 'testing' ? (
              <Loader2 className="w-8 h-8 mx-auto animate-spin" />
            ) : (
              'TEST'
            )}
          </button>
        </div>

        <button
          onClick={onRecalibrate}
          disabled={status === 'testing'}
          className="w-full py-2.5 px-4 border border-clinical-border text-clinical-muted hover:text-clinical-text hover:border-clinical-muted rounded-xl transition-colors text-sm disabled:opacity-50"
        >
          Re-calibrate
        </button>
      </div>
    </div>
  );
}
