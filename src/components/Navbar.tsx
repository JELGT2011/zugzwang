"use client";

export function Navbar() {
  return (
    <header className="bg-card/50 backdrop-blur-sm sticky top-0 z-10 border-b border-border/50">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
        <span className="text-3xl">♚</span>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Zugzwang</h1>
          <p className="text-xs font-medium text-text-muted">Master of Chess</p>
        </div>
      </div>
    </header>
  );
}
