"use client";

import { useAuth } from "@/contexts/AuthContext";
import { getAttemptedPuzzleIds, markPuzzleAttempted } from "@/lib/userProfile";
import { useCallback, useEffect, useState } from "react";

interface UseAttemptedPuzzlesReturn {
  /** Set of puzzle IDs that the user has attempted */
  attemptedPuzzleIds: Set<string>;
  /** Whether the attempted puzzles are still loading */
  isLoading: boolean;
  /** Mark a puzzle as attempted (updates both local state and Firestore) */
  markAttempted: (puzzleId: string) => Promise<void>;
  /** Check if a puzzle has been attempted */
  hasAttempted: (puzzleId: string) => boolean;
  /** Refresh the list of attempted puzzles from Firestore */
  refresh: () => Promise<void>;
}

/**
 * Hook to track which puzzles a user has attempted.
 * Fetches attempted puzzle IDs from Firestore and provides functions to mark puzzles as attempted.
 */
export function useAttemptedPuzzles(): UseAttemptedPuzzlesReturn {
  const { user } = useAuth();
  const [attemptedPuzzleIds, setAttemptedPuzzleIds] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(true);

  const fetchAttemptedPuzzles = useCallback(async () => {
    if (!user) {
      setAttemptedPuzzleIds(new Set());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const ids = await getAttemptedPuzzleIds(user.uid);
      setAttemptedPuzzleIds(ids);
    } catch (err) {
      console.error("Failed to fetch attempted puzzles:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAttemptedPuzzles();
  }, [fetchAttemptedPuzzles]);

  const markAttempted = useCallback(
    async (puzzleId: string) => {
      if (!user) return;

      // Optimistically update local state
      setAttemptedPuzzleIds((prev) => new Set([...prev, puzzleId]));

      try {
        await markPuzzleAttempted(user.uid, puzzleId);
      } catch (err) {
        console.error("Failed to mark puzzle as attempted:", err);
        // Revert on error
        setAttemptedPuzzleIds((prev) => {
          const next = new Set(prev);
          next.delete(puzzleId);
          return next;
        });
      }
    },
    [user]
  );

  const hasAttempted = useCallback(
    (puzzleId: string) => attemptedPuzzleIds.has(puzzleId),
    [attemptedPuzzleIds]
  );

  return {
    attemptedPuzzleIds,
    isLoading,
    markAttempted,
    hasAttempted,
    refresh: fetchAttemptedPuzzles,
  };
}
