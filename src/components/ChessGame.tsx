"use client";

import { Chess } from "chess.js";
import { useState } from "react";
import { Chessboard } from "react-chessboard";
import NewGameCard from "@/components/NewGameCard";

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");

  // Handle player move
  function onDrop(sourceSquare: string, targetSquare: string): boolean {
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
  }

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
              }}
              // onPieceDrop={onDrop}
              // boardOrientation={playerColor}
              // animationDuration={200}
              // customDarkSquareStyle={{ backgroundColor: "#7c6f64" }}
              // customLightSquareStyle={{ backgroundColor: "#d5c4a1" }}
              // customBoardStyle={{
              //   borderRadius: "8px",
              // }}
            />
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
        />
      </div>
    </div>
  );
}
