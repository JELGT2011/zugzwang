"use client";

import { fetchPuzzlesNearRating } from "@/lib/puzzles";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

interface UseRandomPuzzleOptions {
  /** Rating range ± from target (default: 100) */
  range?: number;
  /** Exclude this puzzle ID from results */
  excludeId?: string;
}

interface UseRandomPuzzleReturn {
  /** Navigate to a random puzzle near the given rating */
  goToRandomPuzzle: () => Promise<void>;
  /** Whether a puzzle is currently being fetched */
  isLoading: boolean;
}

/**
 * Hook to navigate to a random puzzle near the player's ELO rating.
 * Shared between /puzzles and /puzzles/[id] pages.
 */
export function useRandomPuzzle(
  puzzleElo: number | undefined,
  options: UseRandomPuzzleOptions = {}
): UseRandomPuzzleReturn {
  const { range = 100, excludeId } = options;
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const goToRandomPuzzle = useCallback(async () => {
    if (!puzzleElo) return;

    setIsLoading(true);
    try {
      // Fetch a few puzzles to pick from randomly
      const result = await fetchPuzzlesNearRating(puzzleElo, {
        range,
        pageSize: 10,
      });

      // Filter out the excluded puzzle if specified
      const availablePuzzles = excludeId
        ? result.puzzles.filter((p) => p.id !== excludeId)
        : result.puzzles;

      if (availablePuzzles.length > 0) {
        const randomPuzzle =
          availablePuzzles[Math.floor(Math.random() * availablePuzzles.length)];
        router.push(`/puzzles/${randomPuzzle.id}`);
      } else if (result.puzzles.length > 0) {
        // If all were excluded, just use the original list
        const randomPuzzle =
          result.puzzles[Math.floor(Math.random() * result.puzzles.length)];
        router.push(`/puzzles/${randomPuzzle.id}`);
      }
    } catch (err) {
      console.error("Failed to fetch random puzzle:", err);
    } finally {
      setIsLoading(false);
    }
  }, [puzzleElo, range, excludeId, router]);

  return {
    goToRandomPuzzle,
    isLoading,
  };
}
