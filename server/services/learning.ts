
import { db } from '../db';
import { games, moves } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { Chess } from 'chess.js';
import { stockfishEngine } from './stockfish';

interface OpeningMove {
  fen: string;
  move: string;
  count: number;
  winRate: number;
  avgEvaluation: number;
}

interface PositionData {
  fen: string;
  bestMoves: string[];
  evaluation: number;
  gamesPlayed: number;
}

export class ChessLearningService {
  private openingBook: Map<string, OpeningMove[]> = new Map();
  private positionDatabase: Map<string, PositionData> = new Map();
  private maxOpeningMoves = 15; // Learn first 15 moves as opening theory

  constructor() {
    this.loadLearningData();
  }

  /**
   * Load all historical game data and build opening book + position database
   */
  async loadLearningData() {
    try {
      if (!db) {
        console.log('Database not available, using empty learning data');
        return;
      }

      // Fetch all completed games
      const completedGames = await db
        .select()
        .from(games)
        .where(eq(games.status, 'completed'));

      console.log(`Loading learning data from ${completedGames.length} completed games...`);

      for (const game of completedGames) {
        await this.processGameForLearning(game.id, game.result || '1/2-1/2');
      }

      console.log(`Opening book size: ${this.openingBook.size} positions`);
      console.log(`Position database size: ${this.positionDatabase.size} positions`);
    } catch (error) {
      console.error('Error loading learning data:', error);
    }
  }

  /**
   * Process a completed game and extract learning data
   */
  async processGameForLearning(gameId: string, result: string) {
    try {
      if (!db) return;

      const gameMoves = await db
        .select()
        .from(moves)
        .where(eq(moves.gameId, gameId))
        .orderBy(moves.moveNumber);

      const chess = new Chess();
      const whiteWon = result === '1-0';
      const blackWon = result === '0-1';
      const draw = result === '1/2-1/2';

      for (let i = 0; i < gameMoves.length; i++) {
        const move = gameMoves[i];
        const positionKey = this.normalizePosition(chess.fen());

        // Add to opening book (first N moves only)
        if (i < this.maxOpeningMoves) {
          this.addToOpeningBook(
            positionKey,
            move.uci,
            whiteWon,
            blackWon,
            draw,
            move.side,
            parseFloat(move.evaluation || '0')
          );
        }

        // Add to position database
        this.addToPositionDatabase(
          positionKey,
          move.uci,
          parseFloat(move.evaluation || '0')
        );

        // Make the move
        chess.move(move.san);
      }
    } catch (error) {
      console.error(`Error processing game ${gameId}:`, error);
    }
  }

  /**
   * Add a move to the opening book with statistics
   */
  private addToOpeningBook(
    fen: string,
    move: string,
    whiteWon: boolean,
    blackWon: boolean,
    draw: boolean,
    side: string,
    evaluation: number
  ) {
    const movesForPosition = this.openingBook.get(fen) || [];
    const existingMove = movesForPosition.find(m => m.move === move);

    if (existingMove) {
      // Update existing move statistics
      existingMove.count++;
      const totalGames = existingMove.count;
      
      // Calculate win rate from perspective of side playing the move
      let wins = 0;
      if (side === 'white' && whiteWon) wins = 1;
      if (side === 'black' && blackWon) wins = 1;
      if (draw) wins = 0.5;

      existingMove.winRate = 
        (existingMove.winRate * (totalGames - 1) + wins) / totalGames;
      
      existingMove.avgEvaluation = 
        (existingMove.avgEvaluation * (totalGames - 1) + evaluation) / totalGames;
    } else {
      // Add new move
      let winRate = 0;
      if (side === 'white' && whiteWon) winRate = 1;
      if (side === 'black' && blackWon) winRate = 1;
      if (draw) winRate = 0.5;

      movesForPosition.push({
        fen,
        move,
        count: 1,
        winRate,
        avgEvaluation: evaluation,
      });
    }

    this.openingBook.set(fen, movesForPosition);
  }

  /**
   * Add position data to the learning database
   */
  private addToPositionDatabase(fen: string, move: string, evaluation: number) {
    const posData = this.positionDatabase.get(fen);

    if (posData) {
      if (!posData.bestMoves.includes(move)) {
        posData.bestMoves.push(move);
      }
      posData.gamesPlayed++;
      posData.evaluation = 
        (posData.evaluation * (posData.gamesPlayed - 1) + evaluation) / posData.gamesPlayed;
    } else {
      this.positionDatabase.set(fen, {
        fen,
        bestMoves: [move],
        evaluation,
        gamesPlayed: 1,
      });
    }
  }

  /**
   * Normalize FEN position (remove move counters for better matching)
   */
  private normalizePosition(fen: string): string {
    const parts = fen.split(' ');
    // Keep only position, turn, castling, and en passant
    return parts.slice(0, 4).join(' ');
  }

  /**
   * Get the best move from the opening book
   */
  getBookMove(fen: string): string | null {
    const normalizedFen = this.normalizePosition(fen);
    const movesForPosition = this.openingBook.get(normalizedFen);

    if (!movesForPosition || movesForPosition.length === 0) {
      return null;
    }

    // Sort by a combination of win rate, frequency, and evaluation
    const scoredMoves = movesForPosition.map(m => ({
      move: m.move,
      score: (m.winRate * 0.5) + 
             (Math.min(m.count / 10, 1) * 0.3) + 
             (Math.tanh(m.avgEvaluation / 2) * 0.2)
    }));

    scoredMoves.sort((a, b) => b.score - a.score);

    // Add some randomness to avoid being too predictable
    // 70% chance to play best move, 20% second best, 10% third best
    const rand = Math.random();
    if (rand < 0.7 && scoredMoves[0]) {
      return scoredMoves[0].move;
    } else if (rand < 0.9 && scoredMoves[1]) {
      return scoredMoves[1].move;
    } else if (scoredMoves[2]) {
      return scoredMoves[2].move;
    }

    return scoredMoves[0]?.move || null;
  }

  /**
   * Get learned evaluation for a position
   */
  getLearnedEvaluation(fen: string): number | null {
    const normalizedFen = this.normalizePosition(fen);
    const posData = this.positionDatabase.get(normalizedFen);
    return posData?.evaluation || null;
  }

  /**
   * Get commonly played moves in a position
   */
  getCommonMoves(fen: string): string[] {
    const normalizedFen = this.normalizePosition(fen);
    const posData = this.positionDatabase.get(normalizedFen);
    return posData?.bestMoves || [];
  }

  /**
   * Check if we have learned data for a position
   */
  hasLearnedPosition(fen: string): boolean {
    const normalizedFen = this.normalizePosition(fen);
    return this.positionDatabase.has(normalizedFen);
  }

  /**
   * Get statistics about the learning database
   */
  getStatistics() {
    return {
      openingBookSize: this.openingBook.size,
      positionDatabaseSize: this.positionDatabase.size,
      totalOpeningMoves: Array.from(this.openingBook.values())
        .reduce((sum, moves) => sum + moves.length, 0),
    };
  }

  /**
   * Export opening book as JSON for backup/analysis
   */
  exportOpeningBook() {
    const bookData: any[] = [];
    this.openingBook.forEach((moves, fen) => {
      bookData.push({
        fen,
        moves: moves.map(m => ({
          move: m.move,
          count: m.count,
          winRate: m.winRate,
          avgEval: m.avgEvaluation,
        }))
      });
    });
    return bookData;
  }

  /**
   * Reload learning data (call after new games are completed)
   */
  async reload() {
    this.openingBook.clear();
    this.positionDatabase.clear();
    await this.loadLearningData();
  }
}

export const learningService = new ChessLearningService();
