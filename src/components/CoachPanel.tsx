"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface CoachPanelProps {
    fen: string;
    moveHistory: string;
    lastMove: string | null;
}

export default function CoachPanel({ fen, moveHistory, lastMove }: CoachPanelProps) {
    const [analysis, setAnalysis] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const lastProcessedMove = useRef<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const analyzeMove = useCallback(async (move: string) => {
        // Abort previous request if it's still running
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        setIsLoading(true);
        setAnalysis("");

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const response = await fetch("/api/coach", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: `Explain the last move: ${move}` }],
                    fen,
                    history: moveHistory,
                }),
                signal: abortController.signal,
            });

            if (!response.ok) throw new Error("Failed to fetch analysis");
            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                setAnalysis((prev) => prev + chunk);
            }
        } catch (error) {
            if (error instanceof Error && error.name !== "AbortError") {
                console.error("Analysis error:", error);
                setAnalysis("Sorry, I couldn't analyze this move.");
            }
        } finally {
            if (abortControllerRef.current === abortController) {
                setIsLoading(false);
            }
        }
    }, [fen, moveHistory]);

    useEffect(() => {
        if (lastMove && lastMove !== lastProcessedMove.current) {
            lastProcessedMove.current = lastMove;
            analyzeMove(lastMove);
        }
    }, [lastMove, analyzeMove]);

    return (
        <div className="bg-surface rounded-xl border border-border overflow-hidden flex flex-col h-full min-h-[300px]">
            <div className="px-4 py-3 border-b border-border bg-black/20 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                    AI Coach
                </h2>
                {isLoading && (
                    <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-accent-bright rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-accent-bright rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-accent-bright rounded-full animate-bounce"></span>
                    </div>
                )}
            </div>

            <div className="p-4 flex-1 overflow-y-auto font-sans text-sm leading-relaxed space-y-4">
                {!lastMove ? (
                    <p className="text-text-muted italic">
                        Make a move to start receiving coaching...
                    </p>
                ) : (
                    <div className="prose prose-invert prose-sm max-w-none">
                        {analysis ? (
                            <div className="text-foreground whitespace-pre-wrap coaching-message">
                                {analysis}
                            </div>
                        ) : isLoading ? (
                            <div className="flex items-center gap-2 text-text-muted animate-pulse">
                                <span>Analyzing position</span>
                                <div className="flex gap-1">
                                    <span className="w-1 h-1 bg-text-muted rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1 h-1 bg-text-muted rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1 h-1 bg-text-muted rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}
