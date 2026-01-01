"use client";

import { StockfishEngine } from "@/lib/stockfish";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// Piece values for material calculation
const PIECE_VALUES: Record<PieceSymbol, number> = {
    p: 1, n: 3, b: 3, r: 5, q: 9, k: 0
};

const PIECE_NAMES: Record<PieceSymbol, string> = {
    p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king'
};

// Tactical information about a position after a move
export interface TacticalInfo {
    // Threats: pieces the moving side is now attacking (potential captures next turn)
    threats: Array<{
        attacker: string;      // e.g., "knight"
        attackerSquare: string; // e.g., "f3"
        target: string;        // e.g., "pawn"
        targetSquare: string;  // e.g., "e5"
        isNewThreat: boolean;  // Was this threat created by the move?
    }>;
    // Hanging pieces: opponent pieces that are attacked but not defended
    hanging: Array<{
        piece: string;         // e.g., "bishop"
        square: string;        // e.g., "c4"
        value: number;         // Material value
    }>;
    // Material balance after the move (positive = white advantage)
    materialBalance: number;
    // Key positional notes
    notes: string[];
}

export interface MoveAnnotation {
    move: string; // UCI format (e.g., "e2e4")
    san: string; // Standard algebraic notation (e.g., "e4")
    evaluation: number | null; // Centipawn score (positive = white advantage)
    mate: number | null; // Mate in N moves (positive = white mates, negative = black mates)
    isCheck: boolean;
    isCheckmate: boolean;
    isCapture: boolean;
    capturedPiece: string | null;
    promotionPiece: string | null;
    principalVariation: string[]; // Expected best continuation (SAN notation)
    tactical: TacticalInfo; // Rich tactical analysis
}

interface StockfishContextType {
    isReady: boolean;
    getBestMove: (fen: string, depth?: number) => Promise<string | null>;
    getEvaluation: (fen: string) => Promise<string | null>;
    getTopMoves: (fen: string, numMoves?: number, depth?: number) => Promise<MoveAnnotation[]>;
}

const StockfishContext = createContext<StockfishContextType | undefined>(undefined);

// Helper function to convert UCI moves to SAN notation
function uciToSan(fen: string, uciMoves: string[]): string[] {
    const sanMoves: string[] = [];
    try {
        const game = new Chess(fen);
        for (const uci of uciMoves) {
            try {
                const move = game.move(uci);
                if (move) {
                    sanMoves.push(move.san);
                } else {
                    break; // Invalid move, stop processing
                }
            } catch {
                break; // Invalid move, stop processing
            }
        }
    } catch {
        // Invalid FEN or other error
    }
    return sanMoves;
}

// Calculate material balance (positive = white advantage)
function calculateMaterial(game: Chess): number {
    const board = game.board();
    let balance = 0;
    for (const row of board) {
        for (const piece of row) {
            if (piece) {
                const value = PIECE_VALUES[piece.type];
                balance += piece.color === 'w' ? value : -value;
            }
        }
    }
    return balance;
}

// Analyze tactical features of a position after a move
function analyzeTactics(beforeFen: string, afterGame: Chess, movingSide: 'w' | 'b'): TacticalInfo {
    const threats: TacticalInfo['threats'] = [];
    const hanging: TacticalInfo['hanging'] = [];
    const notes: string[] = [];
    
    const opponentColor = movingSide === 'w' ? 'b' : 'w';
    
    try {
        // Get the position BEFORE the move to compare threats
        const beforeGame = new Chess(beforeFen);
        const beforeThreats = new Set<string>();
        
        // Find what the moving side was threatening BEFORE the move
        // by checking what captures were available
        const beforeMoves = beforeGame.moves({ verbose: true });
        for (const m of beforeMoves) {
            if (m.captured) {
                beforeThreats.add(`${m.from}->${m.to}`);
            }
        }
        
        // Now check what the moving side threatens AFTER the move
        // We need to simulate their turn by modifying the FEN
        const afterFenParts = afterGame.fen().split(' ');
        afterFenParts[1] = movingSide; // Set turn to moving side
        
        try {
            const threatCheckGame = new Chess(afterFenParts.join(' '));
            const afterMoves = threatCheckGame.moves({ verbose: true });
            
            for (const m of afterMoves) {
                if (m.captured) {
                    const threatKey = `${m.from}->${m.to}`;
                    const isNew = !beforeThreats.has(threatKey);
                    
                    const attackerPiece = threatCheckGame.get(m.from as Square);
                    if (attackerPiece) {
                        threats.push({
                            attacker: PIECE_NAMES[attackerPiece.type],
                            attackerSquare: m.from,
                            target: PIECE_NAMES[m.captured as PieceSymbol],
                            targetSquare: m.to,
                            isNewThreat: isNew,
                        });
                    }
                }
            }
        } catch {
            // Position might be invalid with modified turn, skip threat analysis
        }
        
        // Find hanging pieces (opponent pieces attacked but not defended)
        const board = afterGame.board();
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = board[rank][file];
                if (piece && piece.color === opponentColor && piece.type !== 'k') {
                    const square = (String.fromCharCode(97 + file) + (8 - rank)) as Square;
                    
                    // Check if attacked by moving side
                    const isAttacked = afterGame.isAttacked(square, movingSide);
                    if (isAttacked) {
                        // Check if defended by opponent
                        const isDefended = afterGame.isAttacked(square, opponentColor);
                        if (!isDefended) {
                            hanging.push({
                                piece: PIECE_NAMES[piece.type],
                                square,
                                value: PIECE_VALUES[piece.type],
                            });
                        }
                    }
                }
            }
        }
        
        // Add contextual notes
        if (afterGame.isCheck()) {
            notes.push("Check!");
        }
        if (afterGame.isCheckmate()) {
            notes.push("Checkmate!");
        }
        if (afterGame.isStalemate()) {
            notes.push("Stalemate.");
        }
        if (hanging.length > 0) {
            const highestValue = Math.max(...hanging.map(h => h.value));
            if (highestValue >= 5) {
                notes.push(`Major piece hanging!`);
            } else if (highestValue >= 3) {
                notes.push(`Minor piece hanging.`);
            }
        }
        
        const newThreats = threats.filter(t => t.isNewThreat);
        if (newThreats.length > 0) {
            const highValueThreats = newThreats.filter(t => PIECE_VALUES[t.target.charAt(0) as PieceSymbol] >= 3);
            if (highValueThreats.length > 0) {
                notes.push(`Creates new threats.`);
            }
        }
        
    } catch (error) {
        console.error("Error in tactical analysis:", error);
    }
    
    return {
        threats,
        hanging,
        materialBalance: calculateMaterial(afterGame),
        notes,
    };
}

export function StockfishProvider({ children }: { children: React.ReactNode }) {
    const [isReady, setIsReady] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);
    const engineRef = useRef<StockfishEngine | null>(null);
    
    // Ref for synchronous "thinking" guard to prevent concurrent Stockfish calls.
    // Using a ref (not state) ensures synchronous read/write to prevent race conditions.
    const thinkingRef = useRef(false);

    // Initialize engine on mount
    useEffect(() => {
        // Check for cross-origin isolation (required for SharedArrayBuffer)
        if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
            console.warn(
                "Cross-origin isolation is not enabled. Stockfish multi-threading may not work. " +
                "Ensure COOP and COEP headers are set correctly."
            );
        }

        console.debug("Initializing Stockfish engine...");
        console.debug("crossOriginIsolated:", typeof window !== 'undefined' ? window.crossOriginIsolated : 'N/A (SSR)');
        
        try {
            const engine = new StockfishEngine();
            engineRef.current = engine;

            engine.send("uci");
            engine.send("isready", () => {
                console.debug("Stockfish is ready");
                setIsReady(true);
            });
        } catch (error) {
            console.error("Failed to initialize Stockfish:", error);
            setInitError(error instanceof Error ? error.message : "Unknown error");
        }

        return () => {
            console.debug("Terminating Stockfish engine...");
            engineRef.current?.quit();
            engineRef.current = null;
        };
    }, []);

    // Log initialization error for debugging
    useEffect(() => {
        if (initError) {
            console.error("Stockfish initialization error:", initError);
        }
    }, [initError]);

    const getBestMove = useCallback(
        (fen: string, depth: number = 12): Promise<string | null> => {
            return new Promise((resolve) => {
                if (!engineRef.current || !isReady) {
                    console.warn("Engine not ready");
                    resolve(null);
                    return;
                }

                if (thinkingRef.current) {
                    console.warn("Engine is already thinking");
                    resolve(null);
                    return;
                }

                thinkingRef.current = true;

                engineRef.current.send(`position fen ${fen}`);
                engineRef.current.send(`go depth ${depth}`, (message) => {
                    const bestMoveMatch = message.match(/^bestmove\s([a-h][1-8][a-h][1-8][qrbn]?)/);
                    thinkingRef.current = false;

                    if (bestMoveMatch) {
                        const bestMove = bestMoveMatch[1];
                        console.debug("Engine suggests move:", bestMove);
                        resolve(bestMove);
                    } else {
                        console.warn("No best move found in response:", message);
                        resolve(null);
                    }
                });
            });
        },
        [isReady]
    );

    const getEvaluation = useCallback(
        (fen: string): Promise<string | null> => {
            return new Promise((resolve) => {
                if (!engineRef.current || !isReady) {
                    console.warn("Engine not ready");
                    resolve(null);
                    return;
                }

                engineRef.current.send(`position fen ${fen}`);
                engineRef.current.send("eval", (message) => {
                    console.debug("Engine evaluation:", message);
                    resolve(message);
                });
            });
        },
        [isReady]
    );

    const getTopMoves = useCallback(
        (fen: string, numMoves: number = 3, depth: number = 15): Promise<MoveAnnotation[]> => {
            return new Promise((resolve) => {
                if (!engineRef.current || !isReady) {
                    console.warn("Engine not ready");
                    resolve([]);
                    return;
                }

                if (thinkingRef.current) {
                    console.warn("Engine is already thinking");
                    resolve([]);
                    return;
                }

                thinkingRef.current = true;

                // Store PV lines as we receive them (includes full continuation)
                const pvLines = new Map<number, { 
                    move: string; 
                    score: number | null; 
                    mate: number | null;
                    pv: string[]; // Full principal variation in UCI format
                }>();

                // Set MultiPV option
                engineRef.current.send(`setoption name MultiPV value ${numMoves}`);
                engineRef.current.send(`position fen ${fen}`);

                engineRef.current.send(
                    `go depth ${depth}`,
                    () => {
                        thinkingRef.current = false;

                        // Parse and annotate all collected moves
                        const annotations: MoveAnnotation[] = [];

                        for (const [, pvData] of Array.from(pvLines.entries()).sort((a, b) => a[0] - b[0])) {
                            try {
                                const gameCopy = new Chess(fen);
                                const moveResult = gameCopy.move(pvData.move);

                                if (moveResult) {
                                    // Convert UCI PV moves to SAN notation for readability
                                    const principalVariation = uciToSan(fen, pvData.pv);
                                    
                                    // Analyze tactical features of the position after this move
                                    const tactical = analyzeTactics(fen, gameCopy, moveResult.color);

                                    annotations.push({
                                        move: pvData.move,
                                        san: moveResult.san,
                                        evaluation: pvData.score,
                                        mate: pvData.mate,
                                        isCheck: gameCopy.isCheck(),
                                        isCheckmate: gameCopy.isCheckmate(),
                                        isCapture: moveResult.captured !== undefined,
                                        capturedPiece: moveResult.captured || null,
                                        promotionPiece: moveResult.promotion || null,
                                        principalVariation,
                                        tactical,
                                    });
                                }
                            } catch (error) {
                                console.error("Error analyzing move:", pvData.move, error);
                            }
                        }

                        console.debug("Top moves analysis:", annotations);
                        resolve(annotations);
                    },
                    (infoLine) => {
                        // Stream callback to collect PV lines
                        // Format: info depth X seldepth Y multipv N score cp XXX nodes XXX pv e2e4 e7e5 ...
                        const multipvMatch = infoLine.match(/multipv (\d+)/);
                        const scoreMatch = infoLine.match(/score cp (-?\d+)/);
                        const mateMatch = infoLine.match(/score mate (-?\d+)/);
                        
                        // Extract full PV line (all moves after "pv")
                        const pvFullMatch = infoLine.match(/\bpv\s+((?:[a-h][1-8][a-h][1-8][qrbn]?\s*)+)/);

                        if (multipvMatch && pvFullMatch) {
                            const pvIndex = parseInt(multipvMatch[1]);
                            const pvMoves = pvFullMatch[1].trim().split(/\s+/);
                            const move = pvMoves[0];
                            const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
                            const mate = mateMatch ? parseInt(mateMatch[1]) : null;

                            pvLines.set(pvIndex, { move, score, mate, pv: pvMoves });
                        }
                    }
                );
            });
        },
        [isReady]
    );

    const value: StockfishContextType = {
        isReady,
        getBestMove,
        getEvaluation,
        getTopMoves,
    };

    return <StockfishContext.Provider value={value}>{children}</StockfishContext.Provider>;
}

// Hook to access the Stockfish context
export function useStockfish() {
    const context = useContext(StockfishContext);
    if (context === undefined) {
        throw new Error("useStockfish must be used within a StockfishProvider");
    }
    return context;
}

