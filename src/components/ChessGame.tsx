"use client";

import CoachPanel from "@/components/CoachPanel";
import GameControlsPanel from "@/components/GameControlsPanel";
import NewGamePanel from "@/components/NewGamePanel";
import { Badge } from "@/components/ui/badge";
import { useBoardController } from "@/hooks";
import { useState } from "react";
import { Chessboard } from "react-chessboard";

export default function ChessGame() {
  // Board controller
  const {
    playerColor,
    arrows,
    hasGameStarted,
    makeMove,
    startNewGame,
    getStatus,
    isGameOver,
    getFen,
  } = useBoardController();

  // Local UI state
  const [isNewGameModalOpen, setIsNewGameModalOpen] = useState(true);

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

    if (!targetSquare) {
      console.debug("Move rejected: No target square");
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
          <Badge variant="outline" className="px-4 py-1.5 text-sm">
            {getStatus()}
          </Badge>
        </div>
      </div>

      {/* Side Panel */}
      <div className="flex flex-col gap-4 lg:w-[280px] shrink-0">
        {hasGameStarted && (
          <GameControlsPanel onNewGame={openNewGameModal} />
        )}
        <CoachPanel />
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
