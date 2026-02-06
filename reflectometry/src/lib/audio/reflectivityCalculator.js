/**
 * Computes reflectivity metrics from spectral data.
 * Reflectivity = how much sound is reflected back from the tympanic membrane.
 * Higher reflectivity at mid frequencies suggests fluid (effusion).
 */

/**
 * Compute reflectivity curve from transfer function.
 * Normalizes the transfer function to a 0-1 reflectivity scale.
 *
 * @param {Float32Array} transferFunction - H(f) in dB
 * @param {Float32Array} frequencies - Frequency bins in Hz
 * @param {number} minFreq - Lower bound for analysis (default 200)
 * @param {number} maxFreq - Upper bound for analysis (default 8000)
 * @returns {{ frequencies: number[], reflectivity: number[] }}
 */
export function computeReflectivity(transferFunction, frequencies, minFreq = 200, maxFreq = 8000) {
  const freqArr = [];
  const reflArr = [];

  // Find the range of transfer function values for normalization
  let minVal = Infinity;
  let maxVal = -Infinity;

  for (let i = 0; i < frequencies.length; i++) {
    if (frequencies[i] >= minFreq && frequencies[i] <= maxFreq) {
      if (transferFunction[i] > -Infinity && isFinite(transferFunction[i])) {
        minVal = Math.min(minVal, transferFunction[i]);
        maxVal = Math.max(maxVal, transferFunction[i]);
      }
    }
  }

  const range = maxVal - minVal || 1;

  for (let i = 0; i < frequencies.length; i++) {
    if (frequencies[i] >= minFreq && frequencies[i] <= maxFreq) {
      freqArr.push(Math.round(frequencies[i]));
      // Normalize to 0-1 range where higher = more reflection
      const normalized = isFinite(transferFunction[i])
        ? (transferFunction[i] - minVal) / range
        : 0;
      reflArr.push(Math.max(0, Math.min(1, normalized)));
    }
  }

  return { frequencies: freqArr, reflectivity: reflArr };
}

/**
 * Compute reflectivity aggregated by frequency band.
 *
 * @param {number[]} frequencies - Hz values
 * @param {number[]} reflectivity - 0-1 reflectivity values
 * @returns {{ lowBand: number, midBand: number, highBand: number, overall: number }}
 */
export function computeBandReflectivity(frequencies, reflectivity) {
  const bands = {
    low: { sum: 0, count: 0 },   // 200 - 1000 Hz
    mid: { sum: 0, count: 0 },   // 1000 - 4000 Hz
    high: { sum: 0, count: 0 },  // 4000 - 8000 Hz
  };

  for (let i = 0; i < frequencies.length; i++) {
    const f = frequencies[i];
    const r = reflectivity[i];

    if (f >= 200 && f < 1000) {
      bands.low.sum += r;
      bands.low.count++;
    } else if (f >= 1000 && f < 4000) {
      bands.mid.sum += r;
      bands.mid.count++;
    } else if (f >= 4000 && f <= 8000) {
      bands.high.sum += r;
      bands.high.count++;
    }
  }

  const lowBand = bands.low.count > 0 ? bands.low.sum / bands.low.count : 0;
  const midBand = bands.mid.count > 0 ? bands.mid.sum / bands.mid.count : 0;
  const highBand = bands.high.count > 0 ? bands.high.sum / bands.high.count : 0;
  const overall = (lowBand + midBand + highBand) / 3;

  return { lowBand, midBand, highBand, overall };
}

/**
 * Compute the spectral gradient — the slope of reflectivity across frequency.
 * A flat gradient suggests effusion; a steep gradient suggests normal.
 *
 * @param {number[]} frequencies
 * @param {number[]} reflectivity
 * @returns {number} Gradient value (negative = decreasing with frequency = more normal)
 */
export function computeSpectralGradient(frequencies, reflectivity) {
  if (frequencies.length < 2) return 0;

  // Simple linear regression slope
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  const n = frequencies.length;

  for (let i = 0; i < n; i++) {
    const x = Math.log10(frequencies[i]); // log frequency scale
    const y = reflectivity[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}
