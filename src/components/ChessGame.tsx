"use client";

import { useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import type { PieceDropHandlerArgs } from "react-chessboard";
import NewGameCard from "./NewGameCard";

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");

  // Handle player move
  function onDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!targetSquare) return false;
    
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

      // AI responds after a short delay
      if (!gameCopy.isGameOver()) {
        setTimeout(() => {
          // Make AI move on the updated game
          const aiGame = new Chess(gameCopy.fen());
          const moves = aiGame.moves();
          if (moves.length > 0) {
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            aiGame.move(randomMove);
            setGame(aiGame);
          }
        }, 400);
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

    // If playing as black, AI moves first
    if (!asWhite) {
      setTimeout(() => {
        const aiGame = new Chess();
        const moves = aiGame.moves();
        if (moves.length > 0) {
          const randomMove = moves[Math.floor(Math.random() * moves.length)];
          aiGame.move(randomMove);
          setGame(aiGame);
        }
      }, 400);
    }
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
        <div className="w-full max-w-[800px] aspect-square shadow-2xl rounded-lg overflow-hidden">
          <Chessboard
            options={{
              position: game.fen(),
              onPieceDrop: onDrop,
              boardOrientation: playerColor,
              allowDragging: true,
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
