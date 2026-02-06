import { useState, useRef, useCallback } from 'react';
import { createChirpBuffer } from '../lib/audio/chirpGenerator';

/**
 * Core Web Audio API hook for acoustic reflectometry.
 * Manages AudioContext, microphone access, chirp playback, and capture.
 */
export function useAudioEngine() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState(null);

  const audioContextRef = useRef(null);
  const micStreamRef = useRef(null);
  const analyserRef = useRef(null);
  const micSourceRef = useRef(null);

  /**
   * Initialize the AudioContext and request microphone permission.
   * Must be called from a user gesture (button tap).
   */
  const initialize = useCallback(async () => {
    try {
      setError(null);

      // Create AudioContext
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: 44100 });

      // Resume if suspended (iOS Safari requirement)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Request microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // Set up analyser for real-time visualization
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.3;

      // Connect microphone to analyser
      const micSource = ctx.createMediaStreamSource(stream);
      micSource.connect(analyser);

      audioContextRef.current = ctx;
      micStreamRef.current = stream;
      analyserRef.current = analyser;
      micSourceRef.current = micSource;

      setIsInitialized(true);
      setHasPermission(true);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access to use this tool.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.');
      } else {
        setError(`Audio initialization failed: ${err.message}`);
      }
      setHasPermission(false);
    }
  }, []);

  /**
   * Play a chirp and capture the response from the microphone.
   * Returns both the emitted chirp samples and the captured mic samples.
   *
   * @param {object} options - Chirp parameters
   * @returns {Promise<{ emitted: Float32Array, captured: Float32Array }>}
   */
  const playAndCapture = useCallback(async (options = {}) => {
    const ctx = audioContextRef.current;
    const analyser = analyserRef.current;

    if (!ctx || !analyser) {
      throw new Error('Audio engine not initialized');
    }

    // Resume context if needed
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    setIsPlaying(true);
    setIsCapturing(true);

    try {
      const chirpBuffer = createChirpBuffer(ctx, options);
      const chirpDuration = chirpBuffer.duration;
      const captureMs = (options.captureDuration || 0.15) * 1000;

      // Create and play the chirp
      const source = ctx.createBufferSource();
      source.buffer = chirpBuffer;
      source.connect(ctx.destination);

      // Set up capture using ScriptProcessorNode
      // (widely supported; AudioWorklet is better but more complex)
      const capturedChunks = [];
      const scriptNode = ctx.createScriptProcessor(4096, 1, 1);
      const micSource = micSourceRef.current;

      // Create a separate connection for capture
      const captureAnalyser = ctx.createAnalyser();
      captureAnalyser.fftSize = 4096;
      micSource.connect(captureAnalyser);

      let capturing = true;

      scriptNode.onaudioprocess = (event) => {
        if (capturing) {
          const inputData = event.inputBuffer.getChannelData(0);
          capturedChunks.push(new Float32Array(inputData));
        }
      };

      captureAnalyser.connect(scriptNode);
      scriptNode.connect(ctx.destination); // Required for processing to occur

      // Start playback
      source.start(0);

      // Wait for chirp + capture window
      await new Promise((resolve) =>
        setTimeout(resolve, chirpDuration * 1000 + captureMs)
      );

      // Stop capturing
      capturing = false;
      scriptNode.disconnect();
      captureAnalyser.disconnect(scriptNode);

      // Combine captured chunks
      const totalLength = capturedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const captured = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of capturedChunks) {
        captured.set(chunk, offset);
        offset += chunk.length;
      }

      // Get the emitted chirp samples
      const emitted = new Float32Array(chirpBuffer.length);
      chirpBuffer.copyFromChannel(emitted, 0);

      setIsPlaying(false);
      setIsCapturing(false);

      return { emitted, captured };
    } catch (err) {
      setIsPlaying(false);
      setIsCapturing(false);
      throw err;
    }
  }, []);

  /**
   * Get real-time frequency data from the analyser (for visualization).
   * @returns {Float32Array | null}
   */
  const getRealtimeFrequencyData = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return null;

    const data = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(data);
    return data;
  }, []);

  /**
   * Get real-time time-domain data (for signal level indicator).
   * @returns {Float32Array | null}
   */
  const getRealtimeTimeDomainData = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return null;

    const data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);
    return data;
  }, []);

  /**
   * Get the current sample rate.
   */
  const getSampleRate = useCallback(() => {
    return audioContextRef.current?.sampleRate || 44100;
  }, []);

  /**
   * Clean up all audio resources.
   */
  const cleanup = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    micSourceRef.current = null;
    setIsInitialized(false);
    setHasPermission(false);
    setIsPlaying(false);
    setIsCapturing(false);
  }, []);

  return {
    isInitialized,
    hasPermission,
    isPlaying,
    isCapturing,
    error,
    initialize,
    playAndCapture,
    getRealtimeFrequencyData,
    getRealtimeTimeDomainData,
    getSampleRate,
    cleanup,
  };
}
