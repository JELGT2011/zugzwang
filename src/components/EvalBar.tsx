"use client";

interface EvalBarProps {
  evaluation: number; // centipawns (positive = white advantage)
  mate?: number; // moves to mate (positive = white mates)
  orientation?: "white" | "black"; // which side is at the bottom
  className?: string;
}

export default function EvalBar({
  evaluation,
  mate,
  orientation = "white",
  className = "",
}: EvalBarProps) {
  // Convert evaluation to a percentage for the bar
  // Use a sigmoid-like function to cap extreme values
  function evalToPercent(cp: number): number {
    if (mate !== undefined) {
      // Mate: show 95% or 5% depending on who's mating
      return mate > 0 ? 95 : 5;
    }
    
    // Convert centipawns to percentage using sigmoid-like scaling
    // At ±500cp, it shows roughly 80/20 split
    // At ±1000cp, it shows roughly 90/10 split
    const scaled = cp / 500;
    const sigmoid = 1 / (1 + Math.exp(-scaled));
    return sigmoid * 100;
  }

  // Format the evaluation for display
  function formatEval(): string {
    if (mate !== undefined) {
      return `M${Math.abs(mate)}`;
    }
    const pawns = Math.abs(evaluation) / 100;
    return pawns.toFixed(1);
  }

  const whitePercent = evalToPercent(evaluation);
  const blackPercent = 100 - whitePercent;
  
  // Determine which color is winning for text styling
  const isWhiteWinning = evaluation > 0 || (mate !== undefined && mate > 0);
  const isBlackWinning = evaluation < 0 || (mate !== undefined && mate < 0);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Vertical evaluation bar */}
      <div 
        className="w-6 h-full min-h-[400px] rounded-full overflow-hidden flex flex-col shadow-inner"
        style={{ background: "#1a1a1a" }}
      >
        {/* The bar fills from the perspective of the board orientation */}
        {orientation === "white" ? (
          <>
            {/* Black portion (top when white is at bottom) */}
            <div 
              className="bg-zinc-800 transition-all duration-300 ease-out"
              style={{ height: `${blackPercent}%` }}
            />
            {/* White portion (bottom when white is at bottom) */}
            <div 
              className="bg-zinc-100 transition-all duration-300 ease-out flex-1"
            />
          </>
        ) : (
          <>
            {/* White portion (top when black is at bottom) */}
            <div 
              className="bg-zinc-100 transition-all duration-300 ease-out"
              style={{ height: `${whitePercent}%` }}
            />
            {/* Black portion (bottom when black is at bottom) */}
            <div 
              className="bg-zinc-800 transition-all duration-300 ease-out flex-1"
            />
          </>
        )}
      </div>
      
      {/* Evaluation number */}
      <div 
        className={`mt-2 text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
          isWhiteWinning 
            ? "bg-zinc-100 text-zinc-900" 
            : isBlackWinning 
              ? "bg-zinc-800 text-zinc-100" 
              : "bg-zinc-600 text-zinc-200"
        }`}
      >
        {formatEval()}
      </div>
    </div>
  );
}

