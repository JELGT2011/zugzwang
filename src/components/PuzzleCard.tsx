"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
    DIFFICULTY_RANGES,
    getDifficultyFromRating,
    THEME_DISPLAY_NAMES,
    type Puzzle,
    type PuzzleTheme,
} from "@/types/puzzle";
import { Chess } from "chess.js";
import Link from "next/link";
import { useMemo } from "react";
import { Chessboard } from "react-chessboard";

interface PuzzleCardProps {
    puzzle: Puzzle;
}

export default function PuzzleCard({ puzzle }: PuzzleCardProps) {
    const difficulty = getDifficultyFromRating(puzzle.rating);
    const difficultyInfo = DIFFICULTY_RANGES[difficulty];

    // Calculate the position after the first move (the setup move)
    const displayFen = useMemo(() => {
        try {
            const game = new Chess(puzzle.fen);
            // Apply the first move (opponent's last move) to show the puzzle starting position
            if (puzzle.moves.length > 0) {
                const firstMove = puzzle.moves[0];
                game.move({
                    from: firstMove.slice(0, 2),
                    to: firstMove.slice(2, 4),
                    promotion: firstMove.length > 4 ? firstMove[4] : undefined,
                });
            }
            return game.fen();
        } catch {
            return puzzle.fen;
        }
    }, [puzzle.fen, puzzle.moves]);

    // Determine board orientation based on whose turn it is
    const boardOrientation = useMemo(() => {
        try {
            const game = new Chess(displayFen);
            return game.turn() === "w" ? "white" : "black";
        } catch {
            return "white";
        }
    }, [displayFen]);

    // Get primary themes (limit to 3 for display)
    const displayThemes = puzzle.themes.slice(0, 3);

    return (
        <Link href={`/puzzles/${puzzle.id}`}>
            <Card className="group relative overflow-hidden bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-pointer">
                {/* Mini chessboard preview */}
                <div className="aspect-square w-full relative overflow-hidden">
                    <div className="absolute inset-0 opacity-90 group-hover:opacity-100 transition-opacity">
                        <Chessboard
                            options={{
                                position: displayFen,
                                boardOrientation: boardOrientation,
                                onPieceDrop: () => false,
                                animationDurationInMs: 0,
                                darkSquareStyle: { backgroundColor: "#7c6f64" },
                                lightSquareStyle: { backgroundColor: "#d5c4a1" },
                                boardStyle: {
                                    cursor: "pointer",
                                },
                            }}
                        />
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                        <span className="text-white font-medium text-sm">Solve Puzzle →</span>
                    </div>
                </div>

                {/* Puzzle info */}
                <div className="p-3 space-y-2">
                    {/* Rating and difficulty */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span
                                className="text-lg font-bold"
                                style={{ color: difficultyInfo.color }}
                            >
                                {puzzle.rating}
                            </span>
                            <Badge
                                variant="outline"
                                className="text-xs px-1.5 py-0"
                                style={{
                                    borderColor: difficultyInfo.color,
                                    color: difficultyInfo.color,
                                }}
                            >
                                {difficultyInfo.label}
                            </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {puzzle.moves.length - 1} moves
                        </span>
                    </div>

                    {/* Themes */}
                    <div className="flex flex-wrap gap-1">
                        {displayThemes.map((theme) => (
                            <Badge
                                key={theme}
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 bg-muted/50"
                            >
                                {THEME_DISPLAY_NAMES[theme as PuzzleTheme] || theme}
                            </Badge>
                        ))}
                        {puzzle.themes.length > 3 && (
                            <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 bg-muted/50"
                            >
                                +{puzzle.themes.length - 3}
                            </Badge>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>♟ {puzzle.nbPlays.toLocaleString()} plays</span>
                        <span>👍 {puzzle.popularity}%</span>
                    </div>
                </div>
            </Card>
        </Link>
    );
}
