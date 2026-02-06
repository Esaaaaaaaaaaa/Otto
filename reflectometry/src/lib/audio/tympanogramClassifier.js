/**
 * Classifies acoustic reflectometry results into tympanogram-like categories.
 *
 * Note: True tympanometry requires pressure variation. This classifier
 * maps reflectivity patterns to approximate tympanogram types based on
 * acoustic reflectometry principles.
 *
 * Type A  — Normal: good TM mobility, aerated middle ear
 * Type B  — Flat: effusion/fluid behind TM, or TM perforation
 * Type C  — Negative pressure: retracted TM, eustachian tube dysfunction
 * Type As — Stiffness: otosclerosis, tympanosclerosis
 * Type Ad — Hypermobility: flaccid TM, ossicular discontinuity
 */

/**
 * @typedef {Object} ClassificationResult
 * @property {'A' | 'B' | 'C' | 'As' | 'Ad'} type
 * @property {number} confidence - 0 to 1
 * @property {string} description - Short clinical description
 * @property {string} clinicalNote - Longer explanation
 * @property {string} color - UI color for display
 */

/**
 * Classify the reflectometry result.
 *
 * @param {{ lowBand: number, midBand: number, highBand: number, overall: number }} bands
 * @param {number} spectralGradient - Slope of reflectivity across frequency
 * @returns {ClassificationResult}
 */
export function classifyResult(bands, spectralGradient) {
  const { lowBand, midBand, highBand, overall } = bands;

  // Scoring system: each type gets a score based on pattern matching
  const scores = {
    A: 0,
    B: 0,
    C: 0,
    As: 0,
    Ad: 0,
  };

  // Type B (Effusion): High, uniform reflectivity across all bands
  if (overall > 0.6) scores.B += 3;
  if (overall > 0.5) scores.B += 1;
  if (Math.abs(midBand - lowBand) < 0.15 && Math.abs(midBand - highBand) < 0.15) {
    scores.B += 2; // Flat spectrum = effusion signature
  }
  if (Math.abs(spectralGradient) < 0.1) scores.B += 1;

  // Type A (Normal): Low-moderate reflectivity, decreasing with frequency
  if (overall < 0.5 && overall > 0.2) scores.A += 2;
  if (spectralGradient < -0.1) scores.A += 2; // Decreasing = normal
  if (midBand < 0.5) scores.A += 1;
  if (highBand < lowBand) scores.A += 1;

  // Type C (Negative pressure): Moderate reflectivity, shifted peak
  if (overall > 0.35 && overall < 0.65) scores.C += 1;
  if (midBand > lowBand && midBand > highBand) scores.C += 2; // Peak at mid frequencies
  if (spectralGradient > -0.05 && spectralGradient < 0.15) scores.C += 1;

  // Type As (Stiffness): High low-frequency reflectivity
  if (lowBand > 0.6 && lowBand > midBand + 0.1) scores.As += 3;
  if (highBand < lowBand - 0.15) scores.As += 1;
  if (spectralGradient < -0.2) scores.As += 1;

  // Type Ad (Hypermobility): Very low reflectivity at low frequencies
  if (lowBand < 0.2) scores.Ad += 2;
  if (overall < 0.25) scores.Ad += 2;
  if (highBand > lowBand + 0.2) scores.Ad += 1;
  if (spectralGradient > 0.15) scores.Ad += 1;

  // Find the winning type
  const maxScore = Math.max(...Object.values(scores));
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  let type = 'A';
  for (const [key, value] of Object.entries(scores)) {
    if (value === maxScore) {
      type = key;
      break;
    }
  }

  const confidence = totalScore > 0 ? Math.min(maxScore / totalScore * 1.5, 1) : 0.5;

  return {
    type,
    confidence,
    ...getTypeInfo(type),
  };
}

function getTypeInfo(type) {
  const types = {
    A: {
      description: 'Type A — Normal',
      clinicalNote:
        'Reflectivity pattern is consistent with a normally aerated middle ear space and mobile tympanic membrane. The acoustic impedance mismatch is within expected range.',
      color: '#10b981', // green
    },
    B: {
      description: 'Type B — Suggestive of Effusion',
      clinicalNote:
        'High, uniform reflectivity across frequency bands suggests fluid in the middle ear space. This pattern is commonly seen with serous or mucoid effusion. Clinical correlation with otoscopy and/or formal tympanometry is recommended.',
      color: '#ef4444', // red
    },
    C: {
      description: 'Type C — Negative Pressure',
      clinicalNote:
        'Moderate reflectivity with a mid-frequency peak suggests negative middle ear pressure, consistent with eustachian tube dysfunction or early-stage effusion. The retracted tympanic membrane alters the acoustic response.',
      color: '#f59e0b', // amber
    },
    As: {
      description: 'Type As — Increased Stiffness',
      clinicalNote:
        'Elevated low-frequency reflectivity suggests increased stiffness of the tympanic membrane or ossicular chain. This pattern may be seen with tympanosclerosis or early otosclerosis.',
      color: '#f97316', // orange
    },
    Ad: {
      description: 'Type Ad — Hypermobility',
      clinicalNote:
        'Very low reflectivity, especially at lower frequencies, suggests a hypermobile or flaccid tympanic membrane. This may indicate ossicular discontinuity or a healed perforation with a thin membrane.',
      color: '#8b5cf6', // purple
    },
  };

  return types[type] || types.A;
}
