"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, Square } from "chess.js";
import {
  OptionSquares,
  RightClickedSquares,
} from "./util";
import { useBoardStore } from "../../stores/BoardStore";
import { useSearchParams } from "next/navigation";
import { getStockfishEngine } from "../lib/stockfish";

const ChessboardBot: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const theme = useBoardStore((state) => state.theme);
  const setMoves = useBoardStore((state) => state.setMoves);
  const setOnNewGame = useBoardStore((state) => state.setOnNewGame);
  const setGameOver = useBoardStore((state) => state.setGameOver);
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [rightClickedSquares, setRightClickedSquares] =
    useState<RightClickedSquares>({});
  const [optionSquares, setOptionSquares] = useState<OptionSquares>({});
  const searchParams = useSearchParams();
  const stockfishLevel = Number(searchParams.get("stockfishLevel"));
  const playAs = searchParams.get("playAs");
  const [gameResult, setGameResult] = useBoardStore((state) => [
    state.gameResult,
    state.setGameResult,
  ]);
  const [showGameModal, setShowGameModal] = useState(false);

  useEffect(() => {
    if (playAs === "black") {
      makeStockfishMove();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playAs]);

  useEffect(() => {
    if (game.isCheckmate() || game.isDraw() || game.isStalemate()) {
      if (game.isCheckmate()) {
        if (playAs === "black") {
          setGameResult(game.turn() === "w" ? "User wins!" : "StockFish wins!");
        } else {
          setGameResult(game.turn() === "w" ? "StockFish wins!" : "User wins!");
        }
      } else {
        setGameResult("It's a draw!");
      }
      setShowGameModal(true);
      setGameOver(true);
    } else {
      setGameResult("You Resigned!");
    }

    setMoves(game.history());
  }, [game, playAs, setMoves, setGameResult, setGameOver]);

  function getMoveOptions(square: Square) {
    const moves = game.moves({
      square,
      verbose: true,
    });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: OptionSquares = {};
    moves.forEach((move) => {
      newSquares[move.to] = {
        background:
          game.get(move.to) &&
          game.get(move.to)!.color !== game.get(square)!.color
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    });
    newSquares[square] = {
      background: "rgba(255, 255, 0, 0.4)",
      borderRadius: "",
    };
    setOptionSquares(newSquares);
    return true;
  }

  const makeStockfishMove = useCallback(async () => {
    const engine = getStockfishEngine();
    try {
      const analysis = await engine.analyze(game.fen(), { 
        depth: stockfishLevel || 10,
        skillLevel: stockfishLevel || 10
      });
      
      const bestMove = analysis.bestMove;
      if (bestMove) {
        const gameCopy = new Chess(game.fen());
        const move = gameCopy.move({
          from: bestMove.substring(0, 2),
          to: bestMove.substring(2, 4),
          promotion: (bestMove.substring(4, 5) as any) || "q",
        });

        if (move) {
          setGame(gameCopy);
        }
      }
    } catch (error) {
      console.error("Stockfish move error:", error);
    }
  }, [game, stockfishLevel]);

  function onSquareClick({ square }: { square: any }) {
    const s = square as Square;
    setRightClickedSquares({});

    if (!moveFrom) {
      const hasMoveOptions = getMoveOptions(s);
      if (hasMoveOptions) setMoveFrom(s);
      return;
    }

    if (moveFrom) {
      const s = square as Square;
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: moveFrom,
        to: s,
        promotion: "q",
      });

      if (move === null) {
        const hasMoveOptions = getMoveOptions(s);
        if (hasMoveOptions) setMoveFrom(s);
        return;
      }

      setGame(gameCopy);
      setTimeout(makeStockfishMove, 500);
      setMoveFrom(null);
      setOptionSquares({});
      return;
    }
  }

  function onSquareRightClick({ square }: { square: any }) {
    const s = square as Square;
    const colour = "rgba(255, 0, 0, 0.5)";
    setRightClickedSquares({
      ...rightClickedSquares,
      [s]:
        rightClickedSquares[s] &&
        rightClickedSquares[s]!.backgroundColor === colour
          ? undefined
          : { backgroundColor: colour },
    });
  }

  const onNewGame = useCallback(() => {
    const newGame = new Chess();
    setGame(newGame);
    useBoardStore.setState({ moves: [] });
    if (playAs === "black") {
      setTimeout(makeStockfishMove, 300);
    }
  }, [playAs, makeStockfishMove]);

  useEffect(() => {
    setOnNewGame(onNewGame);

    return () => {
      setOnNewGame(() => {});
    };
  }, [onNewGame, setOnNewGame]);

  useEffect(() => {
    useBoardStore.setState({ currentFEN: game.fen() });
  }, [game]);

  return (
    <>
      <Chessboard
        options={{
          position: game.fen(),
          boardOrientation: playAs === "black" ? "black" : "white",
          onSquareClick: onSquareClick,
          onSquareRightClick: onSquareRightClick,
          boardStyle: {
            borderRadius: "4px",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
          },
          squareStyles: {
            ...optionSquares,
            ...rightClickedSquares,
          },
          darkSquareStyle: theme.darkSquareStyle,
          lightSquareStyle: theme.lightSquareStyle,
        }}
      />
      {/* <GameModal
        isOpen={showGameModal}
        onClose={() => setShowGameModal(false)}
        gameResult={gameResult}
        onNewGame={onNewGame}
      /> */}
    </>
  );
};

export default ChessboardBot;

