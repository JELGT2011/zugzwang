"use client";

import { Move, Color } from "chess.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RotateCcw } from "lucide-react";

interface NewGameCardProps {
  playerColor: Color;
  moveHistory: Move[];
  isGameOver: boolean;
  gameStatus: string;
  onNewGame: (asWhite: boolean) => void;
}

export default function NewGameCard({
  playerColor,
  moveHistory,
  isGameOver,
  gameStatus,
  onNewGame,
}: NewGameCardProps) {
  const hasStarted = moveHistory.length > 0;

  return (
    <Card className="bg-card border-border overflow-hidden min-w-[280px] gap-0 py-0">
      <CardHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-border bg-muted/30 space-y-0 grid-cols-none">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {hasStarted ? "Game" : "New Game"}
        </CardTitle>
        {hasStarted && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNewGame(playerColor === "w")}
            className="h-7 text-[10px] uppercase tracking-wider px-2 hover:bg-background/50"
            title="Reset game"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-4">
        {!hasStarted ? (
          /* Color selection when game hasn't started */
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-text-muted">Choose your color</p>
              <div className="flex gap-2">
                <Button
                  variant={playerColor === "w" ? "default" : "outline"}
                  onClick={() => onNewGame(true)}
                  className="flex-1 h-auto py-3 flex flex-col gap-1"
                >
                  <span className="text-2xl">♔</span>
                  <span className="font-medium">White</span>
                </Button>
                <Button
                  variant={playerColor === "b" ? "default" : "outline"}
                  onClick={() => onNewGame(false)}
                  className="flex-1 h-auto py-3 flex flex-col gap-1"
                >
                  <span className="text-2xl">♚</span>
                  <span className="font-medium">Black</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Move history when game has started */
          <div className="space-y-3">
            {/* Current status */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Playing as</span>
              <Badge variant="outline" className="font-medium capitalize flex items-center gap-1">
                {playerColor === "w" ? "♔" : "♚"} {playerColor === "w" ? "White" : "Black"}
              </Badge>
            </div>

            {/* Game over banner */}
            {isGameOver && (
              <Badge variant="destructive" className="w-full justify-center py-2 text-sm font-semibold">
                {gameStatus}
              </Badge>
            )}

            {/* Move list */}
            <div className="space-y-2">
              <h3 className="text-xs text-text-muted uppercase tracking-wide">Moves</h3>
              <ScrollArea className="h-[200px] pr-4">
                <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 text-sm font-mono">
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => {
                    const whiteMove = moveHistory[i * 2];
                    const blackMove = moveHistory[i * 2 + 1];
                    return (
                      <div key={i} className="contents">
                        <span className="text-text-muted text-right">{i + 1}.</span>
                        <span className="text-foreground">{whiteMove?.san}</span>
                        <span className="text-text-muted">{blackMove?.san ?? ""}</span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
