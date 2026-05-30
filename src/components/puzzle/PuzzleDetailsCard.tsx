"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DIFFICULTY_RANGES,
  THEME_DISPLAY_NAMES,
  getDifficultyFromRating,
  type Puzzle,
  type PuzzleTheme,
} from "@/types/puzzle";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface PuzzleDetailsCardProps {
  puzzle: Puzzle;
}

export function PuzzleDetailsCard({ puzzle }: PuzzleDetailsCardProps) {
  const difficulty = getDifficultyFromRating(puzzle.rating);
  const difficultyInfo = DIFFICULTY_RANGES[difficulty];

  return (
    <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
      <h3 className="font-semibold mb-3">Puzzle Details</h3>

      <div className="flex items-center gap-2 mb-4">
        <Badge
          variant="outline"
          style={{ borderColor: difficultyInfo.color, color: difficultyInfo.color }}
        >
          Rating: {puzzle.rating}
        </Badge>
        <Badge
          style={{
            backgroundColor: `${difficultyInfo.color}20`,
            color: difficultyInfo.color,
          }}
        >
          {difficultyInfo.label}
        </Badge>
      </div>

      <div className="space-y-3 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">ID</span>
          <span className="font-mono">{puzzle.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Played</span>
          <span>{puzzle.nbPlays.toLocaleString()} times</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Popularity</span>
          <span>{puzzle.popularity}%</span>
        </div>

        {puzzle.gameUrl && (
          <a
            href={puzzle.gameUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            View Original Game
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <div className="pt-3 border-t border-border/50">
        <h4 className="text-sm font-medium text-muted-foreground mb-2">Themes</h4>
        <div className="flex flex-wrap gap-1.5">
          {puzzle.themes.map((theme) => (
            <Link key={theme} href={`/puzzles?theme=${theme}`} className="inline-block">
              <Badge
                variant="secondary"
                className="text-xs hover:bg-primary/20 transition-colors cursor-pointer"
              >
                {THEME_DISPLAY_NAMES[theme as PuzzleTheme] || theme}
              </Badge>
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}
