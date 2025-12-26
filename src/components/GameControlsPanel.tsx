"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Color, Move } from "chess.js";
import { RotateCcw } from "lucide-react";

interface GameControlsPanelProps {
    playerColor: Color;
    moveHistory: Move[];
    isGameOver: boolean;
    gameStatus: string;
    onNewGame: () => void;
}

export default function GameControlsPanel({
    playerColor,
    moveHistory,
    isGameOver,
    gameStatus,
    onNewGame,
}: GameControlsPanelProps) {
    return (
        <Card className="bg-card border-border overflow-hidden min-w-[280px] gap-0 py-0 flex flex-col flex-1">
            <CardHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-border bg-muted/30 space-y-0 grid-cols-none shrink-0">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Game
                </CardTitle>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onNewGame}
                    className="h-7 text-[10px] uppercase tracking-wider px-2 hover:bg-background/50"
                    title="Start new game"
                >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    New Game
                </Button>
            </CardHeader>

            <CardContent className="p-4 flex-1 min-h-0">
                <div className="space-y-3 flex flex-col h-full">
                    {/* Current status */}
                    <div className="flex items-center justify-between text-sm shrink-0">
                        <span className="text-muted-foreground">Playing as</span>
                        <Badge variant="outline" className="font-medium capitalize flex items-center gap-1">
                            {playerColor === "w" ? "♔" : "♚"} {playerColor === "w" ? "White" : "Black"}
                        </Badge>
                    </div>

                    {/* Game over banner */}
                    {isGameOver && (
                        <Badge variant="destructive" className="w-full justify-center py-2 text-sm font-semibold shrink-0">
                            {gameStatus}
                        </Badge>
                    )}

                    {/* Move list */}
                    <div className="space-y-2 flex-1 flex flex-col min-h-0">
                        <h3 className="text-xs text-muted-foreground uppercase tracking-wide shrink-0">Moves</h3>
                        {moveHistory.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                                No moves yet
                            </div>
                        ) : (
                            <ScrollArea className="flex-1 pr-4">
                                <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 text-sm font-mono">
                                    {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => {
                                        const whiteMove = moveHistory[i * 2];
                                        const blackMove = moveHistory[i * 2 + 1];
                                        return [
                                            <span key={`${i}-num`} className="text-muted-foreground text-right">{i + 1}.</span>,
                                            <span key={`${i}-white`} className="text-foreground">{whiteMove?.san}</span>,
                                            <span key={`${i}-black`} className="text-muted-foreground">{blackMove?.san ?? ""}</span>
                                        ];
                                    })}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

