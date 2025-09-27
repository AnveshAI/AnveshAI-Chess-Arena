import { spawn, ChildProcess } from 'child_process';

export interface EngineEvaluation {
  score: number; // centipawns
  mate?: number; // moves to mate
  bestMove: string;
  pv: string[]; // principal variation
  depth: number;
}

export class StockfishEngine {
  private engine: ChildProcess | null = null;
  private isReady = false;
  private resolveMap = new Map<string, (value: any) => void>();

  constructor() {
    this.initEngine();
  }

  private initEngine() {
    try {
      // Try different possible stockfish paths
      const possiblePaths = ['stockfish', '/usr/bin/stockfish', '/usr/local/bin/stockfish'];
      let enginePath = 'stockfish';
      
      // In production, stockfish should be available via package manager
      this.engine = spawn(enginePath, [], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.engine.stdout?.on('data', (data) => {
        this.handleEngineOutput(data.toString());
      });

      this.engine.stderr?.on('data', (data) => {
        console.error('Stockfish error:', data.toString());
      });

      this.engine.on('error', (error) => {
        console.error('Failed to start Stockfish:', error);
        // Fallback: use simplified evaluation
        this.isReady = true;
      });

      // Initialize engine
      this.sendCommand('uci');
      this.sendCommand('isready');
    } catch (error) {
      console.error('Stockfish not available, using fallback evaluation');
      this.isReady = true;
    }
  }

  private handleEngineOutput(output: string) {
    const lines = output.trim().split('\n');
    
    for (const line of lines) {
      if (line === 'uciok') {
        this.sendCommand('isready');
      } else if (line === 'readyok') {
        this.isReady = true;
      } else if (line.startsWith('bestmove')) {
        const parts = line.split(' ');
        const bestMove = parts[1];
        const resolver = this.resolveMap.get('bestmove');
        if (resolver) {
          resolver(bestMove);
          this.resolveMap.delete('bestmove');
        }
      } else if (line.startsWith('info')) {
        this.parseEvaluation(line);
      }
    }
  }

  private parseEvaluation(line: string) {
    const parts = line.split(' ');
    let depth = 0;
    let score = 0;
    let mate: number | undefined;
    let pv: string[] = [];

    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === 'depth') {
        depth = parseInt(parts[i + 1]);
      } else if (parts[i] === 'score') {
        if (parts[i + 1] === 'cp') {
          score = parseInt(parts[i + 2]);
        } else if (parts[i + 1] === 'mate') {
          mate = parseInt(parts[i + 2]);
        }
      } else if (parts[i] === 'pv') {
        pv = parts.slice(i + 1);
        break;
      }
    }

    const resolver = this.resolveMap.get('evaluation');
    if (resolver && depth >= 10) { // Only return evaluation after reasonable depth
      resolver({
        score: score / 100, // Convert centipawns to pawns
        mate,
        bestMove: pv[0] || '',
        pv,
        depth
      });
      this.resolveMap.delete('evaluation');
    }
  }

  private sendCommand(command: string) {
    if (this.engine && this.engine.stdin) {
      this.engine.stdin.write(command + '\n');
    }
  }

  async getBestMove(fen: string, timeMs: number = 1000): Promise<string> {
    if (!this.isReady) {
      await this.waitForReady();
    }

    if (!this.engine) {
      // Fallback: return a random legal move (would need chess.js here)
      return 'e2e4'; // Default opening move
    }

    return new Promise((resolve) => {
      this.resolveMap.set('bestmove', resolve);
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go movetime ${timeMs}`);
    });
  }

  async evaluatePosition(fen: string, depth: number = 15): Promise<EngineEvaluation> {
    if (!this.isReady) {
      await this.waitForReady();
    }

    if (!this.engine) {
      // Fallback evaluation
      return {
        score: 0,
        bestMove: 'e2e4',
        pv: ['e2e4'],
        depth: 1
      };
    }

    return new Promise((resolve) => {
      this.resolveMap.set('evaluation', resolve);
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${depth}`);
    });
  }

  private async waitForReady(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.isReady) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  classifyMove(evaluation: EngineEvaluation, bestEval: EngineEvaluation): string {
    const diff = Math.abs(evaluation.score - bestEval.score);
    
    if (diff <= 0.1) return 'best';
    if (diff <= 0.25) return 'excellent';
    if (diff <= 0.5) return 'good';
    if (diff <= 1.0) return 'inaccuracy';
    if (diff <= 2.0) return 'mistake';
    return 'blunder';
  }

  destroy() {
    if (this.engine) {
      this.engine.kill();
    }
  }
}

export const stockfishEngine = new StockfishEngine();
