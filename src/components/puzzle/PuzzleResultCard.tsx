"use client";

import { Card } from "@/components/ui/card";
import type { EloResult } from "@/hooks/usePuzzleSession";
import type { PuzzleStatus } from "@/stores/puzzleStore";
import { TrendingDown, TrendingUp, Trophy, XCircle } from "lucide-react";

interface PuzzleResultCardProps {
  puzzleStatus: PuzzleStatus;
  showSolution: boolean;
  mistakeCount: number;
  eloResult: EloResult | null;
}

export function PuzzleResultCard({
  puzzleStatus,
  showSolution,
  mistakeCount,
  eloResult,
}: PuzzleResultCardProps) {
  if (puzzleStatus !== "success" && puzzleStatus !== "failed") return null;

  return (
    <Card className="p-4 bg-card/50 backdrop-blur border-border/50 animate-in fade-in-0 zoom-in-95 duration-300">
      <div className="text-center py-3">
        {puzzleStatus === "success" && (
          <div className="space-y-2">
            <Trophy className="w-12 h-12 mx-auto text-success victory-bounce victory-glow" />
            <p className="text-lg font-medium text-success">Puzzle Solved!</p>
            <p className="text-sm text-muted-foreground">
              {mistakeCount === 0
                ? "Perfect! No mistakes."
                : `Solved with ${mistakeCount} mistake${mistakeCount > 1 ? "s" : ""}`}
            </p>
            {eloResult && <EloDeltaBadge eloResult={eloResult} />}
          </div>
        )}
        {puzzleStatus === "failed" && (
          <div className="space-y-2">
            <XCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="text-lg font-medium text-destructive">
              {showSolution ? "Solution Shown" : "Incorrect Move"}
            </p>
            <p className="text-sm text-muted-foreground">
              {showSolution ? "Better luck next time!" : "Try again or view the solution"}
            </p>
            {eloResult && showSolution && <EloDeltaBadge eloResult={eloResult} />}
          </div>
        )}
      </div>
    </Card>
  );
}

function EloDeltaBadge({ eloResult }: { eloResult: EloResult }) {
  const positive = eloResult.delta >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <div
      className={`flex items-center justify-center gap-1 text-sm font-medium ${
        positive ? "text-success" : "text-destructive"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>
        {positive ? "+" : ""}
        {eloResult.delta}
      </span>
      <span className="text-muted-foreground font-normal">({eloResult.newRating})</span>
    </div>
  );
}
