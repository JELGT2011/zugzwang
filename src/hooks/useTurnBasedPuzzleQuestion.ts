"use client";

import { usePuzzleStore } from "@/stores";
import { useCoachStore } from "@/stores/coachStore";
import { Chess } from "chess.js";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Arrow } from "react-chessboard";
import { useTtsPlayer } from "./useTtsPlayer";
import {
    analyzeSolution,
    computeTacticalContext,
    extractPieces,
    uciToReadable,
} from "@/lib/puzzleAnalysis";

interface QuestionUsage {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
}

/**
 * Asks Zuggy a free-form question about the current puzzle position by POSTing
 * to /api/puzzles/question. The user's question (already transcribed from
 * speech) is appended to the transcript history; the assistant's spoken
 * response is appended next and spoken via TTS. Arrows returned by the model
 * are exposed for the board, with the solution arrow stripped server-side.
 */
export function useTurnBasedPuzzleQuestion() {
    const currentPuzzle = usePuzzleStore((s) => s.currentPuzzle);
    const currentMoveIndex = usePuzzleStore((s) => s.currentMoveIndex);

    const addToHistory = useCoachStore((s) => s.addToHistory);

    const { playText, stop: stopTts, isPlaying: isSpeaking } = useTtsPlayer();

    const [arrows, setArrows] = useState<Arrow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUsage, setLastUsage] = useState<QuestionUsage | null>(null);
    const inflightRef = useRef<AbortController | null>(null);

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

    const askQuestion = useCallback(
        async (question: string) => {
            const trimmed = question.trim();
            if (!trimmed) return;
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

            const previousHistory = useCoachStore
                .getState()
                .transcriptHistory.map((m) => ({
                    role: m.role,
                    content: m.content,
                }));

            addToHistory({
                role: "user",
                content: trimmed,
                timestamp: Date.now(),
            });

            if (inflightRef.current) {
                inflightRef.current.abort();
            }
            const controller = new AbortController();
            inflightRef.current = controller;

            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch("/api/puzzles/question", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    signal: controller.signal,
                    body: JSON.stringify({
                        userQuestion: trimmed,
                        fen: currentGameState.fen,
                        pieces: currentGameState.pieces,
                        themes: currentPuzzle.themes,
                        moveNumber: Math.ceil(currentMoveIndex / 2),
                        totalMoves: Math.ceil(
                            (currentPuzzle.moves.length - 1) / 2
                        ),
                        playerColor:
                            currentGameState.turn === "w" ? "White" : "Black",
                        tacticalContext: currentGameState.tacticalContext,
                        solutionMove,
                        solutionMoveReadable,
                        solutionAnalysis,
                        transcriptHistory: previousHistory,
                    }),
                });

                if (!response.ok) {
                    const errBody = (await response
                        .json()
                        .catch(() => ({}))) as { error?: string };
                    throw new Error(
                        errBody.error ??
                            `Question request failed: ${response.status}`
                    );
                }

                const data = (await response.json()) as {
                    spokenText: string;
                    arrows: Array<{ from: string; to: string; color: string }>;
                    usage: QuestionUsage;
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
                console.debug("[turnBasedPuzzleQuestion] received", {
                    spokenText: data.spokenText,
                    arrows: data.arrows.length,
                    usage: data.usage,
                });
            } catch (e) {
                if (e instanceof DOMException && e.name === "AbortError") return;
                console.error("[turnBasedPuzzleQuestion] error:", e);
                setError(
                    e instanceof Error ? e.message : "Question request failed"
                );
            } finally {
                setIsLoading(false);
                inflightRef.current = null;
            }
        },
        [
            currentPuzzle,
            currentGameState,
            currentMoveIndex,
            addToHistory,
            playText,
        ]
    );

    return {
        arrows,
        isLoading,
        error,
        lastUsage,
        askQuestion,
        clearArrows,
        isSpeaking,
        stopSpeaking: stopTts,
    };
}
