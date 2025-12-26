"use client";

import CoachPanel from "@/components/CoachPanel";
import GameControlsPanel from "@/components/GameControlsPanel";
import NewGamePanel from "@/components/NewGamePanel";
import { Badge } from "@/components/ui/badge";
import { useStockfish } from "@/contexts/StockfishContext";
import { Arrow } from "@/lib/coach-agent";
import { Chess, Color } from "chess.js";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState<Color>("w");
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [isNewGameModalOpen, setIsNewGameModalOpen] = useState(true);
  const [hasGameStarted, setHasGameStarted] = useState(false);
  const { getBestMove, isThinking: isEngineThinking } = useStockfish();
  const engineThinkingRef = useRef(false);

  // Synchronize ref with state for the engine thinking status
  useEffect(() => {
    engineThinkingRef.current = isEngineThinking;
  }, [isEngineThinking]);

  // Engine move logic
  const makeEngineMove = useCallback(async () => {
    if (game.isGameOver()) return;

    const turn = game.turn(); // 'w' or 'b'
    const engineTurn = playerColor === "w" ? "b" : "w";

    if (turn === engineTurn && !engineThinkingRef.current) {
      console.debug("Engine turn detected. Thinking...");

      // Small delay for natural feel
      setTimeout(async () => {
        const bestMove = await getBestMove(game.fen(), 12);

        if (bestMove) {
          console.debug("Engine suggests move:", bestMove);
          const gameCopy = new Chess(game.fen());
          try {
            gameCopy.move(bestMove);
            setGame(gameCopy);
          } catch (e) {
            console.error("Engine move error:", e);
          }
        }
      }, 500);
    }
  }, [game, playerColor, getBestMove]);

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
    setArrows([]);
    setHasGameStarted(true);
  }

  // Open new game modal
  function openNewGameModal() {
    setIsNewGameModalOpen(true);
  }

  const handleDrawArrow = useCallback((arrow: Arrow) => {
    setArrows(prev => [...prev, arrow]);
  }, []);

  const handleHighlightSquare = useCallback((square: string) => {
    // TODO: Implement square highlighting
    console.log("Highlight square:", square);
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
        {hasGameStarted && (
          <GameControlsPanel
            playerColor={playerColor}
            moveHistory={game.history({ verbose: true })}
            isGameOver={game.isGameOver()}
            gameStatus={getStatus()}
            onNewGame={openNewGameModal}
          />
        )}

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

      {/* New Game Modal */}
      <NewGamePanel
        isOpen={isNewGameModalOpen}
        onClose={() => setIsNewGameModalOpen(false)}
        onStartGame={startNewGame}
      />
    </div>
  );
}
