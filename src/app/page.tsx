import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 pattern-bg" />
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-background/50 to-background" />
        
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-8">
            <div className="p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 glow-accent">
              <Logo size={80} />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6">
            Master Chess with
            <span className="text-primary block mt-2">AI-Powered Coaching</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Play against an adaptive AI opponent while receiving real-time coaching powered by 
            Stockfish analysis and intelligent explanations that help you understand every move.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/play"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 glow-accent"
            >
              Start Playing
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/puzzles"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl bg-card text-foreground border border-border hover:bg-accent transition-all"
            >
              Solve Puzzles
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 bg-card/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Improve
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From real-time coaching to puzzle training, we have all the tools to take your game to the next level.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Real-Time AI Coaching</h3>
              <p className="text-muted-foreground">
                Get instant feedback on every move with explanations that help you understand the strategic and tactical implications.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Stockfish Analysis</h3>
              <p className="text-muted-foreground">
                Powered by Stockfish, one of the strongest chess engines in the world, providing accurate position evaluation and best moves.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Adaptive AI Opponent</h3>
              <p className="text-muted-foreground">
                Play against an AI that adjusts to your skill level, providing the perfect challenge to help you improve.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Tactical Puzzles</h3>
              <p className="text-muted-foreground">
                Sharpen your tactics with thousands of puzzles curated from real games, sorted by difficulty and theme.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Opening Explorer</h3>
              <p className="text-muted-foreground">
                Learn popular openings with interactive lessons and understand the ideas behind each move.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Move Quality Feedback</h3>
              <p className="text-muted-foreground">
                See exactly how good your moves are with detailed quality ratings from brilliant to blunder.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Ready to Elevate Your Game?
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            Join now and start improving your chess with personalized AI coaching. No credit card required.
          </p>
          <Link
            href="/play"
            className="inline-flex items-center justify-center px-10 py-5 text-xl font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 glow-accent"
          >
            Play Your First Game
            <svg className="ml-3 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
