import { usePuzzleStore } from "@/stores";
import { useCoachStore } from "@/stores/coachStore";
import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Arrow } from "react-chessboard";
import { useTtsPlayer } from "./useTtsPlayer";

interface HintUsage {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
}

interface TacticalContext {
    undefendedPieces: Array<{
        piece: string;
        square: string;
        color: string;
        attackedBy: string[];
    }>;
    pins: Array<{
        pinnedPiece: string;
        pinnedSquare: string;
        pinnedBy: string;
        protects: string;
    }>;
    captures: Array<{
        attacker: string;
        attackerSquare: string;
        target: string;
        targetSquare: string;
    }>;
    checks: Array<{
        piece: string;
        fromSquare: string;
        toSquare: string;
    }>;
    forkTargets: Array<{
        targetPieces: string[];
    }>;
    materialBalance: number;
    notes: string[];
}

const PIECE_NAMES: Record<PieceSymbol, string> = {
    p: "pawn",
    n: "knight",
    b: "bishop",
    r: "rook",
    q: "queen",
    k: "king",
};

const PIECE_VALUES: Record<PieceSymbol, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0,
};

function computeTacticalContext(game: Chess): TacticalContext {
    const turn = game.turn();
    const opponentColor: Color = turn === "w" ? "b" : "w";

    const undefendedPieces: TacticalContext["undefendedPieces"] = [];
    const pins: TacticalContext["pins"] = [];
    const captures: TacticalContext["captures"] = [];
    const checks: TacticalContext["checks"] = [];
    const forkTargets: TacticalContext["forkTargets"] = [];
    const notes: string[] = [];

    const legalMoves = game.moves({ verbose: true });

    for (const move of legalMoves) {
        if (move.captured) {
            const piece = game.get(move.from as Square);
            if (piece) {
                captures.push({
                    attacker: PIECE_NAMES[piece.type],
                    attackerSquare: move.from,
                    target: PIECE_NAMES[move.captured as PieceSymbol],
                    targetSquare: move.to,
                });
            }
        }

        const tempGame = new Chess(game.fen());
        tempGame.move(move);
        if (tempGame.isCheck()) {
            const piece = game.get(move.from as Square);
            if (piece) {
                checks.push({
                    piece: PIECE_NAMES[piece.type],
                    fromSquare: move.from,
                    toSquare: move.to,
                });
            }
        }
    }

    const board = game.board();
    let materialBalance = 0;

    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const piece = board[rank][file];
            if (!piece) continue;

            const square = (String.fromCharCode(97 + file) + (8 - rank)) as Square;
            materialBalance +=
                piece.color === "w"
                    ? PIECE_VALUES[piece.type]
                    : -PIECE_VALUES[piece.type];

            if (piece.color === opponentColor && piece.type !== "k") {
                const isAttacked = game.isAttacked(square, turn);
                const isDefended = game.isAttacked(square, opponentColor);

                if (isAttacked) {
                    const attackers: string[] = [];
                    for (const move of legalMoves) {
                        if (move.to === square && move.captured) {
                            const attacker = game.get(move.from as Square);
                            if (attacker) {
                                attackers.push(
                                    `${PIECE_NAMES[attacker.type]} on ${move.from}`
                                );
                            }
                        }
                    }

                    if (!isDefended) {
                        undefendedPieces.push({
                            piece: PIECE_NAMES[piece.type],
                            square,
                            color: piece.color === "w" ? "white" : "black",
                            attackedBy: attackers,
                        });
                    }
                }
            }
        }
    }

    for (const move of legalMoves) {
        const tempGame = new Chess(game.fen());
        tempGame.move(move);

        const attackedPieces: string[] = [];
        const tempBoard = tempGame.board();

        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = tempBoard[rank][file];
                if (!piece || piece.color === turn) continue;

                const sq = (String.fromCharCode(97 + file) + (8 - rank)) as Square;
                if (
                    tempGame.isAttacked(sq, turn) &&
                    (piece.type === "k" || piece.type === "q" || piece.type === "r")
                ) {
                    attackedPieces.push(`${PIECE_NAMES[piece.type]} on ${sq}`);
                }
            }
        }

        if (attackedPieces.length >= 2) {
            forkTargets.push({ targetPieces: attackedPieces });
        }
    }

    if (game.isCheck()) {
        notes.push("The king is in check!");
    }
    if (undefendedPieces.length > 0) {
        notes.push(`There are ${undefendedPieces.length} undefended piece(s).`);
    }
    if (checks.length > 0) {
        notes.push(`${checks.length} check(s) available.`);
    }
    if (forkTargets.length > 0) {
        notes.push("Fork opportunities exist.");
    }

    return {
        undefendedPieces,
        pins,
        captures,
        checks,
        forkTargets,
        materialBalance,
        notes,
    };
}

function uciToReadable(uci: string, game: Chess): string {
    const from = uci.slice(0, 2) as Square;
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;

    const piece = game.get(from);
    if (!piece) return `move from ${from} to ${to}`;

    const pieceName = PIECE_NAMES[piece.type];
    let readable = `${pieceName} from ${from} to ${to}`;

    if (promotion) {
        const promoName =
            PIECE_NAMES[promotion as PieceSymbol] || promotion;
        readable += ` promoting to ${promoName}`;
    }

    return readable;
}

/**
 * Turn-based puzzle hint hook — replaces usePuzzleAgentController.
 *
 * Calls /api/puzzles/hint when the user clicks the hint button. The route
 * uses Claude with a stable cached system prompt + structured JSON output
 * (spokenText + arrows). Arrows that would reveal the solution are stripped
 * server-side as a safety net.
 *
 * Solution awareness — the hook reads currentMoveIndex from the puzzle store
 * to look up the next correct move in puzzle.moves[]. Hint depth is taken
 * from hintsUsed BEFORE incrementing (so the first click sends hintsUsed=0).
 */
export function useTurnBasedPuzzleHint() {
    const currentPuzzle = usePuzzleStore((s) => s.currentPuzzle);
    const currentMoveIndex = usePuzzleStore((s) => s.currentMoveIndex);
    const hintsUsed = usePuzzleStore((s) => s.hintsUsed);

    const addToHistory = useCoachStore((s) => s.addToHistory);

    const { playText, stop: stopTts, isPlaying: isSpeaking } = useTtsPlayer();

    const [arrows, setArrows] = useState<Arrow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUsage, setLastUsage] = useState<HintUsage | null>(null);
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
            ascii: game.ascii(),
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
                    boardAscii: currentGameState.ascii,
                    themes: currentPuzzle.themes,
                    hintsUsed,
                    moveNumber: Math.ceil(currentMoveIndex / 2),
                    totalMoves: Math.ceil((currentPuzzle.moves.length - 1) / 2),
                    playerColor: currentGameState.turn === "w" ? "White" : "Black",
                    tacticalContext: currentGameState.tacticalContext,
                    solutionMove,
                    solutionMoveReadable,
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
