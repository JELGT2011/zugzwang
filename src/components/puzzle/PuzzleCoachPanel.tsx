"use client";

import { TranscriptView } from "@/components/TranscriptView";
import { Button } from "@/components/ui/button";
import type { TranscriptMessage } from "@/stores/coachStore";
import { Lightbulb, Loader2, Volume2, VolumeX } from "lucide-react";

interface PuzzleCoachPanelProps {
  transcriptHistory: TranscriptMessage[];
  isOutputMuted: boolean;
  onToggleMute: () => void;
  onHintRequest: () => void;
  hintsUsed: number;
  hintLoading: boolean;
}

export function PuzzleCoachPanel({
  transcriptHistory,
  isOutputMuted,
  onToggleMute,
  onHintRequest,
  hintsUsed,
  hintLoading,
}: PuzzleCoachPanelProps) {
  return (
    <div className="relative p-3 pb-14 bg-primary/10 rounded-lg border border-primary/20 min-h-[100px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-primary">Coach</span>
      </div>
      <TranscriptView
        transcriptHistory={transcriptHistory}
        transcript=""
        emptyMessage="Tap the lightbulb for a hint"
        className="max-h-32"
      />

      <div className="absolute bottom-2 right-2 flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full shadow-md bg-background"
          onClick={onToggleMute}
          title={isOutputMuted ? "Unmute coach" : "Mute coach"}
        >
          {isOutputMuted ? (
            <VolumeX className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full shadow-md bg-background"
          onClick={onHintRequest}
          disabled={hintLoading}
          title={`Get hint${hintsUsed > 0 ? ` (${hintsUsed} used)` : ""}`}
        >
          {hintLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Lightbulb className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
