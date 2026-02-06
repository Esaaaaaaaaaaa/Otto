/**
 * Adaptive filtering for acoustic reflectometry.
 *
 * Uses NLMS (Normalized Least Mean Squares) — the same algorithm used
 * in active noise-cancelling headphones, echo cancellation, and hearing aids.
 *
 * Two modes:
 *   1. Noise cancellation: removes ambient noise from captured signal
 *      using the noise profile as a reference.
 *   2. System identification: estimates the ear canal impulse response
 *      by adaptively modeling the channel between emitted chirp and capture.
 *
 * NLMS update rule:
 *   w(n+1) = w(n) + mu * e(n) * x(n) / (||x(n)||^2 + eps)
 *
 * Where:
 *   w     = filter tap weights (impulse response estimate)
 *   mu    = step size (0 < mu < 2, controls convergence speed vs stability)
 *   e(n)  = d(n) - w^T * x(n) = error signal
 *   x(n)  = input reference vector
 *   eps   = regularization to prevent division by zero
 */

/**
 * NLMS adaptive filter.
 *
 * @param {Float32Array} reference - Reference/input signal (what we want to model or cancel)
 * @param {Float32Array} desired - Desired/target signal (what we captured)
 * @param {object} options
 * @param {number} options.filterLength - Number of taps (default 256)
 * @param {number} options.stepSize - NLMS step size mu (default 0.5)
 * @param {number} options.eps - Regularization constant (default 1e-6)
 * @returns {{
 *   output: Float32Array,    // Filter output (estimate of desired)
 *   error: Float32Array,     // Error signal (desired - output) = cleaned signal in ANC mode
 *   weights: Float32Array,   // Final filter weights (impulse response estimate)
 *   convergenceCurve: Float32Array  // MSE over time (for diagnostics)
 * }}
 */
export function nlmsFilter(reference, desired, options = {}) {
  const {
    filterLength = 256,
    stepSize = 0.5,
    eps = 1e-6,
  } = options;

  const N = Math.min(reference.length, desired.length);
  const w = new Float32Array(filterLength); // filter weights
  const output = new Float32Array(N);
  const error = new Float32Array(N);

  // Convergence tracking (downsampled)
  const convergenceBlockSize = 64;
  const numBlocks = Math.ceil(N / convergenceBlockSize);
  const convergenceCurve = new Float32Array(numBlocks);
  let blockMSE = 0;
  let blockIdx = 0;

  for (let n = 0; n < N; n++) {
    // Build input vector x(n) = [ref(n), ref(n-1), ..., ref(n-L+1)]
    let xNormSq = 0;
    let y = 0;

    for (let k = 0; k < filterLength; k++) {
      const idx = n - k;
      const xk = idx >= 0 ? reference[idx] : 0;
      y += w[k] * xk;
      xNormSq += xk * xk;
    }

    output[n] = y;
    const e = desired[n] - y;
    error[n] = e;

    // NLMS weight update
    const normFactor = stepSize / (xNormSq + eps);
    for (let k = 0; k < filterLength; k++) {
      const idx = n - k;
      const xk = idx >= 0 ? reference[idx] : 0;
      w[k] += normFactor * e * xk;
    }

    // Track convergence
    blockMSE += e * e;
    if ((n + 1) % convergenceBlockSize === 0 || n === N - 1) {
      const samplesInBlock = (n % convergenceBlockSize) + 1;
      convergenceCurve[blockIdx] = blockMSE / samplesInBlock;
      blockMSE = 0;
      blockIdx++;
    }
  }

  return { output, error, weights: w, convergenceCurve };
}

/**
 * Apply adaptive noise cancellation to a captured signal.
 *
 * Uses the noise spectral profile to generate a synthetic noise reference,
 * then runs NLMS to subtract it from the captured signal.
 *
 * This is the same principle as ANC headphones:
 *   - Reference mic picks up ambient noise
 *   - Adaptive filter models the path from noise source to ear
 *   - Filter output is subtracted from the signal
 *
 * In our case, the noise profile from the pre-test noise check serves
 * as our "reference microphone" signal estimate.
 *
 * @param {Float32Array} captured - Raw captured microphone signal
 * @param {Float32Array} noiseReference - Noise sample captured during noise check
 * @param {object} options
 * @param {number} options.filterLength - NLMS filter taps (default 128)
 * @param {number} options.stepSize - Adaptation rate (default 0.3)
 * @returns {{ cleaned: Float32Array, noiseReduction_dB: number }}
 */
export function adaptiveNoiseCancellation(captured, noiseReference, options = {}) {
  const {
    filterLength = 128,
    stepSize = 0.3,
  } = options;

  // If no noise reference available, return signal as-is
  if (!noiseReference || noiseReference.length === 0) {
    return { cleaned: new Float32Array(captured), noiseReduction_dB: 0 };
  }

  // Tile the noise reference to match captured length
  const noiseRef = new Float32Array(captured.length);
  for (let i = 0; i < captured.length; i++) {
    noiseRef[i] = noiseReference[i % noiseReference.length];
  }

  // NLMS: reference = noise, desired = captured signal
  // The error signal = captured - (noise contribution) = cleaned signal
  const { error } = nlmsFilter(noiseRef, captured, {
    filterLength,
    stepSize,
    eps: 1e-6,
  });

  // Compute noise reduction achieved
  let inputPower = 0;
  let outputPower = 0;
  for (let i = 0; i < captured.length; i++) {
    inputPower += captured[i] * captured[i];
    outputPower += error[i] * error[i];
  }
  inputPower /= captured.length;
  outputPower /= captured.length;

  const noiseReduction_dB = inputPower > 0 && outputPower > 0
    ? 10 * Math.log10(inputPower / outputPower)
    : 0;

  return { cleaned: error, noiseReduction_dB };
}

/**
 * Adaptive system identification — estimate the ear canal impulse response.
 *
 * Uses the emitted chirp as reference and the captured signal as desired.
 * The NLMS filter adapts its weights to model the acoustic path
 * (speaker → speculum → ear canal → TM reflection → mic).
 *
 * The learned filter weights ARE the impulse response estimate.
 * This complements the Wiener deconvolution by providing:
 *   - A time-domain impulse response (useful for delay analysis)
 *   - Adaptive regularization (NLMS step size handles noise naturally)
 *   - Real-time convergence tracking
 *
 * @param {Float32Array} emitted - The chirp signal that was played
 * @param {Float32Array} captured - The microphone capture
 * @param {object} options
 * @param {number} options.filterLength - IR length estimate in taps (default 512)
 * @param {number} options.stepSize - NLMS mu (default 0.5)
 * @returns {{
 *   impulseResponse: Float32Array,
 *   convergenceCurve: Float32Array,
 *   finalMSE: number,
 *   converged: boolean
 * }}
 */
export function adaptiveSystemIdentification(emitted, captured, options = {}) {
  const {
    filterLength = 512,
    stepSize = 0.5,
  } = options;

  const { weights, convergenceCurve } = nlmsFilter(emitted, captured, {
    filterLength,
    stepSize,
    eps: 1e-8,
  });

  // Check convergence: compare first quarter MSE to last quarter MSE
  const quarter = Math.floor(convergenceCurve.length / 4);
  let earlyMSE = 0, lateMSE = 0;
  for (let i = 0; i < quarter; i++) {
    earlyMSE += convergenceCurve[i];
    lateMSE += convergenceCurve[convergenceCurve.length - 1 - i];
  }
  earlyMSE /= quarter || 1;
  lateMSE /= quarter || 1;

  const finalMSE = lateMSE;
  const converged = earlyMSE > 0 ? (lateMSE / earlyMSE) < 0.3 : false;

  return {
    impulseResponse: weights,
    convergenceCurve,
    finalMSE,
    converged,
  };
}

/**
 * Compute the frequency-domain transfer function from an impulse response.
 * Converts the NLMS-estimated IR to a magnitude spectrum for visualization.
 *
 * @param {Float32Array} impulseResponse - Time-domain IR (filter weights)
 * @param {number} fftSize - FFT size for frequency resolution
 * @param {number} sampleRate
 * @returns {{ frequencies: Float32Array, magnitude: Float32Array, magnitudeDB: Float32Array }}
 */
export function irToFrequencyResponse(impulseResponse, fftSize, sampleRate) {
  const halfN = fftSize / 2;
  const frequencies = new Float32Array(halfN);
  const magnitude = new Float32Array(halfN);
  const magnitudeDB = new Float32Array(halfN);
  const binWidth = sampleRate / fftSize;

  // DFT of the impulse response at each frequency bin
  for (let k = 0; k < halfN; k++) {
    frequencies[k] = k * binWidth;

    let realSum = 0;
    let imagSum = 0;
    const L = Math.min(impulseResponse.length, fftSize);

    for (let n = 0; n < L; n++) {
      const angle = (-2 * Math.PI * k * n) / fftSize;
      realSum += impulseResponse[n] * Math.cos(angle);
      imagSum += impulseResponse[n] * Math.sin(angle);
    }

    magnitude[k] = Math.sqrt(realSum * realSum + imagSum * imagSum);
    magnitudeDB[k] = magnitude[k] > 0 ? 20 * Math.log10(magnitude[k]) : -120;
  }

  return { frequencies, magnitude, magnitudeDB };
}
