"use client";

import CoachPanel from "@/components/CoachPanel";
import NewGameCard from "@/components/NewGameCard";
import { Badge } from "@/components/ui/badge";
import { Arrow } from "@/lib/coach-agent";
import { StockfishEngine } from "@/lib/stockfish";
import { Chess, Color } from "chess.js";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState<Color>("w");
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [highlightedSquares, setHighlightedSquares] = useState<string[]>([]);
  const engineThinkingRef = useRef(false);
  const engine = useRef<StockfishEngine | null>(null);

  // Synchronize ref with state for the engine thinking status
  useEffect(() => {
    engineThinkingRef.current = isEngineThinking;
  }, [isEngineThinking]);

  // Initialize engine
  useEffect(() => {
    console.debug("Initializing Stockfish engine...");
    engine.current = new StockfishEngine();
    engine.current.send("uci");
    engine.current.send("isready");

    return () => {
      console.debug("Terminating Stockfish engine...");
      engine.current?.quit();
    };
  }, []);

  // Engine move logic
  const makeEngineMove = useCallback(() => {
    if (game.isGameOver() || !engine.current) return;

    const turn = game.turn(); // 'w' or 'b'
    const engineTurn = playerColor === "w" ? "b" : "w";

    if (turn === engineTurn && !engineThinkingRef.current) {
      console.debug("Engine turn detected. Thinking...");
      engineThinkingRef.current = true;

      // Defer state update to avoid linter warning and cascading renders
      setTimeout(() => setIsEngineThinking(true), 0);

      // Small delay for natural feel
      setTimeout(() => {
        if (!engine.current) return;
        engine.current.send(`position fen ${game.fen()}`);
        engine.current.send("go depth 12", (message) => {
          const bestMoveMatch = message.match(/^bestmove\s([a-h][1-8][a-h][1-8][qrbn]?)/);
          if (bestMoveMatch) {
            const bestMove = bestMoveMatch[1];
            console.debug("Engine suggests move:", bestMove);
            const gameCopy = new Chess(game.fen());
            try {
              gameCopy.move(bestMove);
              setGame(gameCopy);
            } catch (e) {
              console.error("Engine move error:", e);
            }
          }
          engineThinkingRef.current = false;
          setIsEngineThinking(false);
        });
      }, 500);
    }
  }, [game, playerColor]);

  // Trigger engine move when game or turn changes
  useEffect(() => {
    makeEngineMove();
  }, [game, makeEngineMove]);

  // Handle player move
  function onDrop({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }): boolean {
    console.debug("onDrop called:", { sourceSquare, targetSquare });

    if (game.isGameOver()) {
      console.debug("Move rejected: Game is over");
      return false;
    }

    if (engineThinkingRef.current) {
      console.debug("Move rejected: Engine is thinking");
      return false;
    }

    if (!targetSquare) {
      console.debug("Move rejected: No target square");
      return false;
    }

    // Ensure it's the player's turn
    const turn = game.turn();
    const playerTurn = playerColor === "w" ? "w" : "b";

    console.debug("Turn check:", { turn, playerTurn });

    if (turn !== playerTurn) {
      console.debug("Move rejected: Not player's turn");
      return false;
    }

    // Try to make the move
    const gameCopy = new Chess(game.fen());

    try {
      const result = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q", // always promote to queen for simplicity
      });

      if (result === null) {
        console.debug("Move rejected: Invalid move according to chess.js");
        return false;
      }

      console.debug("Move accepted:", result.san);
      // Update state with the new position
      setGame(gameCopy);
      return true;
    } catch (err) {
      console.error("Move error:", err);
      return false;
    }
  }

  // Start new game
  function startNewGame(asWhite: boolean) {
    const newGame = new Chess();
    setGame(newGame);
    setPlayerColor(asWhite ? "w" : "b");
    setIsEngineThinking(false);
    setArrows([]);

    // Reset engine
    if (engine.current) {
      engine.current.send("ucinewgame");
      engine.current.send("isready");
    }
  }

  const handleDrawArrow = useCallback((arrow: Arrow) => {
    setArrows(prev => [...prev, arrow]);
  }, []);

  const handleHighlightSquare = useCallback((square: string, color: string) => {
    setHighlightedSquares(prev => [...prev, square]);
  }, []);

  const handleClearArrows = useCallback(() => {
    setArrows([]);
  }, []);

  // Get game status
  function getStatus() {
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
      {/* Chess Board */}
      <div className="flex flex-col items-center gap-4 flex-1 min-w-0">
        <div className="flex gap-3 w-full max-w-[840px]">
          <div className="flex-1 aspect-square shadow-2xl rounded-lg overflow-hidden relative">
            <Chessboard
              options={{
                position: game.fen(),
                onPieceDrop: (args) => onDrop(args),
                boardOrientation: playerColor === "w" ? "white" : "black",
                animationDurationInMs: 200,
                arrows: arrows,
                clearArrowsOnPositionChange: true,
                darkSquareStyle: { backgroundColor: "#7c6f64" },
                lightSquareStyle: { backgroundColor: "#d5c4a1" },
                boardStyle: {
                  borderRadius: "8px",
                },
              }}
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          {isEngineThinking ? (
            <Badge variant="secondary" className="px-4 py-1.5 text-sm flex gap-2 items-center">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Stockfish is thinking...
            </Badge>
          ) : (
            <Badge variant="outline" className="px-4 py-1.5 text-sm">
              {getStatus()}
            </Badge>
          )}
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
        />

        <CoachPanel
          fen={game.fen()}
          moveHistory={game.history().join(" ")}
          lastMove={game.history().length > 0 ? game.history()[game.history().length - 1] : null}
          playerColor={playerColor}
          onDrawArrow={handleDrawArrow}
          onHighlightSquare={handleHighlightSquare}
          onClearArrows={handleClearArrows}
        />
      </div>
    </div>
  );
}
