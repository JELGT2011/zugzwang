import type { Puzzle, PuzzleFilters, PuzzleSortOption, PuzzleTheme } from "@/types/puzzle";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type PuzzleStatus = "idle" | "playing" | "success" | "failed";

interface PuzzleState {
    // Puzzle library
    puzzles: Puzzle[];
    isLoading: boolean;
    error: string | null;

    // Filtering & sorting
    filters: PuzzleFilters;
    sortOption: PuzzleSortOption;

    // Current puzzle session
    currentPuzzle: Puzzle | null;
    currentMoveIndex: number; // Which move in the solution we're on
    puzzleStatus: PuzzleStatus;
    playerMoves: string[]; // Moves the player has made
    hintsUsed: number;
    showSolution: boolean;

    // Actions - Library management
    setPuzzles: (puzzles: Puzzle[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    // Actions - Filtering & sorting
    setFilters: (filters: PuzzleFilters) => void;
    updateFilter: <K extends keyof PuzzleFilters>(key: K, value: PuzzleFilters[K]) => void;
    clearFilters: () => void;
    setSortOption: (sort: PuzzleSortOption) => void;

    // Actions - Puzzle session
    startPuzzle: (puzzle: Puzzle) => void;
    makeMove: (move: string) => { correct: boolean; complete: boolean };
    useHint: () => string | null;
    showPuzzleSolution: () => void;
    resetPuzzle: () => void;
    nextPuzzle: () => Puzzle | null;

    // Computed / helpers
    getFilteredPuzzles: () => Puzzle[];
    getPuzzleById: (id: string) => Puzzle | undefined;
    getExpectedMove: () => string | null;
    getOpponentMove: () => string | null;
}

const DEFAULT_FILTERS: PuzzleFilters = {};
const DEFAULT_SORT: PuzzleSortOption = { field: "rating", direction: "asc" };

export const usePuzzleStore = create<PuzzleState>()(
    devtools(
        (set, get) => ({
            // Initial state
            puzzles: [],
            isLoading: false,
            error: null,
            filters: DEFAULT_FILTERS,
            sortOption: DEFAULT_SORT,
            currentPuzzle: null,
            currentMoveIndex: 0,
            puzzleStatus: "idle",
            playerMoves: [],
            hintsUsed: 0,
            showSolution: false,

            // Library management
            setPuzzles: (puzzles) => set({ puzzles, isLoading: false, error: null }, false, "setPuzzles"),
            setLoading: (isLoading) => set({ isLoading }, false, "setLoading"),
            setError: (error) => set({ error, isLoading: false }, false, "setError"),

            // Filtering & sorting
            setFilters: (filters) => set({ filters }, false, "setFilters"),
            updateFilter: (key, value) =>
                set(
                    (state) => ({
                        filters: { ...state.filters, [key]: value },
                    }),
                    false,
                    "updateFilter"
                ),
            clearFilters: () => set({ filters: DEFAULT_FILTERS }, false, "clearFilters"),
            setSortOption: (sortOption) => set({ sortOption }, false, "setSortOption"),

            // Puzzle session
            startPuzzle: (puzzle) =>
                set(
                    {
                        currentPuzzle: puzzle,
                        currentMoveIndex: 0,
                        puzzleStatus: "playing",
                        playerMoves: [],
                        hintsUsed: 0,
                        showSolution: false,
                    },
                    false,
                    "startPuzzle"
                ),

            makeMove: (move) => {
                const { currentPuzzle, currentMoveIndex, playerMoves } = get();

                if (!currentPuzzle || get().puzzleStatus !== "playing") {
                    return { correct: false, complete: false };
                }

                // In puzzles, the player makes odd-indexed moves (0 is setup, 1 is player's first move, etc.)
                // Actually, in Lichess puzzles:
                // - moves[0] is the opponent's last move (already on the board when puzzle starts)
                // - moves[1] is the player's first move
                // - moves[2] is the opponent's response
                // - moves[3] is the player's second move, etc.

                // Player moves are at odd indices: 1, 3, 5, ...
                const expectedMoveIndex = currentMoveIndex;
                const expectedMove = currentPuzzle.moves[expectedMoveIndex];

                // Normalize moves for comparison (remove promotion piece case differences)
                const normalizedMove = move.toLowerCase();
                const normalizedExpected = expectedMove?.toLowerCase();

                if (normalizedMove === normalizedExpected) {
                    const newMoveIndex = currentMoveIndex + 1;
                    const isComplete = newMoveIndex >= currentPuzzle.moves.length;

                    set(
                        {
                            currentMoveIndex: newMoveIndex,
                            playerMoves: [...playerMoves, move],
                            puzzleStatus: isComplete ? "success" : "playing",
                        },
                        false,
                        "makeMove:correct"
                    );

                    return { correct: true, complete: isComplete };
                } else {
                    set({ puzzleStatus: "failed" }, false, "makeMove:incorrect");
                    return { correct: false, complete: false };
                }
            },

            useHint: () => {
                const { currentPuzzle, currentMoveIndex, hintsUsed } = get();

                if (!currentPuzzle || get().puzzleStatus !== "playing") {
                    return null;
                }

                const expectedMove = currentPuzzle.moves[currentMoveIndex];
                set({ hintsUsed: hintsUsed + 1 }, false, "useHint");

                // Return the from-square as a hint (first 2 chars of UCI move)
                return expectedMove?.slice(0, 2) || null;
            },

            showPuzzleSolution: () => {
                set({ showSolution: true, puzzleStatus: "failed" }, false, "showSolution");
            },

            resetPuzzle: () => {
                const { currentPuzzle } = get();
                if (currentPuzzle) {
                    set(
                        {
                            currentMoveIndex: 0,
                            puzzleStatus: "playing",
                            playerMoves: [],
                            hintsUsed: 0,
                            showSolution: false,
                        },
                        false,
                        "resetPuzzle"
                    );
                }
            },

            nextPuzzle: () => {
                const { currentPuzzle } = get();
                const filtered = get().getFilteredPuzzles();

                if (!currentPuzzle || filtered.length === 0) {
                    return null;
                }

                const currentIndex = filtered.findIndex((p) => p.id === currentPuzzle.id);
                const nextIndex = (currentIndex + 1) % filtered.length;
                const nextPuzzle = filtered[nextIndex];

                if (nextPuzzle) {
                    get().startPuzzle(nextPuzzle);
                }

                return nextPuzzle;
            },

            // Computed helpers
            getFilteredPuzzles: () => {
                const { puzzles, filters, sortOption } = get();

                let filtered = [...puzzles];

                // Apply filters
                if (filters.difficulty) {
                    const ranges: Record<string, { min: number; max: number }> = {
                        beginner: { min: 0, max: 1000 },
                        easy: { min: 1000, max: 1400 },
                        medium: { min: 1400, max: 1800 },
                        hard: { min: 1800, max: 2200 },
                        expert: { min: 2200, max: 2600 },
                        master: { min: 2600, max: 9999 },
                    };
                    const range = ranges[filters.difficulty];
                    if (range) {
                        filtered = filtered.filter((p) => p.rating >= range.min && p.rating < range.max);
                    }
                }

                if (filters.themes && filters.themes.length > 0) {
                    filtered = filtered.filter((p) =>
                        filters.themes!.some((theme) => p.themes.includes(theme as PuzzleTheme))
                    );
                }

                if (filters.minRating !== undefined) {
                    filtered = filtered.filter((p) => p.rating >= filters.minRating!);
                }

                if (filters.maxRating !== undefined) {
                    filtered = filtered.filter((p) => p.rating <= filters.maxRating!);
                }

                if (filters.searchQuery) {
                    const query = filters.searchQuery.toLowerCase();
                    filtered = filtered.filter(
                        (p) =>
                            p.id.toLowerCase().includes(query) ||
                            p.themes.some((t) => t.toLowerCase().includes(query))
                    );
                }

                // Apply sorting
                filtered.sort((a, b) => {
                    const aVal = a[sortOption.field];
                    const bVal = b[sortOption.field];
                    const modifier = sortOption.direction === "asc" ? 1 : -1;
                    return (aVal - bVal) * modifier;
                });

                return filtered;
            },

            getPuzzleById: (id) => {
                return get().puzzles.find((p) => p.id === id);
            },

            getExpectedMove: () => {
                const { currentPuzzle, currentMoveIndex } = get();
                if (!currentPuzzle) return null;
                return currentPuzzle.moves[currentMoveIndex] || null;
            },

            getOpponentMove: () => {
                const { currentPuzzle, currentMoveIndex } = get();
                if (!currentPuzzle) return null;
                // After player makes a move, the next move is opponent's
                return currentPuzzle.moves[currentMoveIndex] || null;
            },
        }),
        { name: "PuzzleStore" }
    )
);
