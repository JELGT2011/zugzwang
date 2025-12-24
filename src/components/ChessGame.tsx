"use client";

import { useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import type { PieceDropHandlerArgs } from "react-chessboard";

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");

  // Handle player move
  function onDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    console.log("onDrop called:", sourceSquare, "->", targetSquare);
    
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
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-5xl mx-auto p-4">
      {/* Chess Board */}
      <div className="flex flex-col items-center gap-4">
        <div className="shadow-2xl rounded-lg overflow-hidden" style={{ width: 480, height: 480 }}>
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

        {/* Move history */}
        {game.history().length > 0 && (
          <div className="bg-surface rounded-lg p-4 max-w-[480px] w-full">
            <h3 className="text-sm text-text-muted mb-2">Moves</h3>
            <div className="flex flex-wrap gap-2 text-sm font-mono">
              {game.history().map((move, i) => (
                <span key={i} className={i % 2 === 0 ? "text-foreground" : "text-text-muted"}>
                  {i % 2 === 0 && <span className="text-text-muted mr-1">{Math.floor(i/2) + 1}.</span>}
                  {move}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 min-w-[280px]">
        <div className="bg-surface rounded-xl p-6 border border-border">
          <h2 className="text-lg font-semibold mb-4">New Game</h2>
          
          <div className="flex gap-2">
            <button
              onClick={() => startNewGame(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <span className="text-xl">♔</span>
              <span className="font-medium">White</span>
            </button>
            <button
              onClick={() => startNewGame(false)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-black/30 hover:bg-black/40 rounded-lg transition-colors border border-border"
            >
              <span className="text-xl">♚</span>
              <span className="font-medium">Black</span>
            </button>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-6 border border-border">
          <h3 className="text-sm text-text-muted mb-2">Playing as</h3>
          <p className="text-lg font-medium capitalize">{playerColor}</p>
        </div>

        {game.isGameOver() && (
          <div className="bg-accent-bright/20 rounded-xl p-6 border border-accent-bright/30">
            <h3 className="text-lg font-semibold text-accent-bright">Game Over</h3>
            <p className="text-foreground mt-1">{getStatus()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
