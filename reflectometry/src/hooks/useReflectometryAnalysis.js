import { useState, useCallback } from 'react';
import {
  computeComplexSpectrum,
  wienerDeconvolution,
  averageComplexSpectra,
  smoothSpectrum,
} from '../lib/audio/fftAnalysis';
import { computeReflectivity, computeBandReflectivity, computeSpectralGradient } from '../lib/audio/reflectivityCalculator';
import { applySpeculaCompensation } from '../lib/audio/speculaCompensation';

const FFT_SIZE = 4096;

/**
 * Orchestrates the reflectometry workflow with proper Wiener deconvolution
 * and specula resonance compensation.
 *
 * Pipeline:
 *   1. Calibration: capture free-air chirps → complex FFT → average → store
 *   2. Test: capture ear chirps → complex FFT → average → Wiener deconvolution
 *      against calibration → specula compensation → reflectivity
 */
export function useReflectometryAnalysis() {
  const [calibrationData, setCalibrationData] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);

  /**
   * Run calibration: play chirps in free air, store complex spectra.
   */
  const runCalibration = useCallback(async (audioEngine, onProgress, numChirps = 3) => {
    setIsAnalyzing(true);
    setTestResults(null);

    try {
      const complexSpectra = [];
      const sampleRate = audioEngine.getSampleRate();

      for (let i = 0; i < numChirps; i++) {
        const { captured } = await audioEngine.playAndCapture();

        // Complex FFT — preserves phase information
        const spectrum = computeComplexSpectrum(captured, sampleRate, FFT_SIZE);
        complexSpectra.push({ real: spectrum.real, imag: spectrum.imag });

        onProgress?.((i + 1) / numChirps);

        if (i < numChirps - 1) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      // Coherent averaging of complex spectra
      const averaged = averageComplexSpectra(complexSpectra);

      const data = {
        complexSpectrum: averaged,
        sampleRate,
        fftSize: FFT_SIZE,
        timestamp: Date.now(),
      };

      setCalibrationData(data);
      setIsAnalyzing(false);
      return data;
    } catch (err) {
      setIsAnalyzing(false);
      throw err;
    }
  }, []);

  /**
   * Run a test with Wiener deconvolution and specula compensation.
   *
   * @param {object} audioEngine
   * @param {function} onProgress
   * @param {string} ear - 'left' or 'right'
   * @param {number} numChirps
   * @param {string} speculaType - '4mm', '3mm', '5mm', or 'none'
   */
  const runTest = useCallback(async (audioEngine, onProgress, ear = 'left', numChirps = 5, speculaType = '4mm') => {
    if (!calibrationData) {
      throw new Error('Calibration required before testing');
    }

    setIsAnalyzing(true);

    try {
      const complexSpectra = [];
      const sampleRate = audioEngine.getSampleRate();

      for (let i = 0; i < numChirps; i++) {
        const { captured } = await audioEngine.playAndCapture();

        const spectrum = computeComplexSpectrum(captured, sampleRate, FFT_SIZE);
        complexSpectra.push({ real: spectrum.real, imag: spectrum.imag });

        onProgress?.((i + 1) / numChirps);

        if (i < numChirps - 1) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      // Coherent averaging
      const testSpectrum = averageComplexSpectra(complexSpectra);

      // Wiener deconvolution: H(f) = [X*(f)·Y(f)] / [|X(f)|² + λ]
      // This properly recovers the ear canal transfer function with phase,
      // and the regularization prevents noise blowup at weak frequency bins.
      const deconvolved = wienerDeconvolution(
        testSpectrum,
        calibrationData.complexSpectrum
      );

      // Compute frequency axis
      const halfN = FFT_SIZE / 2;
      const frequencies = new Float32Array(halfN);
      const binWidth = sampleRate / FFT_SIZE;
      for (let i = 0; i < halfN; i++) {
        frequencies[i] = i * binWidth;
      }

      // Apply specula resonance compensation
      // This divides out the tube's quarter-wave resonance (~3-4kHz for 4mm)
      const { compensated, speculaTF } = applySpeculaCompensation(
        deconvolved.magnitude,
        frequencies,
        speculaType
      );

      // Smooth the compensated magnitude
      const smoothed = smoothSpectrum(compensated, 7);

      // Compute reflectivity curve (normalize to 0-1 range)
      const reflectivityData = computeReflectivity(
        // Convert to dB-like scale for the existing reflectivity calculator
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

      const results = {
        ear,
        speculaType,
        reflectivity: reflectivityData,
        bands,
        spectralGradient: gradient,
        rawMagnitude: Array.from(deconvolved.magnitude),
        compensatedMagnitude: Array.from(smoothed),
        speculaTF: Array.from(speculaTF),
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
  }, [calibrationData]);

  const reset = useCallback(() => {
    setCalibrationData(null);
    setTestResults(null);
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
    runCalibration,
    runTest,
    reset,
    clearTest,
  };
}

/**
 * Convert linear magnitude to a pseudo-dB transfer function scale.
 * Used to interface with the existing reflectivity calculator which
 * expects a dB-like input for normalization.
 */
function floatToTransferDB(magnitudes) {
  const result = new Float32Array(magnitudes.length);
  for (let i = 0; i < magnitudes.length; i++) {
    result[i] = magnitudes[i] > 0 ? 20 * Math.log10(magnitudes[i]) : -120;
  }
  return result;
}
