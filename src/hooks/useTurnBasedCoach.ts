import { useStockfish } from "@/contexts/StockfishContext";
import { useBoardStore } from "@/stores";
import { useCoachStore } from "@/stores/coachStore";
import { Chess, type Move } from "chess.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTtsPlayer } from "./useTtsPlayer";

const sharedState = {
    lastProcessedFen: null as string | null,
    inflight: null as AbortController | null,
};

interface AnalyzeUsage {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
}

/**
 * Turn-based coach session — calls /api/coach/analyze after each move and
 * after game-over. Drops the WebRTC/realtime path. Renders results as text
 * in the transcript and arrows on the board.
 *
 * Should be called exactly once in the app (CoachPanel).
 */
export function useTurnBasedCoach() {
    const fen = useBoardStore((state) => state.fen);
    const moveHistory = useBoardStore((state) => state.moveHistory);
    const playerColor = useBoardStore((state) => state.playerColor);
    const isThinking = useBoardStore((state) => state.isThinking);
    const hasGameStarted = useBoardStore((state) => state.hasGameStarted);
    const addArrow = useBoardStore((state) => state.addArrow);
    const clearArrows = useBoardStore((state) => state.clearArrows);

    const addToHistory = useCoachStore((state) => state.addToHistory);

    const { getTopMoves } = useStockfish();
    const { playText } = useTtsPlayer();

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [lastUsage, setLastUsage] = useState<AnalyzeUsage | null>(null);
    const [error, setError] = useState<string | null>(null);
    const isProcessingRef = useRef(false);

    const game = useMemo(() => new Chess(fen), [fen]);

    useEffect(() => {
        if (!hasGameStarted) return;

        const currentTurn = game.turn();
        const gameOver = game.isGameOver();
        const isPlayersTurn = currentTurn === playerColor;
        const lastMove =
            moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].san : null;

        const shouldNotify =
            (isPlayersTurn && !isThinking && fen !== sharedState.lastProcessedFen) ||
            (gameOver && fen !== sharedState.lastProcessedFen);

        if (!shouldNotify) return;
        if (!lastMove && !gameOver) return;
        if (isProcessingRef.current) return;

        isProcessingRef.current = true;
        sharedState.lastProcessedFen = fen;

        if (sharedState.inflight) {
            sharedState.inflight.abort();
        }
        const controller = new AbortController();
        sharedState.inflight = controller;

        const analyze = async () => {
            setIsAnalyzing(true);
            setError(null);
            try {
                const analysis = await getTopMoves(fen, 3, 15);
                const stockfishAnalysis = formatStockfishAnalysis(analysis);

                clearArrows();

                const gameStatus = gameOver ? formatGameStatus(game) : undefined;

                const response = await fetch("/api/coach/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fen,
                        moveHistory: moveHistory.map((m: Move) => m.san).join(" "),
                        lastMove,
                        boardAscii: game.ascii(),
                        playerColor,
                        stockfishAnalysis,
                        gameOver,
                        gameStatus,
                    }),
                    signal: controller.signal,
                });

                if (!response.ok) {
                    const errBody = (await response.json().catch(() => ({}))) as {
                        error?: string;
                    };
                    throw new Error(
                        errBody.error ?? `Analyze request failed: ${response.status}`
                    );
                }

                const data = (await response.json()) as {
                    spokenText: string;
                    arrows: Array<{ from: string; to: string; color: string }>;
                    usage: AnalyzeUsage;
                };

                for (const arrow of data.arrows) {
                    addArrow({
                        startSquare: arrow.from,
                        endSquare: arrow.to,
                        color: arrow.color,
                    });
                }

                if (data.spokenText.trim()) {
                    addToHistory({
                        role: "assistant",
                        content: data.spokenText,
                        timestamp: Date.now(),
                    });
                    void playText(data.spokenText);
                }

                setLastUsage(data.usage);
                console.debug("[turnBasedCoach] analyzed", {
                    spokenText: data.spokenText,
                    arrows: data.arrows.length,
                    usage: data.usage,
                });
            } catch (e) {
                if (e instanceof DOMException && e.name === "AbortError") return;
                console.error("[turnBasedCoach] error:", e);
                setError(e instanceof Error ? e.message : "Analysis failed");
                sharedState.lastProcessedFen = null;
            } finally {
                setIsAnalyzing(false);
                isProcessingRef.current = false;
            }
        };

        analyze();
    }, [
        hasGameStarted,
        fen,
        moveHistory,
        playerColor,
        isThinking,
        game,
        getTopMoves,
        addArrow,
        clearArrows,
        addToHistory,
        playText,
    ]);

    useEffect(() => {
        return () => {
            if (sharedState.inflight) {
                sharedState.inflight.abort();
                sharedState.inflight = null;
            }
            sharedState.lastProcessedFen = null;
        };
    }, []);

    return { isAnalyzing, lastUsage, error };
}

function formatStockfishAnalysis(
    moves: Awaited<ReturnType<ReturnType<typeof useStockfish>["getTopMoves"]>>
): string {
    if (!moves || moves.length === 0) return "(no analysis available)";

    return moves
        .map((m, i) => {
            const lines: string[] = [];
            const evalStr = m.mate
                ? `Mate in ${m.mate}`
                : `Eval: ${m.evaluation ?? "N/A"}`;
            lines.push(`${i + 1}. ${m.san} (${evalStr})`);

            const newThreats = m.tactical.threats.filter((t) => t.isNewThreat);
            if (newThreats.length > 0) {
                const threatDesc = newThreats
                    .map(
                        (t) =>
                            `${t.attacker} on ${t.attackerSquare} attacks ${t.target} on ${t.targetSquare}`
                    )
                    .join("; ");
                lines.push(`   NEW THREATS: ${threatDesc}`);
            }

            if (m.tactical.hanging.length > 0) {
                const hangingDesc = m.tactical.hanging
                    .map((h) => `${h.piece} on ${h.square}`)
                    .join(", ");
                lines.push(`   HANGING: ${hangingDesc}`);
            }

            if (m.isCapture && m.capturedPiece) {
                lines.push(`   CAPTURES: ${m.capturedPiece}`);
            }
            if (m.isCheck) lines.push(`   GIVES CHECK`);

            if (m.tactical.notes.length > 0) {
                lines.push(`   NOTES: ${m.tactical.notes.join(", ")}`);
            }

            if (m.principalVariation.length > 1) {
                lines.push(
                    `   PV: ${m.principalVariation.slice(0, 5).join(" ")}`
                );
            }

            return lines.join("\n");
        })
        .join("\n\n");
}

function formatGameStatus(game: Chess): string {
    if (game.isCheckmate()) {
        return game.turn() === "w"
            ? "Black wins by checkmate"
            : "White wins by checkmate";
    }
    if (game.isStalemate()) return "Draw by stalemate";
    if (game.isInsufficientMaterial())
        return "Draw by insufficient material";
    if (game.isThreefoldRepetition()) return "Draw by repetition";
    if (game.isDraw()) return "Draw";
    return "Game over";
}
