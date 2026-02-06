import { useState, useCallback } from 'react';
import {
  computeComplexSpectrum,
  wienerDeconvolution,
  averageComplexSpectra,
  smoothSpectrum,
} from '../lib/audio/fftAnalysis';
import { computeReflectivity, computeBandReflectivity, computeSpectralGradient } from '../lib/audio/reflectivityCalculator';
import { applySpeculaCompensation } from '../lib/audio/speculaCompensation';
import { alignSignals } from '../lib/audio/crossCorrelation';
import { analyzeNoise, getAdaptiveChirpParams } from '../lib/audio/noiseEstimation';
import { adaptiveNoiseCancellation, adaptiveSystemIdentification, irToFrequencyResponse } from '../lib/audio/adaptiveFilter';

const FFT_SIZE = 4096;

/**
 * Full reflectometry analysis pipeline:
 *   0. Noise check → adaptive parameters
 *   1. Calibration → complex spectra + quality assessment
 *   2. Test → cross-correlation align → adaptive noise cancellation
 *      → Wiener deconvolution → specula compensation → reflectivity
 */
export function useReflectometryAnalysis() {
  const [calibrationData, setCalibrationData] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [noiseProfile, setNoiseProfile] = useState(null);
  const [calibrationQuality, setCalibrationQuality] = useState(null);

  /**
   * Step 0: Measure ambient noise.
   */
  const measureNoise = useCallback(async (audioEngine) => {
    setIsAnalyzing(true);
    try {
      const noiseSamples = await audioEngine.captureNoise(500);
      const sampleRate = audioEngine.getSampleRate();
      const profile = analyzeNoise(noiseSamples, sampleRate);
      setNoiseProfile(profile);
      setIsAnalyzing(false);
      return profile;
    } catch (err) {
      setIsAnalyzing(false);
      throw err;
    }
  }, []);

  /**
   * Step 1: Calibration with quality assessment.
   */
  const runCalibration = useCallback(async (audioEngine, onProgress, numChirps = null) => {
    setIsAnalyzing(true);
    setTestResults(null);

    try {
      const sampleRate = audioEngine.getSampleRate();

      // Use adaptive chirp count if noise profile available
      const adaptiveParams = noiseProfile
        ? getAdaptiveChirpParams(noiseProfile.rms)
        : null;
      const chirpCount = numChirps || adaptiveParams?.numChirps || 3;
      const chirpOptions = adaptiveParams
        ? { duration: adaptiveParams.duration, captureDuration: adaptiveParams.captureWindow }
        : {};

      const complexSpectra = [];
      const rawCaptures = [];

      for (let i = 0; i < chirpCount; i++) {
        const { captured } = await audioEngine.playAndCapture(chirpOptions);

        const spectrum = computeComplexSpectrum(captured, sampleRate, FFT_SIZE);
        complexSpectra.push({ real: spectrum.real, imag: spectrum.imag });
        rawCaptures.push(captured);

        onProgress?.((i + 1) / chirpCount);

        if (i < chirpCount - 1) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      // Coherent averaging
      const averaged = averageComplexSpectra(complexSpectra);

      // Calibration quality check
      const quality = assessCalibrationQuality(complexSpectra, FFT_SIZE);
      setCalibrationQuality(quality);

      const data = {
        complexSpectrum: averaged,
        rawCaptures,
        sampleRate,
        fftSize: FFT_SIZE,
        chirpOptions,
        timestamp: Date.now(),
      };

      setCalibrationData(data);
      setIsAnalyzing(false);
      return data;
    } catch (err) {
      setIsAnalyzing(false);
      throw err;
    }
  }, [noiseProfile]);

  /**
   * Step 2: Test with full pipeline including adaptive filtering.
   */
  const runTest = useCallback(async (audioEngine, onProgress, ear = 'left', numChirps = null, speculaType = '4mm') => {
    if (!calibrationData) {
      throw new Error('Calibration required before testing');
    }

    setIsAnalyzing(true);

    try {
      const sampleRate = audioEngine.getSampleRate();

      const adaptiveParams = noiseProfile
        ? getAdaptiveChirpParams(noiseProfile.rms)
        : null;
      const chirpCount = numChirps || adaptiveParams?.numChirps || 5;
      const chirpOptions = calibrationData.chirpOptions || {};

      const complexSpectra = [];
      const rawCaptures = [];
      let lastEmitted = null;

      for (let i = 0; i < chirpCount; i++) {
        const { captured, emitted } = await audioEngine.playAndCapture(chirpOptions);

        // Cross-correlation alignment: remove propagation delay
        const { aligned } = alignSignals(emitted, captured);

        // Adaptive noise cancellation (like ANC headphones)
        let processed = aligned;
        let noiseReduction = 0;
        if (noiseProfile && noiseProfile.spectralProfile) {
          // Use captured noise samples as reference for NLMS
          const noiseSamples = await audioEngine.captureNoise(100);
          const anc = adaptiveNoiseCancellation(aligned, noiseSamples, {
            filterLength: 128,
            stepSize: 0.3,
          });
          processed = anc.cleaned;
          noiseReduction = anc.noiseReduction_dB;
        }

        const spectrum = computeComplexSpectrum(processed, sampleRate, FFT_SIZE);
        complexSpectra.push({ real: spectrum.real, imag: spectrum.imag });
        rawCaptures.push(processed);
        lastEmitted = emitted;

        onProgress?.((i + 1) / chirpCount);

        if (i < chirpCount - 1) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      // Coherent averaging
      const testSpectrum = averageComplexSpectra(complexSpectra);

      // Wiener deconvolution
      const deconvolved = wienerDeconvolution(
        testSpectrum,
        calibrationData.complexSpectrum
      );

      // Frequency axis
      const halfN = FFT_SIZE / 2;
      const frequencies = new Float32Array(halfN);
      const binWidth = sampleRate / FFT_SIZE;
      for (let i = 0; i < halfN; i++) {
        frequencies[i] = i * binWidth;
      }

      // Specula compensation
      const { compensated, speculaTF } = applySpeculaCompensation(
        deconvolved.magnitude,
        frequencies,
        speculaType
      );

      // Smooth
      const smoothed = smoothSpectrum(compensated, 7);

      // Reflectivity curve
      const reflectivityData = computeReflectivity(
        floatToTransferDB(smoothed),
        frequencies
      );

      // Band aggregates
      const bands = computeBandReflectivity(
        reflectivityData.frequencies,
        reflectivityData.reflectivity
      );

      // Spectral gradient
      const gradient = computeSpectralGradient(
        reflectivityData.frequencies,
        reflectivityData.reflectivity
      );

      // Adaptive system identification — estimate impulse response via NLMS
      const avgCapture = averageTimeDomain(rawCaptures);
      const avgCalCapture = averageTimeDomain(calibrationData.rawCaptures);
      const sysId = adaptiveSystemIdentification(avgCalCapture, avgCapture, {
        filterLength: 512,
        stepSize: 0.5,
      });

      // Convert NLMS impulse response to frequency domain for comparison
      const adaptiveFreqResponse = irToFrequencyResponse(
        sysId.impulseResponse,
        FFT_SIZE,
        sampleRate
      );

      const results = {
        ear,
        speculaType,
        reflectivity: reflectivityData,
        bands,
        spectralGradient: gradient,
        rawMagnitude: Array.from(deconvolved.magnitude),
        compensatedMagnitude: Array.from(smoothed),
        speculaTF: Array.from(speculaTF),
        // Adaptive filter results
        adaptiveFilter: {
          impulseResponse: Array.from(sysId.impulseResponse),
          convergenceCurve: Array.from(sysId.convergenceCurve),
          converged: sysId.converged,
          finalMSE: sysId.finalMSE,
          frequencyResponse: {
            frequencies: Array.from(adaptiveFreqResponse.frequencies),
            magnitude: Array.from(adaptiveFreqResponse.magnitude),
            magnitudeDB: Array.from(adaptiveFreqResponse.magnitudeDB),
          },
        },
        lastCaptureWaveform: rawCaptures[rawCaptures.length - 1]
          ? Array.from(rawCaptures[rawCaptures.length - 1].slice(0, 4096))
          : [],
        lastEmittedWaveform: lastEmitted
          ? Array.from(lastEmitted.slice(0, 4096))
          : [],
        sampleRate,
        timestamp: Date.now(),
      };

      setTestResults(results);
      setSessionHistory((prev) => [...prev, results]);
      setIsAnalyzing(false);
      return results;
    } catch (err) {
      setIsAnalyzing(false);
      throw err;
    }
  }, [calibrationData, noiseProfile]);

  const reset = useCallback(() => {
    setCalibrationData(null);
    setTestResults(null);
    setCalibrationQuality(null);
    setIsAnalyzing(false);
  }, []);

  const clearTest = useCallback(() => {
    setTestResults(null);
  }, []);

  return {
    calibrationData,
    testResults,
    isAnalyzing,
    sessionHistory,
    noiseProfile,
    calibrationQuality,
    measureNoise,
    runCalibration,
    runTest,
    reset,
    clearTest,
  };
}

/**
 * Assess calibration quality by measuring variance across chirp captures.
 */
function assessCalibrationQuality(complexSpectra, fftSize) {
  if (complexSpectra.length < 2) {
    return { consistency: 1, rating: 'unknown', message: 'Need multiple chirps to assess' };
  }

  const halfN = fftSize / 2;
  const n = complexSpectra.length;

  const meanMag = new Float32Array(halfN);
  for (const s of complexSpectra) {
    for (let i = 0; i < halfN; i++) {
      meanMag[i] += Math.sqrt(s.real[i] * s.real[i] + s.imag[i] * s.imag[i]);
    }
  }
  for (let i = 0; i < halfN; i++) meanMag[i] /= n;

  let totalVariance = 0, totalMean = 0;
  for (const s of complexSpectra) {
    for (let i = 0; i < halfN; i++) {
      const mag = Math.sqrt(s.real[i] * s.real[i] + s.imag[i] * s.imag[i]);
      totalVariance += (mag - meanMag[i]) ** 2;
      totalMean += meanMag[i];
    }
  }

  const avgMean = totalMean / (n * halfN);
  const avgVar = totalVariance / (n * halfN);
  const cv = avgMean > 0 ? Math.sqrt(avgVar) / avgMean : 1;
  const consistency = Math.max(0, Math.min(1, 1 - cv));

  let rating, message;
  if (consistency > 0.85) {
    rating = 'excellent';
    message = 'Very consistent — reliable baseline.';
  } else if (consistency > 0.7) {
    rating = 'good';
    message = 'Calibration is acceptable.';
  } else if (consistency > 0.5) {
    rating = 'fair';
    message = 'Some variation. Consider recalibrating somewhere quieter.';
  } else {
    rating = 'poor';
    message = 'High variation. Recalibrate — keep steady, reduce noise.';
  }

  return { consistency, rating, message };
}

function floatToTransferDB(magnitudes) {
  const result = new Float32Array(magnitudes.length);
  for (let i = 0; i < magnitudes.length; i++) {
    result[i] = magnitudes[i] > 0 ? 20 * Math.log10(magnitudes[i]) : -120;
  }
  return result;
}

function averageTimeDomain(captures) {
  if (!captures || captures.length === 0) return new Float32Array(0);
  const maxLen = Math.max(...captures.map((c) => c.length));
  const avg = new Float32Array(maxLen);
  for (const cap of captures) {
    for (let i = 0; i < cap.length; i++) avg[i] += cap[i];
  }
  for (let i = 0; i < maxLen; i++) avg[i] /= captures.length;
  return avg;
}
