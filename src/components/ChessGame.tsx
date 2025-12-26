"use client";

import CoachPanel from "@/components/CoachPanel";
import GameControlsPanel from "@/components/GameControlsPanel";
import NewGamePanel from "@/components/NewGamePanel";
import { Badge } from "@/components/ui/badge";
import { useStockfish } from "@/contexts/StockfishContext";
import { useBoardController } from "@/hooks";
import { Chess } from "chess.js";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Chessboard, type Arrow } from "react-chessboard";

export default function ChessGame() {
  // Board controller
  const {
    game,
    playerColor,
    arrows,
    hasGameStarted,
    makeMove,
    startNewGame,
    addArrow,
    clearArrows,
    getStatus,
    getMoveHistory,
    getLastMove,
    isGameOver,
    getFen,
    isPlayerTurn,
    setGame,
  } = useBoardController();

  // Local UI state
  const [isNewGameModalOpen, setIsNewGameModalOpen] = useState(true);
  const { getBestMove, isThinking: isEngineThinking } = useStockfish();

  // Engine move logic
  const makeEngineMove = useCallback(async () => {
    if (game.isGameOver()) return;

    const turn = game.turn(); // 'w' or 'b'
    const engineTurn = playerColor === "w" ? "b" : "w";

    if (turn === engineTurn && !isEngineThinking) {
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
  }, [game, playerColor, getBestMove, isEngineThinking, setGame]);

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

    if (isGameOver()) {
      console.debug("Move rejected: Game is over");
      return false;
    }

    if (isEngineThinking) {
      console.debug("Move rejected: Engine is thinking");
      return false;
    }

    if (!targetSquare) {
      console.debug("Move rejected: No target square");
      return false;
    }

    // Ensure it's the player's turn
    if (!isPlayerTurn()) {
      console.debug("Move rejected: Not player's turn");
      return false;
    }

    // Try to make the move
    const success = makeMove(sourceSquare, targetSquare);

    if (success) {
      console.debug("Move accepted");
    } else {
      console.debug("Move rejected: Invalid move according to chess.js");
    }

    return success;
  }

  // Open new game modal
  function openNewGameModal() {
    setIsNewGameModalOpen(true);
  }

  const handleDrawArrow = useCallback(
    (arrow: Arrow) => {
      addArrow(arrow);
    },
    [addArrow]
  );

  const handleHighlightSquare = useCallback((square: string) => {
    // TODO: Implement square highlighting
    console.log("Highlight square:", square);
  }, []);

  const handleClearArrows = useCallback(() => {
    clearArrows();
  }, [clearArrows]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-[1100px] mx-auto p-4">
      {/* Chess Board */}
      <div className="flex flex-col items-center gap-4 flex-1 min-w-0">
        <div className="flex gap-3 w-full max-w-[840px]">
          <div className="flex-1 aspect-square shadow-2xl rounded-lg overflow-hidden relative">
            <Chessboard
              options={{
                position: getFen(),
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
            moveHistory={getMoveHistory()}
            isGameOver={isGameOver()}
            gameStatus={getStatus()}
            onNewGame={openNewGameModal}
          />
        )}

        <CoachPanel
          fen={getFen()}
          moveHistory={game.history().join(" ")}
          lastMove={getLastMove()}
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
