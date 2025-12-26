import { useBoardStore } from "@/stores";
import { Chess, Move } from "chess.js";
import { useCallback, useMemo } from "react";
import type { Arrow } from "react-chessboard";

/**
 * BoardController hook - provides a clean interface to the board state and actions.
 * Acts as a proxy/facade to the underlying Zustand store.
 * Reconstructs Chess instance from FEN when needed for computed values.
 */
export function useBoardController() {
    // Get store state (all serializable)
    const fen = useBoardStore((state) => state.fen);
    const moveHistory = useBoardStore((state) => state.moveHistory);
    const playerColor = useBoardStore((state) => state.playerColor);
    const arrows = useBoardStore((state) => state.arrows);
    const hasGameStarted = useBoardStore((state) => state.hasGameStarted);

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

