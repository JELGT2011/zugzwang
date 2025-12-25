"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Color } from "chess.js";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface CoachPanelProps {
    fen: string;
    moveHistory: string;
    lastMove: string | null;
    playerColor: Color;
}

export default function CoachPanel({ fen, moveHistory, lastMove, playerColor }: CoachPanelProps) {
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
                    playerColor,
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
    }, [fen, moveHistory, playerColor]);

    useEffect(() => {
        if (lastMove && lastMove !== lastProcessedMove.current) {
            lastProcessedMove.current = lastMove;
            analyzeMove(lastMove);
        }
    }, [lastMove, analyzeMove]);

    return (
        <Card className="flex flex-col h-full min-h-[300px] bg-card border-border overflow-hidden gap-0 py-0">
            <CardHeader className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between space-y-0 grid-cols-none">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    AI Coach
                </CardTitle>
                {isLoading && (
                    <div className="flex gap-1">
                        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    </div>
                )}
            </CardHeader>

            <ScrollArea className="flex-1">
                <CardContent className="p-4 font-sans text-sm leading-relaxed">
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
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}
                </CardContent>
            </ScrollArea>
        </Card>
    );
}
