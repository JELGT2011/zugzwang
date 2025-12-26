export default function OpeningsPage() {
  return (
    <main className="py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold" style={{
              backgroundImage: 'linear-gradient(to right, #98971a, #458588)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent'
            }}>
              Opening Explorer
            </h1>
            <div className="inline-block px-4 py-2 rounded-lg text-sm font-medium bg-muted/50 text-muted-foreground border border-border">
              Coming Soon
            </div>
          </div>
          <p className="text-muted-foreground text-lg max-w-md text-center">
            Learn and practice chess openings with interactive lessons, repertoire building, and AI-guided recommendations.
          </p>
        </div>
      </div>
    </main>
  );
}

