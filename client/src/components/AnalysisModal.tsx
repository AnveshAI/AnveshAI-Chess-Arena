import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AnalysisModalProps {
  gameId: string;
  onClose: () => void;
}

export default function AnalysisModal({ gameId, onClose }: AnalysisModalProps) {
  const { toast } = useToast();

  // Check if analysis exists
  const { data: existingAnalysis, isLoading: isLoadingAnalysis } = useQuery({
    queryKey: ['/api/games', gameId, 'analysis'],
  });

  // Create analysis mutation
  const analyzeGameMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/games/${gameId}/analyze`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Analysis Complete",
        description: "Game analysis has been generated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the game",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    analyzeGameMutation.mutate();
  };

  const handleExportPGN = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}/pgn`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analysis-${gameId}.pgn`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting PGN:', error);
    }
  };

  const analysis = existingAnalysis?.analysis;
  const moves = existingAnalysis?.moves || [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="analysis-modal">
      <div className="bg-card border border-border rounded-lg w-full max-w-7xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold">Game Analysis</h2>
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline"
              onClick={handleExportPGN}
              data-testid="button-export-pgn"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PGN
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              data-testid="button-close-analysis"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 h-full">
          {/* Analysis Content */}
          <div className="lg:col-span-8 p-6">
            <div className="space-y-4">
              
              {!analysis && !analyzeGameMutation.isPending && (
                <div className="text-center py-12">
                  <div className="space-y-4">
                    <div className="text-xl font-semibold">Game Analysis</div>
                    <p className="text-muted-foreground">
                      Analyze this game to get detailed insights, move classifications, and improvement suggestions.
                    </p>
                    <Button 
                      onClick={handleAnalyze}
                      disabled={analyzeGameMutation.isPending}
                      data-testid="button-analyze-game"
                      className="bg-primary hover:bg-primary/90"
                    >
                      {analyzeGameMutation.isPending ? 'Analyzing...' : 'Analyze Game'}
                    </Button>
                  </div>
                </div>
              )}

              {analyzeGameMutation.isPending && (
                <div className="text-center py-12">
                  <div className="space-y-4">
                    <div className="text-xl font-semibold">Analyzing Game...</div>
                    <p className="text-muted-foreground">
                      Please wait while we analyze your game with Stockfish engine.
                    </p>
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                  </div>
                </div>
              )}

              {analysis && (
                <>
                  {/* Game Result */}
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center justify-center space-x-4">
                      <span className="text-lg font-semibold">Analysis Complete</span>
                      <span className="text-muted-foreground">Game analyzed successfully</span>
                    </div>
                  </div>
                  
                  {/* Evaluation Graph Placeholder */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-4">Position Evaluation Over Time</h3>
                      <div className="h-40 bg-muted border border-border rounded flex items-center justify-center">
                        <span className="text-muted-foreground">
                          Evaluation graph would be rendered here with position scores
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
          
          {/* Analysis Sidebar */}
          <div className="lg:col-span-4 border-l border-border p-6 overflow-y-auto">
            <div className="space-y-6">
              
              {analysis && (
                <>
                  {/* Game Statistics */}
                  <div>
                    <h3 className="font-semibold mb-4">Game Statistics</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold" data-testid="text-total-moves">
                            {moves.length}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Moves</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">--:--</div>
                          <div className="text-sm text-muted-foreground">Duration</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Accuracy (White)</span>
                          <span className="text-sm font-medium" data-testid="text-white-accuracy">
                            {analysis.whiteAccuracy}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Accuracy (Black)</span>
                          <span className="text-sm font-medium" data-testid="text-black-accuracy">
                            {analysis.blackAccuracy}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Blunders</span>
                          <span className="text-sm font-medium" data-testid="text-blunders">
                            {analysis.blunders}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Mistakes</span>
                          <span className="text-sm font-medium" data-testid="text-mistakes">
                            {analysis.mistakes}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Inaccuracies</span>
                          <span className="text-sm font-medium" data-testid="text-inaccuracies">
                            {analysis.inaccuracies}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Move Analysis */}
                  <div>
                    <h3 className="font-semibold mb-4">Move Analysis</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {moves.map((move: any, index: number) => (
                        <div key={index} className="p-3 bg-muted rounded-md">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-mono" data-testid={`move-san-${index}`}>
                              {move.moveNumber}. {move.san}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              move.classification === 'blunder' ? 'bg-destructive text-destructive-foreground' :
                              move.classification === 'mistake' ? 'bg-orange-500 text-white' :
                              move.classification === 'inaccuracy' ? 'bg-yellow-500 text-black' :
                              'bg-green-500 text-white'
                            }`}>
                              {move.classification}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Evaluation: {move.evaluation}
                          </div>
                          {move.bestMove && (
                            <div className="text-sm mt-1">
                              <strong>Best:</strong> <span className="font-mono">{move.bestMove}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
