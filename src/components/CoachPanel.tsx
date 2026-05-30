"use client";

import { TranscriptView } from "@/components/TranscriptView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTurnBasedCoach } from "@/hooks";
import { useCoachStore } from "@/stores/coachStore";
import { Loader2 } from "lucide-react";

export default function CoachPanel() {
    const { isAnalyzing, error, lastUsage } = useTurnBasedCoach();
    const transcriptHistory = useCoachStore((s) => s.transcriptHistory);

    const usageBadge = lastUsage
        ? `in: ${lastUsage.input_tokens} • out: ${lastUsage.output_tokens} • cache rd: ${lastUsage.cache_read_input_tokens} • wr: ${lastUsage.cache_creation_input_tokens}`
        : null;

    return (
        <Card className="flex flex-col flex-1 h-full min-h-0 bg-card border-border overflow-hidden gap-0 py-0">
            <CardHeader className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between space-y-0 grid-cols-none shrink-0">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    AI Coach
                </CardTitle>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {isAnalyzing && (
                        <span className="flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Analyzing
                        </span>
                    )}
                </div>
            </CardHeader>

            <div className="relative flex-1 min-h-0">
                <CardContent className="h-full p-4 font-sans text-sm leading-relaxed">
                    {transcriptHistory.length === 0 && !isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <p className="text-muted-foreground italic text-center text-sm">
                                Make a move to start the coach.
                            </p>
                        </div>
                    ) : (
                        <TranscriptView
                            transcriptHistory={transcriptHistory}
                            transcript=""
                            emptyMessage="Make a move to start the coach."
                            className="h-full"
                        />
                    )}
                </CardContent>

                {error && (
                    <div className="absolute bottom-2 left-2 right-2 text-[10px] text-destructive bg-destructive/10 rounded px-2 py-1">
                        {error}
                    </div>
                )}
                {usageBadge && !error && (
                    <div className="absolute bottom-1 right-2 text-[9px] text-muted-foreground/60 font-mono">
                        {usageBadge}
                    </div>
                )}
            </div>
        </Card>
    );
}
