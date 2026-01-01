"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef } from "react";

export interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

interface TranscriptViewProps {
  transcriptHistory: TranscriptMessage[];
  transcript: string;
  emptyMessage?: string;
  className?: string;
}

export function TranscriptView({
  transcriptHistory,
  transcript,
  emptyMessage = "No messages yet",
  className,
}: TranscriptViewProps) {
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollBottomRef.current) {
      // Use setTimeout to ensure DOM has fully updated
      setTimeout(() => {
        scrollBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 0);
    }
  }, [transcriptHistory, transcript]);

  const hasMessages = transcriptHistory.length > 0 || transcript;

  return (
    <ScrollArea className={className}>
      <div className="space-y-2">
        {!hasMessages ? (
          <p className="text-sm text-muted-foreground italic">{emptyMessage}</p>
        ) : (
          <>
            {transcriptHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`text-sm ${msg.role === "user" ? "text-muted-foreground" : "text-foreground"}`}
              >
                <span
                  className={`mr-1 font-medium ${msg.role === "user" ? "text-foreground" : "text-primary"}`}
                >
                  {msg.role === "user" ? "You:" : "Zuggy:"}
                </span>
                {msg.content}
              </div>
            ))}
            {transcript && (
              <div className="text-sm text-foreground">
                <span className="text-primary mr-1 font-medium">Zuggy:</span>
                {transcript}
              </div>
            )}
          </>
        )}
        {/* Invisible element to scroll to */}
        <div ref={scrollBottomRef} />
      </div>
    </ScrollArea>
  );
}
