/**
 * Cross-correlation for time-delay estimation and signal alignment.
 *
 * When sound travels through a speculum and reflects off the TM, there's
 * a propagation delay. Cross-correlating the emitted chirp with the
 * captured signal finds this delay, so we can time-align before FFT.
 *
 * This prevents phase smearing in the Wiener deconvolution.
 */

/**
 * Compute the cross-correlation between two signals.
 * Returns the correlation values and the lag array.
 *
 * Uses a brute-force approach for moderate-length signals.
 * For our chirp lengths (~4410 samples at 44.1kHz), this is fast enough.
 *
 * @param {Float32Array} reference - The emitted chirp signal
 * @param {Float32Array} captured - The captured microphone signal
 * @param {number} maxLag - Maximum lag to search (in samples). Default: 2000 (~45ms at 44.1kHz)
 * @returns {{ correlation: Float32Array, bestLag: number, bestCorrelation: number }}
 */
export function crossCorrelate(reference, captured, maxLag = 2000) {
  const refLen = reference.length;
  const capLen = captured.length;
  const numLags = 2 * maxLag + 1;
  const correlation = new Float32Array(numLags);

  // Normalize reference energy for normalized cross-correlation
  let refEnergy = 0;
  for (let i = 0; i < refLen; i++) {
    refEnergy += reference[i] * reference[i];
  }
  const refRMS = Math.sqrt(refEnergy / refLen) || 1;

  let bestLag = 0;
  let bestCorr = -Infinity;

  for (let lagIdx = 0; lagIdx < numLags; lagIdx++) {
    const lag = lagIdx - maxLag;
    let sum = 0;
    let capEnergy = 0;
    let count = 0;

    for (let i = 0; i < refLen; i++) {
      const j = i + lag;
      if (j >= 0 && j < capLen) {
        sum += reference[i] * captured[j];
        capEnergy += captured[j] * captured[j];
        count++;
      }
    }

    // Normalized correlation coefficient
    const capRMS = Math.sqrt(capEnergy / (count || 1)) || 1;
    const normalized = count > 0 ? sum / (count * refRMS * capRMS) : 0;
    correlation[lagIdx] = normalized;

    if (normalized > bestCorr) {
      bestCorr = normalized;
      bestLag = lag;
    }
  }

  return { correlation, bestLag, bestCorrelation: bestCorr };
}

/**
 * Align the captured signal to the reference using cross-correlation.
 * Shifts the captured signal so it's time-aligned with the emitted chirp.
 *
 * @param {Float32Array} reference - The emitted chirp
 * @param {Float32Array} captured - The captured mic signal
 * @param {number} maxLag - Maximum lag to search
 * @returns {{ aligned: Float32Array, lag: number, correlation: number }}
 */
export function alignSignals(reference, captured, maxLag = 2000) {
  const { bestLag, bestCorrelation } = crossCorrelate(reference, captured, maxLag);

  // Shift captured signal by -bestLag to align
  const aligned = new Float32Array(captured.length);

  for (let i = 0; i < captured.length; i++) {
    const srcIdx = i + bestLag;
    if (srcIdx >= 0 && srcIdx < captured.length) {
      aligned[i] = captured[srcIdx];
    }
    // else remains 0 (zero-pad edges)
  }

  return {
    aligned,
    lag: bestLag,
    correlation: bestCorrelation,
  };
}

/**
 * Estimate the propagation delay in milliseconds.
 *
 * @param {number} lagSamples - Lag in samples from cross-correlation
 * @param {number} sampleRate
 * @returns {number} Delay in milliseconds
 */
export function lagToMs(lagSamples, sampleRate) {
  return (Math.abs(lagSamples) / sampleRate) * 1000;
}
