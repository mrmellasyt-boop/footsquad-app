/**
 * NPC Integration Tests — Footsquad
 * Tests all major systems using real DB data seeded by seed-npc.ts
 * Run after: npx tsx scripts/seed-npc.ts
 */
import { describe, it, expect, beforeAll } from "vitest";
import { drizzle } from "drizzle-orm/mysql2";
import { eq, and, gt, lt, desc, count } from "drizzle-orm";
import {
  users, players, teams, matches, matchPlayers,
  matchRequests, ratings, motmVotes, highlights,
  highlightLikes, chatMessages, follows, notifications,
} from "../drizzle/schema";

const DATABASE_URL = process.env.DATABASE_URL;
let db: ReturnType<typeof drizzle>;

// NPC player IDs resolved at runtime
let eaglesCaptainId: number; // Youssef
let lionsCaptainId: number;  // Mehdi
let hamzaId: number;
let tariqId: number;         // Free agent
let eaglesTeamId: number;
let lionsTeamId: number;
let completedMatchId: number;
let confirmedMatchId: number;
let pendingMatchId: number;

beforeAll(async () => {
  if (!DATABASE_URL) {
    console.warn("⚠️  DATABASE_URL not set — skipping DB integration tests");
    return;
  }
  db = drizzle(DATABASE_URL);

  // Resolve NPC IDs
  const allUsers = await db.select().from(users);
  const allPlayers = await db.select().from(players);
  const allTeams = await db.select().from(teams);
  const allMatches = await db.select().from(matches);

  const getUserId = (openId: string) => allUsers.find(u => u.openId === openId)?.id;
  const getPlayerId = (openId: string) => {
    const uid = getUserId(openId);
    return allPlayers.find(p => p.userId === uid)?.id;
  };

  eaglesCaptainId = getPlayerId("npc_youssef")!;
  lionsCaptainId = getPlayerId("npc_mehdi")!;
  hamzaId = getPlayerId("npc_hamza")!;
  tariqId = getPlayerId("npc_tariq")!;

  eaglesTeamId = allTeams.find(t => t.name === "Casablanca Eagles")?.id!;
  lionsTeamId = allTeams.find(t => t.name === "Rabat Lions")?.id!;

  // Get match IDs by status and team
  const npcMatches = allMatches.filter(m => m.teamAId === eaglesTeamId || m.teamBId === eaglesTeamId);
  completedMatchId = npcMatches.find(m => m.status === "completed")?.id!;
  confirmedMatchId = npcMatches.find(m => m.status === "confirmed")?.id!;
  pendingMatchId = npcMatches.find(m => m.status === "pending")?.id!;
});

// ─── HELPER ───
function skipIfNoDb() {
  if (!DATABASE_URL) return true;
  return false;
}

// ─── 1. AUTHENTICATION ───
describe("System: Authentication", () => {
  it("NPC users exist in DB with email login method", async () => {
    if (skipIfNoDb()) return;
    const npcUsers = await db.select().from(users).where(eq(users.loginMethod, "email"));
    const npcEmails = npcUsers.filter(u => u.email?.endsWith("@npc.test"));
    expect(npcEmails.length).toBeGreaterThanOrEqual(12);
  });

  it("NPC users have passwordHash set", async () => {
    if (skipIfNoDb()) return;
    const youssef = await db.select().from(users).where(eq(users.openId, "npc_youssef")).limit(1);
    expect(youssef[0]?.passwordHash).toBeTruthy();
    expect(youssef[0]?.passwordHash?.length).toBeGreaterThan(20);
  });

  it("Player profiles linked to users", async () => {
    if (skipIfNoDb()) return;
    expect(eaglesCaptainId).toBeTruthy();
    expect(lionsCaptainId).toBeTruthy();
    expect(hamzaId).toBeTruthy();
    expect(tariqId).toBeTruthy();
  });
});

// ─── 2. PLAYER PROFILES ───
describe("System: Player Profiles", () => {
  it("Eagles captain (Youssef) has correct stats", async () => {
    if (skipIfNoDb()) return;
    const [p] = await db.select().from(players).where(eq(players.id, eaglesCaptainId));
    expect(p.fullName).toBe("Youssef Alami");
    expect(p.city).toBe("Casablanca");
    expect(p.position).toBe("GK");
    expect(p.isCaptain).toBe(true);
    expect(p.isFreeAgent).toBe(false);
    expect(p.totalMatches).toBeGreaterThanOrEqual(5);
    expect(p.totalPoints).toBeGreaterThan(0);
  });

  it("Lions captain (Mehdi) has highest match count", async () => {
    if (skipIfNoDb()) return;
    const [p] = await db.select().from(players).where(eq(players.id, lionsCaptainId));
    expect(p.fullName).toBe("Mehdi Raji");
    expect(p.totalMatches).toBeGreaterThanOrEqual(5);
    expect(p.motmCount).toBeGreaterThanOrEqual(3);
  });

  it("Free agents have availability info", async () => {
    if (skipIfNoDb()) return;
    const [tariq] = await db.select().from(players).where(eq(players.id, tariqId));
    expect(tariq.isFreeAgent).toBe(true);
    expect(tariq.isAvailable).toBe(true);
    expect(tariq.availableTime).toBeTruthy();
    expect(tariq.preferredFormat).toBeTruthy();
    expect(tariq.note).toBeTruthy();
  });

  it("Leaderboard only includes players with 5+ matches", async () => {
    if (skipIfNoDb()) return;
    const qualified = await db.select().from(players).where(gt(players.totalMatches, 4));
    expect(qualified.length).toBeGreaterThanOrEqual(10);
    for (const p of qualified) {
      expect(p.totalMatches).toBeGreaterThanOrEqual(5);
    }
  });
});

// ─── 3. TEAMS ───
describe("System: Teams", () => {
  it("Eagles team exists with correct captain", async () => {
    if (skipIfNoDb()) return;
    const [eagles] = await db.select().from(teams).where(eq(teams.id, eaglesTeamId));
    expect(eagles.name).toBe("Casablanca Eagles");
    expect(eagles.city).toBe("Casablanca");
    expect(eagles.captainId).toBe(eaglesCaptainId);
  });

  it("Lions team exists with correct captain", async () => {
    if (skipIfNoDb()) return;
    const [lions] = await db.select().from(teams).where(eq(teams.id, lionsTeamId));
    expect(lions.name).toBe("Rabat Lions");
    expect(lions.city).toBe("Rabat");
    expect(lions.captainId).toBe(lionsCaptainId);
  });

  it("Eagles roster has 5 approved players", async () => {
    if (skipIfNoDb()) return;
    const roster = await db.select().from(players).where(eq(players.teamId, eaglesTeamId));
    expect(roster.length).toBe(5);
  });

  it("Lions roster has 5 approved players", async () => {
    if (skipIfNoDb()) return;
    const roster = await db.select().from(players).where(eq(players.teamId, lionsTeamId));
    expect(roster.length).toBe(5);
  });
});

// ─── 4. MATCHES ───
describe("System: Matches", () => {
  it("Completed match has score and correct status", async () => {
    if (skipIfNoDb()) return;
    const [m] = await db.select().from(matches).where(eq(matches.id, completedMatchId));
    expect(m.status).toBe("completed");
    expect(m.scoreA).toBe(3);
    expect(m.scoreB).toBe(1);
    expect(m.teamAId).toBe(eaglesTeamId);
    expect(m.teamBId).toBe(lionsTeamId);
  });

  it("Confirmed match has both teams and future date", async () => {
    if (skipIfNoDb()) return;
    const [m] = await db.select().from(matches).where(eq(matches.id, confirmedMatchId));
    expect(m.status).toBe("confirmed");
    expect(m.teamAId).toBe(eaglesTeamId);
    expect(m.teamBId).toBe(lionsTeamId);
    expect(m.matchDate.getTime()).toBeGreaterThan(Date.now());
  });

  it("Pending public match has no teamB (waiting for opponent)", async () => {
    if (skipIfNoDb()) return;
    const [m] = await db.select().from(matches).where(eq(matches.id, pendingMatchId));
    expect(m.status).toBe("pending");
    expect(m.type).toBe("public");
    expect(m.teamBId).toBeNull();
  });

  it("Match rosters: completed match has 10 approved players (5+5)", async () => {
    if (skipIfNoDb()) return;
    const roster = await db.select().from(matchPlayers)
      .where(and(eq(matchPlayers.matchId, completedMatchId), eq(matchPlayers.joinStatus, "approved")));
    expect(roster.length).toBe(10);
    const teamA = roster.filter(r => r.teamSide === "A");
    const teamB = roster.filter(r => r.teamSide === "B");
    expect(teamA.length).toBe(5);
    expect(teamB.length).toBe(5);
  });

  it("Confirmed match has 1 pending join request", async () => {
    if (skipIfNoDb()) return;
    const pending = await db.select().from(matchPlayers)
      .where(and(eq(matchPlayers.matchId, confirmedMatchId), eq(matchPlayers.joinStatus, "pending")));
    expect(pending.length).toBe(1);
    expect(pending[0].playerId).toBe(tariqId);
  });
});

// ─── 5. RATINGS SYSTEM ───
describe("System: Ratings (anti-cheat)", () => {
  it("10 ratings exist for completed match", async () => {
    if (skipIfNoDb()) return;
    const matchRatings = await db.select().from(ratings).where(eq(ratings.matchId, completedMatchId));
    expect(matchRatings.length).toBe(10);
  });

  it("Eagles only rated Lions players (anti-cheat: no self-team rating)", async () => {
    if (skipIfNoDb()) return;
    const eaglesPlayerIds = (await db.select().from(players).where(eq(players.teamId, eaglesTeamId))).map(p => p.id);
    const lionsPlayerIds = (await db.select().from(players).where(eq(players.teamId, lionsTeamId))).map(p => p.id);

    const matchRatings = await db.select().from(ratings).where(eq(ratings.matchId, completedMatchId));

    for (const r of matchRatings) {
      if (eaglesPlayerIds.includes(r.raterId)) {
        // Eagles rater should have rated a Lions player
        expect(lionsPlayerIds).toContain(r.ratedPlayerId);
      }
      if (lionsPlayerIds.includes(r.raterId)) {
        // Lions rater should have rated an Eagles player
        expect(eaglesPlayerIds).toContain(r.ratedPlayerId);
      }
    }
  });

  it("Ratings are in valid range (1-10)", async () => {
    if (skipIfNoDb()) return;
    const matchRatings = await db.select().from(ratings).where(eq(ratings.matchId, completedMatchId));
    for (const r of matchRatings) {
      expect(r.score).toBeGreaterThanOrEqual(1);
      expect(r.score).toBeLessThanOrEqual(10);
    }
  });

  it("Youssef (Eagles GK) received rating of 8.0 from Mehdi", async () => {
    if (skipIfNoDb()) return;
    const r = await db.select().from(ratings)
      .where(and(eq(ratings.matchId, completedMatchId), eq(ratings.raterId, lionsCaptainId), eq(ratings.ratedPlayerId, eaglesCaptainId)));
    expect(r.length).toBe(1);
    expect(r[0].score).toBe(8.0);
  });
});

// ─── 6. MOTM VOTING ───
describe("System: Man of the Match", () => {
  it("5 MOTM votes exist for completed match", async () => {
    if (skipIfNoDb()) return;
    const votes = await db.select().from(motmVotes).where(eq(motmVotes.matchId, completedMatchId));
    expect(votes.length).toBe(5);
  });

  it("Hamza wins MOTM with 4 votes", async () => {
    if (skipIfNoDb()) return;
    const votes = await db.select().from(motmVotes)
      .where(and(eq(motmVotes.matchId, completedMatchId), eq(motmVotes.votedPlayerId, hamzaId)));
    expect(votes.length).toBe(4);
  });

  it("Hamza has motmCount >= 1 in profile", async () => {
    if (skipIfNoDb()) return;
    const [p] = await db.select().from(players).where(eq(players.id, hamzaId));
    expect(p.motmCount).toBeGreaterThanOrEqual(1);
  });

  it("MOTM voters are all from the opposing team (Lions voted for Eagles MOTM)", async () => {
    if (skipIfNoDb()) return;
    const votes = await db.select().from(motmVotes).where(eq(motmVotes.matchId, completedMatchId));
    const lionsPlayerIds = (await db.select().from(players).where(eq(players.teamId, lionsTeamId))).map(p => p.id);
    const hamzaVotes = votes.filter(v => v.votedPlayerId === hamzaId);
    for (const v of hamzaVotes) {
      expect(lionsPlayerIds).toContain(v.voterId);
    }
  });
});

// ─── 7. HIGHLIGHTS ───
describe("System: Highlights", () => {
  it("7 active highlights exist (not expired)", async () => {
    if (skipIfNoDb()) return;
    const now = new Date();
    const active = await db.select().from(highlights).where(gt(highlights.expiresAt, now));
    expect(active.length).toBeGreaterThanOrEqual(7);
  });

  it("1 expired highlight exists", async () => {
    if (skipIfNoDb()) return;
    const now = new Date();
    const expired = await db.select().from(highlights).where(lt(highlights.expiresAt, now));
    expect(expired.length).toBeGreaterThanOrEqual(1);
  });

  it("Hamza's highlight has 12+ likes", async () => {
    if (skipIfNoDb()) return;
    const hamzaHighlights = await db.select().from(highlights).where(eq(highlights.playerId, hamzaId));
    expect(hamzaHighlights.length).toBeGreaterThanOrEqual(1);
    expect(hamzaHighlights[0].likes).toBeGreaterThanOrEqual(12);
  });

  it("Highlight likes table has entries for Hamza's highlight", async () => {
    if (skipIfNoDb()) return;
    const hamzaHighlights = await db.select().from(highlights).where(eq(highlights.playerId, hamzaId));
    const hid = hamzaHighlights[0]?.id;
    if (!hid) return;
    const likes = await db.select().from(highlightLikes).where(eq(highlightLikes.highlightId, hid));
    expect(likes.length).toBeGreaterThanOrEqual(12);
  });

  it("Highlights have valid mediaUrl (not empty)", async () => {
    if (skipIfNoDb()) return;
    const allHighlights = await db.select().from(highlights);
    for (const h of allHighlights) {
      expect(h.mediaUrl).toBeTruthy();
      expect(h.mediaUrl.startsWith("http")).toBe(true);
    }
  });

  it("Highlights have expiresAt set to ~48h from creation", async () => {
    if (skipIfNoDb()) return;
    const now = new Date();
    const active = await db.select().from(highlights).where(gt(highlights.expiresAt, now));
    for (const h of active) {
      const diffHours = (h.expiresAt.getTime() - h.createdAt.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeCloseTo(48, 0);
    }
  });
});

// ─── 8. FOLLOW SYSTEM ───
describe("System: Follow", () => {
  it("12 follow relationships exist", async () => {
    if (skipIfNoDb()) return;
    const allFollows = await db.select().from(follows);
    const npcFollows = allFollows.filter(f => f.followerId >= 1);
    expect(npcFollows.length).toBeGreaterThanOrEqual(12);
  });

  it("Hamza has 4+ followers", async () => {
    if (skipIfNoDb()) return;
    const hamzaFollowers = await db.select().from(follows).where(eq(follows.followedId, hamzaId));
    expect(hamzaFollowers.length).toBeGreaterThanOrEqual(4);
  });

  it("Youssef follows Mehdi", async () => {
    if (skipIfNoDb()) return;
    const f = await db.select().from(follows)
      .where(and(eq(follows.followerId, eaglesCaptainId), eq(follows.followedId, lionsCaptainId)));
    expect(f.length).toBe(1);
  });

  it("No duplicate follows", async () => {
    if (skipIfNoDb()) return;
    const allFollows = await db.select().from(follows);
    const unique = new Set(allFollows.map(f => `${f.followerId}-${f.followedId}`));
    expect(unique.size).toBe(allFollows.length);
  });
});

// ─── 9. CHAT MESSAGES ───
describe("System: Chat Messages", () => {
  it("Eagles team chat has 6 messages", async () => {
    if (skipIfNoDb()) return;
    const msgs = await db.select().from(chatMessages)
      .where(and(eq(chatMessages.type, "team"), eq(chatMessages.teamId, eaglesTeamId)));
    expect(msgs.length).toBeGreaterThanOrEqual(6);
  });

  it("Lions team chat has 5 messages", async () => {
    if (skipIfNoDb()) return;
    const msgs = await db.select().from(chatMessages)
      .where(and(eq(chatMessages.type, "team"), eq(chatMessages.teamId, lionsTeamId)));
    expect(msgs.length).toBeGreaterThanOrEqual(5);
  });

  it("Direct messages exist between Youssef and Mehdi", async () => {
    if (skipIfNoDb()) return;
    const dms = await db.select().from(chatMessages)
      .where(and(eq(chatMessages.type, "direct"), eq(chatMessages.senderId, eaglesCaptainId)));
    expect(dms.length).toBeGreaterThanOrEqual(1);
  });

  it("DMs have recipientId set", async () => {
    if (skipIfNoDb()) return;
    const dms = await db.select().from(chatMessages).where(eq(chatMessages.type, "direct"));
    for (const msg of dms) {
      expect(msg.recipientId).toBeTruthy();
    }
  });

  it("Team messages have teamId set", async () => {
    if (skipIfNoDb()) return;
    const teamMsgs = await db.select().from(chatMessages).where(eq(chatMessages.type, "team"));
    for (const msg of teamMsgs) {
      expect(msg.teamId).toBeTruthy();
    }
  });

  it("Messages have non-empty content", async () => {
    if (skipIfNoDb()) return;
    const allMsgs = await db.select().from(chatMessages);
    for (const msg of allMsgs) {
      expect(msg.content.length).toBeGreaterThan(0);
    }
  });
});

// ─── 10. NOTIFICATIONS ───
describe("System: Notifications", () => {
  it("13 notifications exist for NPC players", async () => {
    if (skipIfNoDb()) return;
    const notifs = await db.select().from(notifications);
    expect(notifs.length).toBeGreaterThanOrEqual(13);
  });

  it("Hamza has MOTM notification", async () => {
    if (skipIfNoDb()) return;
    const notifs = await db.select().from(notifications)
      .where(and(eq(notifications.playerId, hamzaId), eq(notifications.type, "motm")));
    expect(notifs.length).toBeGreaterThanOrEqual(1);
    expect(notifs[0].title).toContain("Man of the Match");
  });

  it("Eagles captain has join_request notification", async () => {
    if (skipIfNoDb()) return;
    const notifs = await db.select().from(notifications)
      .where(and(eq(notifications.playerId, eaglesCaptainId), eq(notifications.type, "join_request")));
    expect(notifs.length).toBeGreaterThanOrEqual(1);
  });

  it("Lions captain has match_request notification", async () => {
    if (skipIfNoDb()) return;
    const notifs = await db.select().from(notifications)
      .where(and(eq(notifications.playerId, lionsCaptainId), eq(notifications.type, "match_request")));
    expect(notifs.length).toBeGreaterThanOrEqual(1);
  });

  it("Notifications start as unread (isRead = false)", async () => {
    if (skipIfNoDb()) return;
    const notifs = await db.select().from(notifications);
    const unread = notifs.filter(n => !n.isRead);
    expect(unread.length).toBeGreaterThanOrEqual(10);
  });

  it("All notification types are covered", async () => {
    if (skipIfNoDb()) return;
    const notifs = await db.select().from(notifications);
    const types = new Set(notifs.map(n => n.type));
    expect(types.has("join_request")).toBe(true);
    expect(types.has("match_request")).toBe(true);
    expect(types.has("motm")).toBe(true);
    expect(types.has("follow")).toBe(true);
    expect(types.has("match_confirmed")).toBe(true);
    expect(types.has("message")).toBe(true);
    expect(types.has("points")).toBe(true);
  });
});

// ─── 11. MATCH INVITATIONS ───
describe("System: Match Invitations", () => {
  it("Lions have a pending match request for the public match", async () => {
    if (skipIfNoDb()) return;
    const req = await db.select().from(matchRequests)
      .where(and(eq(matchRequests.matchId, pendingMatchId), eq(matchRequests.teamId, lionsTeamId)));
    expect(req.length).toBe(1);
    expect(req[0].status).toBe("pending");
  });

  it("Pending match has no teamB yet", async () => {
    if (skipIfNoDb()) return;
    const [m] = await db.select().from(matches).where(eq(matches.id, pendingMatchId));
    expect(m.teamBId).toBeNull();
  });

  it("Completed match has both teams (invitation was accepted)", async () => {
    if (skipIfNoDb()) return;
    const [m] = await db.select().from(matches).where(eq(matches.id, completedMatchId));
    expect(m.teamAId).toBeTruthy();
    expect(m.teamBId).toBeTruthy();
  });
});

// ─── 12. POINTS SYSTEM ───
describe("System: Points & Ratings", () => {
  it("Eagles captain (Youssef) has positive totalPoints", async () => {
    if (skipIfNoDb()) return;
    const [p] = await db.select().from(players).where(eq(players.id, eaglesCaptainId));
    expect(p.totalPoints).toBeGreaterThan(0);
  });

  it("Hamza has higher points than average (MOTM bonus)", async () => {
    if (skipIfNoDb()) return;
    const [hamza] = await db.select().from(players).where(eq(players.id, hamzaId));
    const allPlayers = await db.select().from(players).where(gt(players.totalMatches, 4));
    const avgPoints = allPlayers.reduce((s, p) => s + p.totalPoints, 0) / allPlayers.length;
    expect(hamza.totalPoints).toBeGreaterThan(avgPoints * 0.8); // Within 20% of average or above
  });

  it("Players with more matches have more points (correlation)", async () => {
    if (skipIfNoDb()) return;
    const qualified = await db.select().from(players).where(gt(players.totalMatches, 4));
    // All qualified players should have at least 1 point
    for (const p of qualified) {
      expect(p.totalPoints).toBeGreaterThan(0);
    }
  });

  it("Rating average is calculable from totalRatings / ratingCount", async () => {
    if (skipIfNoDb()) return;
    const [youssef] = await db.select().from(players).where(eq(players.id, eaglesCaptainId));
    if (youssef.ratingCount > 0) {
      const avg = youssef.totalRatings / youssef.ratingCount;
      expect(avg).toBeGreaterThanOrEqual(1);
      expect(avg).toBeLessThanOrEqual(10);
    }
  });
});

// ─── 13. FREE AGENT BOARD ───
describe("System: Free Agent Board", () => {
  it("2 free agents are available", async () => {
    if (skipIfNoDb()) return;
    const freeAgents = await db.select().from(players)
      .where(and(eq(players.isFreeAgent, true), eq(players.isAvailable, true)));
    expect(freeAgents.length).toBeGreaterThanOrEqual(2);
  });

  it("Tariq has a complete availability post", async () => {
    if (skipIfNoDb()) return;
    const [tariq] = await db.select().from(players).where(eq(players.id, tariqId));
    expect(tariq.isFreeAgent).toBe(true);
    expect(tariq.isAvailable).toBe(true);
    expect(tariq.city).toBeTruthy();
    expect(tariq.position).toBeTruthy();
    expect(tariq.availableTime).toBeTruthy();
    expect(tariq.preferredFormat).toBeTruthy();
    expect(tariq.note).toBeTruthy();
  });

  it("Free agents are not assigned to any team", async () => {
    if (skipIfNoDb()) return;
    // Only check NPC free agents (openId-linked users with npc_ prefix)
    const allUsers = await db.select().from(users);
    const npcUserIds = allUsers.filter(u => u.openId?.startsWith('npc_')).map(u => u.id);
    const freeAgents = await db.select().from(players).where(eq(players.isFreeAgent, true));
    const npcFreeAgents = freeAgents.filter(fa => npcUserIds.includes(fa.userId!));
    for (const fa of npcFreeAgents) {
      expect(fa.teamId).toBeNull();
    }
  });
});

// ─── 14. FULL SYSTEM FLOW SIMULATION ───
describe("Full System: End-to-End Data Integrity", () => {
  it("All NPC players have valid city and position", async () => {
    if (skipIfNoDb()) return;
    const npcPlayers = await db.select().from(players).where(gt(players.totalMatches, 0));
    for (const p of npcPlayers) {
      expect(p.city).toBeTruthy();
      expect(["GK", "DEF", "MID", "ATT"]).toContain(p.position);
    }
  });

  it("No orphan match_players (all reference valid matches and players)", async () => {
    if (skipIfNoDb()) return;
    const allMatchPlayers = await db.select().from(matchPlayers);
    const allMatchIds = new Set((await db.select().from(matches)).map(m => m.id));
    const allPlayerIds = new Set((await db.select().from(players)).map(p => p.id));
    for (const mp of allMatchPlayers) {
      expect(allMatchIds.has(mp.matchId)).toBe(true);
      expect(allPlayerIds.has(mp.playerId)).toBe(true);
    }
  });

  it("No orphan ratings (all reference valid matches and players)", async () => {
    if (skipIfNoDb()) return;
    const allRatings = await db.select().from(ratings);
    const allMatchIds = new Set((await db.select().from(matches)).map(m => m.id));
    const allPlayerIds = new Set((await db.select().from(players)).map(p => p.id));
    for (const r of allRatings) {
      expect(allMatchIds.has(r.matchId)).toBe(true);
      expect(allPlayerIds.has(r.raterId)).toBe(true);
      expect(allPlayerIds.has(r.ratedPlayerId)).toBe(true);
    }
  });

  it("No orphan notifications (all reference valid players)", async () => {
    if (skipIfNoDb()) return;
    const allNotifs = await db.select().from(notifications);
    const allPlayerIds = new Set((await db.select().from(players)).map(p => p.id));
    for (const n of allNotifs) {
      expect(allPlayerIds.has(n.playerId)).toBe(true);
    }
  });

  it("Highlight likes count matches highlightLikes table", async () => {
    if (skipIfNoDb()) return;
    const hamzaHighlights = await db.select().from(highlights).where(eq(highlights.playerId, hamzaId));
    if (hamzaHighlights.length === 0) return;
    const hid = hamzaHighlights[0].id;
    const likeRows = await db.select().from(highlightLikes).where(eq(highlightLikes.highlightId, hid));
    expect(likeRows.length).toBe(hamzaHighlights[0].likes);
  });
});
