import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, float, json } from "drizzle-orm/mysql-core";

// ─── Users (auth) ───
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// ─── Player Profiles ───
export const players = mysqlTable("players", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  photoUrl: text("photoUrl"),
  city: varchar("city", { length: 100 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  countryFlag: varchar("countryFlag", { length: 10 }),
  position: mysqlEnum("position", ["GK", "DEF", "MID", "ATT"]).notNull(),
  teamId: int("teamId"),
  isFreeAgent: boolean("isFreeAgent").default(true).notNull(),
  isCaptain: boolean("isCaptain").default(false).notNull(),
  totalMatches: int("totalMatches").default(0).notNull(),
  totalPoints: int("totalPoints").default(0).notNull(),
  totalRatings: float("totalRatings").default(0).notNull(),
  ratingCount: int("ratingCount").default(0).notNull(),
  motmCount: int("motmCount").default(0).notNull(),
  // Free agent availability
  availableTime: varchar("availableTime", { length: 255 }),
  preferredFormat: varchar("preferredFormat", { length: 20 }),
  isAvailable: boolean("isAvailable").default(false).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Teams ───
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: text("logoUrl"),
  city: varchar("city", { length: 100 }).notNull(),
  captainId: int("captainId").notNull(),
  totalWins: int("totalWins").default(0).notNull(),
  totalMatches: int("totalMatches").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Matches ───
export const matches = mysqlTable("matches", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["public", "friendly"]).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  pitchName: varchar("pitchName", { length: 255 }).notNull(),
  matchDate: timestamp("matchDate").notNull(),
  format: mysqlEnum("format", ["5v5", "8v8", "11v11"]).notNull(),
  maxPlayers: int("maxPlayers").notNull(),
  maxPlayersPerTeam: int("maxPlayersPerTeam").notNull().default(5),
  teamAId: int("teamAId").notNull(),
  teamBId: int("teamBId"),
  scoreA: int("scoreA"),
  scoreB: int("scoreB"),
  createdBy: int("createdBy").notNull(),
  ratingsOpen: boolean("ratingsOpen").default(false).notNull(),
  ratingsClosedAt: timestamp("ratingsClosedAt"),
  motmVotingOpen: boolean("motmVotingOpen").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Match Players (roster) ───
export const matchPlayers = mysqlTable("match_players", {
  id: int("id").autoincrement().primaryKey(),
  matchId: int("matchId").notNull(),
  playerId: int("playerId").notNull(),
  teamId: int("teamId").notNull(),
  teamSide: mysqlEnum("teamSide", ["A", "B"]).notNull().default("A"),
  joinStatus: mysqlEnum("joinStatus", ["pending", "approved", "declined"]).notNull().default("approved"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Match Requests (team B requests to join public match) ───
export const matchRequests = mysqlTable("match_requests", {
  id: int("id").autoincrement().primaryKey(),
  matchId: int("matchId").notNull(),
  teamId: int("teamId").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Ratings ───
export const ratings = mysqlTable("ratings", {
  id: int("id").autoincrement().primaryKey(),
  matchId: int("matchId").notNull(),
  raterId: int("raterId").notNull(),
  ratedPlayerId: int("ratedPlayerId").notNull(),
  score: float("score").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── MOTM Votes ───
export const motmVotes = mysqlTable("motm_votes", {
  id: int("id").autoincrement().primaryKey(),
  matchId: int("matchId").notNull(),
  voterId: int("voterId").notNull(),
  votedPlayerId: int("votedPlayerId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Highlights ───
export const highlights = mysqlTable("highlights", {
  id: int("id").autoincrement().primaryKey(),
  playerId: int("playerId").notNull(),
  mediaUrl: text("mediaUrl").notNull(),
  mediaType: mysqlEnum("mediaType", ["photo", "video"]).notNull(),
  likes: int("likes").default(0).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Highlight Likes ───
export const highlightLikes = mysqlTable("highlight_likes", {
  id: int("id").autoincrement().primaryKey(),
  highlightId: int("highlightId").notNull(),
  playerId: int("playerId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Chat Messages ───
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["team", "direct"]).notNull(),
  senderId: int("senderId").notNull(),
  recipientId: int("recipientId"),
  teamId: int("teamId"),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Follows ───
export const follows = mysqlTable("follows", {
  id: int("id").autoincrement().primaryKey(),
  followerId: int("followerId").notNull(),
  followedId: int("followedId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Notifications ───
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  playerId: int("playerId").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  data: text("data"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Type exports ───
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;
export type MatchPlayer = typeof matchPlayers.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
export type MotmVote = typeof motmVotes.$inferSelect;
export type Highlight = typeof highlights.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
