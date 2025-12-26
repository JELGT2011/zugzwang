"use client";

import { StockfishEngine } from "@/lib/stockfish";
import { Chess } from "chess.js";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

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
    threats: string[]; // Pieces threatened after this move
    defends: string[]; // Pieces defended after this move
}

interface StockfishContextType {
    isReady: boolean;
    isThinking: boolean;
    getBestMove: (fen: string, depth?: number) => Promise<string | null>;
    getEvaluation: (fen: string) => Promise<string | null>;
    getTopMoves: (fen: string, numMoves?: number, depth?: number) => Promise<MoveAnnotation[]>;
}

const StockfishContext = createContext<StockfishContextType | undefined>(undefined);

// Helper function to analyze threats in a position
function analyzeThreatsSafe(game: Chess, colorWhoMoved: 'w' | 'b'): string[] {
    const threats: string[] = [];
    const opponentColor = colorWhoMoved === 'w' ? 'b' : 'w';

    try {
        // Get all squares with opponent pieces
        const board = game.board();
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = board[rank][file];
                if (piece && piece.color === opponentColor) {
                    const square = String.fromCharCode(97 + file) + (8 - rank);

                    // Check if any of our pieces can attack this square
                    const moves = game.moves({ verbose: true, square: undefined });
                    const attacking = moves.some(m => m.to === square && m.color === colorWhoMoved);

                    if (attacking) {
                        threats.push(`${piece.type}${square}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error analyzing threats:", error);
    }

    return threats;
}

// Helper function to analyze defended pieces
function analyzeDefensesSafe(game: Chess, colorWhoMoved: 'w' | 'b'): string[] {
    const defends: string[] = [];

    try {
        // Get all squares with our pieces
        const board = game.board();
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = board[rank][file];
                if (piece && piece.color === colorWhoMoved) {
                    const square = String.fromCharCode(97 + file) + (8 - rank);

                    // Create a temporary copy to test if this piece is defended
                    // by seeing if we have moves that protect it
                    const tempGame = new Chess(game.fen());
                    const moves = tempGame.moves({ verbose: true });

                    // Check if any of our pieces can move to defend this square
                    // This is simplified - a more accurate version would check actual attacks
                    const defending = moves.some(m => {
                        // If we can move to this square, it's defended
                        return m.to === square && m.color === colorWhoMoved;
                    });

                    if (defending) {
                        defends.push(`${piece.type}${square}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error analyzing defenses:", error);
    }

    return defends;
}

export function StockfishProvider({ children }: { children: React.ReactNode }) {
    const [isReady, setIsReady] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const engineRef = useRef<StockfishEngine | null>(null);
    const thinkingRef = useRef(false);

    // Initialize engine on mount
    useEffect(() => {
        console.debug("Initializing Stockfish engine...");
        const engine = new StockfishEngine();
        engineRef.current = engine;

        engine.send("uci");
        engine.send("isready", () => {
            console.debug("Stockfish is ready");
            setIsReady(true);
        });

        return () => {
            console.debug("Terminating Stockfish engine...");
            engineRef.current?.quit();
            engineRef.current = null;
        };
    }, []);

    // Synchronize thinking ref with state
    useEffect(() => {
        thinkingRef.current = isThinking;
    }, [isThinking]);

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

                setIsThinking(true);

                engineRef.current.send(`position fen ${fen}`);
                engineRef.current.send(`go depth ${depth}`, (message) => {
                    const bestMoveMatch = message.match(/^bestmove\s([a-h][1-8][a-h][1-8][qrbn]?)/);
                    setIsThinking(false);

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

                setIsThinking(true);

                // Store PV lines as we receive them
                const pvLines = new Map<number, { move: string; score: number | null; mate: number | null }>();

                // Set MultiPV option
                engineRef.current.send(`setoption name MultiPV value ${numMoves}`);
                engineRef.current.send(`position fen ${fen}`);

                engineRef.current.send(
                    `go depth ${depth}`,
                    () => {
                        setIsThinking(false);

                        // Parse and annotate all collected moves
                        const annotations: MoveAnnotation[] = [];

                        for (const [, pvData] of Array.from(pvLines.entries()).sort((a, b) => a[0] - b[0])) {
                            try {
                                const gameCopy = new Chess(fen);
                                const moveResult = gameCopy.move(pvData.move);

                                if (moveResult) {
                                    // Analyze threats and defenses in the resulting position
                                    const threats = analyzeThreatsSafe(gameCopy, moveResult.color);
                                    const defends = analyzeDefensesSafe(gameCopy, moveResult.color);

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
                                        threats,
                                        defends,
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
                        const pvMatch = infoLine.match(/pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
                        const scoreMatch = infoLine.match(/score cp (-?\d+)/);
                        const mateMatch = infoLine.match(/score mate (-?\d+)/);

                        if (multipvMatch && pvMatch) {
                            const pvIndex = parseInt(multipvMatch[1]);
                            const move = pvMatch[1];
                            const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
                            const mate = mateMatch ? parseInt(mateMatch[1]) : null;

                            pvLines.set(pvIndex, { move, score, mate });
                        }
                    }
                );
            });
        },
        [isReady]
    );

    const value: StockfishContextType = {
        isReady,
        isThinking,
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

