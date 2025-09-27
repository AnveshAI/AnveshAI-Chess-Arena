import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chess games table
export const games = pgTable("games", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  whitePlayerId: varchar("white_player_id").references(() => users.id), // nullable for guest users
  blackPlayerId: varchar("black_player_id").references(() => users.id), // Always AnveshAI for AI games, nullable for guest
  guestId: varchar("guest_id"), // temporary session ID for guest users
  isGuestGame: boolean("is_guest_game").default(false),
  status: varchar("status").notNull(), // 'active', 'completed', 'abandoned'
  result: varchar("result"), // '1-0', '0-1', '1/2-1/2', null for ongoing
  playerColor: varchar("player_color").notNull(), // 'white' or 'black'
  aiDifficulty: integer("ai_difficulty").notNull().default(1600),
  currentFen: text("current_fen").notNull(),
  pgn: text("pgn").notNull().default(""),
  timeControl: integer("time_control").default(900), // seconds
  whiteTimeLeft: integer("white_time_left").default(900),
  blackTimeLeft: integer("black_time_left").default(900),
  lastMoveAt: timestamp("last_move_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual moves for analysis
export const moves = pgTable("moves", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: uuid("game_id").notNull().references(() => games.id),
  moveNumber: integer("move_number").notNull(),
  side: varchar("side").notNull(), // 'white' or 'black'
  san: varchar("san").notNull(), // Standard Algebraic Notation
  uci: varchar("uci").notNull(), // Universal Chess Interface
  fen: text("fen").notNull(), // Position after this move
  evaluation: text("evaluation"), // Stockfish evaluation
  bestMove: varchar("best_move"), // Engine's best move suggestion
  classification: varchar("classification"), // 'book', 'best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder'
  timeSpent: integer("time_spent"), // milliseconds
  createdAt: timestamp("created_at").defaultNow(),
});

// Game analysis results
export const analyses = pgTable("analyses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: uuid("game_id").notNull().references(() => games.id),
  whiteAccuracy: integer("white_accuracy"), // percentage
  blackAccuracy: integer("black_accuracy"), // percentage
  blunders: integer("blunders").default(0),
  mistakes: integer("mistakes").default(0),
  inaccuracies: integer("inaccuracies").default(0),
  openingName: varchar("opening_name"),
  evaluationGraph: jsonb("evaluation_graph"), // Array of evaluation points
  createdAt: timestamp("created_at").defaultNow(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMoveSchema = createInsertSchema(moves).omit({
  id: true,
  createdAt: true,
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;
export type InsertMove = z.infer<typeof insertMoveSchema>;
export type Move = typeof moves.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analyses.$inferSelect;
