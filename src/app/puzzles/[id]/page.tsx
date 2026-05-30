"use client";

import PuzzleBoard from "@/components/PuzzleBoard";
import { FloatingRatingDelta } from "@/components/puzzle/FloatingRatingDelta";
import { PuzzleCoachPanel } from "@/components/puzzle/PuzzleCoachPanel";
import { PuzzleDetailsCard } from "@/components/puzzle/PuzzleDetailsCard";
import { PuzzleResultCard } from "@/components/puzzle/PuzzleResultCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAttemptedPuzzles } from "@/hooks/useAttemptedPuzzles";
import { usePushToTalk } from "@/hooks/usePushToTalk";
import { usePuzzleSession } from "@/hooks/usePuzzleSession";
import { useRandomPuzzle } from "@/hooks/useRandomPuzzle";
import { useTurnBasedPuzzleHint } from "@/hooks/useTurnBasedPuzzleHint";
import { useTurnBasedPuzzleQuestion } from "@/hooks/useTurnBasedPuzzleQuestion";
import { useUserProfile } from "@/hooks/useUserProfile";
import { fetchAllPuzzles, fetchPuzzleById } from "@/lib/puzzles";
import { useCoachStore } from "@/stores/coachStore";
import { usePuzzleStore } from "@/stores";
import type { Puzzle } from "@/types/puzzle";
import {
  ArrowLeft,
  Loader2,
  LogIn,
  RotateCcw,
  Shuffle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function PuzzlePage() {
  const params = useParams();
  const puzzleId = params.id as string;
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const {
    puzzles,
    puzzleStatus,
    mistakeCount,
    hintsUsed,
    showSolution,
    setPuzzles,
    getPuzzleById,
    useHint: requestHint,
    showPuzzleSolution,
    resetPuzzle,
  } = usePuzzleStore();

  const { profile } = useUserProfile();

  const { attemptedPuzzleIds } = useAttemptedPuzzles();

  const { goToRandomPuzzle, isLoading: loadingRandomPuzzle } = useRandomPuzzle(
    profile?.elos?.puzzle,
    { excludeId: puzzleId, excludeIds: attemptedPuzzleIds }
  );

  const {
    arrows: hintArrows,
    isLoading: hintLoading,
    requestHint: agentRequestHint,
    clearArrows: clearHintArrows,
    clearHistory,
  } = useTurnBasedPuzzleHint();

  const {
    arrows: questionArrows,
    isLoading: questionLoading,
    askQuestion,
    clearArrows: clearQuestionArrows,
  } = useTurnBasedPuzzleQuestion();

  const {
    isRecording,
    isTranscribing,
    error: micError,
    start: startRecording,
    stop: stopRecording,
    cancel: cancelRecording,
    clearError: clearMicError,
  } = usePushToTalk({ onTranscript: askQuestion });

  const transcriptHistory = useCoachStore((s) => s.transcriptHistory);
  const isOutputMuted = useCoachStore((s) => s.isOutputMuted);
  const setIsOutputMuted = useCoachStore((s) => s.setIsOutputMuted);

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { eloResult, clearEloResult } = usePuzzleSession(puzzle);

  const combinedArrows = useMemo(
    () => [...hintArrows, ...questionArrows],
    [hintArrows, questionArrows]
  );

  const clearAllArrows = useCallback(() => {
    clearHintArrows();
    clearQuestionArrows();
  }, [clearHintArrows, clearQuestionArrows]);

  // When hint produces arrows, drop any question arrows so they don't stack visually.
  useEffect(() => {
    if (hintArrows.length > 0) clearQuestionArrows();
  }, [hintArrows, clearQuestionArrows]);

  // And vice versa.
  useEffect(() => {
    if (questionArrows.length > 0) clearHintArrows();
  }, [questionArrows, clearHintArrows]);

  // Reset coach UI when the puzzle URL changes (client-side navigation)
  useEffect(() => {
    cancelRecording();
    clearAllArrows();
    clearHistory();
    clearMicError();
  }, [puzzleId, cancelRecording, clearAllArrows, clearHistory, clearMicError]);

  // Also clear coach UI when the user retries (back to playing with no hints)
  useEffect(() => {
    if (puzzleStatus === "playing" && hintsUsed === 0) {
      clearAllArrows();
      clearHistory();
    }
  }, [puzzleStatus, hintsUsed, clearAllArrows, clearHistory]);

  const loadPuzzle = useCallback(async () => {
    if (!user || !puzzleId) return;

    setLoading(true);
    setError(null);

    try {
      const existingPuzzle = getPuzzleById(puzzleId);
      if (existingPuzzle) {
        setPuzzle(existingPuzzle);
        setLoading(false);
        return;
      }

      const fetchedPuzzle = await fetchPuzzleById(puzzleId);
      if (fetchedPuzzle) {
        setPuzzle(fetchedPuzzle);
        if (!puzzles.some((p) => p.id === fetchedPuzzle.id)) {
          setPuzzles([...puzzles, fetchedPuzzle]);
        }
      } else {
        setError("Puzzle not found");
      }
    } catch (err) {
      console.error("Failed to load puzzle:", err);
      setError("Failed to load puzzle");
    } finally {
      setLoading(false);
    }
  }, [user, puzzleId, getPuzzleById, puzzles, setPuzzles]);

  const loadPuzzlesForNavigation = useCallback(async () => {
    if (!user || puzzles.length > 0) return;

    try {
      const fetchedPuzzles = await fetchAllPuzzles({
        sort: { field: "rating", direction: "asc" },
        maxResults: 500,
      });
      setPuzzles(fetchedPuzzles);
    } catch (err) {
      console.error("Failed to load puzzles for navigation:", err);
    }
  }, [user, puzzles.length, setPuzzles]);

  useEffect(() => {
    if (user) {
      loadPuzzle();
      loadPuzzlesForNavigation();
    }
  }, [user, loadPuzzle, loadPuzzlesForNavigation]);

  const handleHint = useCallback(async () => {
    requestHint();
    await agentRequestHint();
  }, [requestHint, agentRequestHint]);

  const handleNewPuzzle = useCallback(() => {
    clearEloResult();
    clearAllArrows();
    clearHistory();
    clearMicError();
    goToRandomPuzzle();
  }, [
    clearEloResult,
    clearAllArrows,
    clearHistory,
    clearMicError,
    goToRandomPuzzle,
  ]);

  const handleRetry = useCallback(() => {
    clearEloResult();
    clearAllArrows();
    clearHistory();
    clearMicError();
    resetPuzzle();
  }, [
    clearEloResult,
    clearAllArrows,
    clearHistory,
    clearMicError,
    resetPuzzle,
  ]);

  if (authLoading) {
    return (
      <main className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
              <LogIn className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">Sign In Required</h2>
              <p className="text-muted-foreground max-w-md">
                Sign in to access chess puzzles.
              </p>
            </div>
            <Button onClick={signInWithGoogle} size="lg" className="gap-2">
              <LogIn className="w-4 h-4" />
              Sign in with Google
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-muted-foreground">Loading puzzle...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !puzzle) {
    return (
      <main className="py-8 min-h-screen">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">Puzzle Not Found</h2>
            <p className="text-muted-foreground">
              {error || "The puzzle you're looking for doesn't exist."}
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

  const isCompleted = puzzleStatus === "success" || puzzleStatus === "failed";

  return (
    <main className="py-6 min-h-screen">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Link href="/puzzles">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Puzzles
            </Button>
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 max-w-[1200px] mx-auto">
          <div className="flex-1 min-w-0 flex justify-center">
            <div className="w-full max-w-[600px] relative">
              <PuzzleBoard
                puzzle={puzzle}
                externalArrows={combinedArrows}
                onHintRequest={handleHint}
              />
              <FloatingRatingDelta eloResult={eloResult} puzzleId={puzzle.id} />
            </div>
          </div>

          <div className="lg:w-[320px] shrink-0 space-y-4">
            <PuzzleResultCard
              puzzleStatus={puzzleStatus}
              showSolution={showSolution}
              mistakeCount={mistakeCount}
              eloResult={eloResult}
            />

            {puzzleStatus === "playing" && (
              <PuzzleCoachPanel
                transcriptHistory={transcriptHistory}
                isOutputMuted={isOutputMuted}
                onToggleMute={() => setIsOutputMuted(!isOutputMuted)}
                onHintRequest={handleHint}
                hintsUsed={hintsUsed}
                hintLoading={hintLoading}
                hintDisabled={
                  hintLoading ||
                  isRecording ||
                  isTranscribing ||
                  questionLoading
                }
                isRecording={isRecording}
                isMicProcessing={isTranscribing || questionLoading}
                micDisabled={
                  !isRecording &&
                  (isTranscribing || questionLoading || hintLoading)
                }
                onMicPointerDown={startRecording}
                onMicPointerUp={stopRecording}
                onMicPointerCancel={cancelRecording}
                micError={micError}
              />
            )}

            {puzzleStatus === "playing" && (
              <Button
                variant="ghost"
                onClick={showPuzzleSolution}
                className="w-full text-muted-foreground"
              >
                Show Solution
              </Button>
            )}

            {isCompleted && (
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleNewPuzzle}
                  disabled={loadingRandomPuzzle || !profile?.elos?.puzzle}
                  className="w-full"
                >
                  {loadingRandomPuzzle ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Shuffle className="w-4 h-4 mr-2" />
                      New Puzzle
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleRetry} className="w-full">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}

            {eloResult && <PuzzleDetailsCard puzzle={puzzle} />}
          </div>
        </div>
      </div>
    </main>
  );
}

