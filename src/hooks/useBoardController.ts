import { useStockfish } from "@/contexts/StockfishContext";
import { useBoardStore } from "@/stores";
import { Chess, Move } from "chess.js";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Arrow } from "react-chessboard";
import { useMoveController } from "./useMoveController";

/**
 * BoardController hook - provides a clean interface to the board state and actions.
 * Acts as a proxy/facade to the underlying Zustand store.
 * Reconstructs Chess instance from FEN when needed for computed values.
 * 
 * NOTE: This hook contains NO side effects. It's safe to call from multiple components.
 * For engine move automation, use useBoardEngine() which should only be called ONCE.
 */
export function useBoardController() {
    // Get store state (all serializable)
    const fen = useBoardStore((state) => state.fen);
    const moveHistory = useBoardStore((state) => state.moveHistory);
    const playerColor = useBoardStore((state) => state.playerColor);
    const arrows = useBoardStore((state) => state.arrows);
    const hasGameStarted = useBoardStore((state) => state.hasGameStarted);
    const gameMode = useBoardStore((state) => state.gameMode);
    const isThinking = useBoardStore((state) => state.isThinking);

    // Get store actions
    const storeMakeMove = useBoardStore((state) => state.makeMove);
    const storeStartNewGame = useBoardStore((state) => state.startNewGame);
    const storeAddArrow = useBoardStore((state) => state.addArrow);
    const storeClearArrows = useBoardStore((state) => state.clearArrows);

    // Reconstruct Chess instance from FEN (memoized)
    const game = useMemo(() => {
        return new Chess(fen);
    }, [fen]);

    // Wrap actions in useCallback for stable references
    const makeMove = useCallback(
        (from: string, to: string, promotion?: string) => {
            return storeMakeMove(from, to, promotion);
        },
        [storeMakeMove]
    );

    const startNewGame = useCallback(
        (asWhite: boolean) => {
            storeStartNewGame(asWhite);
        },
        [storeStartNewGame]
    );

    const addArrow = useCallback(
        (arrow: Arrow) => {
            storeAddArrow(arrow);
        },
        [storeAddArrow]
    );

    const clearArrows = useCallback(() => {
        storeClearArrows();
    }, [storeClearArrows]);

    // Computed values from the reconstructed Chess instance
    const getStatus = useCallback(() => {
        if (game.isCheckmate()) {
            return game.turn() === "w"
                ? "Black wins by checkmate!"
                : "White wins by checkmate!";
        }
        if (game.isStalemate()) return "Draw by stalemate";
        if (game.isDraw()) return "Draw";
        if (game.isCheck())
            return game.turn() === "w" ? "White is in check" : "Black is in check";
        return game.turn() === "w" ? "White to move" : "Black to move";
    }, [game]);

    const getMoveHistory = useCallback((): Move[] => {
        return moveHistory;
    }, [moveHistory]);

    const getLastMove = useCallback((): string | null => {
        return moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].san : null;
    }, [moveHistory]);

    const isGameOver = useCallback((): boolean => {
        return game.isGameOver();
    }, [game]);

    const getFen = useCallback(() => {
        return fen;
    }, [fen]);

    const getTurn = useCallback(() => {
        return game.turn();
    }, [game]);

    const isPlayerTurn = useCallback(() => {
        return game.turn() === playerColor;
    }, [game, playerColor]);

    return {
        // State
        game, // Reconstructed Chess instance for compatibility
        playerColor,
        arrows,
        hasGameStarted,
        fen,
        moveHistory,
        gameMode,
        isThinking,

        // Actions
        makeMove,
        startNewGame,
        addArrow,
        clearArrows,

        // Computed/getters
        getStatus,
        getMoveHistory,
        getLastMove,
        isGameOver,
        getFen,
        getTurn,
        isPlayerTurn,
    };
}

/**
 * Engine automation hook - handles computer opponent moves.
 * 
 * IMPORTANT: This hook should only be called ONCE in the entire app (typically in ChessGame).
 * It contains side effects that trigger engine moves when it's the computer's turn.
 */
export function useBoardEngine() {
    const fen = useBoardStore((state) => state.fen);
    const playerColor = useBoardStore((state) => state.playerColor);
    const hasGameStarted = useBoardStore((state) => state.hasGameStarted);
    const isThinking = useBoardStore((state) => state.isThinking);
    const lastEngineMoveFen = useBoardStore((state) => state.lastEngineMoveFen);

    const storeMakeMove = useBoardStore((state) => state.makeMove);
    const setIsThinking = useBoardStore((state) => state.setIsThinking);
    const setLastEngineMoveFen = useBoardStore((state) => state.setLastEngineMoveFen);

    const { getNextMove } = useMoveController();
    const { isReady } = useStockfish();

    // Track if we're currently processing to prevent concurrent triggers
    const isProcessingRef = useRef(false);

    // Reconstruct Chess instance from FEN
    const game = useMemo(() => new Chess(fen), [fen]);

    // Automated Move Effect - only runs in this hook instance
    useEffect(() => {
        if (!hasGameStarted || game.isGameOver() || !isReady) return;

        const isEngineTurn = game.turn() !== playerColor;

        // Multiple guards to prevent duplicate triggers:
        // 1. Not engine's turn
        // 2. Already thinking (state-based guard)
        // 3. Already processed this FEN (store-based guard)
        // 4. Currently processing (ref-based guard for race conditions)
        if (!isEngineTurn || isThinking || lastEngineMoveFen === fen || isProcessingRef.current) {
            return;
        }

        const triggerEngineMove = async () => {
            // Set ref immediately to prevent race conditions from Strict Mode double-invoke
            isProcessingRef.current = true;
            setLastEngineMoveFen(fen);
            setIsThinking(true);

            console.debug("[BoardEngine] Engine turn detected, getting move...");

            // Add a small delay for a more natural feel
            await new Promise(resolve => setTimeout(resolve, 600));

            try {
                const move = await getNextMove(game);
                if (move) {
                    console.debug("[BoardEngine] Engine making move:", move);
                    storeMakeMove(move.from, move.to, move.promotion);
                } else {
                    console.warn("[BoardEngine] Engine failed to find a move");
                    // Reset so we can try again
                    setLastEngineMoveFen(null);
                }
            } catch (error) {
                console.error("[BoardEngine] Error in engine move:", error);
                setLastEngineMoveFen(null);
            } finally {
                setIsThinking(false);
                isProcessingRef.current = false;
            }
        };

        triggerEngineMove();
    }, [hasGameStarted, game, playerColor, isThinking, fen, getNextMove, storeMakeMove, setIsThinking, isReady, lastEngineMoveFen, setLastEngineMoveFen]);
}
