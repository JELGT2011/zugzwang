"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useAttemptedPuzzles } from "@/hooks/useAttemptedPuzzles";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useVictoryEffects } from "@/hooks/useVictoryEffects";
import {
  calculateNewElo,
  calculateRatingDelta,
  getPuzzleResult,
  type GameResult,
} from "@/lib/elo";
import { updateUserElo } from "@/lib/userProfile";
import { usePuzzleStore } from "@/stores";
import type { Puzzle } from "@/types/puzzle";
import { useCallback, useEffect, useRef, useState } from "react";

export interface EloResult {
  result: GameResult;
  delta: number;
  newRating: number;
}

export interface PuzzleSession {
  eloResult: EloResult | null;
  clearEloResult: () => void;
  isSettled: boolean;
}

export function usePuzzleSession(puzzle: Puzzle | null): PuzzleSession {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { triggerVictory } = useVictoryEffects();
  const { markAttempted } = useAttemptedPuzzles();

  const currentPuzzle = usePuzzleStore((s) => s.currentPuzzle);
  const puzzleStatus = usePuzzleStore((s) => s.puzzleStatus);
  const mistakeCount = usePuzzleStore((s) => s.mistakeCount);
  const showSolution = usePuzzleStore((s) => s.showSolution);
  const startPuzzle = usePuzzleStore((s) => s.startPuzzle);

  const [eloResult, setEloResult] = useState<EloResult | null>(null);
  const [trackedPuzzleId, setTrackedPuzzleId] = useState<string | null>(null);
  const [recordedForId, setRecordedForId] = useState<string | null>(null);
  const victoryTriggeredRef = useRef<string | null>(null);

  // Source-of-truth gate: store and local puzzle must agree before any completion
  // effect runs. Without this, navigating to a new puzzle would briefly see
  // puzzle=B but puzzleStatus=success (from A), re-firing victory + ELO.
  const isSettled = !!puzzle && currentPuzzle?.id === puzzle.id;

  // State-during-render: reset displayed ELO when the puzzle prop changes.
  // (React docs: "Adjusting state when a prop changes" — preferred over a useEffect.)
  if (puzzle && trackedPuzzleId !== puzzle.id) {
    setTrackedPuzzleId(puzzle.id);
    setEloResult(null);
  }

  // State-during-render: one-shot ELO snapshot when puzzle reaches a terminal state.
  // `recordedForId` makes this idempotent across re-renders and persists through
  // "Try Again" (so we don't re-award ELO on retry of the same puzzle).
  if (
    isSettled &&
    puzzle &&
    user &&
    profile?.elos?.puzzle &&
    recordedForId !== puzzle.id &&
    (puzzleStatus === "success" || showSolution)
  ) {
    const result = getPuzzleResult(puzzleStatus === "success", mistakeCount);
    const playerRating = profile.elos.puzzle;
    const delta = calculateRatingDelta(playerRating, puzzle.rating, result);
    const newRating = calculateNewElo(playerRating, puzzle.rating, result);
    setRecordedForId(puzzle.id);
    setEloResult({ result, delta, newRating });
  }

  useEffect(() => {
    if (!puzzle) return;
    if (currentPuzzle?.id === puzzle.id) return;
    startPuzzle(puzzle);
    markAttempted(puzzle.id);
  }, [puzzle, currentPuzzle, startPuzzle, markAttempted]);

  useEffect(() => {
    if (!isSettled || !puzzle) return;
    if (puzzleStatus !== "success") return;
    if (victoryTriggeredRef.current === puzzle.id) return;
    victoryTriggeredRef.current = puzzle.id;
    const timer = setTimeout(() => triggerVictory(), 50);
    return () => clearTimeout(timer);
  }, [isSettled, puzzle, puzzleStatus, triggerVictory]);

  useEffect(() => {
    if (!eloResult || !user) return;
    updateUserElo(user.uid, "puzzle", eloResult.newRating).catch((err) => {
      console.error("Failed to update ELO:", err);
    });
  }, [eloResult, user]);

  const clearEloResult = useCallback(() => {
    setEloResult(null);
  }, []);

  return { eloResult, clearEloResult, isSettled };
}
