"use client";

import confetti from "canvas-confetti";
import { useCallback, useEffect, useRef } from "react";

interface VictoryEffectsOptions {
  /** Whether to play sound (default: true) */
  enableSound?: boolean;
  /** Whether to show confetti (default: true) */
  enableConfetti?: boolean;
  /** Sound volume 0-1 (default: 0.3) */
  volume?: number;
}

/**
 * Hook to trigger victory effects (sound + confetti animation)
 * Call `triggerVictory()` when player wins
 */
export function useVictoryEffects(options: VictoryEffectsOptions = {}) {
  const { enableSound = true, enableConfetti = true, volume = 0.3 } = options;
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext lazily (must be triggered by user interaction)
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  // Play a pleasant victory sound using Web Audio API
  const playVictorySound = useCallback(() => {
    if (!enableSound) return;

    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Create a pleasant "success" chord (C major arpeggio)
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
      const duration = 0.4;

      frequencies.forEach((freq, i) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = freq;

        // Stagger the notes slightly for arpeggio effect
        const startTime = now + i * 0.05;
        const noteVolume = volume * (1 - i * 0.15); // Slightly decrease volume for higher notes

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(noteVolume, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration + 0.1);
      });
    } catch (e) {
      console.warn("Could not play victory sound:", e);
    }
  }, [enableSound, volume, getAudioContext]);

  // Trigger confetti animation
  const triggerConfetti = useCallback(() => {
    if (!enableConfetti) return;

    // Fire confetti from both sides
    const defaults = {
      spread: 60,
      ticks: 100,
      gravity: 1,
      decay: 0.94,
      startVelocity: 30,
      colors: ["#FFD700", "#FFA500", "#FF6347", "#32CD32", "#4169E1", "#9400D3"],
    };

    // Left side burst
    confetti({
      ...defaults,
      particleCount: 40,
      angle: 60,
      origin: { x: 0, y: 0.65 },
    });

    // Right side burst
    confetti({
      ...defaults,
      particleCount: 40,
      angle: 120,
      origin: { x: 1, y: 0.65 },
    });

    // Center burst (delayed slightly)
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 60,
        angle: 90,
        spread: 100,
        origin: { x: 0.5, y: 0.7 },
      });
    }, 150);
  }, [enableConfetti]);

  // Combined trigger function
  const triggerVictory = useCallback(() => {
    playVictorySound();
    triggerConfetti();
  }, [playVictorySound, triggerConfetti]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  return {
    triggerVictory,
    playVictorySound,
    triggerConfetti,
  };
}
