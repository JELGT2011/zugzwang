"use client";

import BoardSettingsPopover from "@/components/BoardSettingsPopover";
import CoachPanel from "@/components/CoachPanel";
import GameControlsPanel from "@/components/GameControlsPanel";
import NewGamePanel from "@/components/NewGamePanel";
import { Badge } from "@/components/ui/badge";
import { useBoardController, useBoardEngine, useCoachController } from "@/hooks";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Chess } from "chess.js";
import { useCallback, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";

export default function ChessGame() {
  // Board controller (state access only - safe for multiple components)
  const {
    game,
    playerColor,
    arrows,
    hasGameStarted,
    moveHistory,
    makeMove,
    startNewGame,
    getStatus,
    isGameOver,
    getFen,
  } = useBoardController();

  // User profile for move method preference
  const { moveMethod } = useUserProfile();

  // Click-to-move state
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  // Compute highlight styles for the last move
  const lastMoveSquareStyles = useMemo(() => {
    if (moveHistory.length === 0) return {};

    const lastMove = moveHistory[moveHistory.length - 1];
    const highlightColor = "rgba(255, 210, 77, 0.5)"; // Warm golden yellow

    return {
      [lastMove.from]: { backgroundColor: highlightColor },
      [lastMove.to]: { backgroundColor: highlightColor },
    };
  }, [moveHistory]);

  // Compute legal moves for selected piece
  const legalMoveSquares = useMemo(() => {
    if (!selectedSquare || moveMethod === "drag") return {};

    const styles: Record<string, React.CSSProperties> = {};

    try {
      const moves = game.moves({
        square: selectedSquare as Parameters<typeof game.moves>[0]["square"],
        verbose: true,
      });

      for (const move of moves) {
        // Check if there's a piece on the target square (capture)
        const targetPiece = game.get(move.to);
        if (targetPiece) {
          // Capture highlight - ring/border style
          styles[move.to] = {
            background: "radial-gradient(transparent 0%, transparent 79%, rgba(20, 85, 30, 0.4) 80%)",
            borderRadius: "50%",
          };
        } else {
          // Empty square - dot in center
          styles[move.to] = {
            background: "radial-gradient(rgba(20, 85, 30, 0.4) 25%, transparent 25%)",
            borderRadius: "50%",
          };
        }
      }
    } catch {
      // Ignore errors from invalid squares
    }

    return styles;
  }, [selectedSquare, moveMethod, game]);

  // Combine square styles
  const squareStyles = useMemo(() => {
    const styles = { ...lastMoveSquareStyles, ...legalMoveSquares };

    // Add selected square highlight (on top of everything)
    if (selectedSquare && moveMethod !== "drag") {
      styles[selectedSquare] = { backgroundColor: "rgba(20, 85, 30, 0.5)" };
    }

    return styles;
  }, [lastMoveSquareStyles, legalMoveSquares, selectedSquare, moveMethod]);

  // Engine automation - ONLY called here (handles computer opponent moves)
  useBoardEngine();

  // Coach controller (state access only - safe for multiple components)
  const { initiateConnection } = useCoachController();

  // Local UI state
  const [isNewGameModalOpen, setIsNewGameModalOpen] = useState(true);

  // Start new game and connect coach
  const handleStartGame = useCallback((asWhite: boolean) => {
    startNewGame(asWhite);

    // Connect coach with initial board state
    const initialGame = new Chess();
    initiateConnection({
      fen: initialGame.fen(),
      moveHistory: "",
      boardAscii: initialGame.ascii()
    });
  }, [startNewGame, initiateConnection]);

  // Core move function
  const tryMove = useCallback(
    (from: string, to: string): boolean => {
      if (isGameOver()) {
        return false;
      }

      // Check if it's the player's turn
      if (game.turn() !== playerColor) {
        return false;
      }

      const success = makeMove(from, to);
      if (success) {
        setSelectedSquare(null);
      }
      return success;
    },
    [isGameOver, game, playerColor, makeMove]
  );

  // Handle player move (drag and drop)
  const onDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }): boolean => {
      if (moveMethod === "click") {
        return false; // Disable drag when click-only mode
      }

      if (!targetSquare) {
        return false;
      }

      setSelectedSquare(null);
      return tryMove(sourceSquare, targetSquare);
    },
    [moveMethod, tryMove]
  );

  // Handle piece click (click to move - first click)
  const onPieceClick = useCallback(
    ({ square }: { isSparePiece: boolean; piece: { pieceType: string }; square: string | null }) => {
      if (moveMethod === "drag" || isGameOver() || !square) {
        return;
      }

      // Check if it's the player's turn
      if (game.turn() !== playerColor) {
        return;
      }

      // Get the piece on this square
      const piece = game.get(square as Parameters<typeof game.get>[0]);
      if (!piece) {
        return;
      }

      // Only allow selecting pieces of the current player's color
      if (piece.color !== playerColor) {
        // If we have a selected piece, try to capture
        if (selectedSquare) {
          tryMove(selectedSquare, square);
        }
        return;
      }

      // If clicking the same square, deselect
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      // Select this piece
      setSelectedSquare(square);
    },
    [moveMethod, isGameOver, game, playerColor, selectedSquare, tryMove]
  );

  // Handle square click (click to move - second click)
  const onSquareClick = useCallback(
    ({ square }: { piece: { pieceType: string } | null; square: string }) => {
      if (moveMethod === "drag" || isGameOver()) {
        return;
      }

      // If no piece is selected, do nothing (piece click will handle selection)
      if (!selectedSquare) {
        return;
      }

      // If clicking the same square, deselect
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      // Try to make the move
      tryMove(selectedSquare, square);
    },
    [moveMethod, isGameOver, selectedSquare, tryMove]
  );

  // Open new game modal
  function openNewGameModal() {
    setIsNewGameModalOpen(true);
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-[1100px] mx-auto p-4">
      {/* Chess Board */}
      <div className="flex flex-col items-center gap-4 flex-1 min-w-0">
        <div className="flex gap-3 w-full max-w-[840px]">
          <div className="flex-1 aspect-square shadow-2xl rounded-lg overflow-hidden">
            <Chessboard
              options={{
                position: getFen(),
                onPieceDrop: (args) => onDrop(args),
                onPieceClick: (args) => onPieceClick(args),
                onSquareClick: (args) => onSquareClick(args),
                allowDragging: moveMethod !== "click",
                boardOrientation: playerColor === "w" ? "white" : "black",
                animationDurationInMs: 200,
                arrows: arrows,
                clearArrowsOnPositionChange: true,
                darkSquareStyle: { backgroundColor: "#7c6f64" },
                lightSquareStyle: { backgroundColor: "#d5c4a1" },
                squareStyles: squareStyles,
                boardStyle: {
                  borderRadius: "8px",
                },
              }}
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center w-full max-w-[840px] relative">
          <div className="flex items-center justify-center gap-3 flex-1">
            <Badge variant="outline" className="px-4 py-1.5 text-sm">
              {getStatus()}
            </Badge>
          </div>
          <BoardSettingsPopover className="h-8 w-8 absolute right-0" />
        </div>
      </div>

      {/* Side Panel */}
      <div className="flex flex-col gap-4 lg:w-[280px] shrink-0 h-[calc(100vh-12rem)] max-h-[800px]">
        {hasGameStarted && (
          <GameControlsPanel onNewGame={openNewGameModal} />
        )}
        <CoachPanel />
      </div>

      {/* New Game Modal */}
      <NewGamePanel
        isOpen={isNewGameModalOpen}
        onClose={() => setIsNewGameModalOpen(false)}
        onStartGame={handleStartGame}
      />
    </div>
  );
}
