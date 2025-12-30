// Puzzle themes from Lichess database
export const PUZZLE_THEMES = [
    "advancedPawn",
    "advantage",
    "anapimovaopening",
    "anastasiaMate",
    "arabianMate",
    "attackingF2F7",
    "attraction",
    "backRankMate",
    "bishopEndgame",
    "bodenMate",
    "capturingDefender",
    "castling",
    "clearance",
    "cornerMate",
    "crushing",
    "defensiveMove",
    "deflection",
    "discoveredAttack",
    "doubleBishopMate",
    "doubleCheck",
    "dovetailMate",
    "endgame",
    "enPassant",
    "equality",
    "exposedKing",
    "fork",
    "hangingPiece",
    "hookMate",
    "interference",
    "intermezzo",
    "kingsideAttack",
    "knightEndgame",
    "long",
    "master",
    "masterVsMaster",
    "mate",
    "mateIn1",
    "mateIn2",
    "mateIn3",
    "mateIn4",
    "mateIn5",
    "middlegame",
    "oneMove",
    "opening",
    "pawnEndgame",
    "pin",
    "promotion",
    "queenEndgame",
    "queenRookEndgame",
    "queensideAttack",
    "quietMove",
    "rookEndgame",
    "sacrifice",
    "short",
    "simplification",
    "skewer",
    "smotheredMate",
    "superGM",
    "trappedPiece",
    "underPromotion",
    "veryLong",
    "xRayAttack",
    "zugzwang",
] as const;

export type PuzzleTheme = (typeof PUZZLE_THEMES)[number];

// Display names for themes
export const THEME_DISPLAY_NAMES: Record<PuzzleTheme, string> = {
    advancedPawn: "Advanced Pawn",
    advantage: "Advantage",
    anapimovaopening: "Anapimova Opening",
    anastasiaMate: "Anastasia's Mate",
    arabianMate: "Arabian Mate",
    attackingF2F7: "Attacking f2/f7",
    attraction: "Attraction",
    backRankMate: "Back Rank Mate",
    bishopEndgame: "Bishop Endgame",
    bodenMate: "Boden's Mate",
    capturingDefender: "Capturing Defender",
    castling: "Castling",
    clearance: "Clearance",
    cornerMate: "Corner Mate",
    crushing: "Crushing",
    defensiveMove: "Defensive Move",
    deflection: "Deflection",
    discoveredAttack: "Discovered Attack",
    doubleBishopMate: "Double Bishop Mate",
    doubleCheck: "Double Check",
    dovetailMate: "Dovetail Mate",
    endgame: "Endgame",
    enPassant: "En Passant",
    equality: "Equality",
    exposedKing: "Exposed King",
    fork: "Fork",
    hangingPiece: "Hanging Piece",
    hookMate: "Hook Mate",
    interference: "Interference",
    intermezzo: "Intermezzo",
    kingsideAttack: "Kingside Attack",
    knightEndgame: "Knight Endgame",
    long: "Long",
    master: "Master",
    masterVsMaster: "Master vs Master",
    mate: "Mate",
    mateIn1: "Mate in 1",
    mateIn2: "Mate in 2",
    mateIn3: "Mate in 3",
    mateIn4: "Mate in 4",
    mateIn5: "Mate in 5",
    middlegame: "Middlegame",
    oneMove: "One Move",
    opening: "Opening",
    pawnEndgame: "Pawn Endgame",
    pin: "Pin",
    promotion: "Promotion",
    queenEndgame: "Queen Endgame",
    queenRookEndgame: "Queen + Rook Endgame",
    queensideAttack: "Queenside Attack",
    quietMove: "Quiet Move",
    rookEndgame: "Rook Endgame",
    sacrifice: "Sacrifice",
    short: "Short",
    simplification: "Simplification",
    skewer: "Skewer",
    smotheredMate: "Smothered Mate",
    superGM: "Super GM",
    trappedPiece: "Trapped Piece",
    underPromotion: "Under Promotion",
    veryLong: "Very Long",
    xRayAttack: "X-Ray Attack",
    zugzwang: "Zugzwang",
};

// Difficulty categories based on rating
export type PuzzleDifficulty = "beginner" | "easy" | "medium" | "hard" | "expert" | "master";

export const DIFFICULTY_RANGES: Record<PuzzleDifficulty, { min: number; max: number; label: string; color: string }> = {
    beginner: { min: 0, max: 1000, label: "Beginner", color: "#98971a" },
    easy: { min: 1000, max: 1400, label: "Easy", color: "#689d6a" },
    medium: { min: 1400, max: 1800, label: "Medium", color: "#d79921" },
    hard: { min: 1800, max: 2200, label: "Hard", color: "#d65d0e" },
    expert: { min: 2200, max: 2600, label: "Expert", color: "#cc241d" },
    master: { min: 2600, max: 9999, label: "Master", color: "#b16286" },
};

export interface Puzzle {
    id: string;
    fen: string; // Starting position (after opponent's last move)
    moves: string[]; // Solution moves in UCI format (e.g., ["e2e4", "e7e5"])
    rating: number;
    ratingDeviation: number;
    popularity: number;
    nbPlays: number;
    themes: PuzzleTheme[];
    gameUrl?: string;
    openingTags?: string[];
}

export interface PuzzleFilters {
    difficulty?: PuzzleDifficulty;
    themes?: PuzzleTheme[];
    minRating?: number;
    maxRating?: number;
    searchQuery?: string;
}

export interface PuzzleSortOption {
    field: "rating" | "popularity" | "nbPlays";
    direction: "asc" | "desc";
}

// Helper functions
export function getDifficultyFromRating(rating: number): PuzzleDifficulty {
    for (const [difficulty, range] of Object.entries(DIFFICULTY_RANGES)) {
        if (rating >= range.min && rating < range.max) {
            return difficulty as PuzzleDifficulty;
        }
    }
    return "master";
}

export function getDifficultyColor(difficulty: PuzzleDifficulty): string {
    return DIFFICULTY_RANGES[difficulty].color;
}

export function getRatingColor(rating: number): string {
    return getDifficultyColor(getDifficultyFromRating(rating));
}
