// Stockfish engine wrapper for browser-based analysis
// Uses local Stockfish.js for reliable browser loading

export interface StockfishAnalysis {
  bestMove: string;
  ponderMove?: string;
  evaluation: number; // centipawns (positive = white advantage)
  mate?: number; // moves to mate (positive = white mates, negative = black mates)
  depth: number;
  principalVariation: string[];
  wdl?: { win: number; draw: number; loss: number }; // Win/Draw/Loss probabilities (0-1000 scale)
  nodes?: number;
  nps?: number;
  multiPv?: StockfishLine[];
}

export interface StockfishLine {
  move: string;
  evaluation: number;
  mate?: number;
  pv: string[];
  rank: number;
}

export interface AnalysisOptions {
  depth?: number;
  multiPv?: number; // Number of lines to analyze
  skillLevel?: number; // 0-20, affects play strength
  movetime?: number; // Time in ms for analysis
}

type MessageHandler = (analysis: Partial<StockfishAnalysis>) => void;

class StockfishEngine {
  private worker: Worker | null = null;
  private isReady = false;
  private isUciOk = false;
  private pendingResolve: ((value: StockfishAnalysis) => void) | null = null;
  private currentAnalysis: Partial<StockfishAnalysis> = {};
  private messageHandler: MessageHandler | null = null;
  private multiPvLines: Map<number, StockfishLine> = new Map();
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    if (this.isReady) return Promise.resolve();

    this.initPromise = new Promise((resolve, reject) => {
      try {
        // Use local Stockfish.js from public folder
        this.worker = new Worker("/stockfish/stockfish.js");

        this.worker.onmessage = (event: MessageEvent) => {
          const message = event.data;
          this.handleMessage(message);
          
          if (message === "uciok" && !this.isUciOk) {
            this.isUciOk = true;
            // Configure engine options after uciok
            this.sendCommand("setoption name Threads value 1");
            this.sendCommand("setoption name Hash value 16");
            this.sendCommand("isready");
          }
          
          if (message === "readyok" && this.isUciOk && !this.isReady) {
            this.isReady = true;
            console.log("Stockfish initialized successfully");
            resolve();
          }
        };

        this.worker.onerror = (error) => {
          console.error("Stockfish worker error:", error);
          reject(error);
        };

        // Initialize UCI protocol
        this.sendCommand("uci");

        // Set timeout
        setTimeout(() => {
          if (!this.isReady) {
            reject(new Error("Stockfish initialization timeout"));
          }
        }, 20000);

      } catch (error) {
        reject(error);
      }
    });

    return this.initPromise;
  }

  private sendCommand(command: string): void {
    if (this.worker) {
      this.worker.postMessage(command);
    }
  }

  private handleMessage(message: string): void {
    // Parse info lines
    if (message.startsWith("info")) {
      this.parseInfo(message);
      return;
    }

    // Parse bestmove
    if (message.startsWith("bestmove")) {
      this.parseBestMove(message);
      return;
    }
  }

  private parseInfo(message: string): void {
    const parts = message.split(" ");

    // Skip string info messages
    if (parts.includes("string")) return;

    // Extract multipv (line number)
    const multiPvIndex = parts.indexOf("multipv");
    const lineNumber = multiPvIndex !== -1 ? parseInt(parts[multiPvIndex + 1]) : 1;

    // Extract depth
    const depthIndex = parts.indexOf("depth");
    const depth = depthIndex !== -1 ? parseInt(parts[depthIndex + 1]) : 0;

    // Skip if no depth info
    if (depth === 0) return;

    // Extract score
    const scoreIndex = parts.indexOf("score");
    let evaluation = this.currentAnalysis.evaluation || 0;
    let mate: number | undefined;

    if (scoreIndex !== -1) {
      const scoreType = parts[scoreIndex + 1];
      const scoreValue = parseInt(parts[scoreIndex + 2]);

      if (scoreType === "cp") {
        evaluation = scoreValue;
      } else if (scoreType === "mate") {
        mate = scoreValue;
        evaluation = scoreValue > 0 ? 100000 - scoreValue * 100 : -100000 - scoreValue * 100;
      }
    }

    // Extract PV (principal variation)
    const pvIndex = parts.indexOf("pv");
    const pv = pvIndex !== -1 ? parts.slice(pvIndex + 1) : [];

    // Extract WDL (may not be available in older versions)
    const wdlIndex = parts.indexOf("wdl");
    let wdl: { win: number; draw: number; loss: number } | undefined;
    if (wdlIndex !== -1 && parts.length > wdlIndex + 3) {
      wdl = {
        win: parseInt(parts[wdlIndex + 1]),
        draw: parseInt(parts[wdlIndex + 2]),
        loss: parseInt(parts[wdlIndex + 3]),
      };
    }

    // Extract nodes and nps
    const nodesIndex = parts.indexOf("nodes");
    const nodes = nodesIndex !== -1 ? parseInt(parts[nodesIndex + 1]) : undefined;

    const npsIndex = parts.indexOf("nps");
    const nps = npsIndex !== -1 ? parseInt(parts[npsIndex + 1]) : undefined;

    // Store line info for multiPv
    if (pv.length > 0) {
      this.multiPvLines.set(lineNumber, {
        move: pv[0],
        evaluation,
        mate,
        pv,
        rank: lineNumber,
      });
    }

    // Update current analysis (for primary line)
    if (lineNumber === 1) {
      this.currentAnalysis = {
        ...this.currentAnalysis,
        depth,
        evaluation,
        mate,
        principalVariation: pv,
        wdl,
        nodes,
        nps,
      };

      // Notify handler of progress
      if (this.messageHandler) {
        this.messageHandler(this.currentAnalysis);
      }
    }
  }

  private parseBestMove(message: string): void {
    const parts = message.split(" ");
    const bestMove = parts[1];
    
    if (!bestMove || bestMove === "(none)") {
      // No legal moves (checkmate or stalemate)
      if (this.pendingResolve) {
        this.pendingResolve({
          bestMove: "",
          evaluation: this.currentAnalysis.evaluation || 0,
          mate: this.currentAnalysis.mate,
          depth: this.currentAnalysis.depth || 0,
          principalVariation: [],
        });
        this.pendingResolve = null;
      }
      return;
    }

    const ponderIndex = parts.indexOf("ponder");
    const ponderMove = ponderIndex !== -1 ? parts[ponderIndex + 1] : undefined;

    // Compile multiPv lines
    const multiPv = Array.from(this.multiPvLines.values()).sort(
      (a, b) => a.rank - b.rank
    );

    const finalAnalysis: StockfishAnalysis = {
      bestMove,
      ponderMove,
      evaluation: this.currentAnalysis.evaluation || 0,
      mate: this.currentAnalysis.mate,
      depth: this.currentAnalysis.depth || 0,
      principalVariation: this.currentAnalysis.principalVariation || [],
      wdl: this.currentAnalysis.wdl,
      nodes: this.currentAnalysis.nodes,
      nps: this.currentAnalysis.nps,
      multiPv: multiPv.length > 1 ? multiPv : undefined,
    };

    if (this.pendingResolve) {
      this.pendingResolve(finalAnalysis);
      this.pendingResolve = null;
    }
  }

  async analyze(
    fen: string,
    options: AnalysisOptions = {}
  ): Promise<StockfishAnalysis> {
    if (!this.isReady) {
      await this.initialize();
    }

    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      this.currentAnalysis = {};
      this.multiPvLines.clear();

      // Stop any ongoing analysis
      this.sendCommand("stop");

      // Small delay to ensure stop is processed
      setTimeout(() => {
        // Set position
        this.sendCommand(`position fen ${fen}`);

        // Set MultiPV if requested
        if (options.multiPv && options.multiPv > 1) {
          this.sendCommand(`setoption name MultiPV value ${options.multiPv}`);
        } else {
          this.sendCommand("setoption name MultiPV value 1");
        }

        // Set skill level if specified (note: this may not work in all versions)
        if (options.skillLevel !== undefined) {
          this.sendCommand(`setoption name Skill Level value ${options.skillLevel}`);
        }

        // Start analysis
        if (options.movetime) {
          this.sendCommand(`go movetime ${options.movetime}`);
        } else {
          this.sendCommand(`go depth ${options.depth || 16}`);
        }
      }, 10);
    });
  }

  setProgressHandler(handler: MessageHandler | null): void {
    this.messageHandler = handler;
  }

  async getBestMove(
    fen: string,
    skillLevel: number = 20,
    movetime: number = 1000
  ): Promise<string> {
    const analysis = await this.analyze(fen, { skillLevel, movetime });
    return analysis.bestMove;
  }

  stop(): void {
    this.sendCommand("stop");
  }

  destroy(): void {
    if (this.worker) {
      this.sendCommand("quit");
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      this.isUciOk = false;
      this.initPromise = null;
    }
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

// Utility functions for analysis

export function evaluationToCentipawns(evaluation: number): string {
  if (Math.abs(evaluation) > 90000) {
    const mateIn = Math.ceil((100000 - Math.abs(evaluation)) / 100);
    return evaluation > 0 ? `M${mateIn}` : `-M${mateIn}`;
  }
  const pawns = evaluation / 100;
  return pawns >= 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
}

export function wdlToWinProbability(wdl: { win: number; draw: number; loss: number } | undefined, isWhite: boolean): number {
  if (!wdl) return 0.5;
  // WDL is always from white's perspective from engine output
  // But after analysis, it's from side to move perspective
  // We need to normalize to player's perspective
  const { win, draw, loss } = wdl;
  const total = win + draw + loss;
  if (total === 0) return 0.5;
  
  const whiteWinProb = (win + draw * 0.5) / total;
  return isWhite ? whiteWinProb : 1 - whiteWinProb;
}

export function classifyMoveQuality(evalDelta: number): {
  quality: "brilliant" | "great" | "good" | "ok" | "inaccuracy" | "mistake" | "blunder";
  description: string;
} {
  // evalDelta is the change in centipawns from the player's perspective
  // Positive = position got better, Negative = position got worse

  if (evalDelta >= 100) {
    return { quality: "brilliant", description: "Brilliant move!" };
  }
  if (evalDelta >= 50) {
    return { quality: "great", description: "Great move" };
  }
  if (evalDelta >= 0) {
    return { quality: "good", description: "Good move" };
  }
  if (evalDelta >= -30) {
    return { quality: "ok", description: "OK" };
  }
  if (evalDelta >= -100) {
    return { quality: "inaccuracy", description: "Inaccuracy" };
  }
  if (evalDelta >= -300) {
    return { quality: "mistake", description: "Mistake" };
  }
  return { quality: "blunder", description: "Blunder!" };
}
