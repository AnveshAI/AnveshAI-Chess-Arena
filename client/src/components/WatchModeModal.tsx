import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';

interface WatchModeModalProps {
  onClose: () => void;
}

export default function WatchModeModal({ onClose }: WatchModeModalProps) {
  const { toast } = useToast();

  const { data: games, isLoading, error } = useQuery({
    queryKey: ['/api/admin/games'],
    retry: false,
  });

  if (error && isUnauthorizedError(error as Error)) {
    toast({
      title: "Unauthorized",
      description: "Admin access required for watch mode",
      variant: "destructive",
    });
    onClose();
    return null;
  }

  const handleSpectateGame = (gameId: string) => {
    window.open(`/game/${gameId}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="watch-mode-modal">
      <div className="bg-card border border-border rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold">Watch Mode - Live Games</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            data-testid="button-close-watch-mode"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-lg">Loading live games...</div>
            </div>
          ) : !games || !Array.isArray(games) || games.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-lg text-muted-foreground">No active games to watch</div>
              <p className="text-sm text-muted-foreground mt-2">
                Players will appear here when they start new games
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.isArray(games) && games.map((game: any, index: number) => (
                <Card key={game.id} className="bg-muted">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold">Game #{index + 1}</h3>
                      <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                        Live
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Player vs AnveshAI</span>
                        <span className="font-mono">
                          {Math.floor(game.whiteTimeLeft / 60)}:{(game.whiteTimeLeft % 60).toString().padStart(2, '0')} - {Math.floor(game.blackTimeLeft / 60)}:{(game.blackTimeLeft % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      
                      {/* Mini Board Placeholder */}
                      <div className="bg-card border border-border rounded p-2">
                        <div className="grid grid-cols-8 gap-0">
                          {Array.from({ length: 64 }, (_, i) => (
                            <div 
                              key={i} 
                              className={`w-4 h-4 ${(Math.floor(i / 8) + i) % 2 === 0 ? 'bg-amber-800' : 'bg-amber-200'}`}
                            ></div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Status: {game.status}</span>
                        <span>ELO: {game.aiDifficulty}</span>
                      </div>
                      
                      <Button 
                        className="w-full"
                        onClick={() => handleSpectateGame(game.id)}
                        data-testid={`button-spectate-${game.id}`}
                      >
                        Spectate Game
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
