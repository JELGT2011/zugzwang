"use client";

import { StockfishEngine } from "@/lib/stockfish";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface StockfishContextType {
    isReady: boolean;
    isThinking: boolean;
    getBestMove: (fen: string, depth?: number) => Promise<string | null>;
    getEvaluation: (fen: string) => Promise<string | null>;
}

const StockfishContext = createContext<StockfishContextType | undefined>(undefined);

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

    const value: StockfishContextType = {
        isReady,
        isThinking,
        getBestMove,
        getEvaluation,
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

// Hook specifically for getting the best move
export function useStockfishMove() {
    const { getBestMove, isThinking } = useStockfish();
    return { getBestMove, isThinking };
}

// Hook specifically for getting position evaluation
export function useStockfishEvaluation() {
    const { getEvaluation } = useStockfish();
    return { getEvaluation };
}

