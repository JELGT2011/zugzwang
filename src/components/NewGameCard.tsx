"use client";

import { Move } from "chess.js";

interface NewGameCardProps {
  playerColor: "white" | "black";
  moveHistory: Move[];
  isGameOver: boolean;
  gameStatus: string;
  onNewGame: (asWhite: boolean) => void;
  aiStrength?: number;
  onAiStrengthChange?: (strength: number) => void;
}

function getStrengthLabel(strength: number): string {
  if (strength <= 3) return "Beginner";
  if (strength <= 7) return "Casual";
  if (strength <= 12) return "Intermediate";
  if (strength <= 17) return "Advanced";
  return "Master";
}

export default function NewGameCard({
  playerColor,
  moveHistory,
  isGameOver,
  gameStatus,
  onNewGame,
  aiStrength = 10,
  onAiStrengthChange,
}: NewGameCardProps) {
  const hasStarted = moveHistory.length > 0;

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden min-w-[280px]">
      {/* Header with reset button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-black/20">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          {hasStarted ? "Game" : "New Game"}
        </h2>
        {hasStarted && (
          <button
            onClick={() => onNewGame(playerColor === "white")}
            className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
            title="Reset game"
          >
            ↺ Reset
          </button>
        )}
      </div>

      <div className="p-4">
        {!hasStarted ? (
          /* Color selection when game hasn't started */
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-text-muted">Choose your color</p>
              <div className="flex gap-2">
                <button
                  onClick={() => onNewGame(true)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                    playerColor === "white"
                      ? "bg-white/20 ring-2 ring-white/40"
                      : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <span className="text-2xl">♔</span>
                  <span className="font-medium">White</span>
                </button>
                <button
                  onClick={() => onNewGame(false)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all border border-border ${
                    playerColor === "black"
                      ? "bg-black/40 ring-2 ring-white/40"
                      : "bg-black/20 hover:bg-black/30"
                  }`}
                >
                  <span className="text-2xl">♚</span>
                  <span className="font-medium">Black</span>
                </button>
              </div>
            </div>

            {/* AI Strength Slider */}
            {onAiStrengthChange && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">AI Strength</span>
                  <span className="font-medium text-foreground">
                    {getStrengthLabel(aiStrength)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={aiStrength}
                  onChange={(e) => onAiStrengthChange(parseInt(e.target.value))}
                  aria-label="AI Strength"
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:bg-white
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:shadow-md
                    [&::-moz-range-thumb]:w-4
                    [&::-moz-range-thumb]:h-4
                    [&::-moz-range-thumb]:bg-white
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:cursor-pointer
                    [&::-moz-range-thumb]:border-0"
                />
                <div className="flex justify-between text-xs text-text-muted">
                  <span>Easy</span>
                  <span>Hard</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Move history when game has started */
          <div className="space-y-3">
            {/* Current status */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Playing as</span>
              <span className="font-medium capitalize flex items-center gap-1">
                {playerColor === "white" ? "♔" : "♚"} {playerColor}
              </span>
            </div>

            {/* Game over banner */}
            {isGameOver && (
              <div className="bg-accent-bright/20 rounded-lg p-3 border border-accent-bright/30">
                <p className="text-sm font-semibold text-accent-bright">{gameStatus}</p>
              </div>
            )}

            {/* Move list */}
            <div className="space-y-2">
              <h3 className="text-xs text-text-muted uppercase tracking-wide">Moves</h3>
              <div className="max-h-[200px] overflow-y-auto">
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
