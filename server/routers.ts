import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── PLAYER ───
  player: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      return db.getPlayerByUserId(ctx.user.id);
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getPlayerById(input.id);
    }),
    create: protectedProcedure.input(z.object({
      fullName: z.string().min(1).max(255),
      city: z.string().min(1),
      country: z.string().min(1),
      countryFlag: z.string().optional(),
      position: z.enum(["GK", "DEF", "MID", "ATT"]),
      photoUrl: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const existing = await db.getPlayerByUserId(ctx.user.id);
      if (existing) throw new Error("Player profile already exists");
      const id = await db.createPlayer({ ...input, userId: ctx.user.id });
      return { id };
    }),
    update: protectedProcedure.input(z.object({
      fullName: z.string().min(1).max(255).optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      countryFlag: z.string().optional(),
      position: z.enum(["GK", "DEF", "MID", "ATT"]).optional(),
      photoUrl: z.string().optional(),
      availableTime: z.string().optional(),
      preferredFormat: z.string().optional(),
      isAvailable: z.boolean().optional(),
      note: z.string().max(500).optional().nullable(),
    })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");
      await db.updatePlayer(player.id, input);
      return { success: true };
    }),
    postAvailability: protectedProcedure.input(z.object({
      city: z.string().min(1),
      position: z.enum(["GK", "DEF", "MID", "ATT"]),
      availableTime: z.string().min(1),
      preferredFormat: z.string().min(1),
      note: z.string().max(500).optional(),
    })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Create player profile first");
      await db.updatePlayer(player.id, {
        city: input.city,
        position: input.position,
        availableTime: input.availableTime,
        preferredFormat: input.preferredFormat,
        isAvailable: true,
        isFreeAgent: true,
        note: input.note ?? null,
      });
      return { success: true };
    }),
    freeAgents: publicProcedure.input(z.object({ city: z.string().optional() })).query(async ({ input }) => {
      return db.getFreeAgents(input.city);
    }),
    leaderboard: publicProcedure.input(z.object({ city: z.string().optional() })).query(async ({ input }) => {
      return db.getLeaderboard(input.city);
    }),
  }),

  // ─── TEAM ───
  team: router({
    create: protectedProcedure.input(z.object({
      name: z.string().min(1).max(255),
      city: z.string().min(1),
      logoUrl: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Create player profile first");
      if (player.teamId) throw new Error("Already in a team");
      const teamId = await db.createTeam({ ...input, captainId: player.id });
      await db.updatePlayer(player.id, { teamId, isFreeAgent: false, isCaptain: true });
      return { id: teamId };
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const team = await db.getTeamById(input.id);
      if (!team) return null;
      const members = await db.getTeamMembers(input.id);
      return { ...team, members };
    }),
    members: publicProcedure.input(z.object({ teamId: z.number() })).query(async ({ input }) => {
      return db.getTeamMembers(input.teamId);
    }),
    join: protectedProcedure.input(z.object({ teamId: z.number() })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Create player profile first");
      if (player.teamId) throw new Error("Already in a team");
      await db.updatePlayer(player.id, { teamId: input.teamId, isFreeAgent: false });
      return { success: true };
    }),
    leave: protectedProcedure.mutation(async ({ ctx }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");
      if (player.isCaptain) throw new Error("Captain cannot leave team");
      await db.updatePlayer(player.id, { teamId: null, isFreeAgent: true });
      return { success: true };
    }),
    search: publicProcedure.input(z.object({ query: z.string() })).query(async ({ input }) => {
      return db.searchTeams(input.query);
    }),
    updateLogo: protectedProcedure.input(z.object({ teamId: z.number(), logoUrl: z.string() })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player || !player.isCaptain || player.teamId !== input.teamId) throw new Error("Only captain can update team logo");
      await db.updateTeam(input.teamId, { logoUrl: input.logoUrl });
      return { success: true };
    }),
    addPlayer: protectedProcedure.input(z.object({ teamId: z.number(), playerId: z.number() })).mutation(async ({ ctx, input }) => {
      const captain = await db.getPlayerByUserId(ctx.user.id);
      if (!captain || !captain.isCaptain || captain.teamId !== input.teamId) throw new Error("Only captain can add players");
      const target = await db.getPlayerById(input.playerId);
      if (!target) throw new Error("Player not found");
      if (target.teamId) throw new Error("Player already in a team");
      await db.updatePlayer(input.playerId, { teamId: input.teamId, isFreeAgent: false });
      await db.createNotification(input.playerId, "team_invite", "Team Invitation", `You have been added to a team`);
      return { success: true };
    }),
    removePlayer: protectedProcedure.input(z.object({ teamId: z.number(), playerId: z.number() })).mutation(async ({ ctx, input }) => {
      const captain = await db.getPlayerByUserId(ctx.user.id);
      if (!captain || !captain.isCaptain || captain.teamId !== input.teamId) throw new Error("Only captain can remove players");
      if (input.playerId === captain.id) throw new Error("Captain cannot remove themselves");
      const target = await db.getPlayerById(input.playerId);
      if (!target || target.teamId !== input.teamId) throw new Error("Player not in this team");
      await db.updatePlayer(input.playerId, { teamId: null, isFreeAgent: true });
      await db.createNotification(input.playerId, "team_removed", "Removed from Team", `You have been removed from the team`);
      return { success: true };
    }),
  }),

  // ─── MATCH ───
  match: router({
    create: protectedProcedure.input(z.object({
      type: z.enum(["public", "friendly"]),
      city: z.string().min(1),
      pitchName: z.string().min(1),
      matchDate: z.string(),
      format: z.enum(["5v5", "8v8", "11v11"]),
      maxPlayers: z.number().min(2),
      teamBId: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Create player profile first");
      if (!player.isCaptain || !player.teamId) throw new Error("Only team captains can create matches");
      const id = await db.createMatch({
        ...input,
        matchDate: new Date(input.matchDate),
        teamAId: player.teamId,
        teamBId: input.teamBId ?? null,
        createdBy: player.id,
        status: input.type === "friendly" && input.teamBId ? "pending" : "pending",
      });
      return { id };
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const match = await db.getMatchById(input.id);
      if (!match) return null;
      const matchPlayersList = await db.getMatchPlayers(input.id);
      const teamA = match.teamAId ? await db.getTeamById(match.teamAId) : null;
      const teamB = match.teamBId ? await db.getTeamById(match.teamBId) : null;
      // Get player details for roster
      const playerDetails = await Promise.all(matchPlayersList.map(async (mp) => {
        const p = await db.getPlayerById(mp.playerId);
        return { ...mp, player: p };
      }));
      return { ...match, teamA, teamB, players: playerDetails };
    }),
    upcoming: publicProcedure.input(z.object({ city: z.string().optional() })).query(async ({ input }) => {
      const matchList = await db.getUpcomingMatches(input.city);
      // Enrich with team data
      return Promise.all(matchList.map(async (m) => {
        const teamA = m.teamAId ? await db.getTeamById(m.teamAId) : null;
        const teamB = m.teamBId ? await db.getTeamById(m.teamBId) : null;
        const count = await db.getMatchPlayerCount(m.id);
        return { ...m, teamA, teamB, playerCount: count };
      }));
    }),
    publicFeed: publicProcedure.query(async () => {
      const matchList = await db.getPublicMatches();
      return Promise.all(matchList.map(async (m) => {
        const teamA = m.teamAId ? await db.getTeamById(m.teamAId) : null;
        const teamB = m.teamBId ? await db.getTeamById(m.teamBId) : null;
        const count = await db.getMatchPlayerCount(m.id);
        return { ...m, teamA, teamB, playerCount: count };
      }));
    }),
    myMatches: protectedProcedure.query(async ({ ctx }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) return [];
      const matchList = await db.getPlayerMatches(player.id);
      return Promise.all(matchList.map(async (m) => {
        const teamA = m.teamAId ? await db.getTeamById(m.teamAId) : null;
        const teamB = m.teamBId ? await db.getTeamById(m.teamBId) : null;
        return { ...m, teamA, teamB };
      }));
    }),
    join: protectedProcedure.input(z.object({ matchId: z.number(), teamId: z.number() })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Create player profile first");
      const match = await db.getMatchById(input.matchId);
      if (!match) throw new Error("Match not found");
      const count = await db.getMatchPlayerCount(input.matchId);
      if (count >= match.maxPlayers) throw new Error("Match is full");
      await db.addPlayerToMatch(input.matchId, player.id, input.teamId);
      return { success: true };
    }),
    requestToPlay: protectedProcedure.input(z.object({ matchId: z.number() })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player || !player.isCaptain || !player.teamId) throw new Error("Only captains can request");
      await db.createMatchRequest(input.matchId, player.teamId);
      return { success: true };
    }),
    getRequests: protectedProcedure.input(z.object({ matchId: z.number() })).query(async ({ input }) => {
      const requests = await db.getMatchRequests(input.matchId);
      return Promise.all(requests.map(async (r) => {
        const team = await db.getTeamById(r.teamId);
        return { ...r, team };
      }));
    }),
    acceptRequest: protectedProcedure.input(z.object({ requestId: z.number(), matchId: z.number() })).mutation(async ({ ctx, input }) => {
      await db.updateMatchRequest(input.requestId, "accepted");
      const requests = await db.getMatchRequests(input.matchId);
      const accepted = requests.find(r => r.id === input.requestId);
      if (accepted) {
        await db.updateMatch(input.matchId, { teamBId: accepted.teamId, status: "confirmed" });
      }
      return { success: true };
    }),
    declineRequest: protectedProcedure.input(z.object({ requestId: z.number() })).mutation(async ({ ctx, input }) => {
      await db.updateMatchRequest(input.requestId, "rejected");
      return { success: true };
    }),
    inviteTeam: protectedProcedure.input(z.object({ matchId: z.number(), teamId: z.number() })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player || !player.isCaptain) throw new Error("Only captains can invite teams");
      const match = await db.getMatchById(input.matchId);
      if (!match) throw new Error("Match not found");
      if (match.teamBId) throw new Error("Match already has an opponent");
      const targetTeam = await db.getTeamById(input.teamId);
      if (!targetTeam) throw new Error("Team not found");
      await db.createMatchRequest(input.matchId, input.teamId);
      // Notify opponent captain
      if (targetTeam.captainId) {
        await db.createNotification(targetTeam.captainId, "match_invite", "Match Invitation", `Your team has been invited to a friendly match`, JSON.stringify({ matchId: input.matchId }));
      }
      return { success: true };
    }),
    updateScore: protectedProcedure.input(z.object({
      matchId: z.number(),
      scoreA: z.number(),
      scoreB: z.number(),
    })).mutation(async ({ ctx, input }) => {
      await db.updateMatch(input.matchId, {
        scoreA: input.scoreA,
        scoreB: input.scoreB,
        status: "completed",
        ratingsOpen: true,
        motmVotingOpen: true,
        ratingsClosedAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      return { success: true };
    }),
  }),

  // ─── RATING ───
  rating: router({
    submit: protectedProcedure.input(z.object({
      matchId: z.number(),
      ratings: z.array(z.object({ playerId: z.number(), score: z.number().min(1).max(5) })),
    })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");
      const alreadyRated = await db.hasPlayerRated(input.matchId, player.id);
      if (alreadyRated) throw new Error("Already rated");
      // Verify rating only opponents
      const matchPlayersList = await db.getMatchPlayers(input.matchId);
      const myTeamPlayers = matchPlayersList.filter(mp => mp.teamId === player.teamId).map(mp => mp.playerId);
      for (const r of input.ratings) {
        if (myTeamPlayers.includes(r.playerId)) throw new Error("Cannot rate own teammates");
        if (r.playerId === player.id) throw new Error("Cannot rate yourself");
        await db.submitRating(input.matchId, player.id, r.playerId, r.score);
      }
      return { success: true };
    }),
    hasRated: protectedProcedure.input(z.object({ matchId: z.number() })).query(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) return false;
      return db.hasPlayerRated(input.matchId, player.id);
    }),
    getResults: publicProcedure.input(z.object({ matchId: z.number() })).query(async ({ input }) => {
      const allRatings = await db.getMatchRatings(input.matchId);
      // Group by rated player and compute anti-cheat average
      const byPlayer: Record<number, number[]> = {};
      for (const r of allRatings) {
        if (!byPlayer[r.ratedPlayerId]) byPlayer[r.ratedPlayerId] = [];
        byPlayer[r.ratedPlayerId].push(r.score);
      }
      const results: { playerId: number; avgRating: number; count: number }[] = [];
      for (const [pid, scores] of Object.entries(byPlayer)) {
        let filtered = [...scores];
        if (filtered.length >= 5) {
          filtered.sort((a, b) => a - b);
          filtered = filtered.slice(1, -1); // Remove highest and lowest
        }
        const avg = filtered.reduce((a, b) => a + b, 0) / filtered.length;
        results.push({ playerId: Number(pid), avgRating: Math.round(avg * 10) / 10, count: scores.length });
      }
      return results;
    }),
  }),

  // ─── MOTM ───
  motm: router({
    vote: protectedProcedure.input(z.object({
      matchId: z.number(),
      votedPlayerId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");
      if (input.votedPlayerId === player.id) throw new Error("Cannot vote for yourself");
      const alreadyVoted = await db.hasPlayerVotedMotm(input.matchId, player.id);
      if (alreadyVoted) throw new Error("Already voted");
      await db.submitMotmVote(input.matchId, player.id, input.votedPlayerId);
      return { success: true };
    }),
    hasVoted: protectedProcedure.input(z.object({ matchId: z.number() })).query(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) return false;
      return db.hasPlayerVotedMotm(input.matchId, player.id);
    }),
    getResults: publicProcedure.input(z.object({ matchId: z.number() })).query(async ({ input }) => {
      const votes = await db.getMotmVotes(input.matchId);
      const counts: Record<number, number> = {};
      for (const v of votes) {
        counts[v.votedPlayerId] = (counts[v.votedPlayerId] || 0) + 1;
      }
      const maxVotes = Math.max(...Object.values(counts), 0);
      const winners = Object.entries(counts).filter(([, c]) => c === maxVotes).map(([pid]) => Number(pid));
      return { counts, winners, totalVotes: votes.length };
    }),
  }),

  // ─── HIGHLIGHT ───
  highlight: router({
    create: protectedProcedure.input(z.object({
      mediaUrl: z.string(),
      mediaType: z.enum(["photo", "video"]),
    })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");
      await db.createHighlight(player.id, input.mediaUrl, input.mediaType);
      return { success: true };
    }),
    list: publicProcedure.query(async () => {
      const list = await db.getActiveHighlights();
      return Promise.all(list.map(async (h) => {
        const player = await db.getPlayerById(h.playerId);
        const team = player?.teamId ? await db.getTeamById(player.teamId) : null;
        return { ...h, player, team };
      }));
    }),
    like: protectedProcedure.input(z.object({ highlightId: z.number() })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");
      const liked = await db.likeHighlight(input.highlightId, player.id);
      return { success: liked };
    }),
  }),

  // ─── CHAT ───
  chat: router({
    sendTeam: protectedProcedure.input(z.object({ content: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player || !player.teamId) throw new Error("Not in a team");
      await db.sendTeamMessage(player.id, player.teamId, input.content);
      return { success: true };
    }),
    sendDirect: protectedProcedure.input(z.object({
      recipientId: z.number(),
      content: z.string().min(1),
    })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");
      await db.sendDirectMessage(player.id, input.recipientId, input.content);
      return { success: true };
    }),
    teamMessages: protectedProcedure.query(async ({ ctx }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player || !player.teamId) return [];
      const messages = await db.getTeamMessages(player.teamId);
      return Promise.all(messages.map(async (m) => {
        const sender = await db.getPlayerById(m.senderId);
        return { ...m, sender };
      }));
    }),
    directMessages: protectedProcedure.input(z.object({ partnerId: z.number() })).query(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) return [];
      const messages = await db.getDirectMessages(player.id, input.partnerId);
      return Promise.all(messages.map(async (m) => {
        const sender = await db.getPlayerById(m.senderId);
        return { ...m, sender };
      }));
    }),
    conversations: protectedProcedure.query(async ({ ctx }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) return [];
      return db.getConversations(player.id);
    }),
  }),

  // ─── FOLLOW ───
  follow: router({
    toggle: protectedProcedure.input(z.object({ playerId: z.number() })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");
      if (input.playerId === player.id) throw new Error("Cannot follow yourself");
      const isFollowingNow = await db.isFollowing(player.id, input.playerId);
      if (isFollowingNow) {
        await db.unfollowPlayer(player.id, input.playerId);
        return { following: false };
      } else {
        await db.followPlayer(player.id, input.playerId);
        return { following: true };
      }
    }),
    isFollowing: protectedProcedure.input(z.object({ playerId: z.number() })).query(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) return false;
      return db.isFollowing(player.id, input.playerId);
    }),
    followers: publicProcedure.input(z.object({ playerId: z.number() })).query(async ({ input }) => {
      return db.getFollowers(input.playerId);
    }),
    following: publicProcedure.input(z.object({ playerId: z.number() })).query(async ({ input }) => {
      return db.getFollowing(input.playerId);
    }),
  }),

  // ─── NOTIFICATION ───
  notification: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) return [];
      return db.getPlayerNotifications(player.id);
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.markNotificationRead(input.id);
      return { success: true };
    }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) return { success: false };
      await db.markAllNotificationsRead(player.id);
      return { success: true };
    }),
  }),

  // ─── REFERENCE DATA ───
  ref: router({
    cities: publicProcedure.query(() => db.getPredefinedCities()),
    countries: publicProcedure.query(() => db.getCountries()),
  }),
});

export type AppRouter = typeof appRouter;
