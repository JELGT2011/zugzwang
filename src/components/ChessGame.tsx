"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import type { PieceDropHandlerArgs } from "react-chessboard";
import NewGameCard from "./NewGameCard";
import EvalBar from "./EvalBar";
import {
  getStockfishEngine,
  destroyStockfishEngine,
  type StockfishAnalysis,
} from "@/lib/stockfish";

interface Evaluation {
  score: number; // centipawns
  mate?: number; // moves to mate
  depth: number;
}

export type HintLevel = "minimal" | "moderate" | "detailed";

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [engineReady, setEngineReady] = useState(false);
  const [engineThinking, setEngineThinking] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [aiStrength, setAiStrength] = useState(10); // 0-20 scale
  const engineInitialized = useRef(false);

  // Initialize Stockfish engine
  useEffect(() => {
    if (engineInitialized.current) return;
    engineInitialized.current = true;

    const initEngine = async () => {
      try {
        const engine = getStockfishEngine();
        await engine.initialize();
        setEngineReady(true);
        console.log("Stockfish ready");
      } catch (error) {
        console.error("Failed to initialize Stockfish:", error);
      }
    };

    initEngine();

    return () => {
      destroyStockfishEngine();
    };
  }, []);

  // Analyze position for evaluation bar
  const analyzePosition = useCallback(async (fen: string) => {
    if (!engineReady) return;
    
    try {
      const engine = getStockfishEngine();
      const analysis = await engine.analyze(fen, { depth: 12, movetime: 500 });
      setEvaluation({
        score: analysis.evaluation,
        mate: analysis.mate,
        depth: analysis.depth,
      });
    } catch (error) {
      console.error("Analysis error:", error);
    }
  }, [engineReady]);

  // Make AI move using Stockfish
  const makeAiMove = useCallback(async (currentFen: string) => {
    if (!engineReady) return;

    setEngineThinking(true);
    
    try {
      const engine = getStockfishEngine();
      
      // Calculate movetime based on strength (weaker = faster/less accurate)
      const movetime = 200 + (aiStrength * 100); // 200ms to 2200ms
      
      const analysis: StockfishAnalysis = await engine.analyze(currentFen, {
        skillLevel: aiStrength,
        movetime,
        depth: Math.max(8, aiStrength), // Weaker AI searches less deep
      });

      const bestMove = analysis.bestMove;
      if (!bestMove) {
        setEngineThinking(false);
        return;
      }

      // Parse the move (e.g., "e2e4" -> { from: "e2", to: "e4" })
      const from = bestMove.slice(0, 2);
      const to = bestMove.slice(2, 4);
      const promotion = bestMove.length > 4 ? bestMove[4] : undefined;

      const aiGame = new Chess(currentFen);
      aiGame.move({ from, to, promotion });
      setGame(aiGame);

      // Update evaluation after AI move
      setEvaluation({
        score: analysis.evaluation,
        mate: analysis.mate,
        depth: analysis.depth,
      });

    } catch (error) {
      console.error("AI move error:", error);
    } finally {
      setEngineThinking(false);
    }
  }, [engineReady, aiStrength]);

  // Handle player move
  function onDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!targetSquare) return false;
    if (engineThinking) return false; // Don't allow moves while AI is thinking
    
    // Check if it's player's turn
    const isWhiteTurn = game.turn() === "w";
    const isPlayerTurn =
      (playerColor === "white" && isWhiteTurn) ||
      (playerColor === "black" && !isWhiteTurn);

    if (!isPlayerTurn) return false;

    // Try to make the move
    const gameCopy = new Chess(game.fen());
    
    try {
      const result = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q", // always promote to queen for simplicity
      });

      if (result === null) return false;

      // Update state with the new position
      setGame(gameCopy);

      // Analyze the new position
      analyzePosition(gameCopy.fen());

      // AI responds after a short delay
      if (!gameCopy.isGameOver()) {
        setTimeout(() => {
          makeAiMove(gameCopy.fen());
        }, 200);
      }

      return true;
    } catch (e) {
      console.error("Move error:", e);
      return false;
    }
  }

  // Start new game
  function startNewGame(asWhite: boolean) {
    const newGame = new Chess();
    setGame(newGame);
    setPlayerColor(asWhite ? "white" : "black");
    setEvaluation(null);

    // If playing as black, AI moves first
    if (!asWhite && engineReady) {
      setTimeout(() => {
        makeAiMove(newGame.fen());
      }, 300);
    }
  }

  // Get game status
  function getStatus() {
    if (!engineReady) return "Loading engine...";
    if (engineThinking) return "Engine thinking...";
    if (game.isCheckmate()) {
      return game.turn() === "w" ? "Black wins by checkmate!" : "White wins by checkmate!";
    }
    if (game.isStalemate()) return "Draw by stalemate";
    if (game.isDraw()) return "Draw";
    if (game.isCheck()) return game.turn() === "w" ? "White is in check" : "Black is in check";
    return game.turn() === "w" ? "White to move" : "Black to move";
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-[1100px] mx-auto p-4">
      {/* Chess Board with Eval Bar */}
      <div className="flex flex-col items-center gap-4 flex-1 min-w-0">
        <div className="flex gap-3 w-full max-w-[840px]">
          {/* Evaluation Bar */}
          <div className="hidden sm:flex">
            <EvalBar
              evaluation={evaluation?.score ?? 0}
              mate={evaluation?.mate}
              orientation={playerColor}
            />
          </div>
          
          {/* Chess Board */}
          <div className="flex-1 aspect-square shadow-2xl rounded-lg overflow-hidden relative">
            <Chessboard
              options={{
                position: game.fen(),
                onPieceDrop: onDrop,
                boardOrientation: playerColor,
                allowDragging: engineReady && !engineThinking,
                animationDurationInMs: 200,
                boardStyle: {
                  borderRadius: "8px",
                },
                darkSquareStyle: {
                  backgroundColor: "#7c6f64",
                },
                lightSquareStyle: {
                  backgroundColor: "#d5c4a1",
                },
              }}
            />
            
            {/* Loading overlay */}
            {!engineReady && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-white text-sm">Loading Stockfish...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="text-lg font-medium text-foreground">
          {getStatus()}
        </div>
      </div>

      {/* Side Panel */}
      <div className="flex flex-col gap-4 lg:w-[280px] shrink-0">
        <NewGameCard
          playerColor={playerColor}
          moveHistory={game.history({ verbose: true })}
          isGameOver={game.isGameOver()}
          gameStatus={getStatus()}
          onNewGame={startNewGame}
          aiStrength={aiStrength}
          onAiStrengthChange={setAiStrength}
        />
      </div>
    </div>
  );
}
