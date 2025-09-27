import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Game } from '@shared/schema';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface GameControlsProps {
  game: Game;
  onGameUpdate?: (updatedGame: Game) => void;
}

export default function GameControls({ game, onGameUpdate }: GameControlsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [aiDifficulty, setAiDifficulty] = useState(game.aiDifficulty.toString());

  const resignMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/games/${game.id}/resign`, {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Game Resigned",
        description: "You have resigned the game",
        variant: "destructive",
      });
      // Update the game state
      if (onGameUpdate && data.game) {
        onGameUpdate(data.game);
      }
      // Invalidate game-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/games', game.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resign game",
        variant: "destructive",
      });
    }
  });

  const handleResign = () => {
    if (game.status !== 'active') {
      toast({
        title: "Error",
        description: "Game is not active",
        variant: "destructive",
      });
      return;
    }
    resignMutation.mutate();
  };

  const drawOfferMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/games/${game.id}/offer-draw`, {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Draw Accepted",
        description: "Draw offer accepted by AnveshAI",
      });
      // Update the game state
      if (onGameUpdate && data.game) {
        onGameUpdate(data.game);
      }
      // Invalidate game-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/games', game.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to offer draw",
        variant: "destructive",
      });
    }
  });

  const handleOfferDraw = () => {
    if (game.status !== 'active') {
      toast({
        title: "Error",
        description: "Game is not active",
        variant: "destructive",
      });
      return;
    }
    drawOfferMutation.mutate();
  };

  const handleNewGame = () => {
    window.location.href = '/';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPlayerInfo = () => {
    if (game.playerColor === 'white') {
      return {
        player: { color: 'white', symbol: '♔', time: game.whiteTimeLeft },
        ai: { color: 'black', symbol: '♚', time: game.blackTimeLeft }
      };
    } else {
      return {
        player: { color: 'black', symbol: '♚', time: game.blackTimeLeft },
        ai: { color: 'white', symbol: '♔', time: game.whiteTimeLeft }
      };
    }
  };

  const { player, ai } = getPlayerInfo();

  return (
    <div className="space-y-6">
      {/* Game Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Game Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Color Display */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Playing as:</label>
            <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
              <span className="text-2xl">{player.symbol}</span>
              <span className="font-medium capitalize">{player.color}</span>
            </div>
          </div>

          {/* AI Difficulty Display */}
          <div className="space-y-3">
            <label className="text-sm font-medium">AnveshAI Difficulty:</label>
            <div className="p-3 bg-muted rounded-md">
              <span className="font-mono">{game.aiDifficulty} ELO</span>
            </div>
          </div>

          {/* Game Actions */}
          <div className="space-y-2">
            <Button 
              className="w-full" 
              onClick={handleNewGame}
              data-testid="button-new-game"
            >
              New Game
            </Button>
            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={handleResign}
              disabled={resignMutation.isPending || game.status !== 'active'}
              data-testid="button-resign"
            >
              {resignMutation.isPending ? 'Resigning...' : 'Resign'}
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleOfferDraw}
              disabled={drawOfferMutation.isPending || game.status !== 'active'}
              data-testid="button-offer-draw"
            >
              {drawOfferMutation.isPending ? 'Offering...' : 'Offer Draw'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Game Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Game Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Player Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-primary/20 rounded-md">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 ${player.color === 'white' ? 'bg-white text-black' : 'bg-black text-white'} rounded border border-border flex items-center justify-center font-bold`}>
                  {player.color === 'white' ? 'W' : 'B'}
                </div>
                <div>
                  <div className="font-medium">You</div>
                  <div className="text-sm text-muted-foreground">Player</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg" data-testid="text-player-time">
                  {formatTime(player.time || 0)}
                </div>
                <div className="text-sm text-muted-foreground">Time left</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-md">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 ${ai.color === 'white' ? 'bg-white text-black' : 'bg-black text-white'} rounded border border-border flex items-center justify-center font-bold`}>
                  {ai.color === 'white' ? 'W' : 'B'}
                </div>
                <div>
                  <div className="font-medium">AnveshAI</div>
                  <div className="text-sm text-muted-foreground">AI Opponent</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg" data-testid="text-ai-time">
                  {formatTime(ai.time || 0)}
                </div>
                <div className="text-sm text-secondary">
                  {game.status === 'active' ? 'Ready' : 'Thinking...'}
                </div>
              </div>
            </div>
          </div>

          {/* Current Turn Indicator */}
          <div className="text-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/20 text-primary" data-testid="text-current-turn">
              <span className="mr-2">⏰</span>
              {game.status === 'active' ? 'Your turn' : 'Game Over'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Position Evaluation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Position Evaluation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="w-full h-6 bg-muted rounded-md overflow-hidden">
              <div 
                className="evaluation-bar h-full bg-gradient-to-r from-white to-gray-300 transition-all duration-300" 
                style={{ width: '55%' }}
                data-testid="evaluation-bar"
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-muted-foreground">Black</span>
              <span className="font-mono font-medium" data-testid="text-evaluation">+0.3</span>
              <span className="text-muted-foreground">White</span>
            </div>
          </div>
          
          <div className="mt-3 text-sm text-muted-foreground text-center" data-testid="text-evaluation-description">
            Slight advantage for White
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
