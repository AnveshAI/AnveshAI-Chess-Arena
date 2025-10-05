import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, optionalAuth } from "./replitAuth";
import { ChessGameService } from "./services/chess";
import { stockfishEngine } from "./services/stockfish";
import { insertGameSchema, insertMoveSchema } from "@shared/schema";

interface GameSocket extends WebSocket {
  gameId?: string;
  userId?: string;
  isAdmin?: boolean;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Game routes
  app.post('/api/games', optionalAuth, async (req: any, res) => {
    try {
      const { playerColor, aiDifficulty } = req.body;

      const chessGame = new ChessGameService();
      const gameState = chessGame.getGameState();

      let gameData;
      if (req.isGuest) {
        // Guest user - assign guest to chosen color, AI to opposite color
        gameData = {
          whitePlayerId: playerColor === 'white' ? null : 'anveshai',
          blackPlayerId: playerColor === 'black' ? null : 'anveshai',
          guestId: req.guestId,
          isGuestGame: true,
          status: 'active' as const,
          playerColor,
          aiDifficulty: aiDifficulty || 1600,
          currentFen: gameState.fen,
          pgn: gameState.pgn,
          timeControl: 900,
          whiteTimeLeft: 900,
          blackTimeLeft: 900,
        };
      } else {
        // Authenticated user - assign user to chosen color, AI to opposite color
        const userId = req.user.claims.sub;
        gameData = {
          whitePlayerId: playerColor === 'white' ? userId : 'anveshai',
          blackPlayerId: playerColor === 'black' ? userId : 'anveshai',
          guestId: null,
          isGuestGame: false,
          status: 'active' as const,
          playerColor,
          aiDifficulty: aiDifficulty || 1600,
          currentFen: gameState.fen,
          pgn: gameState.pgn,
          timeControl: 900,
          whiteTimeLeft: 900,
          blackTimeLeft: 900,
        };
      }

      const game = await storage.createGame(gameData);
      res.json(game);
    } catch (error) {
      console.error("Error creating game:", error);
      res.status(500).json({ message: "Failed to create game" });
    }
  });

  app.get('/api/games/:id', optionalAuth, async (req: any, res) => {
    try {
      const game = await storage.getGame(req.params.id);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Verify guest user can only access their own games
      if (req.isGuest && game.guestId !== req.guestId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Verify authenticated user can only access their own games
      if (!req.isGuest && game.whitePlayerId !== req.user.claims.sub && game.blackPlayerId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(game);
    } catch (error) {
      console.error("Error fetching game:", error);
      res.status(500).json({ message: "Failed to fetch game" });
    }
  });

  app.post('/api/games/:id/moves', optionalAuth, async (req: any, res) => {
    try {
      const gameId = req.params.id;
      const { move } = req.body;

      const game = await storage.getGame(gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Verify ownership - guest or authenticated user
      if (req.isGuest) {
        if (game.guestId !== req.guestId || !game.isGuestGame) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else {
        const userId = req.user.claims.sub;
        if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Verify it's the player's turn
      const chessGame = new ChessGameService(game.currentFen);
      const gameState = chessGame.getGameState();

      const isPlayerTurn = (gameState.turn === 'w' && game.playerColor === 'white') ||
                          (gameState.turn === 'b' && game.playerColor === 'black');

      if (!isPlayerTurn) {
        return res.status(400).json({ message: "Not your turn" });
      }

      const playerMove = chessGame.makeMove(move);
      if (!playerMove) {
        return res.status(400).json({ message: "Invalid move" });
      }

      // Save player move
      const moveData = {
        gameId,
        moveNumber: Math.floor(chessGame.getGameState().moves.length / 2) + 1,
        side: gameState.turn,
        san: playerMove.san,
        uci: playerMove.uci,
        fen: playerMove.fen,
      };

      await storage.addMove(moveData);
      await storage.updateGame(gameId, {
        currentFen: playerMove.fen,
        pgn: chessGame.getGameState().pgn,
        lastMoveAt: new Date(),
      });

      // Check if game is over
      const newGameState = chessGame.getGameState();
      if (newGameState.isGameOver) {
        let result = '1/2-1/2';
        if (newGameState.isCheckmate) {
          result = gameState.turn === 'w' ? '0-1' : '1-0';
        }

        await storage.updateGame(gameId, {
          status: 'completed',
          result,
        });

        res.json({ move: playerMove, gameState: newGameState, gameOver: true });
        return;
      }

      // Make AI move
      const aiMove = await chessGame.makeAIMove(game.aiDifficulty);
      if (aiMove) {
        const aiMoveData = {
          gameId,
          moveNumber: Math.floor(chessGame.getGameState().moves.length / 2) + 1,
          side: chessGame.getGameState().turn === 'w' ? 'b' : 'w',
          san: aiMove.san,
          uci: aiMove.uci,
          fen: aiMove.fen,
        };

        await storage.addMove(aiMoveData);
        await storage.updateGame(gameId, {
          currentFen: aiMove.fen,
          pgn: chessGame.getGameState().pgn,
          lastMoveAt: new Date(),
        });
      }

      const finalGameState = chessGame.getGameState();
      res.json({ 
        playerMove, 
        aiMove, 
        gameState: finalGameState, 
        gameOver: finalGameState.isGameOver 
      });

    } catch (error) {
      console.error("Error making move:", error);
      res.status(500).json({ message: "Failed to make move" });
    }
  });

  app.get('/api/games/:id/moves', optionalAuth, async (req: any, res) => {
    try {
      const game = await storage.getGame(req.params.id);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Verify ownership - guest or authenticated user
      if (req.isGuest) {
        if (game.guestId !== req.guestId || !game.isGuestGame) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else {
        const userId = req.user.claims.sub;
        if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const moves = await storage.getGameMoves(req.params.id);
      res.json(moves);
    } catch (error) {
      console.error("Error fetching moves:", error);
      res.status(500).json({ message: "Failed to fetch moves" });
    }
  });

  // Admin routes
  app.get('/api/admin/games', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const games = await storage.getActiveGames();
      res.json(games);
    } catch (error) {
      console.error("Error fetching admin games:", error);
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  // Analysis routes (restricted to authenticated users)
  app.post('/api/games/:id/analyze', isAuthenticated, async (req: any, res) => {
    try {
      const gameId = req.params.id;
      const game = await storage.getGame(gameId);

      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      const chessGame = new ChessGameService();
      chessGame.loadPGN(game.pgn);

      const analysisResult = await chessGame.analyzeGame();

      const analysis = await storage.createAnalysis({
        gameId,
        whiteAccuracy: analysisResult.whiteAccuracy,
        blackAccuracy: analysisResult.blackAccuracy,
        blunders: analysisResult.blunders,
        mistakes: analysisResult.mistakes,
        inaccuracies: analysisResult.inaccuracies,
        evaluationGraph: analysisResult.evaluationGraph,
      });

      res.json({ analysis, moves: analysisResult.moves });
    } catch (error) {
      console.error("Error analyzing game:", error);
      res.status(500).json({ message: "Failed to analyze game" });
    }
  });

  // Get learning statistics
  app.get('/api/learning/stats', async (req, res) => {
    try {
      const { learningService } = await import('./services/learning');
      const stats = learningService.getStatistics();
      res.json(stats);
    } catch (error) {
      console.error("Error getting learning stats:", error);
      res.status(500).json({ message: "Failed to get learning statistics" });
    }
  });

  // Export opening book
  app.get('/api/learning/opening-book', async (req, res) => {
    try {
      const { learningService } = await import('./services/learning');
      const bookData = learningService.exportOpeningBook();
      res.json(bookData);
    } catch (error) {
      console.error("Error exporting opening book:", error);
      res.status(500).json({ message: "Failed to export opening book" });
    }
  });

  // Manually trigger learning reload
  app.post('/api/learning/reload', async (req, res) => {
    try {
      const { learningService } = await import('./services/learning');
      await learningService.reload();
      res.json({ message: "Learning service reloaded successfully" });
    } catch (error) {
      console.error("Error reloading learning service:", error);
      res.status(500).json({ message: "Failed to reload learning service" });
    }
  });

  app.get('/api/games/:id/analysis', optionalAuth, async (req: any, res) => {
    try {
      const analysis = await storage.getGameAnalysis(req.params.id);
      const moves = await storage.getGameMoves(req.params.id);
      res.json({ analysis, moves });
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ message: "Failed to fetch analysis" });
    }
  });

  // Game action routes - resign and draw offer
  app.post('/api/games/:id/resign', optionalAuth, async (req: any, res) => {
    try {
      const gameId = req.params.id;
      const game = await storage.getGame(gameId);

      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Verify ownership - guest or authenticated user
      if (req.isGuest) {
        if (game.guestId !== req.guestId || !game.isGuestGame) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else {
        const userId = req.user.claims.sub;
        if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      if (game.status !== 'active') {
        return res.status(400).json({ message: "Game is not active" });
      }

      // Determine the result based on who resigned
      let result = '1/2-1/2'; // Default to draw, but this should not happen
      if (req.isGuest || game.whitePlayerId === (req.user?.claims?.sub)) {
        // Player resigned
        result = game.playerColor === 'white' ? '0-1' : '1-0';
      }

      const updatedGame = await storage.updateGame(gameId, {
        status: 'completed',
        result,
      });

      res.json({ 
        message: "Game resigned", 
        game: updatedGame,
        result 
      });
    } catch (error) {
      console.error("Error resigning game:", error);
      res.status(500).json({ message: "Failed to resign game" });
    }
  });

  app.post('/api/games/:id/offer-draw', optionalAuth, async (req: any, res) => {
    try {
      const gameId = req.params.id;
      const game = await storage.getGame(gameId);

      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Verify ownership - guest or authenticated user
      if (req.isGuest) {
        if (game.guestId !== req.guestId || !game.isGuestGame) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else {
        const userId = req.user.claims.sub;
        if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      if (game.status !== 'active') {
        return res.status(400).json({ message: "Game is not active" });
      }

      // For now, against AI, automatically accept the draw offer
      // In a real implementation, this might involve more complex logic
      const updatedGame = await storage.updateGame(gameId, {
        status: 'completed',
        result: '1/2-1/2',
      });

      res.json({ 
        message: "Draw offer accepted", 
        game: updatedGame,
        result: '1/2-1/2'
      });
    } catch (error) {
      console.error("Error offering draw:", error);
      res.status(500).json({ message: "Failed to offer draw" });
    }
  });

  // PGN export (allow for both guests and authenticated users)
  app.get('/api/games/:id/pgn', optionalAuth, async (req: any, res) => {
    try {
      const game = await storage.getGame(req.params.id);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Verify ownership - guest or authenticated user
      if (req.isGuest) {
        if (game.guestId !== req.guestId || !game.isGuestGame) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else {
        const userId = req.user.claims.sub;
        if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      res.setHeader('Content-Type', 'application/x-chess-pgn');
      res.setHeader('Content-Disposition', `attachment; filename="game-${game.id}.pgn"`);
      res.send(game.pgn);
    } catch (error) {
      console.error("Error exporting PGN:", error);
      res.status(500).json({ message: "Failed to export PGN" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup for real-time features
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: GameSocket, req) => {
    console.log('Client connected to WebSocket');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'join_game':
            ws.gameId = data.gameId;
            ws.userId = data.userId;
            ws.isAdmin = data.isAdmin || false;
            break;

          case 'spectate_game':
            if (ws.isAdmin) {
              ws.gameId = data.gameId;
            }
            break;

          case 'game_update':
            // Broadcast game updates to all connected clients watching this game
            wss.clients.forEach((client: GameSocket) => {
              if (client !== ws && client.gameId === ws.gameId && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'game_state',
                  data: data.gameState
                }));
              }
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  return httpServer;
}
