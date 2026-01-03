"use client";

import BoardSettingsPopover from "@/components/BoardSettingsPopover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePuzzleStore } from "@/stores";
import type { Puzzle } from "@/types/puzzle";
import { Chess, Move as ChessMove } from "chess.js";
import { Lightbulb } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Arrow } from "react-chessboard";
import { Chessboard } from "react-chessboard";

interface PuzzleBoardProps {
  puzzle: Puzzle;
  externalArrows?: Arrow[];
  onHintRequest?: () => void;
}

// Helper to initialize game state from puzzle
function initializeGameFromPuzzle(puzzle: Puzzle): { game: Chess; setupMoveSquares: Record<string, React.CSSProperties> } {
  const game = new Chess(puzzle.fen);
  let setupMoveSquares: Record<string, React.CSSProperties> = {};

  if (puzzle.moves.length > 0) {
    const setupMove = puzzle.moves[0];
    try {
      const move = game.move({
        from: setupMove.slice(0, 2),
        to: setupMove.slice(2, 4),
        promotion: setupMove.length > 4 ? setupMove[4] : undefined,
      });

      if (move) {
        setupMoveSquares = {
          [move.from]: { backgroundColor: "rgba(255, 210, 77, 0.5)" },
          [move.to]: { backgroundColor: "rgba(255, 210, 77, 0.5)" },
        };
      }
    } catch (e) {
      console.error("Failed to apply setup move:", e);
    }
  }

  return { game, setupMoveSquares };
}

export default function PuzzleBoard({ puzzle, externalArrows = [], onHintRequest }: PuzzleBoardProps) {
  const {
    currentMoveIndex,
    puzzleStatus,
    showSolution,
    makeMove: storeMakeMove,
    advanceMoveIndex,
  } = usePuzzleStore();

  // User profile for move method preference
  const { moveMethod } = useUserProfile();

  // Track puzzle ID to detect changes
  const [currentPuzzleId, setCurrentPuzzleId] = useState(puzzle.id);

  // Local game state - initialize with puzzle
  const initialState = useMemo(() => initializeGameFromPuzzle(puzzle), [puzzle]);
  const [game, setGame] = useState<Chess>(initialState.game);
  const [lastMoveSquares, setLastMoveSquares] = useState<Record<string, React.CSSProperties>>(initialState.setupMoveSquares);
  const [moveHighlightSquares, setMoveHighlightSquares] = useState<Record<string, React.CSSProperties>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset game when puzzle changes
  if (puzzle.id !== currentPuzzleId) {
    const { game: newGame, setupMoveSquares } = initializeGameFromPuzzle(puzzle);
    setGame(newGame);
    setLastMoveSquares(setupMoveSquares);
    setMoveHighlightSquares({});
    setSelectedSquare(null);
    setCurrentPuzzleId(puzzle.id);
  }

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

    // Advance the store's move index so the next player move is checked correctly
    advanceMoveIndex();

    setIsAnimating(false);
  }, [puzzle.moves, advanceMoveIndex]);

  // Derive solution arrows from state (no effect needed)
  const arrows = useMemo(() => {
    const allArrows: Arrow[] = [...externalArrows];

    if (showSolution && puzzleStatus === "failed") {
      const remainingMoves = puzzle.moves.slice(currentMoveIndex);
      const solutionArrows: Arrow[] = remainingMoves
        .filter((_, i) => i % 2 === 0) // Only player moves
        .slice(0, 3) // Show up to 3 moves
        .map((move, i) => ({
          startSquare: move.slice(0, 2),
          endSquare: move.slice(2, 4),
          color: i === 0 ? "rgb(69, 133, 136)" : "rgba(69, 133, 136, 0.5)",
        }));

      allArrows.push(...solutionArrows);
    }
    return allArrows;
  }, [showSolution, puzzleStatus, currentMoveIndex, puzzle.moves, externalArrows]);

  // Core move logic shared by drag and click
  const tryMove = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      if (puzzleStatus !== "playing" || isAnimating) {
        return false;
      }

      // Check if it's the player's turn (odd indices: 1, 3, 5, ...)
      // Player moves are at odd indices, opponent moves are at even indices
      const isPlayerTurn = currentMoveIndex % 2 === 1;
      if (!isPlayerTurn) {
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
        setMoveHighlightSquares({});
        setSelectedSquare(null);

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
        setMoveHighlightSquares({
          [sourceSquare]: { backgroundColor: "rgba(204, 36, 29, 0.5)" },
          [targetSquare]: { backgroundColor: "rgba(204, 36, 29, 0.5)" },
        });
        setSelectedSquare(null);

        setTimeout(() => {
          setMoveHighlightSquares({});
        }, 500);

        return false;
      }
    },
    [game, puzzleStatus, currentMoveIndex, isAnimating, storeMakeMove, applyOpponentMove]
  );

  // Handle piece drop (drag and drop)
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
      if (moveMethod === "drag" || puzzleStatus !== "playing" || isAnimating || !square) {
        return;
      }

      // Check if it's the player's turn
      const isPlayerTurn = currentMoveIndex % 2 === 1;
      if (!isPlayerTurn) {
        return;
      }

      // Get the piece on this square
      const piece = game.get(square as Parameters<typeof game.get>[0]);
      if (!piece) {
        return;
      }

      // Only allow selecting pieces of the current player's color
      const playerColor = boardOrientation === "white" ? "w" : "b";
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
    [moveMethod, game, puzzleStatus, currentMoveIndex, isAnimating, boardOrientation, selectedSquare, tryMove]
  );

  // Handle square click (click to move - second click)
  const onSquareClick = useCallback(
    ({ square }: { piece: { pieceType: string } | null; square: string }) => {
      if (moveMethod === "drag" || puzzleStatus !== "playing" || isAnimating) {
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
    [moveMethod, puzzleStatus, isAnimating, selectedSquare, tryMove]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
    };
  }, []);

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
  }, [game, selectedSquare, moveMethod]);

  // Combine square styles
  const squareStyles = useMemo(() => {
    const styles = { ...lastMoveSquares, ...legalMoveSquares, ...moveHighlightSquares };

    // Add selected square highlight (on top of everything)
    if (selectedSquare && moveMethod !== "drag") {
      styles[selectedSquare] = { backgroundColor: "rgba(20, 85, 30, 0.5)" };
    }

    return styles;
  }, [lastMoveSquares, legalMoveSquares, moveHighlightSquares, selectedSquare, moveMethod]);

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
            onPieceClick: (args) => onPieceClick(args),
            onSquareClick: (args) => onSquareClick(args),
            allowDragging: moveMethod !== "click",
            dragActivationDistance: 5, // Allow taps to register as clicks on mobile
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
        {puzzleStatus === "success" && (
          <div className="absolute inset-0 bg-gradient-to-t from-success/20 to-transparent pointer-events-none animate-in fade-in-0 duration-500" />
        )}
        {puzzleStatus === "failed" && (
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        )}
      </div>

      {/* Status */}
      <div className="flex items-center relative">
        <div className="flex items-center justify-center gap-3 flex-1">
          <Badge
            variant="outline"
            className={`px-4 py-1.5 text-sm transition-all ${puzzleStatus === "success"
                ? "border-success text-success animate-in zoom-in-95 duration-300"
                : puzzleStatus === "failed"
                  ? "border-destructive text-destructive"
                  : ""
              }`}
          >
            {statusText}
          </Badge>
          {puzzleStatus === "playing" && onHintRequest && (
            <Button
              variant="outline"
              size="sm"
              onClick={onHintRequest}
              className="gap-1.5"
            >
              <Lightbulb className="h-4 w-4" />
              Hint
            </Button>
          )}
        </div>
        <BoardSettingsPopover className="h-8 w-8 absolute right-0" />
      </div>
    </div>
  );
}

