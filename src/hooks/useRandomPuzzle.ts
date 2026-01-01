"use client";

import { fetchPuzzlesNearRating } from "@/lib/puzzles";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

interface UseRandomPuzzleOptions {
  /** Rating range ± from target (default: 100) */
  range?: number;
  /** Exclude this puzzle ID from results */
  excludeId?: string;
  /** Set of puzzle IDs to exclude (e.g., already attempted puzzles) */
  excludeIds?: Set<string>;
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
  const { range = 100, excludeId, excludeIds } = options;
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const goToRandomPuzzle = useCallback(async () => {
    if (!puzzleElo) return;

    setIsLoading(true);
    try {
      // Fetch more puzzles if we have exclusions to filter out
      const hasExclusions = excludeId || (excludeIds && excludeIds.size > 0);
      const pageSize = hasExclusions ? 50 : 10;
      
      const result = await fetchPuzzlesNearRating(puzzleElo, {
        range,
        pageSize,
      });

      // Filter out excluded puzzles
      let availablePuzzles = result.puzzles;
      
      // Filter out single excluded ID (current puzzle)
      if (excludeId) {
        availablePuzzles = availablePuzzles.filter((p) => p.id !== excludeId);
      }
      
      // Filter out set of excluded IDs (attempted puzzles)
      if (excludeIds && excludeIds.size > 0) {
        availablePuzzles = availablePuzzles.filter((p) => !excludeIds.has(p.id));
      }

      if (availablePuzzles.length > 0) {
        const randomPuzzle =
          availablePuzzles[Math.floor(Math.random() * availablePuzzles.length)];
        router.push(`/puzzles/${randomPuzzle.id}`);
      } else if (result.puzzles.length > 0) {
        // If all were excluded, just use the original list (fallback)
        // This ensures users can still get puzzles even if they've done most of them
        const randomPuzzle =
          result.puzzles[Math.floor(Math.random() * result.puzzles.length)];
        router.push(`/puzzles/${randomPuzzle.id}`);
      }
    } catch (err) {
      console.error("Failed to fetch random puzzle:", err);
    } finally {
      setIsLoading(false);
    }
  }, [puzzleElo, range, excludeId, excludeIds, router]);

  return {
    goToRandomPuzzle,
    isLoading,
  };
}
