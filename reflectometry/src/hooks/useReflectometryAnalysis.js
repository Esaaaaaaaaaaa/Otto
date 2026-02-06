import { useState, useCallback } from 'react';
import { computeSpectrum, averageSpectra, computeTransferFunction, smoothSpectrum } from '../lib/audio/fftAnalysis';
import { computeReflectivity, computeBandReflectivity, computeSpectralGradient } from '../lib/audio/reflectivityCalculator';
import { classifyResult } from '../lib/audio/tympanogramClassifier';

/**
 * Orchestrates the reflectometry workflow:
 * 1. Calibration — capture free-air reference spectra
 * 2. Test — capture ear canal reflections
 * 3. Analysis — compute reflectivity and classify
 */
export function useReflectometryAnalysis() {
  const [calibrationData, setCalibrationData] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);

  /**
   * Run calibration: play multiple chirps in free air and average the captured spectra.
   *
   * @param {object} audioEngine - The useAudioEngine hook instance
   * @param {function} onProgress - Called with progress 0-1
   * @param {number} numChirps - Number of chirps to average (default 3)
   * @returns {Promise<object>} Calibration data
   */
  const runCalibration = useCallback(async (audioEngine, onProgress, numChirps = 3) => {
    setIsAnalyzing(true);
    setTestResults(null);

    try {
      const spectra = [];
      const sampleRate = audioEngine.getSampleRate();

      for (let i = 0; i < numChirps; i++) {
        const { captured } = await audioEngine.playAndCapture();
        const { magnitudes } = await computeSpectrum(captured, sampleRate);
        spectra.push(magnitudes);

        onProgress?.((i + 1) / numChirps);

        // Small delay between chirps
        if (i < numChirps - 1) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      const averagedSpectrum = averageSpectra(spectra);
      const smoothed = smoothSpectrum(averagedSpectrum, 5);

      const data = {
        spectrum: smoothed,
        rawSpectra: spectra,
        sampleRate,
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
   * Run a test: play chirps with phone against ear canal, analyze reflections.
   *
   * @param {object} audioEngine - The useAudioEngine hook instance
   * @param {function} onProgress - Called with progress 0-1
   * @param {string} ear - 'left' or 'right'
   * @param {number} numChirps - Number of chirps to average (default 5)
   * @returns {Promise<object>} Test results
   */
  const runTest = useCallback(async (audioEngine, onProgress, ear = 'left', numChirps = 5) => {
    if (!calibrationData) {
      throw new Error('Calibration required before testing');
    }

    setIsAnalyzing(true);

    try {
      const spectra = [];
      const sampleRate = audioEngine.getSampleRate();

      for (let i = 0; i < numChirps; i++) {
        const { captured } = await audioEngine.playAndCapture();
        const { magnitudes } = await computeSpectrum(captured, sampleRate);
        spectra.push(magnitudes);

        onProgress?.((i + 1) / numChirps);

        // Small delay between chirps
        if (i < numChirps - 1) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      const averagedSpectrum = averageSpectra(spectra);
      const smoothed = smoothSpectrum(averagedSpectrum, 5);

      // Compute transfer function: test - calibration (in dB)
      const transferFunction = computeTransferFunction(smoothed, calibrationData.spectrum);

      // Compute frequencies array
      const fftSize = 4096;
      const frequencies = new Float32Array(smoothed.length);
      const binWidth = sampleRate / fftSize;
      for (let i = 0; i < frequencies.length; i++) {
        frequencies[i] = i * binWidth;
      }

      // Compute reflectivity curve
      const reflectivityData = computeReflectivity(transferFunction, frequencies);

      // Compute band aggregates
      const bands = computeBandReflectivity(
        reflectivityData.frequencies,
        reflectivityData.reflectivity
      );

      // Compute spectral gradient
      const gradient = computeSpectralGradient(
        reflectivityData.frequencies,
        reflectivityData.reflectivity
      );

      // Classify
      const classification = classifyResult(bands, gradient);

      const results = {
        ear,
        classification,
        reflectivity: reflectivityData,
        bands,
        spectralGradient: gradient,
        transferFunction: Array.from(transferFunction),
        spectrum: Array.from(smoothed),
        calibrationSpectrum: Array.from(calibrationData.spectrum),
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

  /**
   * Reset all state for a fresh session.
   */
  const reset = useCallback(() => {
    setCalibrationData(null);
    setTestResults(null);
    setIsAnalyzing(false);
  }, []);

  /**
   * Clear only the test results (keep calibration).
   */
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
