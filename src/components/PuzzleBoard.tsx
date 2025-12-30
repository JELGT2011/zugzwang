"use client";

import { Badge } from "@/components/ui/badge";
import { usePuzzleStore } from "@/stores";
import type { Puzzle } from "@/types/puzzle";
import { Chess, Move as ChessMove } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import type { Arrow } from "react-chessboard";

interface PuzzleBoardProps {
  puzzle: Puzzle;
}

export default function PuzzleBoard({ puzzle }: PuzzleBoardProps) {
  const {
    currentMoveIndex,
    puzzleStatus,
    playerMoves,
    showSolution,
    hintsUsed,
    makeMove: storeMakeMove,
  } = usePuzzleStore();

  // Local game state
  const [game, setGame] = useState<Chess>(() => new Chess(puzzle.fen));
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [lastMoveSquares, setLastMoveSquares] = useState<Record<string, React.CSSProperties>>({});
  const [highlightSquares, setHighlightSquares] = useState<Record<string, React.CSSProperties>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset game when puzzle changes
  useEffect(() => {
    const newGame = new Chess(puzzle.fen);
    
    // Apply the first move (opponent's last move that sets up the puzzle)
    if (puzzle.moves.length > 0) {
      const setupMove = puzzle.moves[0];
      try {
        const move = newGame.move({
          from: setupMove.slice(0, 2),
          to: setupMove.slice(2, 4),
          promotion: setupMove.length > 4 ? setupMove[4] : undefined,
        });
        
        if (move) {
          // Highlight the setup move
          setLastMoveSquares({
            [move.from]: { backgroundColor: "rgba(255, 210, 77, 0.5)" },
            [move.to]: { backgroundColor: "rgba(255, 210, 77, 0.5)" },
          });
        }
      } catch (e) {
        console.error("Failed to apply setup move:", e);
      }
    }
    
    setGame(newGame);
    setArrows([]);
    setHighlightSquares({});
  }, [puzzle]);

  // Board orientation - player plays as the side to move after setup
  const boardOrientation = useMemo(() => {
    const setupGame = new Chess(puzzle.fen);
    if (puzzle.moves.length > 0) {
      const setupMove = puzzle.moves[0];
      try {
        setupGame.move({
          from: setupMove.slice(0, 2),
          to: setupMove.slice(2, 4),
          promotion: setupMove.length > 4 ? setupMove[4] : undefined,
        });
      } catch {
        // ignore
      }
    }
    return setupGame.turn() === "w" ? "white" : "black";
  }, [puzzle]);

  // Apply opponent moves after player's correct move
  const applyOpponentMove = useCallback((moveIndex: number) => {
    if (moveIndex >= puzzle.moves.length) return;

    const opponentMoveUci = puzzle.moves[moveIndex];
    
    setGame((prevGame) => {
      const newGame = new Chess(prevGame.fen());
      try {
        const move = newGame.move({
          from: opponentMoveUci.slice(0, 2),
          to: opponentMoveUci.slice(2, 4),
          promotion: opponentMoveUci.length > 4 ? opponentMoveUci[4] : undefined,
        });
        
        if (move) {
          setLastMoveSquares({
            [move.from]: { backgroundColor: "rgba(255, 210, 77, 0.5)" },
            [move.to]: { backgroundColor: "rgba(255, 210, 77, 0.5)" },
          });
        }
      } catch (e) {
        console.error("Failed to apply opponent move:", e);
      }
      return newGame;
    });
    
    setIsAnimating(false);
  }, [puzzle.moves]);

  // Show hint arrow when hint is used
  useEffect(() => {
    if (hintsUsed > 0 && puzzleStatus === "playing" && currentMoveIndex < puzzle.moves.length) {
      const expectedMove = puzzle.moves[currentMoveIndex];
      const fromSquare = expectedMove.slice(0, 2);
      
      setHighlightSquares({
        [fromSquare]: { 
          backgroundColor: "rgba(69, 133, 136, 0.6)",
          boxShadow: "inset 0 0 0 3px rgba(69, 133, 136, 0.8)",
        },
      });
    } else {
      setHighlightSquares({});
    }
  }, [hintsUsed, puzzleStatus, currentMoveIndex, puzzle.moves]);

  // Show solution arrows when solution is revealed
  useEffect(() => {
    if (showSolution && puzzleStatus === "failed") {
      const remainingMoves = puzzle.moves.slice(currentMoveIndex);
      const solutionArrows: Arrow[] = remainingMoves
        .filter((_, i) => i % 2 === 0) // Only player moves
        .slice(0, 3) // Show up to 3 moves
        .map((move, i) => ({
          from: move.slice(0, 2),
          to: move.slice(2, 4),
          color: i === 0 ? "rgb(69, 133, 136)" : "rgba(69, 133, 136, 0.5)",
        }));
      
      setArrows(solutionArrows);
    } else {
      setArrows([]);
    }
  }, [showSolution, puzzleStatus, currentMoveIndex, puzzle.moves]);

  // Handle piece drop
  const onDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }): boolean => {
      if (puzzleStatus !== "playing" || isAnimating || !targetSquare) {
        return false;
      }

      // Check if it's the player's turn (odd moves in the array: 1, 3, 5, ...)
      const isPlayerTurn = currentMoveIndex % 2 === 1;
      if (!isPlayerTurn && currentMoveIndex !== 1) {
        // currentMoveIndex 1 is the first player move
        return false;
      }

      // Try to make the move on the local game
      const gameCopy = new Chess(game.fen());
      let moveResult: ChessMove | null = null;

      try {
        moveResult = gameCopy.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q", // Always promote to queen for simplicity
        });
      } catch {
        return false;
      }

      if (!moveResult) {
        return false;
      }

      // Convert to UCI format for comparison
      const uciMove = sourceSquare + targetSquare + (moveResult.promotion || "");
      
      // Check with the store
      const { correct, complete } = storeMakeMove(uciMove);

      if (correct) {
        // Update local game state
        setGame(gameCopy);
        setLastMoveSquares({
          [moveResult.from]: { backgroundColor: "rgba(152, 151, 26, 0.5)" },
          [moveResult.to]: { backgroundColor: "rgba(152, 151, 26, 0.5)" },
        });
        setHighlightSquares({});

        if (!complete) {
          // Schedule opponent's response
          setIsAnimating(true);
          moveTimeoutRef.current = setTimeout(() => {
            applyOpponentMove(currentMoveIndex + 1);
          }, 500);
        }

        return true;
      } else {
        // Wrong move - flash red
        setHighlightSquares({
          [sourceSquare]: { backgroundColor: "rgba(204, 36, 29, 0.5)" },
          [targetSquare]: { backgroundColor: "rgba(204, 36, 29, 0.5)" },
        });
        
        setTimeout(() => {
          setHighlightSquares({});
        }, 500);

        return false;
      }
    },
    [game, puzzleStatus, currentMoveIndex, isAnimating, storeMakeMove, applyOpponentMove]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
    };
  }, []);

  // Combine square styles
  const squareStyles = useMemo(() => {
    return { ...lastMoveSquares, ...highlightSquares };
  }, [lastMoveSquares, highlightSquares]);

  // Get status text
  const statusText = useMemo(() => {
    if (puzzleStatus === "success") return "Puzzle Solved! ✓";
    if (puzzleStatus === "failed") return showSolution ? "Solution" : "Try Again";
    if (isAnimating) return "Opponent's turn...";
    return boardOrientation === "white" ? "White to move" : "Black to move";
  }, [puzzleStatus, showSolution, isAnimating, boardOrientation]);

  return (
    <div className="space-y-4">
      {/* Board */}
      <div className="aspect-square w-full shadow-2xl rounded-lg overflow-hidden relative">
        <Chessboard
          options={{
            position: game.fen(),
            onPieceDrop: (args) => onDrop(args),
            boardOrientation: boardOrientation,
            animationDurationInMs: 200,
            arrows: arrows,
            clearArrowsOnPositionChange: false,
            darkSquareStyle: { backgroundColor: "#7c6f64" },
            lightSquareStyle: { backgroundColor: "#d5c4a1" },
            squareStyles: squareStyles,
            boardStyle: {
              borderRadius: "8px",
            },
          }}
        />

        {/* Overlay for completed/failed state */}
        {(puzzleStatus === "success" || puzzleStatus === "failed") && (
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        )}
      </div>

      {/* Status */}
      <div className="flex items-center justify-center gap-3">
        <Badge
          variant="outline"
          className={`px-4 py-1.5 text-sm ${
            puzzleStatus === "success"
              ? "border-success text-success"
              : puzzleStatus === "failed"
              ? "border-destructive text-destructive"
              : ""
          }`}
        >
          {statusText}
        </Badge>
        
        {puzzleStatus === "playing" && (
          <Badge variant="secondary" className="px-3 py-1 text-xs">
            Move {Math.ceil(currentMoveIndex / 2)} of {Math.ceil((puzzle.moves.length - 1) / 2)}
          </Badge>
        )}
      </div>
    </div>
  );
}

