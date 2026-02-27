/**
 * Footsquad NPC Seed Script
 * Seeds the database with realistic NPC data to test all app systems:
 * - 12 NPC players (2 teams of 5 + 2 free agents)
 * - 2 teams (Casablanca Eagles + Rabat Lions)
 * - 3 matches (1 completed, 1 confirmed upcoming, 1 public pending)
 * - Team chat messages + direct messages
 * - Highlights with likes
 * - Follow relationships
 * - MOTM votes + ratings
 * - Match invitations (friendly + public request)
 * - Notifications for each event type
 * - Points and ratings calculated
 */

import { drizzle } from "drizzle-orm/mysql2";
import {
  users, players, teams, matches, matchPlayers,
  matchRequests, ratings, motmVotes, highlights,
  highlightLikes, chatMessages, follows, notifications,
} from "../drizzle/schema";
import * as bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const db = drizzle(DATABASE_URL);

// ─── NPC DATA ───
const NPC_PASSWORD = bcrypt.hashSync("Test1234!", 10);

const NPC_USERS = [
  // Team A: Casablanca Eagles
  { openId: "npc_youssef", name: "Youssef Alami", email: "youssef@npc.test", passwordHash: NPC_PASSWORD, loginMethod: "email" },
  { openId: "npc_karim", name: "Karim Benali", email: "karim@npc.test", passwordHash: NPC_PASSWORD, loginMethod: "email" },
  { openId: "npc_hamza", name: "Hamza Tazi", email: "hamza@npc.test", passwordHash: NPC_PASSWORD, loginMethod: "email" },
  { openId: "npc_amine", name: "Amine Chraibi", email: "amine@npc.test", passwordHash: NPC_PASSWORD, loginMethod: "email" },
  { openId: "npc_saad", name: "Saad Ouali", email: "saad@npc.test", passwordHash: NPC_PASSWORD, loginMethod: "email" },
  // Team B: Rabat Lions
  { openId: "npc_mehdi", name: "Mehdi Raji", email: "mehdi@npc.test", passwordHash: NPC_PASSWORD, loginMethod: "email" },
  { openId: "npc_omar", name: "Omar Fassi", email: "omar@npc.test", passwordHash: NPC_PASSWORD, loginMethod: "email" },
  { openId: "npc_bilal", name: "Bilal Kettani", email: "bilal@npc.test", passwordHash: NPC_PASSWORD, loginMethod: "email" },
  { openId: "npc_adam", name: "Adam Berrada", email: "adam@npc.test", passwordHash: NPC_PASSWORD, loginMethod: "email" },
  { openId: "npc_ilyas", name: "Ilyas Moussaoui", email: "ilyas@npc.test", passwordHash: NPC_PASSWORD, loginMethod: "email" },
  // Free Agents
  { openId: "npc_tariq", name: "Tariq Bensouda", email: "tariq@npc.test", passwordHash: NPC_PASSWORD, loginMethod: "email" },
  { openId: "npc_nabil", name: "Nabil Lahlou", email: "nabil@npc.test", passwordHash: NPC_PASSWORD, loginMethod: "email" },
];

async function seed() {
  console.log("🌱 Starting Footsquad NPC Seed...\n");

  // ─── 1. INSERT USERS ───
  console.log("👤 Creating NPC users...");
  for (const u of NPC_USERS) {
    await db.insert(users).values({ ...u, lastSignedIn: new Date() }).onDuplicateKeyUpdate({ set: { name: u.name } });
  }

  // Fetch user IDs
  const allUsers = await db.select().from(users);
  const userMap: Record<string, number> = {};
  for (const u of allUsers) {
    if (u.openId.startsWith("npc_")) userMap[u.openId] = u.id;
  }
  console.log(`   ✅ ${Object.keys(userMap).length} users created`);

  // ─── 2. INSERT PLAYERS ───
  console.log("⚽ Creating player profiles...");
  const playerData = [
    // Team A - Eagles (captain: Youssef)
    { openId: "npc_youssef", fullName: "Youssef Alami", city: "Casablanca", country: "Morocco", countryFlag: "🇲🇦", position: "GK" as const, isCaptain: true, isFreeAgent: false, totalMatches: 8, totalPoints: 22, totalRatings: 35.5, ratingCount: 7, motmCount: 2 },
    { openId: "npc_karim", fullName: "Karim Benali", city: "Casablanca", country: "Morocco", countryFlag: "🇲🇦", position: "DEF" as const, isCaptain: false, isFreeAgent: false, totalMatches: 7, totalPoints: 18, totalRatings: 28.0, ratingCount: 6, motmCount: 1 },
    { openId: "npc_hamza", fullName: "Hamza Tazi", city: "Casablanca", country: "Morocco", countryFlag: "🇲🇦", position: "MID" as const, isCaptain: false, isFreeAgent: false, totalMatches: 8, totalPoints: 20, totalRatings: 36.0, ratingCount: 7, motmCount: 1 },
    { openId: "npc_amine", fullName: "Amine Chraibi", city: "Casablanca", country: "Morocco", countryFlag: "🇲🇦", position: "ATT" as const, isCaptain: false, isFreeAgent: false, totalMatches: 6, totalPoints: 15, totalRatings: 24.0, ratingCount: 5, motmCount: 0 },
    { openId: "npc_saad", fullName: "Saad Ouali", city: "Casablanca", country: "Morocco", countryFlag: "🇲🇦", position: "ATT" as const, isCaptain: false, isFreeAgent: false, totalMatches: 5, totalPoints: 12, totalRatings: 19.5, ratingCount: 4, motmCount: 0 },
    // Team B - Lions (captain: Mehdi)
    { openId: "npc_mehdi", fullName: "Mehdi Raji", city: "Rabat", country: "Morocco", countryFlag: "🇲🇦", position: "GK" as const, isCaptain: true, isFreeAgent: false, totalMatches: 9, totalPoints: 24, totalRatings: 40.5, ratingCount: 8, motmCount: 3 },
    { openId: "npc_omar", fullName: "Omar Fassi", city: "Rabat", country: "Morocco", countryFlag: "🇲🇦", position: "DEF" as const, isCaptain: false, isFreeAgent: false, totalMatches: 8, totalPoints: 21, totalRatings: 33.6, ratingCount: 7, motmCount: 1 },
    { openId: "npc_bilal", fullName: "Bilal Kettani", city: "Rabat", country: "Morocco", countryFlag: "🇲🇦", position: "MID" as const, isCaptain: false, isFreeAgent: false, totalMatches: 7, totalPoints: 19, totalRatings: 29.4, ratingCount: 6, motmCount: 1 },
    { openId: "npc_adam", fullName: "Adam Berrada", city: "Rabat", country: "Morocco", countryFlag: "🇲🇦", position: "ATT" as const, isCaptain: false, isFreeAgent: false, totalMatches: 6, totalPoints: 16, totalRatings: 24.0, ratingCount: 5, motmCount: 0 },
    { openId: "npc_ilyas", fullName: "Ilyas Moussaoui", city: "Rabat", country: "Morocco", countryFlag: "🇲🇦", position: "MID" as const, isCaptain: false, isFreeAgent: false, totalMatches: 5, totalPoints: 13, totalRatings: 19.0, ratingCount: 4, motmCount: 0 },
    // Free Agents
    { openId: "npc_tariq", fullName: "Tariq Bensouda", city: "Marrakech", country: "Morocco", countryFlag: "🇲🇦", position: "ATT" as const, isCaptain: false, isFreeAgent: true, totalMatches: 3, totalPoints: 7, totalRatings: 10.5, ratingCount: 3, motmCount: 0, isAvailable: true, availableTime: "Weekends", preferredFormat: "5v5", note: "Looking for a team in Marrakech or Casablanca. Available every weekend. Fast and technical ATT." },
    { openId: "npc_nabil", fullName: "Nabil Lahlou", city: "Casablanca", country: "Morocco", countryFlag: "🇲🇦", position: "DEF" as const, isCaptain: false, isFreeAgent: true, totalMatches: 5, totalPoints: 11, totalRatings: 18.0, ratingCount: 4, motmCount: 0, isAvailable: true, availableTime: "Evenings", preferredFormat: "8v8", note: "Solid defender, 5 years experience. Available weekday evenings. Looking for serious team." },
  ];

  for (const p of playerData) {
    const uid = userMap[p.openId];
    if (!uid) continue;
    await db.insert(players).values({
      userId: uid,
      fullName: p.fullName,
      city: p.city,
      country: p.country,
      countryFlag: p.countryFlag,
      position: p.position,
      isCaptain: p.isCaptain,
      isFreeAgent: p.isFreeAgent,
      totalMatches: p.totalMatches,
      totalPoints: p.totalPoints,
      totalRatings: p.totalRatings,
      ratingCount: p.ratingCount,
      motmCount: p.motmCount,
      isAvailable: (p as any).isAvailable ?? false,
      availableTime: (p as any).availableTime ?? null,
      preferredFormat: (p as any).preferredFormat ?? null,
      note: (p as any).note ?? null,
    }).onDuplicateKeyUpdate({ set: { fullName: p.fullName } });
  }

  const allPlayers = await db.select().from(players);
  const playerMap: Record<string, number> = {};
  for (const p of allPlayers) {
    const u = allUsers.find(u => u.id === p.userId);
    if (u?.openId.startsWith("npc_")) playerMap[u.openId] = p.id;
  }
  console.log(`   ✅ ${Object.keys(playerMap).length} players created`);

  // ─── 3. INSERT TEAMS ───
  console.log("🏟️  Creating teams...");
  const eaglesId = await insertOrGetTeam("Casablanca Eagles", "Casablanca", playerMap["npc_youssef"]);
  const lionsId = await insertOrGetTeam("Rabat Lions", "Rabat", playerMap["npc_mehdi"]);

  // Assign players to teams
  const eaglesPlayers = ["npc_youssef", "npc_karim", "npc_hamza", "npc_amine", "npc_saad"];
  const lionsPlayers = ["npc_mehdi", "npc_omar", "npc_bilal", "npc_adam", "npc_ilyas"];
  for (const openId of eaglesPlayers) {
    const pid = playerMap[openId];
    if (pid) await db.update(players).set({ teamId: eaglesId, isFreeAgent: false }).where(require("drizzle-orm").eq(players.id, pid));
  }
  for (const openId of lionsPlayers) {
    const pid = playerMap[openId];
    if (pid) await db.update(players).set({ teamId: lionsId, isFreeAgent: false }).where(require("drizzle-orm").eq(players.id, pid));
  }
  console.log(`   ✅ Teams: Eagles (id=${eaglesId}), Lions (id=${lionsId})`);

  // ─── 4. INSERT MATCHES ───
  console.log("🏆 Creating matches...");

  // Match 1: COMPLETED - Eagles vs Lions (Eagles won 3-1)
  const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
  const [completedMatch] = await db.insert(matches).values({
    type: "friendly",
    status: "completed",
    city: "Casablanca",
    pitchName: "Terrain Maarif",
    matchDate: pastDate,
    format: "5v5",
    maxPlayers: 10,
    maxPlayersPerTeam: 5,
    teamAId: eaglesId,
    teamBId: lionsId,
    scoreA: 3,
    scoreB: 1,
    createdBy: playerMap["npc_youssef"],
    ratingsOpen: false,
    motmVotingOpen: false,
  }).$returningId();
  const completedMatchId = completedMatch.id;

  // Match 2: CONFIRMED - Eagles vs Lions (upcoming in 2 days)
  const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const [confirmedMatch] = await db.insert(matches).values({
    type: "public",
    status: "confirmed",
    city: "Casablanca",
    pitchName: "Complexe Al Amal",
    matchDate: futureDate,
    format: "5v5",
    maxPlayers: 10,
    maxPlayersPerTeam: 5,
    teamAId: eaglesId,
    teamBId: lionsId,
    createdBy: playerMap["npc_youssef"],
    ratingsOpen: false,
    motmVotingOpen: false,
  }).$returningId();
  const confirmedMatchId = confirmedMatch.id;

  // Match 3: PENDING PUBLIC - Eagles looking for opponent
  const futureDateB = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const [pendingMatch] = await db.insert(matches).values({
    type: "public",
    status: "pending",
    city: "Casablanca",
    pitchName: "Stade Ibn Batouta",
    matchDate: futureDateB,
    format: "8v8",
    maxPlayers: 16,
    maxPlayersPerTeam: 8,
    teamAId: eaglesId,
    createdBy: playerMap["npc_youssef"],
    ratingsOpen: false,
    motmVotingOpen: false,
  }).$returningId();
  const pendingMatchId = pendingMatch.id;

  console.log(`   ✅ Matches: completed(${completedMatchId}), confirmed(${confirmedMatchId}), pending(${pendingMatchId})`);

  // ─── 5. INSERT MATCH ROSTERS ───
  console.log("📋 Adding players to match rosters...");
  for (const openId of eaglesPlayers) {
    const pid = playerMap[openId];
    if (!pid) continue;
    await db.insert(matchPlayers).values({ matchId: completedMatchId, playerId: pid, teamId: eaglesId, teamSide: "A", joinStatus: "approved" }).catch(() => {});
    await db.insert(matchPlayers).values({ matchId: confirmedMatchId, playerId: pid, teamId: eaglesId, teamSide: "A", joinStatus: "approved" }).catch(() => {});
  }
  for (const openId of lionsPlayers) {
    const pid = playerMap[openId];
    if (!pid) continue;
    await db.insert(matchPlayers).values({ matchId: completedMatchId, playerId: pid, teamId: lionsId, teamSide: "B", joinStatus: "approved" }).catch(() => {});
    await db.insert(matchPlayers).values({ matchId: confirmedMatchId, playerId: pid, teamId: lionsId, teamSide: "B", joinStatus: "approved" }).catch(() => {});
  }
  // Pending join request for confirmed match
  await db.insert(matchPlayers).values({ matchId: confirmedMatchId, playerId: playerMap["npc_tariq"], teamId: eaglesId, teamSide: "A", joinStatus: "pending" }).catch(() => {});
  console.log("   ✅ Rosters populated");

  // ─── 6. INSERT RATINGS (for completed match) ───
  console.log("⭐ Inserting ratings...");
  // Eagles rate Lions players (anti-cheat: only rate opponents)
  const eaglesRatings = [
    { rater: "npc_youssef", rated: "npc_mehdi", score: 7.5 },
    { rater: "npc_youssef", rated: "npc_omar", score: 6.0 },
    { rater: "npc_karim", rated: "npc_bilal", score: 7.0 },
    { rater: "npc_hamza", rated: "npc_adam", score: 5.5 },
    { rater: "npc_amine", rated: "npc_ilyas", score: 6.5 },
  ];
  // Lions rate Eagles players
  const lionsRatings = [
    { rater: "npc_mehdi", rated: "npc_youssef", score: 8.0 },
    { rater: "npc_mehdi", rated: "npc_karim", score: 7.0 },
    { rater: "npc_omar", rated: "npc_hamza", score: 8.5 },
    { rater: "npc_bilal", rated: "npc_amine", score: 7.5 },
    { rater: "npc_adam", rated: "npc_saad", score: 6.5 },
  ];
  for (const r of [...eaglesRatings, ...lionsRatings]) {
    const raterId = playerMap[r.rater];
    const ratedId = playerMap[r.rated];
    if (!raterId || !ratedId) continue;
    await db.insert(ratings).values({ matchId: completedMatchId, raterId, ratedPlayerId: ratedId, score: r.score }).catch(() => {});
  }
  console.log("   ✅ 10 ratings inserted");

  // ─── 7. INSERT MOTM VOTES ───
  console.log("🏅 Inserting MOTM votes...");
  // Hamza wins MOTM (voted by 4 players from Lions side)
  const motmVoters = [
    { voter: "npc_mehdi", voted: "npc_hamza" },
    { voter: "npc_omar", voted: "npc_hamza" },
    { voter: "npc_bilal", voted: "npc_hamza" },
    { voter: "npc_adam", voted: "npc_hamza" },
    { voter: "npc_ilyas", voted: "npc_youssef" }, // 1 vote for Youssef
  ];
  for (const v of motmVoters) {
    const voterId = playerMap[v.voter];
    const votedId = playerMap[v.voted];
    if (!voterId || !votedId) continue;
    await db.insert(motmVotes).values({ matchId: completedMatchId, voterId, votedPlayerId: votedId }).catch(() => {});
  }
  // Update Hamza's MOTM count and points
  const hamzaId = playerMap["npc_hamza"];
  if (hamzaId) {
    await db.update(players).set({ motmCount: 2, totalPoints: 22 }).where(require("drizzle-orm").eq(players.id, hamzaId));
  }
  console.log("   ✅ 5 MOTM votes inserted (Hamza wins)");

  // ─── 8. INSERT HIGHLIGHTS ───
  console.log("🎬 Inserting highlights...");
  const now = new Date();
  const expires48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const expiredDate = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1h ago = expired

  const highlightData = [
    { openId: "npc_hamza", mediaUrl: "https://picsum.photos/seed/hamza1/400/711", mediaType: "photo" as const, likes: 12, expiresAt: expires48h },
    { openId: "npc_youssef", mediaUrl: "https://picsum.photos/seed/youssef1/400/711", mediaType: "photo" as const, likes: 8, expiresAt: expires48h },
    { openId: "npc_mehdi", mediaUrl: "https://picsum.photos/seed/mehdi1/400/711", mediaType: "photo" as const, likes: 15, expiresAt: expires48h },
    { openId: "npc_karim", mediaUrl: "https://picsum.photos/seed/karim1/400/711", mediaType: "photo" as const, likes: 5, expiresAt: expires48h },
    { openId: "npc_omar", mediaUrl: "https://picsum.photos/seed/omar1/400/711", mediaType: "photo" as const, likes: 9, expiresAt: expires48h },
    { openId: "npc_bilal", mediaUrl: "https://picsum.photos/seed/bilal1/400/711", mediaType: "photo" as const, likes: 3, expiresAt: expires48h },
    { openId: "npc_amine", mediaUrl: "https://picsum.photos/seed/amine1/400/711", mediaType: "photo" as const, likes: 7, expiresAt: expires48h },
    // Expired highlight (should not appear in active feed)
    { openId: "npc_saad", mediaUrl: "https://picsum.photos/seed/saad_old/400/711", mediaType: "photo" as const, likes: 2, expiresAt: expiredDate },
  ];

  const insertedHighlightIds: number[] = [];
  for (const h of highlightData) {
    const pid = playerMap[h.openId];
    if (!pid) continue;
    const [res] = await db.insert(highlights).values({ playerId: pid, mediaUrl: h.mediaUrl, mediaType: h.mediaType, likes: h.likes, expiresAt: h.expiresAt }).$returningId();
    insertedHighlightIds.push(res.id);
  }
  console.log(`   ✅ ${insertedHighlightIds.length} highlights inserted (1 expired)`);

  // ─── 9. INSERT HIGHLIGHT LIKES ───
  console.log("❤️  Inserting highlight likes...");
  // Multiple players like Hamza's highlight (first one)
  const hamzaHighlightId = insertedHighlightIds[0];
  const likers = ["npc_youssef", "npc_karim", "npc_mehdi", "npc_omar", "npc_bilal", "npc_adam", "npc_amine", "npc_saad", "npc_tariq", "npc_nabil", "npc_ilyas", "npc_hamza"];
  for (const openId of likers) {
    const pid = playerMap[openId];
    if (!pid) continue;
    await db.insert(highlightLikes).values({ highlightId: hamzaHighlightId, playerId: pid }).catch(() => {});
  }
  // Mehdi's highlight (3rd) gets 15 likes
  const mehdiHighlightId = insertedHighlightIds[2];
  const mehdiLikers = ["npc_youssef", "npc_karim", "npc_hamza", "npc_amine", "npc_saad", "npc_omar", "npc_bilal", "npc_adam", "npc_ilyas", "npc_tariq", "npc_nabil", "npc_amine", "npc_saad", "npc_karim", "npc_hamza"];
  for (const openId of mehdiLikers) {
    const pid = playerMap[openId];
    if (!pid) continue;
    await db.insert(highlightLikes).values({ highlightId: mehdiHighlightId, playerId: pid }).catch(() => {});
  }
  console.log("   ✅ Highlight likes inserted");

  // ─── 10. INSERT FOLLOWS ───
  console.log("👥 Inserting follow relationships...");
  const followPairs = [
    // Eagles follow Mehdi (top Lions player)
    { follower: "npc_youssef", followed: "npc_mehdi" },
    { follower: "npc_hamza", followed: "npc_mehdi" },
    { follower: "npc_karim", followed: "npc_mehdi" },
    // Lions follow Hamza (MOTM winner)
    { follower: "npc_mehdi", followed: "npc_hamza" },
    { follower: "npc_omar", followed: "npc_hamza" },
    { follower: "npc_bilal", followed: "npc_hamza" },
    { follower: "npc_adam", followed: "npc_hamza" },
    // Cross follows
    { follower: "npc_youssef", followed: "npc_omar" },
    { follower: "npc_amine", followed: "npc_bilal" },
    { follower: "npc_tariq", followed: "npc_youssef" },
    { follower: "npc_nabil", followed: "npc_mehdi" },
    { follower: "npc_tariq", followed: "npc_hamza" },
  ];
  for (const f of followPairs) {
    const followerId = playerMap[f.follower];
    const followedId = playerMap[f.followed];
    if (!followerId || !followedId) continue;
    await db.insert(follows).values({ followerId, followedId }).catch(() => {});
  }
  console.log(`   ✅ ${followPairs.length} follow relationships inserted`);

  // ─── 11. INSERT CHAT MESSAGES ───
  console.log("💬 Inserting chat messages...");
  const teamChatMessages = [
    { sender: "npc_youssef", content: "Bon match hier les gars ! 3-1 on les a dominés 💪", teamId: eaglesId },
    { sender: "npc_karim", content: "Hamza t'as été incroyable au milieu ! MOTM bien mérité 🏅", teamId: eaglesId },
    { sender: "npc_hamza", content: "Merci à tous ! L'équipe était au top. On remet ça dans 2 jours ?", teamId: eaglesId },
    { sender: "npc_amine", content: "Je suis dispo pour le prochain match ! 🔥", teamId: eaglesId },
    { sender: "npc_saad", content: "Pareil, je suis là. On va les écraser encore 😄", teamId: eaglesId },
    { sender: "npc_youssef", content: "Rappel : match confirmé dans 2 jours au Complexe Al Amal. 18h00. Soyez à l'heure !", teamId: eaglesId },
    // Lions team chat
    { sender: "npc_mehdi", content: "On a perdu mais c'était un bon match. On apprend et on revient plus forts.", teamId: lionsId },
    { sender: "npc_omar", content: "Leur milieu était trop fort. On doit travailler la défense.", teamId: lionsId },
    { sender: "npc_bilal", content: "Prochain match on va se venger 😤", teamId: lionsId },
    { sender: "npc_adam", content: "Je suis prêt pour la revanche ! 💪", teamId: lionsId },
    { sender: "npc_ilyas", content: "On s'entraîne quand ? Je veux améliorer mon pressing.", teamId: lionsId },
  ];
  for (const msg of teamChatMessages) {
    const senderId = playerMap[msg.sender];
    if (!senderId) continue;
    await db.insert(chatMessages).values({ type: "team", senderId, teamId: msg.teamId, content: msg.content }).catch(() => {});
  }

  // Direct messages between captains
  const dmMessages = [
    { sender: "npc_youssef", recipient: "npc_mehdi", content: "GG hier Mehdi ! Ton équipe joue bien." },
    { sender: "npc_mehdi", recipient: "npc_youssef", content: "Merci Youssef ! Hamza était inarrêtable. On se revoit dans 2 jours." },
    { sender: "npc_youssef", recipient: "npc_mehdi", content: "Oui ! Ce sera encore plus serré. Bonne chance 🤝" },
    { sender: "npc_mehdi", recipient: "npc_youssef", content: "Pareil ! À bientôt sur le terrain 🔥" },
    // Free agent DM
    { sender: "npc_tariq", recipient: "npc_youssef", content: "Salam Youssef ! J'ai vu votre match. Je cherche une équipe à Casa. Vous avez de la place ?" },
    { sender: "npc_youssef", recipient: "npc_tariq", content: "Salam Tariq ! On est complet pour l'instant mais je te contacte si on a besoin." },
  ];
  for (const msg of dmMessages) {
    const senderId = playerMap[msg.sender];
    const recipientId = playerMap[msg.recipient];
    if (!senderId || !recipientId) continue;
    await db.insert(chatMessages).values({ type: "direct", senderId, recipientId, content: msg.content }).catch(() => {});
  }
  console.log(`   ✅ ${teamChatMessages.length} team messages + ${dmMessages.length} DMs inserted`);

  // ─── 12. INSERT MATCH REQUEST (public match) ───
  console.log("📨 Inserting match requests...");
  // Lions request to play against Eagles in the pending public match
  await db.insert(matchRequests).values({ matchId: pendingMatchId, teamId: lionsId, status: "pending" }).catch(() => {});
  console.log("   ✅ Match request: Lions → pending public match");

  // ─── 13. INSERT NOTIFICATIONS ───
  console.log("🔔 Inserting notifications...");
  const notifData = [
    // Join request notification to Eagles captain
    { playerId: playerMap["npc_youssef"], type: "join_request", title: "New Join Request", message: "Tariq Bensouda wants to join your team for the upcoming match." },
    // Match invitation notification to Lions captain
    { playerId: playerMap["npc_mehdi"], type: "match_request", title: "Challenge Request", message: "Casablanca Eagles challenge you to a match at Stade Ibn Batouta!" },
    // MOTM notification to Hamza
    { playerId: playerMap["npc_hamza"], type: "motm", title: "🏅 Man of the Match!", message: "You won Man of the Match in the Eagles vs Lions game! +2 points added." },
    // Rating notification to Youssef
    { playerId: playerMap["npc_youssef"], type: "rating", title: "Match Ratings Available", message: "Ratings for Eagles vs Lions are now visible. Your average: 8.0 ⭐" },
    // Follow notification to Hamza
    { playerId: playerMap["npc_hamza"], type: "follow", title: "New Follower", message: "Mehdi Raji started following you." },
    // Follow notification to Mehdi
    { playerId: playerMap["npc_mehdi"], type: "follow", title: "New Follower", message: "Youssef Alami started following you." },
    // Match confirmed notification
    { playerId: playerMap["npc_youssef"], type: "match_confirmed", title: "Match Confirmed ✅", message: "Your match vs Rabat Lions at Complexe Al Amal is confirmed for tomorrow!" },
    { playerId: playerMap["npc_mehdi"], type: "match_confirmed", title: "Match Confirmed ✅", message: "Your match vs Casablanca Eagles at Complexe Al Amal is confirmed!" },
    // Highlight like notification
    { playerId: playerMap["npc_hamza"], type: "highlight_like", title: "❤️ 12 likes on your highlight!", message: "Your highlight is trending! 12 players liked it." },
    // DM notification
    { playerId: playerMap["npc_youssef"], type: "message", title: "New message from Tariq", message: "Salam Youssef ! J'ai vu votre match. Je cherche une équipe à Casa..." },
    { playerId: playerMap["npc_mehdi"], type: "message", title: "New message from Youssef", message: "GG hier Mehdi ! Ton équipe joue bien." },
    // Points update
    { playerId: playerMap["npc_hamza"], type: "points", title: "Points Updated 🎯", message: "You earned 5 points from the last match (Win +3, MOTM +2)." },
    { playerId: playerMap["npc_youssef"], type: "points", title: "Points Updated 🎯", message: "You earned 3 points from the Eagles vs Lions win." },
  ];
  for (const n of notifData) {
    if (!n.playerId) continue;
    await db.insert(notifications).values({ playerId: n.playerId, type: n.type, title: n.title, message: n.message, isRead: false }).catch(() => {});
  }
  console.log(`   ✅ ${notifData.length} notifications inserted`);

  // ─── SUMMARY ───
  console.log("\n✅ SEED COMPLETE!\n");
  console.log("📊 Summary:");
  console.log("   👤 12 NPC users (email: *@npc.test, password: Test1234!)");
  console.log("   ⚽ 12 player profiles (5 Eagles + 5 Lions + 2 free agents)");
  console.log("   🏟️  2 teams (Casablanca Eagles, Rabat Lions)");
  console.log("   🏆 3 matches (1 completed 3-1, 1 confirmed upcoming, 1 pending public)");
  console.log("   📋 Rosters: 5+5 approved + 1 pending join request");
  console.log("   ⭐ 10 ratings (Eagles rate Lions, Lions rate Eagles)");
  console.log("   🏅 5 MOTM votes (Hamza wins 4-1)");
  console.log("   🎬 8 highlights (7 active + 1 expired)");
  console.log("   ❤️  Highlight likes: Hamza=12, Mehdi=15");
  console.log("   👥 12 follow relationships");
  console.log("   💬 11 team chat messages + 6 DMs");
  console.log("   📨 1 match request (Lions → pending public match)");
  console.log("   🔔 13 notifications (join, MOTM, rating, follow, match, DM, points)");
  console.log("\n🔑 Test login: youssef@npc.test / Test1234! (Eagles captain)");
  console.log("🔑 Test login: mehdi@npc.test / Test1234! (Lions captain)");
  console.log("🔑 Test login: tariq@npc.test / Test1234! (Free agent)");
}

async function insertOrGetTeam(name: string, city: string, captainId: number): Promise<number> {
  const existing = await db.select().from(teams).where(require("drizzle-orm").eq(teams.name, name)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [res] = await db.insert(teams).values({ name, city, captainId, totalWins: 3, totalMatches: 8 }).$returningId();
  return res.id;
}

seed().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
