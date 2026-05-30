"use client";

import type { EloResult } from "@/hooks/usePuzzleSession";

interface FloatingRatingDeltaProps {
  eloResult: EloResult | null;
  puzzleId: string | undefined;
}

export function FloatingRatingDelta({ eloResult, puzzleId }: FloatingRatingDeltaProps) {
  if (!eloResult || !puzzleId) return null;

  const positive = eloResult.delta >= 0;

  return (
    <div
      key={`float-${puzzleId}-${eloResult.newRating}`}
      className={`absolute left-1/2 top-[55%] pointer-events-none float-up-fade text-6xl sm:text-7xl font-bold z-10 ${
        positive ? "text-success" : "text-destructive"
      }`}
      style={{
        textShadow: "0 0 20px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.6)",
      }}
    >
      {positive ? "+" : ""}
      {eloResult.delta}
    </div>
  );
}
