import { Chess, Color, Move } from "chess.js";
import type { Arrow } from "react-chessboard";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export type GameMode = "game" | "puzzle" | "opening";

interface BoardState {
    // Core game state (serializable)
    fen: string;
    moveHistory: Move[]; // Store full Move objects (verbose history)
    playerColor: Color;
    arrows: Arrow[];
    hasGameStarted: boolean;
    gameMode: GameMode;
    isThinking: boolean;

    // Actions
    setFen: (fen: string) => void;
    setPlayerColor: (color: Color) => void;
    setArrows: (arrows: Arrow[] | ((prev: Arrow[]) => Arrow[])) => void;
    addArrow: (arrow: Arrow) => void;
    clearArrows: () => void;
    setHasGameStarted: (started: boolean) => void;
    setGameMode: (mode: GameMode) => void;
    setIsThinking: (isThinking: boolean) => void;

    // Game actions
    makeMove: (from: string, to: string, promotion?: string) => boolean;
    startNewGame: (asWhite: boolean, mode?: GameMode) => void;
    resetGame: () => void;

    // Helper to reconstruct Chess instance
    getChessInstance: () => Chess;
}

export const useBoardStore = create<BoardState>()(
    devtools(
        (set, get) => ({
            // Initial state
            fen: STARTING_FEN,
            moveHistory: [],
            playerColor: "w",
            arrows: [],
            hasGameStarted: false,
            gameMode: "game",
            isThinking: false,

            // Setters
            setFen: (fen) => set({ fen, arrows: [] }, false, "setFen"),
            setPlayerColor: (color) => set({ playerColor: color }, false, "setPlayerColor"),
            setArrows: (arrows) =>
                set(
                    (state) => ({
                        arrows: typeof arrows === "function" ? arrows(state.arrows) : arrows,
                    }),
                    false,
                    "setArrows"
                ),
            addArrow: (arrow) =>
                set((state) => ({ arrows: [...state.arrows, arrow] }), false, "addArrow"),
            clearArrows: () => set({ arrows: [] }, false, "clearArrows"),
            setHasGameStarted: (started) =>
                set({ hasGameStarted: started }, false, "setHasGameStarted"),
            setGameMode: (gameMode) => set({ gameMode }, false, "setGameMode"),
            setIsThinking: (isThinking) => set({ isThinking }, false, "setIsThinking"),

            // Game actions
            makeMove: (from, to, promotion = "q") => {
                const { fen, moveHistory } = get();
                const game = new Chess(fen);

                try {
                    const result = game.move({
                        from,
                        to,
                        promotion,
                    });

                    if (result === null) {
                        return false;
                    }

                    // Update state with new FEN and move history
                    set(
                        {
                            fen: game.fen(),
                            moveHistory: [...moveHistory, result],
                            arrows: [],
                        },
                        false,
                        "makeMove"
                    );
                    return true;
                } catch (err) {
                    console.error("Move error:", err);
                    return false;
                }
            },

            startNewGame: (asWhite, mode = "game") => {
                set(
                    {
                        fen: STARTING_FEN,
                        moveHistory: [],
                        playerColor: asWhite ? "w" : "b",
                        arrows: [],
                        hasGameStarted: true,
                        gameMode: mode,
                        isThinking: false,
                    },
                    false,
                    "startNewGame"
                );
            },

            resetGame: () => {
                set(
                    {
                        fen: STARTING_FEN,
                        moveHistory: [],
                        playerColor: "w",
                        arrows: [],
                        hasGameStarted: false,
                    },
                    false,
                    "resetGame"
                );
            },

            // Helper to reconstruct Chess instance from current state
            getChessInstance: () => {
                const { fen } = get();
                return new Chess(fen);
            },
        }),
        { name: "BoardStore" }
    )
);
