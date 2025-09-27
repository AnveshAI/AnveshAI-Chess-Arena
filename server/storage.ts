import {
  users,
  games,
  moves,
  analyses,
  type User,
  type UpsertUser,
  type Game,
  type InsertGame,
  type Move,
  type InsertMove,
  type Analysis,
  type InsertAnalysis,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Game operations
  createGame(game: InsertGame): Promise<Game>;
  getGame(id: string): Promise<Game | undefined>;
  updateGame(id: string, updates: Partial<Game>): Promise<Game>;
  getActiveGames(): Promise<Game[]>;
  getUserGames(userId: string): Promise<Game[]>;
  
  // Move operations
  addMove(move: InsertMove): Promise<Move>;
  getGameMoves(gameId: string): Promise<Move[]>;
  
  // Analysis operations
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getGameAnalysis(gameId: string): Promise<Analysis | undefined>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    if (!db) {
      throw new Error('Database not available');
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Game operations
  async createGame(game: InsertGame): Promise<Game> {
    const [newGame] = await db.insert(games).values(game).returning();
    return newGame;
  }

  async getGame(id: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game;
  }

  async updateGame(id: string, updates: Partial<Game>): Promise<Game> {
    const [game] = await db
      .update(games)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(games.id, id))
      .returning();
    return game;
  }

  async getActiveGames(): Promise<Game[]> {
    return db.select().from(games).where(eq(games.status, 'active')).orderBy(desc(games.lastMoveAt));
  }

  async getUserGames(userId: string): Promise<Game[]> {
    return db.select().from(games)
      .where(eq(games.whitePlayerId, userId))
      .orderBy(desc(games.createdAt));
  }

  // Move operations
  async addMove(move: InsertMove): Promise<Move> {
    const [newMove] = await db.insert(moves).values(move).returning();
    return newMove;
  }

  async getGameMoves(gameId: string): Promise<Move[]> {
    return db.select().from(moves)
      .where(eq(moves.gameId, gameId))
      .orderBy(moves.moveNumber);
  }

  // Analysis operations
  async createAnalysis(analysis: InsertAnalysis): Promise<Analysis> {
    const [newAnalysis] = await db.insert(analyses).values(analysis).returning();
    return newAnalysis;
  }

  async getGameAnalysis(gameId: string): Promise<Analysis | undefined> {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.gameId, gameId));
    return analysis;
  }
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private games = new Map<string, Game>();
  private moves = new Map<string, Move[]>();
  private analyses = new Map<string, Analysis>();

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = Array.from(this.users.values()).find(user => user.email === userData.email);
    const user: User = {
      id: existingUser?.id || nanoid(),
      email: userData.email || '',
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      isAdmin: userData.isAdmin || false,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  // Game operations
  async createGame(game: InsertGame): Promise<Game> {
    const newGame: Game = {
      id: nanoid(),
      whitePlayerId: game.whitePlayerId || null,
      blackPlayerId: game.blackPlayerId || null,
      guestId: game.guestId || null,
      isGuestGame: game.isGuestGame || false,
      status: game.status,
      result: game.result || null,
      playerColor: game.playerColor,
      aiDifficulty: game.aiDifficulty || 1600,
      currentFen: game.currentFen,
      pgn: game.pgn || '',
      timeControl: game.timeControl || null,
      whiteTimeLeft: game.whiteTimeLeft || null,
      blackTimeLeft: game.blackTimeLeft || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMoveAt: new Date(),
    };
    this.games.set(newGame.id, newGame);
    return newGame;
  }

  async getGame(id: string): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async updateGame(id: string, updates: Partial<Game>): Promise<Game> {
    const game = this.games.get(id);
    if (!game) throw new Error('Game not found');
    const updatedGame = { ...game, ...updates, updatedAt: new Date() };
    this.games.set(id, updatedGame);
    return updatedGame;
  }

  async getActiveGames(): Promise<Game[]> {
    return Array.from(this.games.values())
      .filter(game => game.status === 'active')
      .sort((a, b) => (b.lastMoveAt?.getTime() || 0) - (a.lastMoveAt?.getTime() || 0));
  }

  async getUserGames(userId: string): Promise<Game[]> {
    return Array.from(this.games.values())
      .filter(game => game.whitePlayerId === userId || game.blackPlayerId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  // Move operations
  async addMove(move: InsertMove): Promise<Move> {
    const newMove: Move = {
      id: nanoid(),
      gameId: move.gameId,
      moveNumber: move.moveNumber,
      side: move.side,
      san: move.san,
      uci: move.uci,
      fen: move.fen,
      evaluation: move.evaluation || null,
      bestMove: move.bestMove || null,
      classification: move.classification || null,
      timeSpent: move.timeSpent || null,
      createdAt: new Date(),
    };
    const gameMoves = this.moves.get(move.gameId) || [];
    gameMoves.push(newMove);
    this.moves.set(move.gameId, gameMoves);
    return newMove;
  }

  async getGameMoves(gameId: string): Promise<Move[]> {
    return this.moves.get(gameId) || [];
  }

  // Analysis operations
  async createAnalysis(analysis: InsertAnalysis): Promise<Analysis> {
    const newAnalysis: Analysis = {
      id: nanoid(),
      gameId: analysis.gameId,
      whiteAccuracy: analysis.whiteAccuracy || null,
      blackAccuracy: analysis.blackAccuracy || null,
      blunders: analysis.blunders || null,
      mistakes: analysis.mistakes || null,
      inaccuracies: analysis.inaccuracies || null,
      openingName: analysis.openingName || null,
      evaluationGraph: analysis.evaluationGraph || null,
      createdAt: new Date(),
    };
    this.analyses.set(analysis.gameId, newAnalysis);
    return newAnalysis;
  }

  async getGameAnalysis(gameId: string): Promise<Analysis | undefined> {
    return this.analyses.get(gameId);
  }
}

// Use database storage if available, otherwise use in-memory storage
export const storage: IStorage = db ? new DatabaseStorage() : new MemStorage();
console.log('Storage initialized:', db ? 'Database storage' : 'In-memory storage');
