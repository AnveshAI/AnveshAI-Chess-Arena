import { Chess } from 'chess.js';
import { stockfishEngine, EngineEvaluation } from './stockfish';
import { learningService } from './learning';

export interface GameMove {
  san: string;
  uci: string;
  fen: string;
  evaluation?: EngineEvaluation;
  timeSpent?: number;
}

export interface GameState {
  fen: string;
  pgn: string;
  isGameOver: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  turn: 'w' | 'b';
  moves: GameMove[];
}

export class ChessGameService {
  private chess: Chess;

  constructor(fen?: string) {
    this.chess = new Chess(fen);
  }

  getGameState(): GameState {
    return {
      fen: this.chess.fen(),
      pgn: this.chess.pgn(),
      isGameOver: this.chess.isGameOver(),
      isCheck: this.chess.isCheck(),
      isCheckmate: this.chess.isCheckmate(),
      isStalemate: this.chess.isStalemate(),
      isDraw: this.chess.isDraw(),
      turn: this.chess.turn(),
      moves: this.chess.history({ verbose: true }).map(move => ({
        san: move.san,
        uci: move.from + move.to + (move.promotion || ''),
        fen: move.after || this.chess.fen()
      }))
    };
  }

  makeMove(move: string): GameMove | null {
    try {
      const moveObj = this.chess.move(move);
      if (!moveObj) return null;

      return {
        san: moveObj.san,
        uci: moveObj.from + moveObj.to + (moveObj.promotion || ''),
        fen: this.chess.fen()
      };
    } catch (error) {
      return null;
    }
  }

  async makeAIMove(difficulty: number = 1600): Promise<GameMove | null> {
    try {
      const currentFen = this.chess.fen();
      let bestMove: string;

      // Try to use learned opening book first (for opening phase)
      const moveCount = this.chess.history().length;
      if (moveCount < 15) {
        const bookMove = learningService.getBookMove(currentFen);
        if (bookMove) {
          console.log(`Using learned opening book move: ${bookMove}`);
          const moveObj = this.chess.move(bookMove);
          if (moveObj) {
            return {
              san: moveObj.san,
              uci: bookMove,
              fen: this.chess.fen()
            };
          }
        }
      }

      // Check if we have learned data for this position
      if (learningService.hasLearnedPosition(currentFen)) {
        const commonMoves = learningService.getCommonMoves(currentFen);
        const learnedEval = learningService.getLearnedEvaluation(currentFen);
        
        // Consider learned moves with some probability based on difficulty
        const useLearnedMove = Math.random() < (difficulty / 2000); // Higher difficulty = more likely to use learned moves
        
        if (useLearnedMove && commonMoves.length > 0) {
          // Validate that the move is legal
          for (const learnedMove of commonMoves) {
            const moveObj = this.chess.move(learnedMove);
            if (moveObj) {
              console.log(`Using learned move: ${learnedMove} (eval: ${learnedEval})`);
              return {
                san: moveObj.san,
                uci: learnedMove,
                fen: this.chess.fen()
              };
            }
          }
        }
      }

      // Fallback to Stockfish engine
      const thinkingTime = Math.max(500, Math.min(3000, difficulty));
      bestMove = await stockfishEngine.getBestMove(currentFen, thinkingTime);
      
      const moveObj = this.chess.move(bestMove);
      if (!moveObj) return null;

      return {
        san: moveObj.san,
        uci: bestMove,
        fen: this.chess.fen()
      };
    } catch (error) {
      console.error('AI move error:', error);
      
      // Fallback: make a random legal move
      const moves = this.chess.moves();
      if (moves.length === 0) return null;
      
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      const moveObj = this.chess.move(randomMove);
      
      return {
        san: moveObj.san,
        uci: moveObj.from + moveObj.to + (moveObj.promotion || ''),
        fen: this.chess.fen()
      };
    }
  }

  getLegalMoves(square?: string): string[] {
    if (square) {
      return this.chess.moves({ square: square as any, verbose: true }).map((move: any) => move.to);
    }
    return this.chess.moves();
  }

  isLegalMove(move: string): boolean {
    try {
      const chess = new Chess(this.chess.fen());
      return chess.move(move) !== null;
    } catch {
      return false;
    }
  }

  async analyzeGame(): Promise<any> {
    const history = this.chess.history({ verbose: true });
    const analysisData = [];
    let blunders = 0;
    let mistakes = 0;
    let inaccuracies = 0;
    let whiteAccuracy = 0;
    let blackAccuracy = 0;
    let evaluationGraph = [];

    // Reset to start position for analysis
    const tempChess = new Chess();
    
    for (let i = 0; i < history.length; i++) {
      const move = history[i];
      const fen = tempChess.fen();
      
      // Get best move evaluation
      const bestEval = await stockfishEngine.evaluatePosition(fen);
      
      // Make the actual move
      tempChess.move(move);
      const actualEval = await stockfishEngine.evaluatePosition(tempChess.fen());
      
      // Classify the move
      const classification = stockfishEngine.classifyMove(actualEval, bestEval);
      
      if (classification === 'blunder') blunders++;
      else if (classification === 'mistake') mistakes++;
      else if (classification === 'inaccuracy') inaccuracies++;

      analysisData.push({
        moveNumber: Math.floor(i / 2) + 1,
        side: move.color === 'w' ? 'white' : 'black',
        san: move.san,
        uci: move.from + move.to + (move.promotion || ''),
        fen: tempChess.fen(),
        evaluation: actualEval.score.toString(),
        bestMove: bestEval.bestMove,
        classification
      });

      evaluationGraph.push({
        move: i + 1,
        evaluation: actualEval.score,
        side: move.color
      });
    }

    // Calculate accuracy (simplified)
    const totalMoves = history.length;
    const goodMoves = analysisData.filter(m => 
      ['best', 'excellent', 'good'].includes(m.classification)
    ).length;
    
    const accuracy = totalMoves > 0 ? Math.round((goodMoves / totalMoves) * 100) : 100;
    
    return {
      moves: analysisData,
      blunders,
      mistakes,
      inaccuracies,
      whiteAccuracy: accuracy,
      blackAccuracy: accuracy,
      evaluationGraph
    };
  }

  reset() {
    this.chess = new Chess();
  }

  loadPGN(pgn: string): boolean {
    try {
      this.chess.loadPgn(pgn);
      return true;
    } catch {
      return false;
    }
  }

  exportPGN(): string {
    return this.chess.pgn();
  }
}
