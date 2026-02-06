/**
 * Complex FFT implementation for phase-aware spectral processing.
 * Required for Wiener deconvolution which needs both magnitude and phase.
 *
 * Uses the Cooley-Tukey radix-2 DIT algorithm.
 */

/**
 * Compute the complex FFT of a real-valued signal.
 *
 * @param {Float32Array} signal - Time-domain samples (length must be power of 2)
 * @returns {{ real: Float32Array, imag: Float32Array }} Complex spectrum
 */
export function fft(signal) {
  const N = signal.length;

  if (N <= 1) {
    return { real: new Float32Array(signal), imag: new Float32Array(N) };
  }

  // Zero-pad to next power of 2 if needed
  const n = nextPowerOf2(N);
  const padded = new Float32Array(n);
  padded.set(signal);

  // Bit-reversal permutation
  const real = new Float32Array(n);
  const imag = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const j = bitReverse(i, Math.log2(n));
    real[j] = padded[i];
  }

  // Cooley-Tukey butterfly
  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2;
    const angleStep = (-2 * Math.PI) / size;

    for (let i = 0; i < n; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const angle = angleStep * j;
        const twiddleReal = Math.cos(angle);
        const twiddleImag = Math.sin(angle);

        const evenIdx = i + j;
        const oddIdx = i + j + halfSize;

        const tReal = twiddleReal * real[oddIdx] - twiddleImag * imag[oddIdx];
        const tImag = twiddleReal * imag[oddIdx] + twiddleImag * real[oddIdx];

        real[oddIdx] = real[evenIdx] - tReal;
        imag[oddIdx] = imag[evenIdx] - tImag;
        real[evenIdx] = real[evenIdx] + tReal;
        imag[evenIdx] = imag[evenIdx] + tImag;
      }
    }
  }

  return { real, imag };
}

/**
 * Compute the inverse FFT (complex input -> real output).
 *
 * @param {{ real: Float32Array, imag: Float32Array }} spectrum
 * @returns {Float32Array} Time-domain signal
 */
export function ifft(spectrum) {
  const N = spectrum.real.length;

  // Conjugate, FFT, conjugate, divide by N
  const conjugateImag = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    conjugateImag[i] = -spectrum.imag[i];
  }

  const result = fft(new Float32Array(N)); // dummy to get structure
  // Actually: do FFT of conjugated input
  const tempSignal = new Float32Array(N);

  // Pack real and conjugated imag into a signal for FFT
  // Use the linearity: IFFT(X) = conj(FFT(conj(X))) / N
  const conjInput = { real: new Float32Array(spectrum.real), imag: conjugateImag };

  // Manual IFFT via FFT of conjugate
  const padded = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    padded[i] = spectrum.real[i]; // We need to do full complex FFT
  }

  // Simpler approach: swap real/imag, do FFT, swap back, divide by N
  const swapped = fftComplex(spectrum.imag, spectrum.real);

  const output = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    output[i] = swapped.real[i] / N;
  }

  return output;
}

/**
 * Full complex FFT (both real and imaginary input).
 *
 * @param {Float32Array} inputReal
 * @param {Float32Array} inputImag
 * @returns {{ real: Float32Array, imag: Float32Array }}
 */
export function fftComplex(inputReal, inputImag) {
  const N = inputReal.length;
  const n = nextPowerOf2(N);

  const real = new Float32Array(n);
  const imag = new Float32Array(n);

  // Bit-reversal permutation
  for (let i = 0; i < n; i++) {
    const j = bitReverse(i, Math.log2(n));
    real[j] = i < N ? inputReal[i] : 0;
    imag[j] = i < N ? inputImag[i] : 0;
  }

  // Cooley-Tukey butterfly
  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2;
    const angleStep = (-2 * Math.PI) / size;

    for (let i = 0; i < n; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const angle = angleStep * j;
        const twiddleReal = Math.cos(angle);
        const twiddleImag = Math.sin(angle);

        const evenIdx = i + j;
        const oddIdx = i + j + halfSize;

        const tReal = twiddleReal * real[oddIdx] - twiddleImag * imag[oddIdx];
        const tImag = twiddleReal * imag[oddIdx] + twiddleImag * real[oddIdx];

        real[oddIdx] = real[evenIdx] - tReal;
        imag[oddIdx] = imag[evenIdx] - tImag;
        real[evenIdx] = real[evenIdx] + tReal;
        imag[evenIdx] = imag[evenIdx] + tImag;
      }
    }
  }

  return { real, imag };
}

/**
 * Compute magnitude spectrum from complex FFT result.
 *
 * @param {{ real: Float32Array, imag: Float32Array }} spectrum
 * @returns {Float32Array} Magnitude at each bin
 */
export function magnitude(spectrum) {
  const N = spectrum.real.length;
  const mag = new Float32Array(N / 2);
  for (let i = 0; i < N / 2; i++) {
    mag[i] = Math.sqrt(
      spectrum.real[i] * spectrum.real[i] +
      spectrum.imag[i] * spectrum.imag[i]
    );
  }
  return mag;
}

/**
 * Compute phase spectrum from complex FFT result.
 *
 * @param {{ real: Float32Array, imag: Float32Array }} spectrum
 * @returns {Float32Array} Phase in radians at each bin
 */
export function phase(spectrum) {
  const N = spectrum.real.length;
  const ph = new Float32Array(N / 2);
  for (let i = 0; i < N / 2; i++) {
    ph[i] = Math.atan2(spectrum.imag[i], spectrum.real[i]);
  }
  return ph;
}

/**
 * Compute the power spectrum |X(f)|^2.
 *
 * @param {{ real: Float32Array, imag: Float32Array }} spectrum
 * @returns {Float32Array}
 */
export function powerSpectrum(spectrum) {
  const N = spectrum.real.length;
  const power = new Float32Array(N / 2);
  for (let i = 0; i < N / 2; i++) {
    power[i] = spectrum.real[i] * spectrum.real[i] +
               spectrum.imag[i] * spectrum.imag[i];
  }
  return power;
}

// --- Utility functions ---

function nextPowerOf2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function bitReverse(x, bits) {
  let result = 0;
  for (let i = 0; i < bits; i++) {
    result = (result << 1) | (x & 1);
    x >>= 1;
  }
  return result;
}
