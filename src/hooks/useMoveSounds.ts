"use client";

import type { Move as ChessMove } from "chess.js";
import { useCallback, useEffect, useMemo } from "react";

export type MoveSoundKind = "move" | "capture" | "wrong";

const SOUND_FILES: Record<MoveSoundKind, string> = {
  move: "/sounds/move.mp3",
  capture: "/sounds/capture.mp3",
  wrong: "/sounds/error.mp3",
};

interface MoveSoundOptions {
  enableSound?: boolean;
  volume?: number;
}

export function useMoveSounds(options: MoveSoundOptions = {}) {
  const { enableSound = true, volume = 0.6 } = options;

  const audioMap = useMemo(() => {
    if (typeof window === "undefined") return null;
    const map: Record<MoveSoundKind, HTMLAudioElement> = {} as Record<MoveSoundKind, HTMLAudioElement>;
    for (const kind of Object.keys(SOUND_FILES) as MoveSoundKind[]) {
      const audio = new Audio(SOUND_FILES[kind]);
      audio.preload = "auto";
      map[kind] = audio;
    }
    return map;
  }, []);

  useEffect(() => {
    if (!audioMap) return;
    for (const audio of Object.values(audioMap)) {
      audio.volume = volume;
    }
  }, [volume, audioMap]);

  const playMoveSound = useCallback(
    (kind: MoveSoundKind) => {
      if (!enableSound || !audioMap) return;
      const original = audioMap[kind];
      if (!original) return;
      try {
        // Clone so overlapping moves (e.g. opponent reply 500ms after player) don't truncate each other
        const clone = original.cloneNode() as HTMLAudioElement;
        clone.volume = volume;
        clone.play().catch(() => {
          // Autoplay restrictions or transient errors - fail silently
        });
      } catch (e) {
        console.warn("Could not play move sound:", e);
      }
    },
    [enableSound, audioMap, volume]
  );

  const playForMove = useCallback(
    (move: ChessMove) => {
      if (!enableSound) return;
      if (move.flags.includes("c") || move.flags.includes("e")) {
        playMoveSound("capture");
        return;
      }
      playMoveSound("move");
    },
    [enableSound, playMoveSound]
  );

  return { playMoveSound, playForMove };
}
