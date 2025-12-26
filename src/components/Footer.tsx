import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card/50 backdrop-blur-sm border-t border-border/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">♚</span>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Zugzwang</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Master chess with AI-powered coaching and real-time analysis.
            </p>
          </div>

          {/* Features Section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">Features</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/"
                  className="hover:text-primary transition-colors"
                >
                  Play Chess
                </Link>
              </li>
              <li>
                <Link
                  href="/puzzles"
                  className="hover:text-primary transition-colors"
                >
                  Solve Puzzles
                </Link>
              </li>
              <li>
                <Link
                  href="/openings"
                  className="hover:text-primary transition-colors"
                >
                  Learn Openings
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">Resources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://www.chess.com/learn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Learn Chess
                </a>
              </li>
              <li>
                <a
                  href="https://stockfishchess.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Stockfish Engine
                </a>
              </li>
              <li>
                <a
                  href="https://lichess.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Lichess
                </a>
              </li>
            </ul>
          </div>

          {/* About Section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">About</h3>
            <p className="text-sm text-muted-foreground">
              Powered by Stockfish analysis and advanced AI coaching to help you improve your chess game.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Zugzwang. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

