/**
 * Noise floor estimation and ambient noise checking.
 *
 * Before calibration, we capture a silent period to estimate
 * the background noise level. This is used to:
 *   1. Warn the user if the environment is too noisy
 *   2. Set the Wiener deconvolution regularization parameter
 *   3. Determine adaptive chirp duration
 */

/**
 * Noise level thresholds (RMS amplitude, 0-1 scale).
 * These are approximate — actual dB SPL depends on mic sensitivity.
 */
export const NOISE_THRESHOLDS = {
  excellent: 0.005,   // Very quiet room
  good: 0.015,        // Normal room
  acceptable: 0.04,   // Moderately noisy
  poor: 0.08,         // Too noisy for reliable measurements
};

/**
 * Analyze a captured noise sample.
 *
 * @param {Float32Array} noiseSamples - Raw microphone samples captured in silence
 * @param {number} sampleRate
 * @returns {{
 *   rms: number,
 *   peak: number,
 *   quality: 'excellent' | 'good' | 'acceptable' | 'poor',
 *   message: string,
 *   isAcceptable: boolean,
 *   spectralProfile: Float32Array
 * }}
 */
export function analyzeNoise(noiseSamples, sampleRate) {
  const N = noiseSamples.length;

  // RMS level
  let sumSquared = 0;
  let peak = 0;
  for (let i = 0; i < N; i++) {
    sumSquared += noiseSamples[i] * noiseSamples[i];
    const abs = Math.abs(noiseSamples[i]);
    if (abs > peak) peak = abs;
  }
  const rms = Math.sqrt(sumSquared / N);

  // Classify quality
  let quality, message;
  if (rms < NOISE_THRESHOLDS.excellent) {
    quality = 'excellent';
    message = 'Environment is very quiet — ideal for testing.';
  } else if (rms < NOISE_THRESHOLDS.good) {
    quality = 'good';
    message = 'Noise level is acceptable.';
  } else if (rms < NOISE_THRESHOLDS.acceptable) {
    quality = 'acceptable';
    message = 'Some background noise detected. Results may be less accurate.';
  } else {
    quality = 'poor';
    message = 'Environment is too noisy. Move to a quieter location for reliable results.';
  }

  // Simple spectral profile of the noise (for Wiener regularization)
  // Use overlapping windows to get a stable estimate
  const fftSize = 1024;
  const hop = 512;
  const numBins = fftSize / 2;
  const spectralProfile = new Float32Array(numBins);
  let numWindows = 0;

  for (let start = 0; start + fftSize <= N; start += hop) {
    for (let i = 0; i < numBins; i++) {
      // Simple power estimate per bin using DFT at this position
      let realSum = 0, imagSum = 0;
      for (let j = 0; j < fftSize; j++) {
        const angle = (-2 * Math.PI * i * j) / fftSize;
        realSum += noiseSamples[start + j] * Math.cos(angle);
        imagSum += noiseSamples[start + j] * Math.sin(angle);
      }
      spectralProfile[i] += (realSum * realSum + imagSum * imagSum) / (fftSize * fftSize);
    }
    numWindows++;
  }

  // Average
  if (numWindows > 0) {
    for (let i = 0; i < numBins; i++) {
      spectralProfile[i] /= numWindows;
    }
  }

  return {
    rms,
    peak,
    quality,
    message,
    isAcceptable: rms < NOISE_THRESHOLDS.poor,
    spectralProfile,
  };
}

/**
 * Determine the optimal chirp duration based on noise level.
 * Noisier environments need longer chirps for better SNR.
 *
 * @param {number} noiseRMS - Background noise RMS level
 * @returns {{ duration: number, numChirps: number, description: string }}
 */
export function getAdaptiveChirpParams(noiseRMS) {
  if (noiseRMS < NOISE_THRESHOLDS.excellent) {
    return {
      duration: 0.08,     // 80ms — short and fast
      numChirps: 3,
      captureWindow: 0.12,
      description: 'Fast mode (quiet environment)',
    };
  } else if (noiseRMS < NOISE_THRESHOLDS.good) {
    return {
      duration: 0.1,      // 100ms — standard
      numChirps: 5,
      captureWindow: 0.15,
      description: 'Standard mode',
    };
  } else if (noiseRMS < NOISE_THRESHOLDS.acceptable) {
    return {
      duration: 0.15,     // 150ms — longer for better SNR
      numChirps: 7,
      captureWindow: 0.2,
      description: 'Extended mode (noisy environment)',
    };
  } else {
    return {
      duration: 0.2,      // 200ms — maximum
      numChirps: 10,
      captureWindow: 0.25,
      description: 'Maximum averaging (very noisy)',
    };
  }
}
