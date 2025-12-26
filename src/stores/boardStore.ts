import { Chess, Color, Move } from "chess.js";
import type { Arrow } from "react-chessboard";
import { create } from "zustand";

interface BoardState {
    // Core game state
    game: Chess;
    playerColor: Color;
    arrows: Arrow[];
    hasGameStarted: boolean;

    // Actions
    setGame: (game: Chess) => void;
    setPlayerColor: (color: Color) => void;
    setArrows: (arrows: Arrow[] | ((prev: Arrow[]) => Arrow[])) => void;
    addArrow: (arrow: Arrow) => void;
    clearArrows: () => void;
    setHasGameStarted: (started: boolean) => void;

    // Game actions
    makeMove: (from: string, to: string, promotion?: string) => boolean;
    startNewGame: (asWhite: boolean) => void;
    resetGame: () => void;

    // Computed values
    getStatus: () => string;
    getFen: () => string;
    getMoveHistory: () => Move[];
    getLastMove: () => string | null;
    isGameOver: () => boolean;
}

export const useBoardStore = create<BoardState>((set, get) => ({
    // Initial state
    game: new Chess(),
    playerColor: "w",
    arrows: [],
    hasGameStarted: false,

    // Setters
    setGame: (game) => set({ game }),
    setPlayerColor: (color) => set({ playerColor: color }),
    setArrows: (arrows) =>
        set((state) => ({
            arrows: typeof arrows === "function" ? arrows(state.arrows) : arrows,
        })),
    addArrow: (arrow) => set((state) => ({ arrows: [...state.arrows, arrow] })),
    clearArrows: () => set({ arrows: [] }),
    setHasGameStarted: (started) => set({ hasGameStarted: started }),

    // Game actions
    makeMove: (from, to, promotion = "q") => {
        const { game } = get();
        const gameCopy = new Chess(game.fen());

        try {
            const result = gameCopy.move({
                from,
                to,
                promotion,
            });

            if (result === null) {
                return false;
            }

            set({ game: gameCopy });
            return true;
        } catch (err) {
            console.error("Move error:", err);
            return false;
        }
    },

    startNewGame: (asWhite) => {
        const newGame = new Chess();
        set({
            game: newGame,
            playerColor: asWhite ? "w" : "b",
            arrows: [],
            hasGameStarted: true,
        });
    },

    resetGame: () => {
        const newGame = new Chess();
        set({
            game: newGame,
            playerColor: "w",
            arrows: [],
            hasGameStarted: false,
        });
    },

    // Computed values
    getStatus: () => {
        const { game } = get();
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
    },

    getFen: () => get().game.fen(),

    getMoveHistory: () => get().game.history({ verbose: true }),

    getLastMove: () => {
        const { game } = get();
        const history = game.history();
        return history.length > 0 ? history[history.length - 1] : null;
    },

    isGameOver: () => get().game.isGameOver(),
}));
