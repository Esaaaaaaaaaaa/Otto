/**
 * Generates a logarithmic sine sweep (chirp) signal.
 * Sweeps from startFreq to endFreq over the given duration.
 * Used as the probe signal for acoustic reflectometry.
 */

/**
 * Apply a Tukey window to taper the edges of the signal,
 * preventing spectral leakage and audible clicks.
 */
function applyTukeyWindow(buffer, alpha = 0.1) {
  const N = buffer.length;
  const taperLen = Math.floor((alpha * N) / 2);

  for (let i = 0; i < taperLen; i++) {
    const w = 0.5 * (1 - Math.cos((Math.PI * i) / taperLen));
    buffer[i] *= w;
    buffer[N - 1 - i] *= w;
  }

  return buffer;
}

/**
 * Generate a logarithmic chirp signal as a Float32Array.
 *
 * @param {number} sampleRate - Audio sample rate (e.g. 44100)
 * @param {number} startFreq - Start frequency in Hz (default 200)
 * @param {number} endFreq - End frequency in Hz (default 8000)
 * @param {number} duration - Duration in seconds (default 0.1)
 * @param {number} amplitude - Signal amplitude 0-1 (default 0.8)
 * @returns {Float32Array} PCM samples
 */
export function generateChirpSamples(
  sampleRate,
  startFreq = 200,
  endFreq = 8000,
  duration = 0.1,
  amplitude = 0.8
) {
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new Float32Array(numSamples);
  const logRatio = Math.log(endFreq / startFreq);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const phase =
      ((2 * Math.PI * startFreq * duration) / logRatio) *
      (Math.exp((t / duration) * logRatio) - 1);
    buffer[i] = amplitude * Math.sin(phase);
  }

  applyTukeyWindow(buffer, 0.1);
  return buffer;
}

/**
 * Create an AudioBuffer from chirp samples.
 *
 * @param {AudioContext} audioContext
 * @param {object} options - Optional overrides for chirp parameters
 * @returns {AudioBuffer}
 */
export function createChirpBuffer(audioContext, options = {}) {
  const {
    startFreq = 200,
    endFreq = 8000,
    duration = 0.1,
    amplitude = 0.8,
  } = options;

  const sampleRate = audioContext.sampleRate;
  const samples = generateChirpSamples(
    sampleRate,
    startFreq,
    endFreq,
    duration,
    amplitude
  );

  const audioBuffer = audioContext.createBuffer(1, samples.length, sampleRate);
  audioBuffer.copyToChannel(samples, 0);
  return audioBuffer;
}
