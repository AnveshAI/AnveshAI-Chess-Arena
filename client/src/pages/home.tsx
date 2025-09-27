import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChessGame } from '@/hooks/useChessGame';
import { useState } from 'react';
import { useLocation } from 'wouter';
import WatchModeModal from '@/components/WatchModeModal';

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [playerColor, setPlayerColor] = useState<string>('white');
  const [aiDifficulty, setAiDifficulty] = useState<number>(1600);
  const [showWatchMode, setShowWatchMode] = useState(false);
  const { createGame, isCreatingGame } = useChessGame();
  
  const isGuestMode = location.startsWith('/guest-play');

  // Only redirect to login if we're not in guest mode and not authenticated
  useEffect(() => {
    if (!isLoading && !user && !isGuestMode && location === '/') {
      toast({
        title: "Unauthorized", 
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, isLoading, toast, isGuestMode, location]);

  const handleCreateGame = () => {
    createGame({ playerColor, aiDifficulty });
  };

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  if (isLoading && !isGuestMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold mb-2">Loading...</div>
          <div className="text-muted-foreground">Preparing your chess arena</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                AnveshAI Chess Arena
              </h1>
              <div className="hidden md:flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Online</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  {user?.isAdmin && (
                    <Button 
                      variant="outline"
                      onClick={() => setShowWatchMode(true)}
                      data-testid="button-watch-mode"
                      className="flex items-center space-x-2"
                    >
                      <span>👁️</span>
                      <span className="hidden md:inline">Watch Mode</span>
                    </Button>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    {user?.profileImageUrl && (
                      <img 
                        src={user.profileImageUrl} 
                        alt="Profile" 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    <span className="text-sm">{user?.firstName || user?.email}</span>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleLogout}
                    data-testid="button-logout"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <span className="text-xs">👤</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Guest Player</span>
                  </div>
                  
                  <Button 
                    variant="default"
                    onClick={() => window.location.href = '/api/login'}
                    data-testid="button-login"
                  >
                    Login
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold">
              {isAuthenticated 
                ? `Welcome back, ${user?.firstName || 'Chess Master'}!`
                : 'Welcome, Guest Player!'}
            </h2>
            <p className="text-xl text-muted-foreground">
              {isAuthenticated 
                ? 'Ready to challenge AnveshAI to another game?'
                : 'Ready to try your skills against AnveshAI?'}
            </p>
            {!isAuthenticated && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-2xl mx-auto">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  🚀 Playing as guest? <strong>Sign up</strong> to save your games, access detailed analysis, and track your progress!
                </p>
              </div>
            )}
          </div>

          {/* Game Setup */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Start New Game</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Color Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Play as:</label>
                <div className="flex space-x-2">
                  <Button 
                    variant={playerColor === 'white' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setPlayerColor('white')}
                    data-testid="button-color-white"
                  >
                    ♔ White
                  </Button>
                  <Button 
                    variant={playerColor === 'black' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setPlayerColor('black')}
                    data-testid="button-color-black"
                  >
                    ♚ Black
                  </Button>
                </div>
              </div>

              {/* AI Difficulty */}
              <div className="space-y-3">
                <label className="text-sm font-medium">AnveshAI Difficulty:</label>
                <Select value={aiDifficulty.toString()} onValueChange={(value) => setAiDifficulty(parseInt(value))}>
                  <SelectTrigger data-testid="select-difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="800">Beginner (800)</SelectItem>
                    <SelectItem value="1200">Intermediate (1200)</SelectItem>
                    <SelectItem value="1600">Advanced (1600)</SelectItem>
                    <SelectItem value="2000">Expert (2000)</SelectItem>
                    <SelectItem value="2400">Master (2400)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Game Button */}
              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-lg"
                onClick={handleCreateGame}
                disabled={isCreatingGame}
                data-testid="button-start-game"
              >
                {isCreatingGame ? 'Creating Game...' : 'Start Game vs AnveshAI'}
              </Button>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="font-semibold mb-2">Perfect Your Strategy</h3>
                <p className="text-sm text-muted-foreground">
                  Challenge yourself against different difficulty levels and improve your tactical skills
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="font-semibold mb-2">Deep Game Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Get detailed post-game analysis with move classifications and improvement suggestions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="font-semibold mb-2">Real-time Evaluation</h3>
                <p className="text-sm text-muted-foreground">
                  See position evaluation and best moves as you play to learn from every game
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Watch Mode Modal */}
      {showWatchMode && (
        <WatchModeModal onClose={() => setShowWatchMode(false)} />
      )}
    </div>
  );
}
