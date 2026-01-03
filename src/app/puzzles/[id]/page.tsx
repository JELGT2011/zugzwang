"use client";

import AudioDeviceModal from "@/components/AudioDeviceModal";
import PuzzleBoard from "@/components/PuzzleBoard";
import { TranscriptView } from "@/components/TranscriptView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useAttemptedPuzzles } from "@/hooks/useAttemptedPuzzles";
import { usePuzzleAgentController } from "@/hooks/usePuzzleAgentController";
import { useRandomPuzzle } from "@/hooks/useRandomPuzzle";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useVictoryEffects } from "@/hooks/useVictoryEffects";
import { calculateNewElo, calculateRatingDelta, getPuzzleResult, type GameResult } from "@/lib/elo";
import { fetchPuzzleById, fetchAllPuzzles } from "@/lib/puzzles";
import { updateUserElo } from "@/lib/userProfile";
import { usePuzzleStore } from "@/stores";
import {
  getDifficultyFromRating,
  DIFFICULTY_RANGES,
  THEME_DISPLAY_NAMES,
  type PuzzleTheme,
  type Puzzle,
} from "@/types/puzzle";
import {
  ArrowLeft,
  ExternalLink,
  Lightbulb,
  Loader2,
  LogIn,
  Mic,
  RotateCcw,
  Shuffle,
  Square,
  TrendingDown,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";

export default function PuzzlePage() {
  const params = useParams();
  const puzzleId = params.id as string;
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const {
    puzzles,
    currentPuzzle,
    puzzleStatus,
    mistakeCount,
    hintsUsed,
    showSolution,
    setPuzzles,
    getPuzzleById,
    startPuzzle,
    useHint: requestHint,
    showPuzzleSolution,
    resetPuzzle,
  } = usePuzzleStore();

  const { profile } = useUserProfile();

  // Victory effects (sound + confetti)
  const { triggerVictory } = useVictoryEffects();
  
  // Track attempted puzzles
  const { attemptedPuzzleIds, markAttempted } = useAttemptedPuzzles();

  // Random puzzle navigation - exclude already attempted puzzles
  const { goToRandomPuzzle, isLoading: loadingRandomPuzzle } = useRandomPuzzle(
    profile?.elos?.puzzle,
    { excludeId: puzzleId, excludeIds: attemptedPuzzleIds }
  );

  // Puzzle Agent for hints
  const {
    isConnected: agentConnected,
    isConnecting: agentConnecting,
    isMicMuted,
    transcript,
    transcriptHistory,
    arrows: agentArrows,
    showDeviceModal,
    inputDevices,
    outputDevices,
    selectedInputDeviceId,
    selectedOutputDeviceId,
    requestHint: agentRequestHint,
    confirmDeviceSelection,
    setSelectedInputDeviceId,
    setSelectedOutputDeviceId,
    setShowDeviceModal,
    toggleMic,
    clearArrows,
    clearHistory,
  } = usePuzzleAgentController();

  // Note: Agent no longer auto-responds to moves. Hints only when user clicks the button.

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ELO tracking
  const [eloResult, setEloResult] = useState<{
    result: GameResult;
    delta: number;
    newRating: number;
  } | null>(null);
  const eloRecordedForPuzzleRef = useRef<string | null>(null);
  
  // Track if we've auto-triggered the first hint for this puzzle
  const autoHintTriggeredRef = useRef<string | null>(null);
  
  // Track if we've triggered victory effects for this puzzle
  const victoryTriggeredRef = useRef<string | null>(null);

  // Reset UI state when puzzle ID changes (handles client-side navigation)
  useEffect(() => {
    // Reset all puzzle-specific state when URL changes
    // Note: Don't reset victoryTriggeredRef here - it's checked against puzzle.id
    // in the victory effect, so resetting it here causes double-trigger during navigation
    setEloResult(null);
    eloRecordedForPuzzleRef.current = null;
    autoHintTriggeredRef.current = null;
    clearArrows();
    clearHistory();
  }, [puzzleId, clearArrows, clearHistory]);

  // Load single puzzle from Firestore
  const loadPuzzle = useCallback(async () => {
    if (!user || !puzzleId) return;
    
    setLoading(true);
    setError(null);

    try {
      // First check if we already have it in the store
      const existingPuzzle = getPuzzleById(puzzleId);
      if (existingPuzzle) {
        setPuzzle(existingPuzzle);
        setLoading(false);
        return;
      }

      // Fetch from Firestore
      const fetchedPuzzle = await fetchPuzzleById(puzzleId);
      if (fetchedPuzzle) {
        setPuzzle(fetchedPuzzle);
        // Also add to store for navigation
        if (!puzzles.some(p => p.id === fetchedPuzzle.id)) {
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

  // Load puzzles for navigation if not loaded
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

  // Start puzzle when puzzle data is available
  useEffect(() => {
    if (puzzle && (!currentPuzzle || currentPuzzle.id !== puzzle.id)) {
      startPuzzle(puzzle);
      // Mark puzzle as attempted
      markAttempted(puzzle.id);
      // Reset ELO tracking for new puzzle
      setEloResult(null);
      eloRecordedForPuzzleRef.current = null;
    }
  }, [puzzle, currentPuzzle, startPuzzle, markAttempted]);

  const handleHint = useCallback(async () => {
    // Use the puzzle agent for hints
    // Also increment the hint counter in the store
    requestHint();
    await agentRequestHint();
  }, [requestHint, agentRequestHint]);

  // Cleanup agent when puzzle changes or resets
  useEffect(() => {
    if (puzzleStatus === "playing" && hintsUsed === 0) {
      clearArrows();
      clearHistory();
    }
  }, [puzzleStatus, hintsUsed, clearArrows, clearHistory]);

  // Auto-trigger first hint when puzzle loads
  useEffect(() => {
    // Only trigger once per puzzle
    if (!puzzle || autoHintTriggeredRef.current === puzzle.id) return;
    // Wait until puzzle is ready to play
    if (puzzleStatus !== "playing") return;
    // Don't trigger if already connecting or connected
    if (agentConnecting || agentConnected) return;
    
    // Mark as triggered for this puzzle
    autoHintTriggeredRef.current = puzzle.id;
    
    // Request the first hint automatically
    handleHint();
  }, [puzzle, puzzleStatus, agentConnecting, agentConnected, handleHint]);

  // Trigger victory effects when puzzle is solved
  useEffect(() => {
    // Guard: only trigger once per puzzle ID
    if (puzzleStatus !== "success" || !puzzle) return;
    if (victoryTriggeredRef.current === puzzle.id) return;
    
    // Set ref immediately to prevent double-trigger from StrictMode or re-renders
    victoryTriggeredRef.current = puzzle.id;
    
    // Small delay to ensure state is settled and avoid race conditions
    const timer = setTimeout(() => {
      triggerVictory();
    }, 50);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleStatus, puzzle?.id]);

  // Record ELO when puzzle is completed (success or solution shown)
  useEffect(() => {
    const recordElo = async () => {
      // Only record once per puzzle
      if (!puzzle || !user || !profile?.elos?.puzzle) return;
      if (eloRecordedForPuzzleRef.current === puzzle.id) return;
      if (puzzleStatus !== "success" && !showSolution) return;

      // Determine result
      const result = getPuzzleResult(puzzleStatus === "success", mistakeCount);
      
      // Calculate new ELO
      const playerRating = profile.elos.puzzle;
      const puzzleRating = puzzle.rating;
      const delta = calculateRatingDelta(playerRating, puzzleRating, result);
      const newRating = calculateNewElo(playerRating, puzzleRating, result);

      // Record that we've processed this puzzle
      eloRecordedForPuzzleRef.current = puzzle.id;

      // Update state to show result
      setEloResult({ result, delta, newRating });

      // Update Firestore
      try {
        await updateUserElo(user.uid, "puzzle", newRating);
        console.log(`ELO updated: ${playerRating} → ${newRating} (${delta >= 0 ? "+" : ""}${delta}) [${result}]`);
      } catch (err) {
        console.error("Failed to update ELO:", err);
      }
    };

    recordElo();
  }, [puzzle, user, profile, puzzleStatus, showSolution, mistakeCount]);

  // Show loading state while checking auth
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

  // Show sign-in prompt if not authenticated
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

  const difficulty = getDifficultyFromRating(puzzle.rating);
  const difficultyInfo = DIFFICULTY_RANGES[difficulty];

  return (
    <main className="py-6 min-h-screen">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link href="/puzzles">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Puzzles
            </Button>
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 max-w-[1200px] mx-auto">
          {/* Puzzle Board */}
          <div className="flex-1 min-w-0 flex justify-center">
            <div className="w-full max-w-[600px]">
              <PuzzleBoard puzzle={puzzle} externalArrows={agentArrows} onHintRequest={handleHint} />
            </div>
          </div>

          {/* Side Panel */}
          <div className="lg:w-[320px] shrink-0 space-y-4">
            {/* Status Card - only show for success/failed states */}
            {(puzzleStatus === "success" || puzzleStatus === "failed") && (
              <Card className="p-4 bg-card/50 backdrop-blur border-border/50 animate-in fade-in-0 zoom-in-95 duration-300">
                <div className="text-center py-3">
                  {puzzleStatus === "success" && (
                    <div className="space-y-2">
                      <Trophy className="w-12 h-12 mx-auto text-success victory-bounce victory-glow" />
                      <p className="text-lg font-medium text-success">
                        Puzzle Solved!
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {mistakeCount === 0
                          ? "Perfect! No mistakes."
                          : `Solved with ${mistakeCount} mistake${mistakeCount > 1 ? "s" : ""}`}
                      </p>
                      {eloResult && (
                        <div className={`flex items-center justify-center gap-1 text-sm font-medium ${
                          eloResult.delta >= 0 ? "text-success" : "text-destructive"
                        }`}>
                          {eloResult.delta >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span>{eloResult.delta >= 0 ? "+" : ""}{eloResult.delta}</span>
                          <span className="text-muted-foreground font-normal">
                            ({eloResult.newRating})
                          </span>
                        </div>
                      )}
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
                      {eloResult && showSolution && (
                        <div className={`flex items-center justify-center gap-1 text-sm font-medium ${
                          eloResult.delta >= 0 ? "text-success" : "text-destructive"
                        }`}>
                          {eloResult.delta >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span>{eloResult.delta >= 0 ? "+" : ""}{eloResult.delta}</span>
                          <span className="text-muted-foreground font-normal">
                            ({eloResult.newRating})
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Coach Conversation */}
            {puzzleStatus === "playing" && (
              <div className="relative p-3 pb-14 bg-primary/10 rounded-lg border border-primary/20 min-h-[100px]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-primary">Coach</span>
                </div>
                <TranscriptView
                  transcriptHistory={transcriptHistory}
                  transcript={transcript}
                  emptyMessage="Tap the lightbulb for a hint"
                  className="max-h-32"
                />

                {/* Floating Action Buttons */}
                <div className="absolute bottom-2 right-2 flex items-center gap-2">
                  {/* Get Hint FAB */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full shadow-md bg-background"
                    onClick={handleHint}
                    disabled={agentConnecting}
                    title={`Get hint${hintsUsed > 0 ? ` (${hintsUsed} used)` : ""}`}
                  >
                    {agentConnecting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Lightbulb className="w-3.5 h-3.5" />
                    )}
                  </Button>

                  {/* Transcribe/Stop FAB - only when connected */}
                  {agentConnected && (
                    <Button
                      variant={isMicMuted ? "default" : "secondary"}
                      size="icon"
                      className={`h-8 w-8 rounded-full shadow-md transition-all ${
                        !isMicMuted ? "ring-2 ring-primary ring-offset-1 ring-offset-background animate-pulse" : ""
                      }`}
                      onClick={toggleMic}
                      title={isMicMuted ? "Start transcribing" : "Stop transcribing"}
                    >
                      {isMicMuted ? (
                        <Mic className="w-3.5 h-3.5" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {puzzleStatus === "playing" && (
              <Button
                variant="ghost"
                onClick={showPuzzleSolution}
                className="w-full text-muted-foreground"
              >
                Show Solution
              </Button>
            )}

            {(puzzleStatus === "success" || puzzleStatus === "failed") && (
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => {
                    // Reset visual state before navigating
                    // Note: Don't reset eloRecordedForPuzzleRef here - it will cause
                    // the ELO recording effect to re-run and set eloResult again.
                    // The puzzleId effect will handle resetting refs when URL changes.
                    setEloResult(null);
                    clearArrows();
                    clearHistory();
                    goToRandomPuzzle();
                  }}
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
                <Button
                  variant="outline"
                  onClick={() => {
                    // Reset for retry - keep WebRTC connection, just clear visuals
                    // Hide puzzle details card but don't reset eloRecordedForPuzzleRef
                    // so ELO isn't recorded again for the same puzzle
                    setEloResult(null);
                    autoHintTriggeredRef.current = null; // Reset so auto-hint triggers again
                    clearArrows();
                    clearHistory();
                    resetPuzzle();
                  }}
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}

            {/* Puzzle Details Card - shown after completion */}
            {eloResult && (
              <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
                <h3 className="font-semibold mb-3">Puzzle Details</h3>

                {/* Rating & Difficulty */}
                <div className="flex items-center gap-2 mb-4">
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

                {/* Puzzle Info */}
                <div className="space-y-3 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID</span>
                    <span className="font-mono">{puzzle.id}</span>
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

                {/* Themes */}
                <div className="pt-3 border-t border-border/50">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Themes</h4>
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
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Audio Device Selection Modal */}
      <AudioDeviceModal
        isOpen={showDeviceModal}
        onClose={() => setShowDeviceModal(false)}
        onConfirm={confirmDeviceSelection}
        inputDevices={inputDevices}
        outputDevices={outputDevices}
        selectedInputDeviceId={selectedInputDeviceId}
        selectedOutputDeviceId={selectedOutputDeviceId}
        onInputDeviceChange={setSelectedInputDeviceId}
        onOutputDeviceChange={setSelectedOutputDeviceId}
      />
    </main>
  );
}
