// Stockfish engine wrapper for browser-based analysis
// Uses stockfish.js v10 from CDN

export interface StockfishAnalysis {
  bestMove: string;
  ponderMove?: string;
  evaluation: number; // centipawns (positive = white advantage)
  mate?: number; // moves to mate (positive = white mates, negative = black mates)
  depth: number;
  principalVariation: string[];
}

export interface AnalysisOptions {
  depth?: number;
  movetime?: number; // Time in ms for analysis
  skillLevel?: number; // 0-20
}

class StockfishEngine {
  async initialize(): Promise<void> {
    // No-op for server-side engine
    return Promise.resolve();
  }

  async analyze(fen: string, options: AnalysisOptions = {}): Promise<StockfishAnalysis> {
    try {
      const response = await fetch("/api/engine", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fen, options }),
      });

      if (!response.ok) {
        throw new Error(`Engine API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to analyze position via API:", error);
      throw error;
    }
  }

  async getBestMove(fen: string, options: AnalysisOptions = {}): Promise<string> {
    const analysis = await this.analyze(fen, options);
    return analysis.bestMove;
  }

  stop(): void {
    // Server-side analysis is atomic per request
  }

  destroy(): void {
    // No-op for server-side engine
  }
}

// Singleton instance
let engineInstance: StockfishEngine | null = null;

export function getStockfishEngine(): StockfishEngine {
  if (!engineInstance) {
    engineInstance = new StockfishEngine();
  }
  return engineInstance;
}

export function destroyStockfishEngine(): void {
  if (engineInstance) {
    engineInstance.destroy();
    engineInstance = null;
  }
}

// Utility: format evaluation for display
export function formatEvaluation(evaluation: number, mate?: number): string {
  if (mate !== undefined) {
    return `M${mate > 0 ? "" : "-"}${Math.abs(mate)}`;
  }
  const pawns = evaluation / 100;
  return pawns >= 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
}
