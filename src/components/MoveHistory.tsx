"use client";

import { Move } from "chess.js";

interface MoveHistoryProps {
  moves: Move[];
}

export default function MoveHistory({ moves }: MoveHistoryProps) {
  if (moves.length === 0) {
    return null;
  }

  // Group moves into pairs (white, black)
  const movePairs: Array<{ number: number; white?: Move; black?: Move }> = [];
  
  for (let i = 0; i < moves.length; i++) {
    const moveNumber = Math.floor(i / 2) + 1;
    const isWhite = i % 2 === 0;
    
    if (isWhite) {
      movePairs.push({ number: moveNumber, white: moves[i] });
    } else {
      if (movePairs.length > 0) {
        movePairs[movePairs.length - 1].black = moves[i];
      }
    }
  }

  return (
    <div className="w-full max-w-[520px] bg-surface rounded-lg border border-border overflow-hidden">
      <div className="px-3 py-2 bg-surface-elevated border-b border-border">
        <h3 className="text-sm font-medium text-text-muted">Move History</h3>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 p-3 max-h-32 overflow-y-auto">
        {movePairs.map((pair) => (
          <div key={pair.number} className="flex items-center gap-1 text-sm">
            <span className="text-text-muted w-6 text-right">{pair.number}.</span>
            <span className="font-mono text-foreground w-12">
              {pair.white?.san || ""}
            </span>
            <span className="font-mono text-foreground/80 w-12">
              {pair.black?.san || ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

