import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Game, Move } from '@shared/schema';
import { Download } from 'lucide-react';
import { useState } from 'react';

interface GameInfoProps {
  game: Game;
  moves: Move[];
}

export default function GameInfo({ game, moves }: GameInfoProps) {
  const [isLiveAnalysisEnabled, setIsLiveAnalysisEnabled] = useState(false);
  
  const handleDownloadPGN = async () => {
    try {
      const response = await fetch(`/api/games/${game.id}/pgn`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `game-${game.id}.pgn`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading PGN:', error);
    }
  };

  const formatMoveHistory = () => {
    const moveHistory = [];
    for (let i = 0; i < moves.length; i += 2) {
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];
      moveHistory.push({
        number: Math.floor(i / 2) + 1,
        white: whiteMove?.san || '',
        black: blackMove?.san || '...'
      });
    }
    return moveHistory;
  };

  const moveHistory = formatMoveHistory();

  return (
    <div className="space-y-6">
      {/* Move History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Move History</CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleDownloadPGN}
              data-testid="button-download-pgn"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-80 overflow-y-auto" data-testid="move-history">
            {moveHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No moves yet
              </div>
            ) : (
              moveHistory.map((move, index) => (
                <div key={index} className="grid grid-cols-3 gap-2 py-1 text-sm">
                  <span className="font-mono text-muted-foreground">{move.number}.</span>
                  <span 
                    className="font-mono hover:bg-accent hover:text-accent-foreground px-1 rounded cursor-pointer"
                    data-testid={`move-white-${move.number}`}
                  >
                    {move.white}
                  </span>
                  <span 
                    className="font-mono hover:bg-accent hover:text-accent-foreground px-1 rounded cursor-pointer"
                    data-testid={`move-black-${move.number}`}
                  >
                    {move.black}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Analysis (Admin Only) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Live Analysis</CardTitle>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">Admin</span>
              <button 
                className="w-8 h-4 bg-muted rounded-full relative transition-colors duration-200" 
                onClick={() => setIsLiveAnalysisEnabled(!isLiveAnalysisEnabled)}
                data-testid="toggle-live-analysis"
              >
                <div 
                  className={`w-3 h-3 rounded-full absolute top-0.5 transition-all duration-200 ${
                    isLiveAnalysisEnabled 
                      ? 'translate-x-4 bg-primary' 
                      : 'translate-x-0.5 bg-white'
                  }`}
                ></div>
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLiveAnalysisEnabled ? (
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Best Move</span>
                  <span className="text-xs text-muted-foreground">Depth 18</span>
                </div>
                <div className="font-mono text-secondary" data-testid="text-best-move">Nf6</div>
                <div className="text-xs text-muted-foreground mt-1" data-testid="text-move-evaluation">
                  Evaluation: +0.21
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Top 3 Moves:</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-mono" data-testid="text-top-move-1">Nf6</span>
                    <span className="text-muted-foreground">+0.21</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-mono" data-testid="text-top-move-2">Be7</span>
                    <span className="text-muted-foreground">+0.15</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-mono" data-testid="text-top-move-3">f5</span>
                    <span className="text-destructive">-0.45</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <div className="text-sm">Live analysis is disabled</div>
              <div className="text-xs mt-1">Toggle above to enable real-time position analysis</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Captured Pieces */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Captured Pieces</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground mb-1">White captured:</div>
              <div className="flex space-x-1" data-testid="captured-by-white">
                <span className="text-2xl">♟</span>
                <span className="text-2xl">♟</span>
              </div>
              <div className="text-xs text-muted-foreground">+2 points</div>
            </div>
            
            <div>
              <div className="text-sm text-muted-foreground mb-1">Black captured:</div>
              <div className="flex space-x-1" data-testid="captured-by-black">
                <span className="text-2xl">♙</span>
              </div>
              <div className="text-xs text-muted-foreground">+1 point</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
