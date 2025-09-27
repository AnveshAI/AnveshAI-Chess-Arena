import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AnveshAI Chess Arena
            </h1>
            <div className="flex space-x-3">
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/guest-play'}
                data-testid="button-play-guest"
              >
                Play as Guest
              </Button>
              <Button 
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-login"
              >
                Login to Play
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-bold">
              Master Chess with{" "}
              <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                AnveshAI
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Challenge our advanced Stockfish-powered AI opponent, analyze your games with deep insights, 
              and improve your chess skills with professional-grade analysis tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">AI Opponent</h3>
                <p className="text-muted-foreground">
                  Play against AnveshAI powered by Stockfish engine with adjustable difficulty levels
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Deep Analysis</h3>
                <p className="text-muted-foreground">
                  Get detailed post-game analysis with blunder detection and move suggestions
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <span className="text-2xl">👁️</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Live Spectating</h3>
                <p className="text-muted-foreground">
                  Admins can watch live games and provide real-time analysis during matches
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/guest-play'}
              data-testid="button-get-started-guest"
              variant="outline"
              className="px-8 py-3 text-lg"
            >
              Try as Guest
            </Button>
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-get-started"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg"
            >
              Get Started - Login
            </Button>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="bg-muted/20 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-8">
            <h2 className="text-3xl font-bold">Why Choose AnveshAI Chess Arena?</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-4">♟️</div>
                <h3 className="font-semibold mb-2">Professional Chess Engine</h3>
                <p className="text-sm text-muted-foreground">
                  Powered by Stockfish, the world's strongest open-source chess engine
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="font-semibold mb-2">Real-time Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Get instant feedback and suggestions during your games
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl mb-4">📈</div>
                <h3 className="font-semibold mb-2">Skill Improvement</h3>
                <p className="text-sm text-muted-foreground">
                  Learn from mistakes with detailed move-by-move analysis
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl mb-4">💾</div>
                <h3 className="font-semibold mb-2">PGN Export</h3>
                <p className="text-sm text-muted-foreground">
                  Save and share your games in standard PGN format
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
