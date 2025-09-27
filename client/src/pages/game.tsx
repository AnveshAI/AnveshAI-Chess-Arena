import { useParams } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { isUnauthorizedError } from '@/lib/authUtils';
import ChessBoard from '@/components/ChessBoard';
import GameControls from '@/components/GameControls';
import GameInfo from '@/components/GameInfo';
import AnalysisModal from '@/components/AnalysisModal';
import { useChessGame } from '@/hooks/useChessGame';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function Game() {
  const { id: gameId } = useParams<{ id: string }>();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [showAnalysis, setShowAnalysis] = useState(false);
  const { 
    game, 
    moves, 
    isLoading: isGameLoading,
    handleSquareClick,
    getBoardState,
    isSquareSelected,
    isSquarePossibleMove,
    isSquareLight,
    makeMove,
    isMakingMove
  } = useChessGame(gameId);
  
  const { joinGame, subscribe } = useWebSocket();

  // Join game via WebSocket - handle both authenticated and guest users
  useEffect(() => {
    if (gameId) {
      if (isAuthenticated && user?.id) {
        joinGame(gameId, user.id, user.isAdmin || false);
      } else if (!isLoading && !isAuthenticated) {
        // Guest user - create a temporary ID for WebSocket connection
        const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        joinGame(gameId, guestId, false);
      }
    }
  }, [gameId, user, joinGame, isAuthenticated, isLoading]);

  // Subscribe to game updates
  useEffect(() => {
    if (!gameId) return;

    const unsubscribe = subscribe('game_state', (gameState: any) => {
      // Handle real-time game state updates
      console.log('Game state updated:', gameState);
    });

    return unsubscribe;
  }, [gameId, subscribe]);

  if (isLoading || isGameLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold mb-2">Loading Game...</div>
          <div className="text-muted-foreground">Preparing the board</div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold mb-2">Game Not Found</div>
          <div className="text-muted-foreground">The requested game could not be found</div>
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
                <span className="text-sm text-muted-foreground">Live Game</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowAnalysis(true)}
                className="bg-muted hover:bg-accent px-3 py-2 rounded-md text-sm flex items-center space-x-2"
                data-testid="button-analysis"
              >
                <span>📊</span>
                <span className="hidden md:inline">Analysis</span>
              </button>
              
              <button 
                onClick={() => window.location.href = '/'}
                className="bg-primary hover:bg-primary/90 px-4 py-2 rounded-md text-sm text-primary-foreground"
                data-testid="button-home"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Interface */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* Left Sidebar - Game Controls */}
          <div className="xl:col-span-3">
            <GameControls game={game} />
          </div>

          {/* Center - Chess Board */}
          <div className="xl:col-span-6 flex justify-center">
            <ChessBoard 
              boardState={getBoardState()}
              onSquareClick={handleSquareClick}
              isSquareSelected={isSquareSelected}
              isSquarePossibleMove={isSquarePossibleMove}
              isSquareLight={isSquareLight}
              playerColor={game.playerColor}
            />
          </div>

          {/* Right Sidebar - Game Info */}
          <div className="xl:col-span-3">
            <GameInfo game={game} moves={moves || []} />
          </div>
        </div>
      </main>

      {/* Analysis Modal */}
      {showAnalysis && (
        <AnalysisModal 
          gameId={gameId!}
          onClose={() => setShowAnalysis(false)} 
        />
      )}
    </div>
  );
}
