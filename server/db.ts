import { eq, and, desc, asc, gte, lte, ne, sql, inArray, isNotNull, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  players, InsertPlayer,
  teams, InsertTeam,
  matches, InsertMatch,
  matchPlayers,
  matchRequests,
  ratings,
  motmVotes,
  highlights,
  highlightLikes,
  chatMessages,
  follows,
  notifications,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USER ───
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod", "passwordHash"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    values[field] = value ?? null;
    updateSet[field] = value ?? null;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; } else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

// ─── PLAYER ───
export async function getPlayerByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(players).where(eq(players.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function getPlayerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(players).where(eq(players.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createPlayer(data: InsertPlayer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(players).values(data);
  return result[0].insertId;
}

export async function updatePlayer(id: number, data: Partial<InsertPlayer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(players).set(data).where(eq(players.id, id));
}

export async function getFreeAgents(city?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(players.isFreeAgent, true), eq(players.isAvailable, true)];
  if (city) conditions.push(eq(players.city, city));
  return db.select().from(players).where(and(...conditions));
}

export async function searchPlayers(query: string) {
  const db = await getDb();
  if (!db) return [];
  const q = `%${query}%`;
  return db.select().from(players)
    .where(or(like(players.fullName, q), like(players.city, q)))
    .limit(20);
}

export async function getLeaderboard(city?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [gte(players.totalMatches, 5)];
  if (city) conditions.push(eq(players.city, city));
  return db.select().from(players).where(and(...conditions)).orderBy(desc(players.totalPoints)).limit(50);
}

// ─── TEAM ───
export async function createTeam(data: InsertTeam) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(teams).values(data);
  return result[0].insertId;
}

export async function getTeamById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getTeamMembers(teamId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(players).where(eq(players.teamId, teamId));
}

export async function updateTeam(id: number, data: Partial<InsertTeam>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(teams).set(data).where(eq(teams.id, id));
}

export async function searchTeams(query: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teams).where(sql`${teams.name} LIKE ${`%${query}%`}`).limit(20);
}

export async function deleteTeam(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(teams).where(eq(teams.id, id));
}

// ─── MATCH ───
export async function createMatch(data: InsertMatch) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(matches).values(data);
  return result[0].insertId;
}

export async function getMatchById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getUpcomingMatches(city?: string) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  // Home shows only confirmed matches with TWO teams assigned
  const conditions = [
    gte(matches.matchDate, now),
    eq(matches.status, "confirmed"),
    isNotNull(matches.teamBId),
  ];
  if (city) conditions.push(eq(matches.city, city));
  return db.select().from(matches).where(and(...conditions)).orderBy(asc(matches.matchDate)).limit(10);
}

export async function getPublicMatches() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  // Only show public matches that are not expired and not cancelled
  return db.select().from(matches)
    .where(and(
      eq(matches.type, "public"),
      ne(matches.status, "cancelled"),
      gte(matches.matchDate, now)
    ))
    .orderBy(desc(matches.createdAt)).limit(50);
}

export async function getPlayerMatches(playerId: number) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  // Matches where player is in the roster (upcoming + completed, not cancelled)
  const playerMatchIds = await db.select({ matchId: matchPlayers.matchId }).from(matchPlayers).where(eq(matchPlayers.playerId, playerId));
  const rosterIds = playerMatchIds.map(m => m.matchId);
  // Also include matches created by this player (as captain) — even if no roster entry yet
  const createdMatches = await db.select().from(matches)
    .where(and(eq(matches.createdBy, playerId), ne(matches.status, "cancelled")))
    .orderBy(desc(matches.matchDate));
  if (rosterIds.length === 0) return createdMatches;
  const rosterMatches = await db.select().from(matches)
    .where(and(inArray(matches.id, rosterIds), ne(matches.status, "cancelled")))
    .orderBy(desc(matches.matchDate));
  // Merge and deduplicate by id
  const all = [...createdMatches, ...rosterMatches];
  const seen = new Set<number>();
  return all.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
    .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());
}

export async function updateMatch(id: number, data: Partial<InsertMatch>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(matches).set(data).where(eq(matches.id, id));
}

// ─── MATCH PLAYERS ───
export async function addPlayerToMatch(
  matchId: number,
  playerId: number,
  teamId: number,
  teamSide: "A" | "B" = "A",
  joinStatus: "pending" | "approved" | "declined" = "approved"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(matchPlayers).values({ matchId, playerId, teamId, teamSide, joinStatus });
}

export async function updateMatchPlayerStatus(matchId: number, playerId: number, joinStatus: "pending" | "approved" | "declined") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(matchPlayers)
    .set({ joinStatus })
    .where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.playerId, playerId)));
}

export async function getMatchPlayers(matchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matchPlayers).where(eq(matchPlayers.matchId, matchId));
}

export async function getMatchPlayersBySide(matchId: number, teamSide: "A" | "B") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matchPlayers)
    .where(and(
      eq(matchPlayers.matchId, matchId),
      eq(matchPlayers.teamSide, teamSide),
      eq(matchPlayers.joinStatus, "approved")
    ));
}

export async function getMatchPlayerCount(matchId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(matchPlayers)
    .where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.joinStatus, "approved")));
  return result[0]?.count ?? 0;
}

export async function getMatchPlayerCountBySide(matchId: number, teamSide: "A" | "B") {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(matchPlayers)
    .where(and(
      eq(matchPlayers.matchId, matchId),
      eq(matchPlayers.teamSide, teamSide),
      eq(matchPlayers.joinStatus, "approved")
    ));
  return result[0]?.count ?? 0;
}

export async function getPendingJoinRequests(matchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matchPlayers)
    .where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.joinStatus, "pending")));
}

// ─── MATCH REQUESTS ───
export async function createMatchRequest(matchId: number, teamId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(matchRequests).values({ matchId, teamId });
}

export async function getMatchRequests(matchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matchRequests).where(eq(matchRequests.matchId, matchId));
}

export async function getMatchRequestById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(matchRequests).where(eq(matchRequests.id, id));
  return results[0] ?? null;
}

export async function updateMatchRequest(id: number, status: "accepted" | "rejected") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(matchRequests).set({ status }).where(eq(matchRequests.id, id));
}

// ─── POINTS & STATS AWARD ───
export async function awardMatchPoints(
  matchId: number,
  scoreA: number,
  scoreB: number,
  teamAId: number,
  teamBId: number
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const teamAWon = scoreA > scoreB;
  const teamBWon = scoreB > scoreA;
  const isDraw = scoreA === scoreB;
  const pointsA = teamAWon ? 3 : isDraw ? 1 : 0;
  const pointsB = teamBWon ? 3 : isDraw ? 1 : 0;
  const rosterA = await database.select().from(matchPlayers)
    .where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.teamSide, "A"), eq(matchPlayers.joinStatus, "approved")));
  const rosterB = await database.select().from(matchPlayers)
    .where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.teamSide, "B"), eq(matchPlayers.joinStatus, "approved")));
  for (const mp of rosterA) {
    const p = await database.select().from(players).where(eq(players.id, mp.playerId)).limit(1);
    if (p[0]) await database.update(players).set({ totalPoints: p[0].totalPoints + pointsA, totalMatches: p[0].totalMatches + 1 }).where(eq(players.id, mp.playerId));
  }
  for (const mp of rosterB) {
    const p = await database.select().from(players).where(eq(players.id, mp.playerId)).limit(1);
    if (p[0]) await database.update(players).set({ totalPoints: p[0].totalPoints + pointsB, totalMatches: p[0].totalMatches + 1 }).where(eq(players.id, mp.playerId));
  }
  const tA = await database.select().from(teams).where(eq(teams.id, teamAId)).limit(1);
  if (tA[0]) await database.update(teams).set({ totalMatches: tA[0].totalMatches + 1, totalWins: tA[0].totalWins + (teamAWon ? 1 : 0) }).where(eq(teams.id, teamAId));
  const tB = await database.select().from(teams).where(eq(teams.id, teamBId)).limit(1);
  if (tB[0]) await database.update(teams).set({ totalMatches: tB[0].totalMatches + 1, totalWins: tB[0].totalWins + (teamBWon ? 1 : 0) }).where(eq(teams.id, teamBId));
}

export async function finalizeMotmWinner(matchId: number) {
  const database = await getDb();
  if (!database) return null;
  const votes = await database.select().from(motmVotes).where(eq(motmVotes.matchId, matchId));
  if (votes.length === 0) return null;
  const counts: Record<number, number> = {};
  for (const v of votes) counts[v.votedPlayerId] = (counts[v.votedPlayerId] || 0) + 1;
  const maxVotes = Math.max(...Object.values(counts));
  const winnerId = Number(Object.entries(counts).find(([, c]) => c === maxVotes)?.[0]);
  if (!winnerId) return null;
  const winner = await database.select().from(players).where(eq(players.id, winnerId)).limit(1);
  if (winner[0]) await database.update(players).set({ motmCount: winner[0].motmCount + 1, totalPoints: winner[0].totalPoints + 2 }).where(eq(players.id, winnerId));
  await database.update(matches).set({ motmWinnerId: winnerId, motmVotingOpen: false }).where(eq(matches.id, matchId));
  return winnerId;
}

export async function updatePlayerRatingStats(matchId: number) {
  const database = await getDb();
  if (!database) return;
  const allRatings = await database.select().from(ratings).where(eq(ratings.matchId, matchId));
  const byPlayer: Record<number, number[]> = {};
  for (const r of allRatings) {
    if (!byPlayer[r.ratedPlayerId]) byPlayer[r.ratedPlayerId] = [];
    byPlayer[r.ratedPlayerId].push(r.score);
  }
  for (const [pid, scores] of Object.entries(byPlayer)) {
    const p = await database.select().from(players).where(eq(players.id, Number(pid))).limit(1);
    if (p[0]) await database.update(players).set({ totalRatings: p[0].totalRatings + scores.reduce((a, b) => a + b, 0), ratingCount: p[0].ratingCount + scores.length }).where(eq(players.id, Number(pid)));
  }
}

// ─── RATINGS ───
export async function submitRating(matchId: number, raterId: number, ratedPlayerId: number, score: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(ratings).values({ matchId, raterId, ratedPlayerId, score });
}

export async function getMatchRatings(matchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ratings).where(eq(ratings.matchId, matchId));
}

export async function hasPlayerRated(matchId: number, raterId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(ratings).where(and(eq(ratings.matchId, matchId), eq(ratings.raterId, raterId))).limit(1);
  return result.length > 0;
}

export async function getPlayerRatingsForMatch(matchId: number, playerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ratings).where(and(eq(ratings.matchId, matchId), eq(ratings.ratedPlayerId, playerId)));
}

// ─── MOTM VOTES ───
export async function submitMotmVote(matchId: number, voterId: number, votedPlayerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(motmVotes).values({ matchId, voterId, votedPlayerId });
}

export async function getMotmVotes(matchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(motmVotes).where(eq(motmVotes.matchId, matchId));
}

export async function hasPlayerVotedMotm(matchId: number, voterId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(motmVotes).where(and(eq(motmVotes.matchId, matchId), eq(motmVotes.voterId, voterId))).limit(1);
  return result.length > 0;
}

// ─── HIGHLIGHTS ───
export async function createHighlight(playerId: number, mediaUrl: string, mediaType: "photo" | "video") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  await db.delete(highlights).where(eq(highlights.playerId, playerId));
  await db.insert(highlights).values({ playerId, mediaUrl, mediaType, expiresAt });
}

export async function getActiveHighlights() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db.select().from(highlights).where(gte(highlights.expiresAt, now)).orderBy(desc(highlights.likes));
}

export async function likeHighlight(highlightId: number, playerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(highlightLikes).where(and(eq(highlightLikes.highlightId, highlightId), eq(highlightLikes.playerId, playerId))).limit(1);
  if (existing.length > 0) return false;
  await db.insert(highlightLikes).values({ highlightId, playerId });
  await db.update(highlights).set({ likes: sql`${highlights.likes} + 1` }).where(eq(highlights.id, highlightId));
  return true;
}

export async function deleteExpiredHighlights() {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  await db.delete(highlights).where(lte(highlights.expiresAt, now));
}

// ─── CHAT ───
export async function sendTeamMessage(senderId: number, teamId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(chatMessages).values({ type: "team", senderId, teamId, content });
}

export async function sendDirectMessage(senderId: number, recipientId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(chatMessages).values({ type: "direct", senderId, recipientId, content });
}

export async function getTeamMessages(teamId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages).where(and(eq(chatMessages.type, "team"), eq(chatMessages.teamId, teamId))).orderBy(desc(chatMessages.createdAt)).limit(limit);
}

export async function getDirectMessages(userId1: number, userId2: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages).where(
    and(
      eq(chatMessages.type, "direct"),
      sql`((${chatMessages.senderId} = ${userId1} AND ${chatMessages.recipientId} = ${userId2}) OR (${chatMessages.senderId} = ${userId2} AND ${chatMessages.recipientId} = ${userId1}))`
    )
  ).orderBy(desc(chatMessages.createdAt)).limit(limit);
}

export async function getConversations(playerId: number) {
  const db = await getDb();
  if (!db) return [];
  const sent = await db.select({ partnerId: chatMessages.recipientId }).from(chatMessages).where(and(eq(chatMessages.type, "direct"), eq(chatMessages.senderId, playerId)));
  const received = await db.select({ partnerId: chatMessages.senderId }).from(chatMessages).where(and(eq(chatMessages.type, "direct"), eq(chatMessages.recipientId, playerId)));
  const partnerIds = [...new Set([...sent.map(s => s.partnerId!), ...received.map(r => r.partnerId!)])];
  if (partnerIds.length === 0) return [];
  return db.select().from(players).where(inArray(players.id, partnerIds));
}

// ─── FOLLOWS ───
export async function followPlayer(followerId: number, followedId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(follows).where(and(eq(follows.followerId, followerId), eq(follows.followedId, followedId))).limit(1);
  if (existing.length > 0) return false;
  await db.insert(follows).values({ followerId, followedId });
  return true;
}

export async function unfollowPlayer(followerId: number, followedId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(follows).where(and(eq(follows.followerId, followerId), eq(follows.followedId, followedId)));
}

export async function getFollowers(playerId: number) {
  const db = await getDb();
  if (!db) return [];
  const followerIds = await db.select({ followerId: follows.followerId }).from(follows).where(eq(follows.followedId, playerId));
  if (followerIds.length === 0) return [];
  return db.select().from(players).where(inArray(players.id, followerIds.map(f => f.followerId)));
}

export async function getFollowing(playerId: number) {
  const db = await getDb();
  if (!db) return [];
  const followedIds = await db.select({ followedId: follows.followedId }).from(follows).where(eq(follows.followerId, playerId));
  if (followedIds.length === 0) return [];
  return db.select().from(players).where(inArray(players.id, followedIds.map(f => f.followedId)));
}

export async function isFollowing(followerId: number, followedId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(follows).where(and(eq(follows.followerId, followerId), eq(follows.followedId, followedId))).limit(1);
  return result.length > 0;
}

// ─── NOTIFICATIONS ───
export async function createNotification(playerId: number, type: string, title: string, message?: string, data?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({ playerId, type, title, message, data });
}

export async function getPlayerNotifications(playerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.playerId, playerId)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(playerId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.playerId, playerId));
}

// ─── CITIES & COUNTRIES ───
export function getPredefinedCities() {
  return [
    "Casablanca", "Rabat", "Marrakech", "Fès", "Tanger", "Agadir", "Meknès", "Oujda",
    "Kénitra", "Tétouan", "Safi", "Mohammedia", "El Jadida", "Béni Mellal", "Nador",
    "Taza", "Settat", "Berrechid", "Khouribga", "Laâyoune", "Paris", "Lyon", "Marseille",
    "Madrid", "Barcelona", "London", "Amsterdam", "Brussels", "Berlin", "Dubai", "Doha",
    "Riyadh", "Jeddah", "Istanbul", "Cairo", "Tunis", "Algiers"
  ];
}

export function getCountries() {
  return [
    { name: "Morocco", flag: "🇲🇦" }, { name: "France", flag: "🇫🇷" },
    { name: "Spain", flag: "🇪🇸" }, { name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    { name: "Netherlands", flag: "🇳🇱" }, { name: "Belgium", flag: "🇧🇪" },
    { name: "Germany", flag: "🇩🇪" }, { name: "UAE", flag: "🇦🇪" },
    { name: "Qatar", flag: "🇶🇦" }, { name: "Saudi Arabia", flag: "🇸🇦" },
    { name: "Turkey", flag: "🇹🇷" }, { name: "Egypt", flag: "🇪🇬" },
    { name: "Tunisia", flag: "🇹🇳" }, { name: "Algeria", flag: "🇩🇿" },
    { name: "Italy", flag: "🇮🇹" }, { name: "Portugal", flag: "🇵🇹" },
    { name: "USA", flag: "🇺🇸" }, { name: "Canada", flag: "🇨🇦" },
    { name: "Brazil", flag: "🇧🇷" }, { name: "Argentina", flag: "🇦🇷" },
  ];
}
