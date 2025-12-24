"use client";

import { useEffect, useRef } from "react";

interface CoachingPanelProps {
  messages: any[];
  isThinking: boolean;
  playerColor: "white" | "black";
}

export default function CoachingPanel({
  messages,
  isThinking,
  playerColor,
}: CoachingPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // Filter to only assistant messages
  const coachMessages = messages.filter((m) => m.role === "assistant");

  return (
    <div className="flex flex-col h-[400px] bg-surface rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-surface-elevated border-b border-border">
        <div className="w-8 h-8 rounded-full bg-accent-bright/20 flex items-center justify-center">
          <span className="text-accent-bright text-lg">♔</span>
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Coach</h3>
          <p className="text-xs text-text-muted">
            You're playing as {playerColor}
          </p>
        </div>
        {isThinking && (
          <div className="ml-auto flex items-center gap-2 text-sm text-text-muted">
            <span className="thinking-dots">
              <span>•</span>
              <span>•</span>
              <span>•</span>
            </span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {coachMessages.length === 0 && !isThinking && (
          <div className="text-center text-text-muted py-8">
            <p className="text-lg mb-2">Welcome to Zugzwang! ♟</p>
            <p className="text-sm">
              Make your first move or start a new game. I'll analyze each position
              and give you coaching tips as you play.
            </p>
          </div>
        )}

        {coachMessages.map((message, index) => (
          <CoachMessage key={message.id || index} content={message.content} />
        ))}

        {isThinking && (
          <div className="coaching-message flex gap-3">
            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
              <span className="text-accent text-sm">♔</span>
            </div>
            <div className="flex-1 bg-surface-elevated rounded-lg px-4 py-3">
              <div className="thinking-dots text-text-muted">
                <span>•</span>
                <span>•</span>
                <span>•</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CoachMessage({ content }: { content: string }) {
  // Parse content for move quality indicators
  const formattedContent = formatCoachingMessage(content);

  return (
    <div className="coaching-message flex gap-3">
      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-1">
        <span className="text-accent text-sm">♔</span>
      </div>
      <div className="flex-1 bg-surface-elevated rounded-lg px-4 py-3">
        <p
          className="text-sm text-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formattedContent }}
        />
      </div>
    </div>
  );
}

function formatCoachingMessage(content: string): string {
  // Highlight move quality keywords
  const qualityPatterns = [
    { pattern: /\b(brilliant|excellent)\b/gi, class: "move-brilliant" },
    { pattern: /\b(great|strong)\b/gi, class: "move-great" },
    { pattern: /\b(good|solid)\b/gi, class: "move-good" },
    { pattern: /\b(inaccuracy|inaccurate)\b/gi, class: "move-inaccuracy" },
    { pattern: /\b(mistake)\b/gi, class: "move-mistake" },
    { pattern: /\b(blunder|blundered)\b/gi, class: "move-blunder" },
  ];

  let formatted = content;

  // Highlight chess moves (e.g., Nf3, e4, Qxd7+)
  formatted = formatted.replace(
    /\b([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|O-O-O|O-O)\b/g,
    '<code class="text-accent-bright font-mono">$1</code>'
  );

  // Apply quality highlights
  for (const { pattern, class: className } of qualityPatterns) {
    formatted = formatted.replace(
      pattern,
      `<span class="${className} font-medium">$1</span>`
    );
  }

  return formatted;
}

