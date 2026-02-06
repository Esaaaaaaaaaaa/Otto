/**
 * FFT-based spectral analysis utilities.
 * Uses OfflineAudioContext for precise offline analysis of captured buffers.
 */

/**
 * Compute the magnitude spectrum of a time-domain signal using OfflineAudioContext.
 *
 * @param {Float32Array} timeDomainData - Raw PCM samples
 * @param {number} sampleRate - Sample rate
 * @param {number} fftSize - FFT size (default 4096)
 * @returns {Promise<{ frequencies: Float32Array, magnitudes: Float32Array }>}
 */
export async function computeSpectrum(timeDomainData, sampleRate, fftSize = 4096) {
  const length = Math.max(timeDomainData.length, fftSize);
  const offlineCtx = new OfflineAudioContext(1, length, sampleRate);

  const buffer = offlineCtx.createBuffer(1, timeDomainData.length, sampleRate);
  buffer.copyToChannel(timeDomainData, 0);

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;

  const analyser = offlineCtx.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = 0;

  source.connect(analyser);
  analyser.connect(offlineCtx.destination);
  source.start(0);

  await offlineCtx.startRendering();

  const magnitudes = new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatFrequencyData(magnitudes);

  const frequencies = new Float32Array(analyser.frequencyBinCount);
  const binWidth = sampleRate / fftSize;
  for (let i = 0; i < frequencies.length; i++) {
    frequencies[i] = i * binWidth;
  }

  return { frequencies, magnitudes };
}

/**
 * Average multiple magnitude spectra for noise reduction.
 *
 * @param {Float32Array[]} spectra - Array of magnitude spectra (same length)
 * @returns {Float32Array}
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
 * Compute the transfer function H(f) = Test(f) - Calibration(f).
 * Since magnitudes are in dB, subtraction = division in linear domain.
 *
 * @param {Float32Array} testMagnitudes - Test spectrum in dB
 * @param {Float32Array} calibrationMagnitudes - Calibration spectrum in dB
 * @returns {Float32Array} Transfer function in dB
 */
export function computeTransferFunction(testMagnitudes, calibrationMagnitudes) {
  const length = Math.min(testMagnitudes.length, calibrationMagnitudes.length);
  const result = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    result[i] = testMagnitudes[i] - calibrationMagnitudes[i];
  }

  return result;
}

/**
 * Smooth a spectrum using a moving average filter.
 *
 * @param {Float32Array} spectrum
 * @param {number} windowSize - Number of bins to average (default 5)
 * @returns {Float32Array}
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
 * Convert dB magnitudes to linear scale (0-1 reflectivity).
 *
 * @param {Float32Array} dbValues - Values in dB
 * @returns {Float32Array} Linear values
 */
export function dbToLinear(dbValues) {
  const result = new Float32Array(dbValues.length);
  for (let i = 0; i < dbValues.length; i++) {
    result[i] = Math.pow(10, dbValues[i] / 20);
  }
  return result;
}
