/**
 * FFT-based spectral analysis with Wiener deconvolution.
 *
 * Previous approach: spectral subtraction in dB (magnitude only, no phase).
 * New approach: proper Wiener deconvolution in complex domain using our own FFT,
 * which recovers the true impulse response of the ear canal by dividing in the
 * complex frequency domain with regularization to handle noise.
 */

import { fft, magnitude, powerSpectrum } from './complexFFT';

/**
 * Compute the complex FFT spectrum of a time-domain signal.
 * Returns the full complex result plus convenience arrays.
 *
 * @param {Float32Array} signal - Time-domain samples
 * @param {number} sampleRate
 * @param {number} fftSize - Will zero-pad to this size (must be power of 2)
 * @returns {{ real: Float32Array, imag: Float32Array, magnitudes: Float32Array, power: Float32Array, frequencies: Float32Array }}
 */
export function computeComplexSpectrum(signal, sampleRate, fftSize = 4096) {
  // Zero-pad to fftSize
  const padded = new Float32Array(fftSize);
  const copyLen = Math.min(signal.length, fftSize);
  for (let i = 0; i < copyLen; i++) {
    padded[i] = signal[i];
  }

  const spectrum = fft(padded);
  const mag = magnitude(spectrum);
  const power = powerSpectrum(spectrum);

  const halfN = fftSize / 2;
  const frequencies = new Float32Array(halfN);
  const binWidth = sampleRate / fftSize;
  for (let i = 0; i < halfN; i++) {
    frequencies[i] = i * binWidth;
  }

  return {
    real: spectrum.real,
    imag: spectrum.imag,
    magnitudes: mag,
    power,
    frequencies,
  };
}

/**
 * Legacy wrapper: compute magnitude spectrum using OfflineAudioContext.
 * Kept for backward compatibility with the calibration flow.
 *
 * @param {Float32Array} timeDomainData
 * @param {number} sampleRate
 * @param {number} fftSize
 * @returns {Promise<{ frequencies: Float32Array, magnitudes: Float32Array }>}
 */
export async function computeSpectrum(timeDomainData, sampleRate, fftSize = 4096) {
  const result = computeComplexSpectrum(timeDomainData, sampleRate, fftSize);
  // Convert magnitude to dB for backward compat
  const dbMagnitudes = new Float32Array(result.magnitudes.length);
  for (let i = 0; i < result.magnitudes.length; i++) {
    dbMagnitudes[i] = result.magnitudes[i] > 0
      ? 20 * Math.log10(result.magnitudes[i])
      : -120;
  }
  return { frequencies: result.frequencies, magnitudes: dbMagnitudes };
}

/**
 * Wiener deconvolution: recover the ear canal impulse response H(f).
 *
 * Given:
 *   Y(f) = captured signal spectrum (test, phone pressed to ear)
 *   X(f) = reference signal spectrum (calibration, free air)
 *   N    = noise power estimate
 *
 * The Wiener estimate of the channel is:
 *   H_wiener(f) = [X*(f) · Y(f)] / [|X(f)|^2 + lambda]
 *
 * Where:
 *   X*(f) = complex conjugate of X
 *   lambda = regularization parameter (noise power estimate)
 *
 * This avoids the catastrophic noise amplification of naive 1/X(f) inversion
 * at frequency bins where X(f) ≈ 0.
 *
 * @param {{ real: Float32Array, imag: Float32Array }} testSpectrum - Y(f)
 * @param {{ real: Float32Array, imag: Float32Array }} calibrationSpectrum - X(f)
 * @param {number} regularization - lambda, noise floor estimate (default auto-estimated)
 * @returns {{ real: Float32Array, imag: Float32Array, magnitude: Float32Array }}
 */
export function wienerDeconvolution(testSpectrum, calibrationSpectrum, regularization = null) {
  const N = testSpectrum.real.length;
  const halfN = N / 2;

  // Auto-estimate regularization from the noise floor if not provided.
  // Use the median of the calibration power spectrum as a robust estimate.
  if (regularization === null) {
    const calPower = powerSpectrum(calibrationSpectrum);
    const sorted = Array.from(calPower).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    // Set lambda to a fraction of median power — controls the SNR tradeoff.
    // Higher = more smoothing (less noise but lower resolution).
    // 0.01 * median is a good starting point for smartphone mics.
    regularization = Math.max(0.01 * median, 1e-10);
  }

  const hReal = new Float32Array(halfN);
  const hImag = new Float32Array(halfN);
  const hMag = new Float32Array(halfN);

  for (let i = 0; i < halfN; i++) {
    const xr = calibrationSpectrum.real[i];
    const xi = calibrationSpectrum.imag[i];
    const yr = testSpectrum.real[i];
    const yi = testSpectrum.imag[i];

    // X*(f) · Y(f) = (xr - j*xi)(yr + j*yi) = (xr*yr + xi*yi) + j(xr*yi - xi*yr)
    const numReal = xr * yr + xi * yi;
    const numImag = xr * yi - xi * yr;

    // |X(f)|^2 + lambda
    const denom = xr * xr + xi * xi + regularization;

    hReal[i] = numReal / denom;
    hImag[i] = numImag / denom;
    hMag[i] = Math.sqrt(hReal[i] * hReal[i] + hImag[i] * hImag[i]);
  }

  return { real: hReal, imag: hImag, magnitude: hMag };
}

/**
 * Average multiple complex spectra for noise reduction.
 * Averages real and imaginary parts separately (coherent averaging).
 *
 * @param {{ real: Float32Array, imag: Float32Array }[]} spectra
 * @returns {{ real: Float32Array, imag: Float32Array }}
 */
export function averageComplexSpectra(spectra) {
  if (spectra.length === 0) return { real: new Float32Array(0), imag: new Float32Array(0) };

  const N = spectra[0].real.length;
  const avgReal = new Float32Array(N);
  const avgImag = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    let sumR = 0, sumI = 0;
    for (const s of spectra) {
      sumR += s.real[i];
      sumI += s.imag[i];
    }
    avgReal[i] = sumR / spectra.length;
    avgImag[i] = sumI / spectra.length;
  }

  return { real: avgReal, imag: avgImag };
}

/**
 * Average multiple magnitude spectra (incoherent averaging, dB domain).
 * Kept for backward compatibility.
 */
export function averageSpectra(spectra) {
  if (spectra.length === 0) return new Float32Array(0);

  const length = spectra[0].length;
  const result = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (const spectrum of spectra) {
      sum += spectrum[i];
    }
    result[i] = sum / spectra.length;
  }

  return result;
}

/**
 * Smooth a spectrum using a moving average filter.
 */
export function smoothSpectrum(spectrum, windowSize = 5) {
  const result = new Float32Array(spectrum.length);
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < spectrum.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i - halfWindow; j <= i + halfWindow; j++) {
      if (j >= 0 && j < spectrum.length) {
        sum += spectrum[j];
        count++;
      }
    }
    result[i] = sum / count;
  }

  return result;
}

/**
 * Convert dB magnitudes to linear scale.
 */
export function dbToLinear(dbValues) {
  const result = new Float32Array(dbValues.length);
  for (let i = 0; i < dbValues.length; i++) {
    result[i] = Math.pow(10, dbValues[i] / 20);
  }
  return result;
}
