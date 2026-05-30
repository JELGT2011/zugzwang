import { usePuzzleStore } from "@/stores";
import { useCoachStore } from "@/stores/coachStore";
import { useStockfish } from "@/contexts/StockfishContext";
import { Chess } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Arrow } from "react-chessboard";
import { useTtsPlayer } from "./useTtsPlayer";
import {
    analyzeSolution,
    computeTacticalContext,
    extractPieces,
    uciToReadable,
    walkUserDecisions,
} from "@/lib/puzzleAnalysis";

interface HintUsage {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
}

interface EngineLine {
    move: string;
    san: string;
    evaluation: number | null;
    mate: number | null;
    pv: string[];
}

interface StepEngineAnalysis {
    stepIndex: number;
    fen: string;
    sideToMove: "white" | "black";
    solutionMove: string;
    lines: EngineLine[];
}

/**
 * Calls /api/puzzles/hint on demand. Hint depth is taken from hintsUsed
 * BEFORE the puzzle store increments (so the first click sends 0).
 * Spoken text is appended to the transcript and played via TTS;
 * arrows that would reveal the solution are stripped server-side.
 */
export function useTurnBasedPuzzleHint() {
    const currentPuzzle = usePuzzleStore((s) => s.currentPuzzle);
    const currentMoveIndex = usePuzzleStore((s) => s.currentMoveIndex);
    const hintsUsed = usePuzzleStore((s) => s.hintsUsed);

    const addToHistory = useCoachStore((s) => s.addToHistory);

    const { playText, stop: stopTts, isPlaying: isSpeaking } = useTtsPlayer();
    const { isReady: isStockfishReady, getTopMoves } = useStockfish();

    const [arrows, setArrows] = useState<Arrow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUsage, setLastUsage] = useState<HintUsage | null>(null);
    const [engineSteps, setEngineSteps] = useState<StepEngineAnalysis[]>([]);
    const inflightRef = useRef<AbortController | null>(null);

    useEffect(() => {
        setEngineSteps([]);
        if (!currentPuzzle || !isStockfishReady) return;

        let cancelled = false;
        const decisions = walkUserDecisions(currentPuzzle.fen, currentPuzzle.moves);
        if (decisions.length === 0) return;

        (async () => {
            const collected: StepEngineAnalysis[] = [];
            for (const decision of decisions) {
                if (cancelled) return;
                try {
                    const top = await getTopMoves(decision.fen, 3, 15);
                    if (cancelled) return;
                    const sideToMove =
                        new Chess(decision.fen).turn() === "w" ? "white" : "black";
                    collected.push({
                        stepIndex: decision.stepIndex,
                        fen: decision.fen,
                        sideToMove,
                        solutionMove: decision.solutionMove,
                        lines: top.slice(0, 3).map((t) => ({
                            move: t.move,
                            san: t.san,
                            evaluation: t.evaluation,
                            mate: t.mate,
                            pv: t.principalVariation.slice(0, 5),
                        })),
                    });
                } catch (e) {
                    console.warn(
                        "[turnBasedPuzzleHint] engine pre-compute failed for step",
                        decision.stepIndex,
                        e
                    );
                }
            }
            if (!cancelled) {
                console.debug(
                    "[turnBasedPuzzleHint] engine pre-compute complete",
                    { steps: collected.length, puzzleId: currentPuzzle.id }
                );
                setEngineSteps(collected);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [currentPuzzle, isStockfishReady, getTopMoves]);

    const currentGameState = useMemo(() => {
        if (!currentPuzzle) return null;

        const game = new Chess(currentPuzzle.fen);
        for (let i = 0; i < currentMoveIndex; i++) {
            const move = currentPuzzle.moves[i];
            try {
                game.move({
                    from: move.slice(0, 2),
                    to: move.slice(2, 4),
                    promotion: move.length > 4 ? move[4] : undefined,
                });
            } catch {
                break;
            }
        }

        return {
            game,
            fen: game.fen(),
            pieces: extractPieces(game),
            turn: game.turn(),
            tacticalContext: computeTacticalContext(game),
        };
    }, [currentPuzzle, currentMoveIndex]);

    const clearArrows = useCallback(() => {
        setArrows([]);
    }, []);

    const clearHistory = useCallback(() => {
        useCoachStore.getState().clearHistory();
    }, []);

    const requestHint = useCallback(async () => {
        if (!currentPuzzle || !currentGameState) return;

        const solutionMove = currentPuzzle.moves[currentMoveIndex] || "";
        if (!solutionMove) return;

        const solutionMoveReadable = uciToReadable(
            solutionMove,
            currentGameState.game
        );

        const solutionAnalysis = analyzeSolution(
            currentGameState.fen,
            solutionMove
        );

        const relevantEngineSteps = engineSteps
            .filter((s) => s.stepIndex >= currentMoveIndex)
            .map((s) => ({
                ...s,
                isCurrent: s.stepIndex === currentMoveIndex,
            }));

        if (inflightRef.current) {
            inflightRef.current.abort();
        }
        const controller = new AbortController();
        inflightRef.current = controller;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/puzzles/hint", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    fen: currentGameState.fen,
                    pieces: currentGameState.pieces,
                    themes: currentPuzzle.themes,
                    hintsUsed,
                    moveNumber: Math.ceil(currentMoveIndex / 2),
                    totalMoves: Math.ceil((currentPuzzle.moves.length - 1) / 2),
                    playerColor: currentGameState.turn === "w" ? "White" : "Black",
                    tacticalContext: currentGameState.tacticalContext,
                    solutionMove,
                    solutionMoveReadable,
                    solutionAnalysis,
                    engineSteps: relevantEngineSteps,
                }),
            });

            if (!response.ok) {
                const errBody = (await response.json().catch(() => ({}))) as {
                    error?: string;
                };
                throw new Error(
                    errBody.error ?? `Hint request failed: ${response.status}`
                );
            }

            const data = (await response.json()) as {
                spokenText: string;
                arrows: Array<{ from: string; to: string; color: string }>;
                usage: HintUsage;
            };

            setArrows(
                data.arrows.map((a) => ({
                    startSquare: a.from,
                    endSquare: a.to,
                    color: a.color,
                }))
            );

            if (data.spokenText.trim()) {
                addToHistory({
                    role: "assistant",
                    content: data.spokenText,
                    timestamp: Date.now(),
                });
                void playText(data.spokenText);
            }

            setLastUsage(data.usage);
            console.debug("[turnBasedPuzzleHint] received", {
                spokenText: data.spokenText,
                arrows: data.arrows.length,
                hintsUsed,
                usage: data.usage,
            });
        } catch (e) {
            if (e instanceof DOMException && e.name === "AbortError") return;
            console.error("[turnBasedPuzzleHint] error:", e);
            setError(e instanceof Error ? e.message : "Hint request failed");
        } finally {
            setIsLoading(false);
            inflightRef.current = null;
        }
    }, [
        currentPuzzle,
        currentGameState,
        currentMoveIndex,
        hintsUsed,
        engineSteps,
        addToHistory,
        playText,
    ]);

    return {
        arrows,
        isLoading,
        error,
        lastUsage,
        requestHint,
        clearArrows,
        clearHistory,
        isSpeaking,
        stopSpeaking: stopTts,
    };
}
