import { useBoardStore } from "@/stores";
import { Chess, Move } from "chess.js";
import { useCallback } from "react";
import type { Arrow } from "react-chessboard";

/**
 * BoardController hook - provides a clean interface to the board state and actions.
 * Acts as a proxy/facade to the underlying Zustand store.
 */
export function useBoardController() {
    // Get store state
    const game = useBoardStore((state) => state.game);
    const playerColor = useBoardStore((state) => state.playerColor);
    const arrows = useBoardStore((state) => state.arrows);
    const hasGameStarted = useBoardStore((state) => state.hasGameStarted);

    // Get store actions
    const storeSetGame = useBoardStore((state) => state.setGame);
    const storeMakeMove = useBoardStore((state) => state.makeMove);
    const storeStartNewGame = useBoardStore((state) => state.startNewGame);
    const storeAddArrow = useBoardStore((state) => state.addArrow);
    const storeClearArrows = useBoardStore((state) => state.clearArrows);
    const storeGetStatus = useBoardStore((state) => state.getStatus);
    const storeGetMoveHistory = useBoardStore((state) => state.getMoveHistory);
    const storeGetLastMove = useBoardStore((state) => state.getLastMove);
    const storeIsGameOver = useBoardStore((state) => state.isGameOver);

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

    const getStatus = useCallback(() => {
        return storeGetStatus();
    }, [storeGetStatus]);

    const getMoveHistory = useCallback((): Move[] => {
        return storeGetMoveHistory();
    }, [storeGetMoveHistory]);

    const getLastMove = useCallback((): string | null => {
        return storeGetLastMove();
    }, [storeGetLastMove]);

    const isGameOver = useCallback((): boolean => {
        return storeIsGameOver();
    }, [storeIsGameOver]);

    const getFen = useCallback(() => {
        return game.fen();
    }, [game]);

    const getTurn = useCallback(() => {
        return game.turn();
    }, [game]);

    const isPlayerTurn = useCallback(() => {
        return game.turn() === playerColor;
    }, [game, playerColor]);

    // Expose internal setGame for engine moves (temporary until we refactor engine logic)
    const setGame = useCallback(
        (newGame: Chess) => {
            storeSetGame(newGame);
        },
        [storeSetGame]
    );

    return {
        // State
        game,
        playerColor,
        arrows,
        hasGameStarted,

        // Actions
        makeMove,
        startNewGame,
        addArrow,
        clearArrows,
        setGame,

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

