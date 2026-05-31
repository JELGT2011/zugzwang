"use client";

import { TranscriptView } from "@/components/TranscriptView";
import { Button } from "@/components/ui/button";
import type { TranscriptMessage } from "@/stores/coachStore";
import {
    Lightbulb,
    Loader2,
    Mic,
    Send,
    Volume2,
    VolumeX,
    X,
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
    onMicClick: () => void;
    onMicCancel: () => void;
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
    onMicClick,
    onMicCancel,
    micError,
}: PuzzleCoachPanelProps) {
    const hintIsDisabled = hintDisabled ?? hintLoading;
    const statusText = isRecording
        ? "Recording… tap to send"
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
                emptyMessage="Tap the mic to ask a question, or tap the lightbulb for a hint"
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
                {isRecording && (
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full shadow-md bg-background"
                        onClick={onMicCancel}
                        title="Cancel recording"
                        aria-label="Cancel recording"
                    >
                        <X className="w-3.5 h-3.5" />
                    </Button>
                )}
                <Button
                    variant="outline"
                    size="icon"
                    className={`h-8 w-8 rounded-full shadow-md ${
                        isRecording
                            ? "bg-destructive text-destructive-foreground animate-pulse border-destructive hover:bg-destructive/90"
                            : "bg-background"
                    }`}
                    onClick={onMicClick}
                    disabled={micDisabled}
                    title={
                        isRecording
                            ? "Tap to send"
                            : isMicProcessing
                                ? "Thinking…"
                                : "Tap to ask a question"
                    }
                    aria-label={
                        isRecording
                            ? "Stop recording and send"
                            : "Start recording a question"
                    }
                >
                    {isMicProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isRecording ? (
                        <Send className="w-3.5 h-3.5" />
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
