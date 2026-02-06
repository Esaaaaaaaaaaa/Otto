/**
 * Specula resonance compensation model.
 *
 * A 4mm otoscope speculum (~25mm long) acts as a quarter-wave resonator.
 * This creates a strong resonant peak around 3-4kHz that distorts the
 * reflectivity measurement. The peak is an artifact of the tube geometry,
 * not the ear canal.
 *
 * Physics:
 *   Quarter-wave resonance: f_res = c / (4 * L)
 *   Where c = speed of sound (~343 m/s), L = tube length
 *   For L = 25mm: f_res ≈ 3430 Hz
 *   Harmonics at odd multiples: 3f, 5f, etc.
 *
 * The tube also has a low-frequency cutoff below which sound cannot
 * propagate efficiently (waveguide cutoff):
 *   f_cutoff ≈ 1.84 * c / (π * d)
 *   For d = 4mm: f_cutoff ≈ 50kHz (well above our range, so all
 *   frequencies propagate as plane waves — good)
 *
 * Compensation approach:
 *   Model the speculum transfer function as a series of Lorentzian peaks
 *   at the resonant frequencies, then divide the measured spectrum by
 *   this model to flatten the tube's contribution.
 */

/**
 * Specula configuration presets.
 * Each speculum has different dimensions affecting its resonance.
 */
export const SPECULA_PRESETS = {
  '4mm': {
    diameter: 4,      // mm
    length: 25,       // mm (typical otoscope speculum)
    label: '4mm Standard',
  },
  '3mm': {
    diameter: 3,
    length: 25,
    label: '3mm Pediatric',
  },
  '5mm': {
    diameter: 5,
    length: 25,
    label: '5mm Large',
  },
  'none': {
    diameter: null,
    length: null,
    label: 'No Speculum',
  },
};

/**
 * Compute the theoretical transfer function of a cylindrical speculum.
 *
 * Models the tube as a lossy quarter-wave resonator with:
 *   - Fundamental resonance at c/(4L)
 *   - Odd harmonics (3rd, 5th)
 *   - Viscothermal losses at the walls (frequency-dependent damping)
 *   - End correction for the open end
 *
 * @param {Float32Array} frequencies - Frequency bins in Hz
 * @param {number} diameter - Speculum inner diameter in mm
 * @param {number} length - Speculum length in mm
 * @returns {Float32Array} Transfer function magnitude (linear scale)
 */
export function computeSpeculaTransferFunction(frequencies, diameter, length) {
  const c = 343;                    // speed of sound, m/s
  const d = diameter / 1000;        // convert mm to m
  const L = length / 1000;          // convert mm to m
  const radius = d / 2;

  // End correction: the effective length is slightly longer than physical length
  // Flanged open end: delta ≈ 0.85 * radius
  const endCorrection = 0.85 * radius;
  const effectiveLength = L + endCorrection;

  // Fundamental quarter-wave resonance
  const f0 = c / (4 * effectiveLength);

  // Viscothermal loss coefficient (Kirchhoff model)
  // Attenuation per unit length: alpha(f) = (1/radius) * sqrt(pi * f * nu / c^2)
  // where nu ≈ 1.5e-5 m^2/s (kinematic viscosity of air)
  const nu = 1.5e-5;

  const tfMag = new Float32Array(frequencies.length);

  for (let i = 0; i < frequencies.length; i++) {
    const f = frequencies[i];
    if (f <= 0) {
      tfMag[i] = 1;
      continue;
    }

    // Viscothermal attenuation (increases with sqrt(f) and 1/radius)
    const alpha = (1 / radius) * Math.sqrt(Math.PI * f * nu) / c;
    const propagationLoss = Math.exp(-alpha * L);

    // Quarter-wave resonator response: sum of resonant modes
    // Each mode has a Lorentzian shape centered at odd multiples of f0
    let resonanceGain = 1;
    const numHarmonics = 3; // fundamental + 2 odd harmonics

    for (let n = 0; n < numHarmonics; n++) {
      const fn = (2 * n + 1) * f0; // odd harmonics: f0, 3f0, 5f0
      const Q = 10 + 5 * n;        // Quality factor (higher harmonics are broader)
      const bandwidth = fn / Q;

      // Lorentzian peak
      const peak = 1 / (1 + Math.pow((f - fn) / (bandwidth / 2), 2));

      // Peak amplitude decreases with harmonic number and viscous losses
      const harmonicAmp = propagationLoss / (2 * n + 1);
      resonanceGain += harmonicAmp * peak * 3; // 3x gain at resonance
    }

    tfMag[i] = resonanceGain;
  }

  return tfMag;
}

/**
 * Apply specula compensation to a reflectivity magnitude spectrum.
 * Divides out the modeled tube resonance to recover the true ear response.
 *
 * @param {Float32Array} magnitudeSpectrum - Measured |H(f)| from Wiener deconvolution
 * @param {Float32Array} frequencies - Frequency bins in Hz
 * @param {string} speculaType - Key from SPECULA_PRESETS (e.g. '4mm')
 * @returns {{ compensated: Float32Array, speculaTF: Float32Array }}
 */
export function applySpeculaCompensation(magnitudeSpectrum, frequencies, speculaType = '4mm') {
  const preset = SPECULA_PRESETS[speculaType];

  // No compensation if no speculum selected
  if (!preset || !preset.diameter) {
    return {
      compensated: new Float32Array(magnitudeSpectrum),
      speculaTF: new Float32Array(frequencies.length).fill(1),
    };
  }

  const speculaTF = computeSpeculaTransferFunction(
    frequencies,
    preset.diameter,
    preset.length
  );

  const compensated = new Float32Array(magnitudeSpectrum.length);

  for (let i = 0; i < magnitudeSpectrum.length; i++) {
    // Divide out the speculum response, with floor to avoid division by tiny values
    const tf = Math.max(speculaTF[i], 0.1);
    compensated[i] = magnitudeSpectrum[i] / tf;
  }

  return { compensated, speculaTF };
}

/**
 * Get the expected resonant frequency for a given speculum.
 *
 * @param {string} speculaType - Key from SPECULA_PRESETS
 * @returns {number} Resonant frequency in Hz, or 0 if no speculum
 */
export function getResonantFrequency(speculaType) {
  const preset = SPECULA_PRESETS[speculaType];
  if (!preset || !preset.diameter) return 0;

  const c = 343;
  const radius = (preset.diameter / 1000) / 2;
  const endCorrection = 0.85 * radius;
  const effectiveLength = (preset.length / 1000) + endCorrection;

  return c / (4 * effectiveLength);
}
