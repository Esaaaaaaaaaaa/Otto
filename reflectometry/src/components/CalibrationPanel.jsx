import React, { useState } from 'react';
import { Mic, CheckCircle, AlertCircle, Loader2, Volume2, Shield } from 'lucide-react';
import SignalIndicator from './SignalIndicator';
import FrequencyChart from './FrequencyChart';
import WaveformChart from './WaveformChart';

/**
 * Step 1: Calibration panel.
 * Guided noise check → calibration → quality indicator.
 */
export default function CalibrationPanel({
  audioEngine,
  analysis,
  onComplete,
}) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | initializing | noise_check | calibrating | done | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleStart = async () => {
    try {
      // Initialize audio engine if needed
      if (!audioEngine.isInitialized) {
        setStatus('initializing');
        await audioEngine.initialize();
      }

      // Step 0: Noise check
      setStatus('noise_check');
      await analysis.measureNoise(audioEngine);

      // Step 1: Calibration
      setStatus('calibrating');
      setProgress(0);

      await analysis.runCalibration(audioEngine, (p) => {
        setProgress(p);
      });

      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Calibration failed');
    }
  };

  const noiseProfile = analysis.noiseProfile;
  const calQuality = analysis.calibrationQuality;

  const getNoiseColor = (quality) => {
    switch (quality) {
      case 'excellent': return 'text-clinical-success';
      case 'good': return 'text-clinical-success';
      case 'acceptable': return 'text-clinical-warning';
      case 'poor': return 'text-clinical-danger';
      default: return 'text-clinical-muted';
    }
  };

  const getQualityColor = (rating) => {
    switch (rating) {
      case 'excellent': return 'text-clinical-success border-clinical-success/30 bg-clinical-success/10';
      case 'good': return 'text-clinical-success border-clinical-success/30 bg-clinical-success/10';
      case 'fair': return 'text-clinical-warning border-clinical-warning/30 bg-clinical-warning/10';
      case 'poor': return 'text-clinical-danger border-clinical-danger/30 bg-clinical-danger/10';
      default: return 'text-clinical-muted border-clinical-border bg-clinical-surface';
    }
  };

  return (
    <div className="panel-enter space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-clinical-accent/10 flex items-center justify-center">
          <Mic className="w-8 h-8 text-clinical-accent" />
        </div>
        <h2 className="text-xl font-bold text-clinical-heading">Calibration</h2>
        <p className="text-sm text-clinical-muted max-w-sm mx-auto">
          First, we need to capture a reference measurement in open air to calibrate for your device.
        </p>
      </div>

      {/* Instructions */}
      {status === 'idle' && (
        <div className="bg-clinical-accent/5 border border-clinical-accent/20 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-clinical-accent">Instructions</h3>
          <ol className="text-sm text-clinical-text space-y-2 list-decimal list-inside">
            <li>Hold the phone at arm&apos;s length in open air</li>
            <li>Make sure the environment is relatively quiet</li>
            <li>Tap the button below — you&apos;ll hear short chirp sounds</li>
            <li>Keep still until calibration completes</li>
          </ol>
        </div>
      )}

      {/* Error from audio engine */}
      {audioEngine.error && (
        <div className="bg-clinical-danger/10 border border-clinical-danger/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-clinical-danger flex-shrink-0 mt-0.5" />
          <p className="text-sm text-clinical-danger">{audioEngine.error}</p>
        </div>
      )}

      {/* Calibration error */}
      {status === 'error' && (
        <div className="bg-clinical-danger/10 border border-clinical-danger/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-clinical-danger flex-shrink-0 mt-0.5" />
          <p className="text-sm text-clinical-danger">{errorMsg}</p>
        </div>
      )}

      {/* Noise check in progress */}
      {status === 'noise_check' && (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-clinical-accent">
            <Volume2 className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-medium">Checking ambient noise...</span>
          </div>
          <SignalIndicator audioEngine={audioEngine} active={true} />
        </div>
      )}

      {/* Noise profile result */}
      {noiseProfile && (status === 'calibrating' || status === 'done') && (
        <div className="bg-clinical-surface border border-clinical-border rounded-xl p-3 flex items-center gap-3">
          <Volume2 className={`w-5 h-5 flex-shrink-0 ${getNoiseColor(noiseProfile.quality)}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${getNoiseColor(noiseProfile.quality)}`}>
              Noise: {noiseProfile.quality}
            </p>
            <p className="text-xs text-clinical-muted truncate">{noiseProfile.message}</p>
          </div>
        </div>
      )}

      {/* Calibration progress + dual viz */}
      {(status === 'calibrating' || status === 'initializing') && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-clinical-accent">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">
              {status === 'initializing' ? 'Setting up microphone...' : `Calibrating... ${Math.round(progress * 100)}%`}
            </span>
          </div>
          <div className="h-2 bg-clinical-border rounded-full overflow-hidden">
            <div
              className="h-full bg-clinical-accent rounded-full transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <SignalIndicator audioEngine={audioEngine} active={true} />
          {/* Dual viz: waveform + frequency */}
          <WaveformChart audioEngine={audioEngine} live={true} title="Waveform" height={120} />
          <FrequencyChart audioEngine={audioEngine} live={true} title="Frequency Spectrum" height={120} />
        </div>
      )}

      {/* Calibration quality indicator */}
      {status === 'done' && calQuality && (
        <div className={`border rounded-xl p-4 space-y-3 ${getQualityColor(calQuality.rating)}`}>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold capitalize">
                Calibration: {calQuality.rating}
              </p>
              <p className="text-xs opacity-80">{calQuality.message}</p>
            </div>
          </div>
          {/* Consistency bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Consistency</span>
              <span>{Math.round(calQuality.consistency * 100)}%</span>
            </div>
            <div className="h-2 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-current opacity-60"
                style={{ width: `${calQuality.consistency * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Success message */}
      {status === 'done' && (
        <div className="bg-clinical-success/10 border border-clinical-success/30 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-clinical-success flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-clinical-success">Calibration complete</p>
            <p className="text-xs text-clinical-muted mt-1">
              Reference spectrum captured. You can now proceed to test.
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        {status !== 'done' ? (
          <button
            onClick={handleStart}
            disabled={status === 'calibrating' || status === 'initializing' || status === 'noise_check'}
            className="w-full py-4 px-6 bg-clinical-accent hover:bg-clinical-accent-dim disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-base"
          >
            {status === 'idle' || status === 'error' ? 'Start Calibration' : 'Calibrating...'}
          </button>
        ) : (
          <button
            onClick={onComplete}
            className="w-full py-4 px-6 bg-clinical-accent hover:bg-clinical-accent-dim text-white font-semibold rounded-xl transition-colors text-base"
          >
            Proceed to Test
          </button>
        )}
      </div>
    </div>
  );
}
