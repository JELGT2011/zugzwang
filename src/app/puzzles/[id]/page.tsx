"use client";

import PuzzleBoard from "@/components/PuzzleBoard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePuzzleStore } from "@/stores";
import {
  getDifficultyFromRating,
  DIFFICULTY_RANGES,
  THEME_DISPLAY_NAMES,
  type PuzzleTheme,
} from "@/types/puzzle";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Lightbulb,
  RotateCcw,
  Trophy,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PuzzlePage() {
  const params = useParams();
  const router = useRouter();
  const puzzleId = params.id as string;

  const {
    puzzles,
    currentPuzzle,
    puzzleStatus,
    hintsUsed,
    showSolution,
    setPuzzles,
    getPuzzleById,
    startPuzzle,
    useHint: requestHint,
    showPuzzleSolution,
    resetPuzzle,
    nextPuzzle,
  } = usePuzzleStore();

  // Load puzzles if not loaded
  useEffect(() => {
    async function loadPuzzles() {
      try {
        const response = await fetch("/api/puzzles");
        if (response.ok) {
          const data = await response.json();
          setPuzzles(data.puzzles || []);
        }
      } catch (error) {
        console.error("Failed to load puzzles:", error);
      }
    }

    if (puzzles.length === 0) {
      loadPuzzles();
    }
  }, [puzzles.length, setPuzzles]);

  // Start puzzle when puzzle data is available
  useEffect(() => {
    if (puzzles.length > 0 && puzzleId) {
      const puzzle = getPuzzleById(puzzleId);
      if (puzzle && (!currentPuzzle || currentPuzzle.id !== puzzleId)) {
        startPuzzle(puzzle);
      }
    }
  }, [puzzles, puzzleId, getPuzzleById, startPuzzle, currentPuzzle]);

  const puzzle = getPuzzleById(puzzleId);

  if (!puzzle) {
    return (
      <main className="py-8 min-h-screen">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">Puzzle Not Found</h2>
            <p className="text-muted-foreground">
              The puzzle you&apos;re looking for doesn&apos;t exist.
            </p>
            <Link href="/puzzles">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Puzzles
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const difficulty = getDifficultyFromRating(puzzle.rating);
  const difficultyInfo = DIFFICULTY_RANGES[difficulty];

  const handleNextPuzzle = () => {
    const next = nextPuzzle();
    if (next) {
      router.push(`/puzzles/${next.id}`);
    }
  };

  const handleHint = () => {
    const hintSquare = requestHint();
    if (hintSquare) {
      // The hint is handled by the PuzzleBoard component through the store
      console.log("Hint: Start from", hintSquare);
    }
  };

  return (
    <main className="py-6 min-h-screen">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/puzzles">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Puzzles
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              style={{
                borderColor: difficultyInfo.color,
                color: difficultyInfo.color,
              }}
            >
              Rating: {puzzle.rating}
            </Badge>
            <Badge
              style={{
                backgroundColor: `${difficultyInfo.color}20`,
                color: difficultyInfo.color,
              }}
            >
              {difficultyInfo.label}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 max-w-[1200px] mx-auto">
          {/* Puzzle Board */}
          <div className="flex-1 min-w-0 flex justify-center">
            <div className="w-full max-w-[600px]">
              <PuzzleBoard puzzle={puzzle} />
            </div>
          </div>

          {/* Side Panel */}
          <div className="lg:w-[320px] shrink-0 space-y-4">
            {/* Status Card */}
            <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
              <div className="space-y-4">
                {/* Status indicator */}
                <div className="text-center py-3">
                  {puzzleStatus === "playing" && (
                    <div className="space-y-2">
                      <p className="text-lg font-medium">Your Turn</p>
                      <p className="text-sm text-muted-foreground">
                        Find the best move
                      </p>
                    </div>
                  )}
                  {puzzleStatus === "success" && (
                    <div className="space-y-2">
                      <Trophy className="w-12 h-12 mx-auto text-success" />
                      <p className="text-lg font-medium text-success">
                        Puzzle Solved!
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {hintsUsed === 0
                          ? "Perfect! No hints used."
                          : `Solved with ${hintsUsed} hint${hintsUsed > 1 ? "s" : ""}`}
                      </p>
                    </div>
                  )}
                  {puzzleStatus === "failed" && (
                    <div className="space-y-2">
                      <XCircle className="w-12 h-12 mx-auto text-destructive" />
                      <p className="text-lg font-medium text-destructive">
                        {showSolution ? "Solution Shown" : "Incorrect Move"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Try again or view the solution
                      </p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2">
                  {puzzleStatus === "playing" && (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleHint}
                        className="w-full"
                      >
                        <Lightbulb className="w-4 h-4 mr-2" />
                        Get Hint {hintsUsed > 0 && `(${hintsUsed} used)`}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={showPuzzleSolution}
                        className="w-full text-muted-foreground"
                      >
                        Show Solution
                      </Button>
                    </>
                  )}

                  {(puzzleStatus === "success" || puzzleStatus === "failed") && (
                    <>
                      <Button onClick={handleNextPuzzle} className="w-full">
                        Next Puzzle
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={resetPuzzle}
                        className="w-full"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>

            {/* Puzzle Info Card */}
            <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
              <h3 className="font-semibold mb-3">Puzzle Info</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID</span>
                  <span className="font-mono">{puzzle.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Moves</span>
                  <span>{puzzle.moves.length - 1} to solve</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Played</span>
                  <span>{puzzle.nbPlays.toLocaleString()} times</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Popularity</span>
                  <span>{puzzle.popularity}%</span>
                </div>

                {puzzle.gameUrl && (
                  <a
                    href={puzzle.gameUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    View Original Game
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </Card>

            {/* Themes Card */}
            <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
              <h3 className="font-semibold mb-3">Themes</h3>
              <div className="flex flex-wrap gap-1.5">
                {puzzle.themes.map((theme) => (
                  <Link
                    key={theme}
                    href={`/puzzles?theme=${theme}`}
                    className="inline-block"
                  >
                    <Badge
                      variant="secondary"
                      className="text-xs hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      {THEME_DISPLAY_NAMES[theme as PuzzleTheme] || theme}
                    </Badge>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

