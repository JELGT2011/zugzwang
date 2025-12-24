"use client";

import { HintLevel } from "./ChessGame";

interface GameControlsProps {
  aiStrength: number;
  setAiStrength: (value: number) => void;
  hintLevel: HintLevel;
  setHintLevel: (value: HintLevel) => void;
  autoCoach: boolean;
  setAutoCoach: (value: boolean) => void;
  onNewGame: (asWhite: boolean) => void;
  onRequestHint: () => void;
  isPlayerTurn: boolean;
  isGameOver: boolean;
  currentAnalysis: {
    depth: number;
    bestMove: string;
    evaluation: number;
  };
}

export default function GameControls({
  aiStrength,
  setAiStrength,
  hintLevel,
  setHintLevel,
  autoCoach,
  setAutoCoach,
  onNewGame,
  onRequestHint,
  isPlayerTurn,
  isGameOver,
  currentAnalysis,
}: GameControlsProps) {
  // Convert skill level to approximate ELO
  const approxElo = 800 + aiStrength * 100;

  // Win probability based on skill level (simplified)
  const targetWinRate = Math.max(30, Math.min(70, 100 - aiStrength * 2.5));

  return (
    <div className="flex flex-col gap-4 p-4 bg-surface rounded-xl border border-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Game Settings</h2>
        <div className="text-xs text-text-muted font-mono">
          Depth: {currentAnalysis.depth}
        </div>
      </div>

      {/* New Game Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onNewGame(true)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          <span className="text-lg">♔</span>
          <span className="text-sm font-medium">Play as White</span>
        </button>
        <button
          onClick={() => onNewGame(false)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-black/30 hover:bg-black/40 rounded-lg transition-colors border border-border"
        >
          <span className="text-lg">♚</span>
          <span className="text-sm font-medium">Play as Black</span>
        </button>
      </div>

      {/* AI Strength Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-text-muted">AI Strength</label>
          <span className="text-sm font-mono text-accent-bright">
            ~{approxElo} ELO
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="20"
          value={aiStrength}
          onChange={(e) => setAiStrength(parseInt(e.target.value))}
          className="w-full h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-accent-bright"
        />
        <div className="flex justify-between text-xs text-text-muted">
          <span>Beginner</span>
          <span>~{targetWinRate.toFixed(0)}% win rate target</span>
          <span>Master</span>
        </div>
      </div>

      {/* Hint Level */}
      <div className="space-y-2">
        <label className="text-sm text-text-muted">Hint Detail Level</label>
        <div className="flex gap-2">
          {(["minimal", "moderate", "detailed"] as HintLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => setHintLevel(level)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                hintLevel === level
                  ? "bg-accent-bright text-background"
                  : "bg-surface-elevated text-text-muted hover:text-foreground"
              }`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Auto Coach Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-text-muted">Auto-coach on moves</label>
        <button
          onClick={() => setAutoCoach(!autoCoach)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            autoCoach ? "bg-accent-bright" : "bg-surface-elevated"
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              autoCoach ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Hint Button */}
      <button
        onClick={onRequestHint}
        disabled={!isPlayerTurn || isGameOver}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
          isPlayerTurn && !isGameOver
            ? "bg-accent-bright/20 text-accent-bright hover:bg-accent-bright/30 border border-accent-bright/30"
            : "bg-surface-elevated text-text-muted cursor-not-allowed"
        }`}
      >
        {isPlayerTurn ? "💡 Get Hint" : isGameOver ? "Game Over" : "Waiting for AI..."}
      </button>

      {/* Quick Analysis Display */}
      <div className="flex items-center justify-between text-xs text-text-muted bg-surface-elevated rounded-lg px-3 py-2">
        <span>Best move</span>
        <code className="text-accent-bright font-mono">
          {currentAnalysis.bestMove || "—"}
        </code>
      </div>
    </div>
  );
}

