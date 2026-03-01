"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface AudioData {
  volume: number;
  frequencies: number[];
  waveform: number[];
  isActive: boolean;
}

export function useAudioAnalyzer() {
  const [isListening, setIsListening] = useState(false);
  const [audioData, setAudioData] = useState<AudioData>({
    volume: 0,
    frequencies: [],
    waveform: [],
    isActive: false,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const analyze = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const waveformData = new Uint8Array(analyser.fftSize);

    const tick = () => {
      analyser.getByteFrequencyData(frequencyData);
      analyser.getByteTimeDomainData(waveformData);

      let sum = 0;
      for (let i = 0; i < waveformData.length; i++) {
        const val = (waveformData[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / waveformData.length);
      const volume = Math.min(rms * 3, 1);

      const step = Math.floor(frequencyData.length / 64);
      const frequencies: number[] = [];
      for (let i = 0; i < 64; i++) {
        frequencies.push(frequencyData[i * step] / 255);
      }

      const wStep = Math.floor(waveformData.length / 128);
      const waveform: number[] = [];
      for (let i = 0; i < 128; i++) {
        waveform.push((waveformData[i * wStep] - 128) / 128);
      }

      setAudioData({
        volume,
        frequencies,
        waveform,
        isActive: volume > 0.01,
      });

      animationRef.current = requestAnimationFrame(tick);
    };

    tick();
  }, []);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      streamRef.current = stream;
      sourceRef.current = source;

      setIsListening(true);
      analyze();
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }, [analyze]);

  const stopListening = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;

    setIsListening(false);
    setAudioData({
      volume: 0,
      frequencies: [],
      waveform: [],
      isActive: false,
    });
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (sourceRef.current) sourceRef.current.disconnect();
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return { isListening, audioData, startListening, stopListening };
}
