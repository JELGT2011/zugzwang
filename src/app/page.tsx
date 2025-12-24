"use client";

import dynamic from "next/dynamic";

const ChessGame = dynamic(() => import("@/components/ChessGame"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-text-muted">Loading...</div>
    </div>
  ),
});

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-surface/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-3xl">♚</span>
          <div>
            <h1 className="text-xl font-bold text-foreground">Zugzwang</h1>
            <p className="text-xs text-text-muted">Chess</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="py-8">
        <ChessGame />
      </main>
    </div>
  );
}
