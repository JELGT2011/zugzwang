import { usePuzzleStore } from "@/stores";
import { useCoachStore } from "@/stores/coachStore";
import { useStockfish } from "@/contexts/StockfishContext";
import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
        attacker: string;
        attackerFromSquare: string;
        attackerToSquare: string;
        targetPieces: string[];
    }>;
    materialBalance: number;
    notes: string[];
}

interface EngineLine {
    move: string;
    san: string;
    evaluation: number | null;
    mate: number | null;
    pv: string[];
}

interface StepEngineAnalysis {
    stepIndex: number;
    fen: string;
    sideToMove: "white" | "black";
    solutionMove: string;
    lines: EngineLine[];
}

interface SolutionAnalysis {
    movingPiece: string;
    movingFromSquare: string;
    movingToSquare: string;
    kind: "checkmate" | "check" | "capture" | "promotion" | "quiet" | "sacrifice";
    isCheck: boolean;
    isCheckmate: boolean;
    capturedPiece: string | null;
    capturedSquare: string | null;
    promotedTo: string | null;
    materialDelta: number;
    newThreats: Array<{
        attacker: string;
        attackerSquare: string;
        target: string;
        targetSquare: string;
    }>;
    rationale: string;
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

const SLIDER_DIRECTIONS: Record<"b" | "r" | "q", Array<[number, number]>> = {
    b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
    r: [[0, 1], [0, -1], [1, 0], [-1, 0]],
    q: [
        [0, 1], [0, -1], [1, 0], [-1, 0],
        [1, 1], [1, -1], [-1, 1], [-1, -1],
    ],
};

function squareFromCoords(file: number, rank: number): Square {
    return (String.fromCharCode(97 + file) + (8 - rank)) as Square;
}

function detectPins(game: Chess, ownColor: Color): TacticalContext["pins"] {
    const pins: TacticalContext["pins"] = [];
    const opponentColor: Color = ownColor === "w" ? "b" : "w";
    const board = game.board();

    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const slider = board[rank][file];
            if (!slider || slider.color !== opponentColor) continue;
            if (slider.type !== "b" && slider.type !== "r" && slider.type !== "q") {
                continue;
            }

            const sliderSquare = squareFromCoords(file, rank);
            const dirs = SLIDER_DIRECTIONS[slider.type];

            for (const [df, dr] of dirs) {
                let firstBlocker: { square: Square; type: PieceSymbol } | null = null;
                for (let step = 1; step < 8; step++) {
                    const f = file + df * step;
                    const r = rank + dr * step;
                    if (f < 0 || f > 7 || r < 0 || r > 7) break;
                    const piece = board[r][f];
                    if (!piece) continue;

                    const sq = squareFromCoords(f, r);
                    if (!firstBlocker) {
                        if (piece.color === opponentColor) break;
                        firstBlocker = { square: sq, type: piece.type };
                    } else {
                        if (
                            piece.color === ownColor &&
                            (piece.type === "k" ||
                                piece.type === "q" ||
                                piece.type === "r")
                        ) {
                            pins.push({
                                pinnedPiece: PIECE_NAMES[firstBlocker.type],
                                pinnedSquare: firstBlocker.square,
                                pinnedBy: `${PIECE_NAMES[slider.type]} on ${sliderSquare}`,
                                protects: `${PIECE_NAMES[piece.type]} on ${sq}`,
                            });
                        }
                        break;
                    }
                }
            }
        }
    }

    return pins;
}

function computeTacticalContext(game: Chess): TacticalContext {
    const turn = game.turn();

    const captures: TacticalContext["captures"] = [];
    const checks: TacticalContext["checks"] = [];
    const undefendedPieces: TacticalContext["undefendedPieces"] = [];
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

            const square = squareFromCoords(file, rank);
            materialBalance +=
                piece.color === "w"
                    ? PIECE_VALUES[piece.type]
                    : -PIECE_VALUES[piece.type];

            if (piece.type === "k") continue;

            const attackerColor: Color = piece.color === "w" ? "b" : "w";
            const defenderColor: Color = piece.color;

            const attackerSquares = game.attackers(square, attackerColor);
            if (attackerSquares.length === 0) continue;

            const defenderSquares = game.attackers(square, defenderColor);
            if (defenderSquares.length > 0) continue;

            const attackedBy = attackerSquares.map((aSq) => {
                const ap = game.get(aSq);
                return ap ? `${PIECE_NAMES[ap.type]} on ${aSq}` : aSq;
            });

            undefendedPieces.push({
                piece: PIECE_NAMES[piece.type],
                square,
                color: piece.color === "w" ? "white" : "black",
                attackedBy,
            });
        }
    }

    const pins = detectPins(game, turn);

    const forkMap = new Map<string, TacticalContext["forkTargets"][number]>();
    for (const move of legalMoves) {
        const tempGame = new Chess(game.fen());
        tempGame.move(move);

        const tempBoard = tempGame.board();
        const attackedPieces: string[] = [];

        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = tempBoard[rank][file];
                if (!piece || piece.color === turn) continue;
                const sq = squareFromCoords(file, rank);
                if (
                    tempGame.isAttacked(sq, turn) &&
                    (piece.type === "k" ||
                        piece.type === "q" ||
                        piece.type === "r")
                ) {
                    attackedPieces.push(`${PIECE_NAMES[piece.type]} on ${sq}`);
                }
            }
        }

        if (attackedPieces.length >= 2) {
            const key = [...attackedPieces].sort().join("|");
            if (!forkMap.has(key)) {
                const moverPiece = game.get(move.from as Square);
                forkMap.set(key, {
                    attacker: moverPiece ? PIECE_NAMES[moverPiece.type] : "piece",
                    attackerFromSquare: move.from,
                    attackerToSquare: move.to,
                    targetPieces: attackedPieces,
                });
            }
        }
    }
    const forkTargets = Array.from(forkMap.values());

    if (game.isCheck()) {
        notes.push("The king is in check!");
    }
    const ownHanging = undefendedPieces.filter(
        (p) => (p.color === "white") === (turn === "w")
    );
    const oppHanging = undefendedPieces.filter(
        (p) => (p.color === "white") !== (turn === "w")
    );
    if (ownHanging.length > 0) {
        notes.push(`${ownHanging.length} of your piece(s) hanging.`);
    }
    if (oppHanging.length > 0) {
        notes.push(`${oppHanging.length} opponent piece(s) hanging.`);
    }
    if (pins.length > 0) {
        notes.push(`${pins.length} pin(s) detected.`);
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

function computeMaterial(game: Chess): number {
    const board = game.board();
    let bal = 0;
    for (const row of board) {
        for (const p of row) {
            if (!p) continue;
            bal += p.color === "w" ? PIECE_VALUES[p.type] : -PIECE_VALUES[p.type];
        }
    }
    return bal;
}

function analyzeSolution(
    beforeFen: string,
    solutionUci: string
): SolutionAnalysis | null {
    const before = new Chess(beforeFen);
    const movingSide = before.turn();
    const from = solutionUci.slice(0, 2) as Square;
    const to = solutionUci.slice(2, 4) as Square;
    const promotion = solutionUci.length > 4 ? solutionUci[4] : undefined;

    const movingPiece = before.get(from);
    if (!movingPiece) return null;

    const after = new Chess(beforeFen);
    let moveResult;
    try {
        moveResult = after.move({ from, to, promotion });
    } catch {
        return null;
    }
    if (!moveResult) return null;

    const matBefore = computeMaterial(before);
    const matAfter = computeMaterial(after);
    const materialDelta =
        (matAfter - matBefore) * (movingSide === "w" ? 1 : -1);

    const beforeThreatKeys = new Set<string>();
    for (const m of before.moves({ verbose: true })) {
        if (m.captured) beforeThreatKeys.add(`${m.from}->${m.to}`);
    }

    const newThreats: SolutionAnalysis["newThreats"] = [];
    try {
        const afterFenParts = after.fen().split(" ");
        afterFenParts[1] = movingSide;
        const threatGame = new Chess(afterFenParts.join(" "));
        for (const m of threatGame.moves({ verbose: true })) {
            if (!m.captured) continue;
            const key = `${m.from}->${m.to}`;
            if (beforeThreatKeys.has(key)) continue;
            const attacker = threatGame.get(m.from as Square);
            if (!attacker) continue;
            newThreats.push({
                attacker: PIECE_NAMES[attacker.type],
                attackerSquare: m.from,
                target: PIECE_NAMES[m.captured as PieceSymbol],
                targetSquare: m.to,
            });
        }
    } catch {
        // ignore — threat game may be invalid (e.g. king already in check after artificial turn swap)
    }

    const isCheck = after.isCheck();
    const isCheckmate = after.isCheckmate();
    const isCapture = moveResult.captured !== undefined;
    const isPromotion = moveResult.promotion !== undefined;

    let kind: SolutionAnalysis["kind"];
    if (isCheckmate) kind = "checkmate";
    else if (isCheck) kind = "check";
    else if (isPromotion) kind = "promotion";
    else if (isCapture && materialDelta < 0) kind = "sacrifice";
    else if (isCapture) kind = "capture";
    else kind = "quiet";

    const movingPieceName = PIECE_NAMES[movingPiece.type];
    const parts: string[] = [];
    if (isCheckmate) {
        parts.push(`delivers checkmate`);
    } else if (isCheck) {
        parts.push(`gives check`);
    }
    if (isCapture && moveResult.captured) {
        const capName = PIECE_NAMES[moveResult.captured as PieceSymbol];
        parts.push(`captures the ${capName} on ${to}`);
    }
    if (isPromotion && moveResult.promotion) {
        parts.push(`promotes to ${PIECE_NAMES[moveResult.promotion as PieceSymbol]}`);
    }
    if (newThreats.length > 0) {
        const top = newThreats.slice(0, 3).map(
            (t) => `${t.attacker} on ${t.attackerSquare} → ${t.target} on ${t.targetSquare}`
        );
        parts.push(`creates new threat(s): ${top.join("; ")}`);
    }
    if (parts.length === 0) {
        parts.push(`is a quiet move (no immediate capture, check, or new threat)`);
    }
    const matFragment =
        materialDelta > 0
            ? ` Net material change for the mover: +${materialDelta}.`
            : materialDelta < 0
                ? ` Net material change for the mover: ${materialDelta} (sacrifice).`
                : "";
    const rationale =
        `The ${movingPieceName} from ${from} to ${to} ${parts.join("; ")}.${matFragment}`.trim();

    return {
        movingPiece: movingPieceName,
        movingFromSquare: from,
        movingToSquare: to,
        kind,
        isCheck,
        isCheckmate,
        capturedPiece: moveResult.captured
            ? PIECE_NAMES[moveResult.captured as PieceSymbol]
            : null,
        capturedSquare: moveResult.captured ? to : null,
        promotedTo: moveResult.promotion
            ? PIECE_NAMES[moveResult.promotion as PieceSymbol]
            : null,
        materialDelta,
        newThreats,
        rationale,
    };
}

function walkUserDecisions(
    initialFen: string,
    moves: string[]
): Array<{ stepIndex: number; fen: string; solutionMove: string }> {
    const out: Array<{ stepIndex: number; fen: string; solutionMove: string }> = [];
    const game = new Chess(initialFen);
    for (let i = 0; i < moves.length; i++) {
        if (i % 2 === 1) {
            out.push({
                stepIndex: i,
                fen: game.fen(),
                solutionMove: moves[i],
            });
        }
        try {
            game.move({
                from: moves[i].slice(0, 2),
                to: moves[i].slice(2, 4),
                promotion: moves[i].length > 4 ? moves[i][4] : undefined,
            });
        } catch {
            break;
        }
    }
    return out;
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
 * Calls /api/puzzles/hint on demand. Hint depth is taken from hintsUsed
 * BEFORE the puzzle store increments (so the first click sends 0).
 * Spoken text is appended to the transcript and played via TTS;
 * arrows that would reveal the solution are stripped server-side.
 */
export function useTurnBasedPuzzleHint() {
    const currentPuzzle = usePuzzleStore((s) => s.currentPuzzle);
    const currentMoveIndex = usePuzzleStore((s) => s.currentMoveIndex);
    const hintsUsed = usePuzzleStore((s) => s.hintsUsed);

    const addToHistory = useCoachStore((s) => s.addToHistory);

    const { playText, stop: stopTts, isPlaying: isSpeaking } = useTtsPlayer();
    const { isReady: isStockfishReady, getTopMoves } = useStockfish();

    const [arrows, setArrows] = useState<Arrow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUsage, setLastUsage] = useState<HintUsage | null>(null);
    const [engineSteps, setEngineSteps] = useState<StepEngineAnalysis[]>([]);
    const inflightRef = useRef<AbortController | null>(null);

    useEffect(() => {
        setEngineSteps([]);
        if (!currentPuzzle || !isStockfishReady) return;

        let cancelled = false;
        const decisions = walkUserDecisions(currentPuzzle.fen, currentPuzzle.moves);
        if (decisions.length === 0) return;

        (async () => {
            const collected: StepEngineAnalysis[] = [];
            for (const decision of decisions) {
                if (cancelled) return;
                try {
                    const top = await getTopMoves(decision.fen, 3, 15);
                    if (cancelled) return;
                    const sideToMove =
                        new Chess(decision.fen).turn() === "w" ? "white" : "black";
                    collected.push({
                        stepIndex: decision.stepIndex,
                        fen: decision.fen,
                        sideToMove,
                        solutionMove: decision.solutionMove,
                        lines: top.slice(0, 3).map((t) => ({
                            move: t.move,
                            san: t.san,
                            evaluation: t.evaluation,
                            mate: t.mate,
                            pv: t.principalVariation.slice(0, 5),
                        })),
                    });
                } catch (e) {
                    console.warn(
                        "[turnBasedPuzzleHint] engine pre-compute failed for step",
                        decision.stepIndex,
                        e
                    );
                }
            }
            if (!cancelled) {
                console.debug(
                    "[turnBasedPuzzleHint] engine pre-compute complete",
                    { steps: collected.length, puzzleId: currentPuzzle.id }
                );
                setEngineSteps(collected);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [currentPuzzle, isStockfishReady, getTopMoves]);

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

        const pieces: Array<{ piece: string; square: string; color: "white" | "black" }> = [];
        const boardSnapshot = game.board();
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const p = boardSnapshot[rank][file];
                if (!p) continue;
                pieces.push({
                    piece: PIECE_NAMES[p.type],
                    square: squareFromCoords(file, rank),
                    color: p.color === "w" ? "white" : "black",
                });
            }
        }

        return {
            game,
            fen: game.fen(),
            pieces,
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

        const solutionAnalysis = analyzeSolution(
            currentGameState.fen,
            solutionMove
        );

        const relevantEngineSteps = engineSteps
            .filter((s) => s.stepIndex >= currentMoveIndex)
            .map((s) => ({
                ...s,
                isCurrent: s.stepIndex === currentMoveIndex,
            }));

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
                    fen: currentGameState.fen,
                    pieces: currentGameState.pieces,
                    themes: currentPuzzle.themes,
                    hintsUsed,
                    moveNumber: Math.ceil(currentMoveIndex / 2),
                    totalMoves: Math.ceil((currentPuzzle.moves.length - 1) / 2),
                    playerColor: currentGameState.turn === "w" ? "White" : "Black",
                    tacticalContext: currentGameState.tacticalContext,
                    solutionMove,
                    solutionMoveReadable,
                    solutionAnalysis,
                    engineSteps: relevantEngineSteps,
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
        engineSteps,
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
