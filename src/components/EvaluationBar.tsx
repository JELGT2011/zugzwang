"use client";

import { useMemo } from "react";

interface EvaluationBarProps {
  evaluation: number; // centipawns
  mate?: number;
  winProbability: number; // 0-1
  orientation: "white" | "black";
  isAnalyzing: boolean;
}

export default function EvaluationBar({
  evaluation,
  mate,
  winProbability,
  orientation,
  isAnalyzing,
}: EvaluationBarProps) {
  // Calculate the bar fill percentage (0-100, from white's perspective)
  const fillPercentage = useMemo(() => {
    if (mate !== undefined) {
      // Mate found
      return mate > 0 ? 100 : 0;
    }
    // Use win probability for smoother display
    return winProbability * 100;
  }, [mate, winProbability]);

  // Format evaluation text
  const evalText = useMemo(() => {
    if (mate !== undefined) {
      return mate > 0 ? `M${mate}` : `M${Math.abs(mate)}`;
    }
    const pawns = Math.abs(evaluation) / 100;
    if (pawns < 0.1) return "0.0";
    return pawns.toFixed(1);
  }, [evaluation, mate]);

  // Determine who's winning for display
  const whiteAdvantage = mate !== undefined ? mate > 0 : evaluation >= 0;

  // Adjust for board orientation
  const adjustedFill = orientation === "white" ? fillPercentage : 100 - fillPercentage;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Eval bar */}
      <div
        className={`relative w-6 h-[480px] rounded-lg overflow-hidden border border-border ${
          isAnalyzing ? "eval-bar-animated" : ""
        }`}
        style={{ backgroundColor: "#1a1a1f" }}
      >
        {/* White fill (from bottom) */}
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out"
          style={{
            height: `${adjustedFill}%`,
            background: "linear-gradient(to top, #f0f0f0, #e0e0e0)",
          }}
        />
        
        {/* Gradient overlay for depth */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(90deg, rgba(0,0,0,0.1) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
          }}
        />

        {/* Center line */}
        <div 
          className="absolute left-0 right-0 h-px bg-accent/50"
          style={{ top: "50%" }}
        />
      </div>

      {/* Eval number */}
      <div
        className={`text-sm font-mono font-medium px-2 py-1 rounded ${
          whiteAdvantage 
            ? "bg-white/10 text-white" 
            : "bg-black/20 text-text-muted"
        }`}
      >
        {!whiteAdvantage && mate === undefined && "-"}
        {evalText}
      </div>

      {/* Analyzing indicator */}
      {isAnalyzing && (
        <div className="text-xs text-text-muted thinking-dots">
          <span>•</span>
          <span>•</span>
          <span>•</span>
        </div>
      )}
    </div>
  );
}

