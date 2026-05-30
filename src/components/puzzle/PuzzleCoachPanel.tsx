"use client";

import { TranscriptView } from "@/components/TranscriptView";
import { Button } from "@/components/ui/button";
import type { TranscriptMessage } from "@/stores/coachStore";
import {
    Lightbulb,
    Loader2,
    Mic,
    Volume2,
    VolumeX,
} from "lucide-react";

interface PuzzleCoachPanelProps {
    transcriptHistory: TranscriptMessage[];
    isOutputMuted: boolean;
    onToggleMute: () => void;
    onHintRequest: () => void;
    hintsUsed: number;
    hintLoading: boolean;
    hintDisabled?: boolean;
    isRecording: boolean;
    isMicProcessing: boolean;
    micDisabled: boolean;
    onMicPointerDown: () => void;
    onMicPointerUp: () => void;
    onMicPointerCancel: () => void;
    micError: string | null;
}

export function PuzzleCoachPanel({
    transcriptHistory,
    isOutputMuted,
    onToggleMute,
    onHintRequest,
    hintsUsed,
    hintLoading,
    hintDisabled,
    isRecording,
    isMicProcessing,
    micDisabled,
    onMicPointerDown,
    onMicPointerUp,
    onMicPointerCancel,
    micError,
}: PuzzleCoachPanelProps) {
    const hintIsDisabled = hintDisabled ?? hintLoading;
    const statusText = isRecording
        ? "Listening… release to send"
        : isMicProcessing
            ? "Thinking…"
            : null;

    return (
        <div className="relative p-3 pb-14 bg-primary/10 rounded-lg border border-primary/20 min-h-[100px]">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-primary">Coach</span>
                {statusText && (
                    <span className="text-xs text-muted-foreground italic">
                        {statusText}
                    </span>
                )}
            </div>
            <TranscriptView
                transcriptHistory={transcriptHistory}
                transcript=""
                emptyMessage="Hold the mic to ask a question, or tap the lightbulb for a hint"
                className="max-h-32"
            />

            {micError && (
                <p className="mt-2 text-xs text-destructive">{micError}</p>
            )}

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
                    className={`h-8 w-8 rounded-full shadow-md select-none touch-none ${
                        isRecording
                            ? "bg-destructive text-destructive-foreground animate-pulse border-destructive"
                            : "bg-background"
                    }`}
                    onPointerDown={(e) => {
                        if (micDisabled) return;
                        e.preventDefault();
                        (e.currentTarget as HTMLElement).setPointerCapture(
                            e.pointerId
                        );
                        onMicPointerDown();
                    }}
                    onPointerUp={(e) => {
                        e.preventDefault();
                        onMicPointerUp();
                    }}
                    onPointerCancel={() => {
                        onMicPointerCancel();
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    disabled={micDisabled}
                    title="Hold to ask a question"
                    aria-label="Hold to ask a question"
                >
                    {isMicProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Mic className="w-3.5 h-3.5" />
                    )}
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full shadow-md bg-background"
                    onClick={onHintRequest}
                    disabled={hintIsDisabled}
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
