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
    search: publicProcedure.input(z.object({ query: z.string().min(1) })).query(async ({ input }) => {
      return db.searchPlayers(input.query);
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
    stats: publicProcedure.input(z.object({ teamId: z.number() })).query(async ({ input }) => {
      return db.getTeamStats(input.teamId);
    }),
    topPlayer: publicProcedure.input(z.object({ teamId: z.number() })).query(async ({ input }) => {
      return db.getTeamTopPlayer(input.teamId);
    }),
    openChallenge: publicProcedure.input(z.object({ teamId: z.number() })).query(async ({ input }) => {
      const challenges = await db.getTeamChallenges(input.teamId);
      return challenges.find((c) => c.status === "open") ?? null;
    }),
    deleteTeam: protectedProcedure.input(z.object({ teamId: z.number() })).mutation(async ({ ctx, input }) => {
      const captain = await db.getPlayerByUserId(ctx.user.id);
      if (!captain || !captain.isCaptain || captain.teamId !== input.teamId) throw new Error("Only captain can delete team");
      // Remove all members from team
      const members = await db.getTeamMembers(input.teamId);
      for (const m of members) {
        await db.updatePlayer(m.id, { teamId: null, isFreeAgent: true, isCaptain: false });
        if (m.id !== captain.id) {
          await db.createNotification(m.id, "team_removed", "Team Disbanded", `Your team has been disbanded by the captain.`);
        }
      }
      await db.deleteTeam(input.teamId);
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
      // Friendly matches start as 'pending' (awaiting opponent acceptance)
      // Public matches start as 'pending' (awaiting a challenger via requestToPlay)
      const id = await db.createMatch({
        ...input,
        matchDate: new Date(input.matchDate),
        teamAId: player.teamId,
        teamBId: null, // teamBId is NEVER set at creation — only after opponent accepts
        createdBy: player.id,
        status: "pending",
      });
      // Auto-add captain to Team A roster (approved) so they get points
      await db.addPlayerToMatch(id, player.id, player.teamId, "A", "approved");
      return { id };
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const match = await db.getMatchById(input.id);
      if (!match) return null;
      const allMatchPlayers = await db.getMatchPlayers(input.id);
      const teamA = match.teamAId ? await db.getTeamById(match.teamAId) : null;
      const teamB = match.teamBId ? await db.getTeamById(match.teamBId) : null;
      // Build rosters per side with player details
      const enriched = await Promise.all(allMatchPlayers.map(async (mp) => {
        const p = await db.getPlayerById(mp.playerId);
        return { ...mp, player: p };
      }));
      const rosterA = enriched.filter(mp => mp.teamSide === "A" && mp.joinStatus === "approved");
      const rosterB = enriched.filter(mp => mp.teamSide === "B" && mp.joinStatus === "approved");
      const pendingRequests = enriched.filter(mp => mp.joinStatus === "pending");
      const countA = rosterA.length;
      const countB = rosterB.length;
      return { ...match, teamA, teamB, rosterA, rosterB, pendingRequests, countA, countB, players: enriched };
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
    join: protectedProcedure.input(z.object({
      matchId: z.number(),
      teamId: z.number(),
      teamSide: z.enum(["A", "B"]),
    })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Create player profile first");
      const match = await db.getMatchById(input.matchId);
      if (!match) throw new Error("Match not found");
      // Check per-team limit
      const sideCount = await db.getMatchPlayerCountBySide(input.matchId, input.teamSide);
      if (sideCount >= match.maxPlayersPerTeam) throw new Error(`Team ${input.teamSide} is full`);
      // Check if player already in this match
      const existing = await db.getMatchPlayers(input.matchId);
      if (existing.some(mp => mp.playerId === player.id)) throw new Error("Already in this match");
      // Captain cannot join their own team's match via Join (they are auto-added at creation)
      const matchForCheck = await db.getMatchById(input.matchId);
      if (matchForCheck && (matchForCheck.teamAId === player.teamId || matchForCheck.teamBId === player.teamId) && player.isCaptain) {
        throw new Error("As captain, you are already part of this match");
      }
      // Add as pending - captain must approve
      await db.addPlayerToMatch(input.matchId, player.id, input.teamId, input.teamSide, "pending");
      // Notify the correct team captain based on teamSide
      const teamIdForSide = input.teamSide === "A" ? match.teamAId : match.teamBId;
      const notifyTeamId = teamIdForSide ?? input.teamId;
      const team = notifyTeamId != null ? await db.getTeamById(notifyTeamId as number) : null;
      if (team) {
        const captain = await db.getPlayerById(team.captainId);
        if (captain) {
          await db.createNotification(
            captain.id,
            "join_request",
            `⚽ Join Request: ${player.fullName}`,
            `${player.fullName} wants to join your team (${team.name}) for the match on ${new Date(match.matchDate).toLocaleDateString()}. Tap to approve or decline.`,
            JSON.stringify({ matchId: input.matchId, playerId: player.id, teamSide: input.teamSide })
          );
        }
      }
      return { success: true, status: "pending" };
    }),
    approveJoin: protectedProcedure.input(z.object({
      matchId: z.number(),
      playerId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      const captain = await db.getPlayerByUserId(ctx.user.id);
      if (!captain || !captain.isCaptain) throw new Error("Only captains can approve");
      await db.updateMatchPlayerStatus(input.matchId, input.playerId, "approved");
      // Notify the player
      await db.createNotification(
        input.playerId,
        "join_approved",
        "Join Request Approved!",
        `Your request to join the match has been approved. You're in the roster!`,
        JSON.stringify({ matchId: input.matchId })
      );
      return { success: true };
    }),
    declineJoin: protectedProcedure.input(z.object({
      matchId: z.number(),
      playerId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      const captain = await db.getPlayerByUserId(ctx.user.id);
      if (!captain || !captain.isCaptain) throw new Error("Only captains can decline");
      await db.updateMatchPlayerStatus(input.matchId, input.playerId, "declined");
      // Notify the player
      await db.createNotification(
        input.playerId,
        "join_declined",
        "Join Request Declined",
        `Your request to join the match was declined by the captain.`,
        JSON.stringify({ matchId: input.matchId })
      );
      return { success: true };
    }),
    myJoinStatus: protectedProcedure.input(z.object({ matchId: z.number() })).query(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) return null;
      const allPlayers = await db.getMatchPlayers(input.matchId);
      const entry = allPlayers.find(mp => mp.playerId === player.id);
      return entry ? { status: entry.joinStatus, teamSide: entry.teamSide } : null;
    }),
    requestToPlay: protectedProcedure.input(z.object({ matchId: z.number() })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player || !player.isCaptain || !player.teamId) throw new Error("Only captains can request");
      const match = await db.getMatchById(input.matchId);
      if (!match) throw new Error("Match not found");
      if (match.type !== "public") throw new Error("Only public matches accept requests");
      if (match.teamBId) throw new Error("Match already has an opponent");
      if (match.teamAId === player.teamId) throw new Error("Cannot request to play against your own team");
      // Check if already requested
      const existing = await db.getMatchRequests(input.matchId);
      if (existing.some((r: any) => r.teamId === player.teamId && r.status === "pending")) {
        throw new Error("Request already sent");
      }
      await db.createMatchRequest(input.matchId, player.teamId);
      // Notify match creator captain
      const creatorTeam = await db.getTeamById(match.teamAId);
      if (creatorTeam?.captainId) {
        const requestingTeam = await db.getTeamById(player.teamId);
        await db.createNotification(
          creatorTeam.captainId,
          "play_request",
          "New Challenge Request",
          `${requestingTeam?.name ?? "A team"} wants to play against your team`,
          JSON.stringify({ matchId: input.matchId, teamId: player.teamId })
        );
      }
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
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player || !player.isCaptain) throw new Error("Only captains can accept requests");
      await db.updateMatchRequest(input.requestId, "accepted");
      const requests = await db.getMatchRequests(input.matchId);
      const accepted = requests.find((r: any) => r.id === input.requestId);
      if (accepted) {
        // Assign teamB and confirm the match
        await db.updateMatch(input.matchId, { teamBId: accepted.teamId, status: "confirmed" });
        // Decline all other pending requests for this match
        const otherPending = requests.filter((r: any) => r.id !== input.requestId && r.status === "pending");
        for (const other of otherPending) {
          await db.updateMatchRequest(other.id, "rejected");
        }
        // Notify the accepted team captain
        const acceptedTeam = await db.getTeamById(accepted.teamId);
        if (acceptedTeam?.captainId) {
          const match = await db.getMatchById(input.matchId);
          const creatorTeam = match?.teamAId ? await db.getTeamById(match.teamAId) : null;
          await db.createNotification(
            acceptedTeam.captainId,
            "play_request_accepted",
            "Challenge Accepted!",
            `${creatorTeam?.name ?? "The team"} accepted your challenge request. Match is confirmed!`,
            JSON.stringify({ matchId: input.matchId })
          );
        }
      }
      return { success: true };
    }),
    declineRequest: protectedProcedure.input(z.object({ requestId: z.number() })).mutation(async ({ ctx, input }) => {
      await db.updateMatchRequest(input.requestId, "rejected");
      // Notify the declined team captain
      const allRequests = await db.getMatchRequestById(input.requestId);
      if (allRequests?.teamId) {
        const declinedTeam = await db.getTeamById(allRequests.teamId);
        if (declinedTeam?.captainId) {
          await db.createNotification(
            declinedTeam.captainId,
            "play_request_declined",
            "Challenge Declined",
            `Your challenge request was declined. Keep looking for a match!`,
            JSON.stringify({ matchId: allRequests.matchId })
          );
        }
      }
      return { success: true };
    }),
    inviteTeam: protectedProcedure.input(z.object({ matchId: z.number(), teamId: z.number() })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player || !player.isCaptain) throw new Error("Only captains can invite teams");
      const match = await db.getMatchById(input.matchId);
      if (!match) throw new Error("Match not found");
      if (match.type !== "friendly") throw new Error("Only friendly matches can be invited");
      // Check if match already has a CONFIRMED opponent (teamBId set)
      if (match.teamBId) throw new Error("Match already has a confirmed opponent");
      // Check if this team already has a pending invite for this match
      const existingRequests = await db.getMatchRequests(input.matchId);
      if (existingRequests.some((r: any) => r.teamId === input.teamId && r.status === "pending")) {
        throw new Error("This team already has a pending invite");
      }
      const targetTeam = await db.getTeamById(input.teamId);
      if (!targetTeam) throw new Error("Team not found");
      await db.createMatchRequest(input.matchId, input.teamId);
      // Notify opponent captain
      if (targetTeam.captainId) {
        const creatorTeam = match.teamAId ? await db.getTeamById(match.teamAId) : null;
        await db.createNotification(
          targetTeam.captainId,
          "match_invite",
          "Friendly Match Invitation",
          `${creatorTeam?.name ?? "A team"} has invited your team to a friendly match on ${new Date(match.matchDate).toLocaleDateString()}`,
          JSON.stringify({ matchId: input.matchId })
        );
      }
      return { success: true };
    }),

    // Accept a friendly match invitation directly (from notification or match page)
    // This replaces the old acceptRequest flow for friendly matches
    acceptInvitation: protectedProcedure.input(z.object({ matchId: z.number() })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player || !player.isCaptain) throw new Error("Only captains can accept invitations");
      const match = await db.getMatchById(input.matchId);
      if (!match) throw new Error("Match not found");
      if (match.type !== "friendly") throw new Error("Only friendly matches can be accepted this way");
      if (match.teamBId) throw new Error("Match already has a confirmed opponent");
      // Find the pending invite for this captain's team
      const requests = await db.getMatchRequests(input.matchId);
      const invite = requests.find((r: any) => r.teamId === player.teamId && r.status === "pending");
      if (!invite) throw new Error("No pending invitation found for your team");
      // Accept: set teamB + confirm match
      await db.updateMatchRequest(invite.id, "accepted");
      await db.updateMatch(input.matchId, { teamBId: player.teamId, status: "confirmed" });
      // Decline other pending invites
      const others = requests.filter((r: any) => r.id !== invite.id && r.status === "pending");
      for (const other of others) await db.updateMatchRequest(other.id, "rejected");
      // Notify creator captain
      const teamAId: number | null = match.teamAId ?? null;
      const creatorTeam = teamAId != null ? await db.getTeamById(teamAId as number) : null;
      const acceptorTeam = player.teamId != null ? await db.getTeamById(player.teamId as number) : null;
      if (creatorTeam?.captainId) {
        await db.createNotification(
          creatorTeam.captainId,
          "match_accepted",
          "Invitation Accepted! ✅",
          `${acceptorTeam?.name ?? "The team"} accepted your friendly match invitation. Match is confirmed!`,
          JSON.stringify({ matchId: input.matchId })
        );
      }
      // Notify ALL players of BOTH teams to join the match
      const teamAMembers = teamAId != null ? await db.getTeamMembers(teamAId as number) : [];
      const teamBMembers = player.teamId != null ? await db.getTeamMembers(player.teamId as number) : [];
      const allMembers = [...teamAMembers, ...teamBMembers];
      for (const member of allMembers) {
        if (!member.userId) continue;
        // Skip captains (they already know)
        if (member.userId === ctx.user.id) continue;
        if (member.userId === creatorTeam?.captainId) continue;
        await db.createNotification(
          member.userId,
          "join_request",
          "Match Confirmed - Join Now! ⚽",
          `Your team has a confirmed friendly match on ${new Date(match.matchDate).toLocaleDateString()}. Tap to join the roster!`,
          JSON.stringify({ matchId: input.matchId })
        );
      }
      return { success: true, matchId: input.matchId };
    }),

    submitScore: protectedProcedure.input(z.object({
      matchId: z.number(),
      scoreA: z.number().int().min(0),
      scoreB: z.number().int().min(0),
    })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player || !player.isCaptain) throw new Error("Only captains can submit scores");
      const match = await db.getMatchById(input.matchId);
      if (!match) throw new Error("Match not found");
      if (match.status !== "confirmed" && match.status !== "in_progress") throw new Error("Match is not in a state to submit scores");
      const teamA = match.teamAId ? await db.getTeamById(match.teamAId) : null;
      const teamB = match.teamBId ? await db.getTeamById(match.teamBId) : null;
      const isCapA = teamA?.captainId === player.id;
      const isCapB = teamB?.captainId === player.id;
      if (!isCapA && !isCapB) throw new Error("You are not a captain of either team in this match");
      const scoreStr = `${input.scoreA}-${input.scoreB}`;
      if (isCapA) {
        await db.updateMatch(input.matchId, { scoreSubmittedByA: scoreStr, status: "in_progress" });
      } else {
        await db.updateMatch(input.matchId, { scoreSubmittedByB: scoreStr, status: "in_progress" });
      }
      const updated = await db.getMatchById(input.matchId);
      if (!updated) throw new Error("Match not found after update");
      const subA = updated.scoreSubmittedByA;
      const subB = updated.scoreSubmittedByB;
      if (!subA || !subB) {
        const otherCaptainId = isCapA ? teamB?.captainId : teamA?.captainId;
        if (otherCaptainId) {
          await db.createNotification(
            otherCaptainId, "score_request", "Score Submission Required",
            `The opposing captain has submitted the score. Please submit your score for the match.`,
            JSON.stringify({ matchId: input.matchId })
          );
        }
        return { status: "waiting", message: "Score submitted. Waiting for opponent captain." };
      }
      if (subA === subB) {
        const [sA, sB] = subA.split("-").map(Number);
        await db.updateMatch(input.matchId, {
          scoreA: sA, scoreB: sB,
          status: "completed",
          ratingsOpen: true,
          motmVotingOpen: true,
          ratingsClosedAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          scoreConflict: false,
        });
        if (match.teamAId && match.teamBId) {
          await db.awardMatchPoints(input.matchId, sA, sB, match.teamAId, match.teamBId);
        }
        if (teamA?.captainId) await db.createNotification(teamA.captainId, "score_confirmed", "Score Confirmed ✅", `Final score: ${sA}-${sB}. Ratings and MOTM voting are now open!`, JSON.stringify({ matchId: input.matchId }));
        if (teamB?.captainId) await db.createNotification(teamB.captainId, "score_confirmed", "Score Confirmed ✅", `Final score: ${sA}-${sB}. Ratings and MOTM voting are now open!`, JSON.stringify({ matchId: input.matchId }));
        return { status: "confirmed", scoreA: sA, scoreB: sB };
      } else {
        const conflictCount = ((updated as any).scoreConflictCount ?? 0) + 1;
        if (conflictCount >= 2) {
          await db.updateMatch(input.matchId, {
            status: "null_result",
            scoreConflict: true,
            scoreConflictCount: conflictCount,
            scoreSubmittedByA: null,
            scoreSubmittedByB: null,
          });
          if (teamA?.captainId) await db.createNotification(teamA.captainId, "score_null", "Match Result: NULL ❌", "Both captains submitted different scores twice. No points awarded.", JSON.stringify({ matchId: input.matchId }));
          if (teamB?.captainId) await db.createNotification(teamB.captainId, "score_null", "Match Result: NULL ❌", "Both captains submitted different scores twice. No points awarded.", JSON.stringify({ matchId: input.matchId }));
          return { status: "null_result", message: "Score conflict. Match result is null." };
        } else {
          await db.updateMatch(input.matchId, {
            scoreConflict: true,
            scoreConflictCount: conflictCount,
            scoreSubmittedByA: null,
            scoreSubmittedByB: null,
            status: "in_progress",
          });
          if (teamA?.captainId) await db.createNotification(teamA.captainId, "score_conflict", "Score Conflict ⚠️", `Scores don't match (you: ${subA}, opponent: ${subB}). Please resubmit. Last chance!`, JSON.stringify({ matchId: input.matchId }));
          if (teamB?.captainId) await db.createNotification(teamB.captainId, "score_conflict", "Score Conflict ⚠️", `Scores don't match (you: ${subB}, opponent: ${subA}). Please resubmit. Last chance!`, JSON.stringify({ matchId: input.matchId }));
          return { status: "conflict", message: "Score mismatch. Both captains must resubmit." };
        }
      }
    }),
    getScoreStatus: publicProcedure.input(z.object({ matchId: z.number() })).query(async ({ input }) => {
      const match = await db.getMatchById(input.matchId);
      if (!match) return null;
      return {
        status: match.status,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        scoreConflict: (match as any).scoreConflict,
        motmWinnerId: (match as any).motmWinnerId,
      };
    }),
  }),

  // ─── RATING ───
  rating: router({
    submit: protectedProcedure.input(z.object({
      matchId: z.number(),
      ratings: z.array(z.object({ playerId: z.number(), score: z.number().int().min(1).max(10) })),
    })).mutation(async ({ ctx, input }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");
      const alreadyRated = await db.hasPlayerRated(input.matchId, player.id);
      if (alreadyRated) throw new Error("Already rated");
      const match = await db.getMatchById(input.matchId);
      if (!match || !match.ratingsOpen) throw new Error("Ratings are not open for this match");
      // Verify rater is an approved player in this match
      const matchPlayersList = await db.getMatchPlayers(input.matchId);
      const myMatchEntry = matchPlayersList.find(mp => mp.playerId === player.id && mp.joinStatus === "approved");
      if (!myMatchEntry) throw new Error("You are not an approved player in this match");
      // Only captain can rate (captain = team's captainId)
      const myTeam = myMatchEntry.teamId === match.teamAId
        ? await db.getTeamById(match.teamAId!)
        : await db.getTeamById(match.teamBId!);
      if (!myTeam || myTeam.captainId !== player.id) throw new Error("Only the captain can submit ratings");
      // Verify rating only opponents (not own team)
      const myTeamPlayers = matchPlayersList.filter(mp => mp.teamId === myMatchEntry.teamId).map(mp => mp.playerId);
      const opponents = matchPlayersList.filter(mp => mp.teamId !== myMatchEntry.teamId && mp.joinStatus === "approved");
      for (const r of input.ratings) {
        if (myTeamPlayers.includes(r.playerId)) throw new Error("Cannot rate own teammates");
        if (r.playerId === player.id) throw new Error("Cannot rate yourself");
      }
      // ANTI-FAKE BUDGET: total points distributed must be <= opponentCount * 7
      // This prevents giving 10/10 to everyone (max avg = 7)
      const opponentCount = opponents.length;
      if (opponentCount > 0) {
        const totalGiven = input.ratings.reduce((sum, r) => sum + r.score, 0);
        const maxBudget = opponentCount * 7;
        if (totalGiven > maxBudget) {
          throw new Error(`Total rating budget exceeded. You can distribute at most ${maxBudget} points across ${opponentCount} opponents (max avg 7/10).`);
        }
      }
      for (const r of input.ratings) {
        await db.submitRating(input.matchId, player.id, r.playerId, r.score);
      }
      // Update player rating stats after all ratings submitted
      await db.updatePlayerRatingStats(input.matchId);
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
      const match = await db.getMatchById(input.matchId);
      if (!match || !match.motmVotingOpen) throw new Error("MOTM voting is not open for this match");
      const alreadyVoted = await db.hasPlayerVotedMotm(input.matchId, player.id);
      if (alreadyVoted) throw new Error("Already voted");
      // Verify voter AND voted player are both approved players in this match
      const matchPlayersList = await db.getMatchPlayers(input.matchId);
      const allPlayerIds = matchPlayersList.filter(mp => mp.joinStatus === "approved").map(mp => mp.playerId);
      if (!allPlayerIds.includes(player.id)) throw new Error("You are not a player in this match");
      if (!allPlayerIds.includes(input.votedPlayerId)) throw new Error("Voted player is not in this match");
      await db.submitMotmVote(input.matchId, player.id, input.votedPlayerId);
      // Check if all eligible players have voted — if so, finalize winner
      const totalVoters = allPlayerIds.length;
      const votes = await db.getMotmVotes(input.matchId);
      if (votes.length >= totalVoters) {
        const winnerId = await db.finalizeMotmWinner(input.matchId);
        if (winnerId) {
          const winner = await db.getPlayerById(winnerId);
          // Notify all match players of the MOTM winner
          for (const pid of allPlayerIds) {
            await db.createNotification(
              pid, "motm_winner", "🏆 Man of the Match",
              `${winner?.fullName ?? "A player"} has been voted Man of the Match!`,
              JSON.stringify({ matchId: input.matchId, winnerId })
            );
          }
          return { success: true, motmWinnerId: winnerId, finalized: true };
        }
      }
      return { success: true, finalized: false };
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
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) return { count: 0 };
      const notifs = await db.getPlayerNotifications(player.id);
      const count = notifs.filter((n: any) => !n.isRead).length;
      return { count };
    }),
    deleteExpired: protectedProcedure.mutation(async ({ ctx }) => {
      const player = await db.getPlayerByUserId(ctx.user.id);
      if (!player) return { success: false };
      await db.deleteExpiredNotifications(player.id);
      return { success: true };
    }),
  }),

   // ─── SEARCH ───
  search: router({
    teams: publicProcedure.input(z.object({
      query: z.string().default(""),
      city: z.string().optional(),
    })).query(async ({ input }) => {
      return db.searchTeamsAdvanced(input.query, input.city);
    }),
    players: publicProcedure.input(z.object({
      query: z.string().default(""),
      city: z.string().optional(),
      position: z.enum(["GK", "DEF", "MID", "ATT"]).optional(),
    })).query(async ({ input }) => {
      return db.searchPlayersAdvanced(input.query, input.city, input.position);
    }),
  }),

  // ─── REFERENCE DATA ───
  ref: router({
    cities: publicProcedure.query(() => db.getPredefinedCities()),
    countries: publicProcedure.query(() => db.getCountries()),
  }),

  // ─── CHALLENGES ───
  challenge: router({
    list: publicProcedure.input(z.object({
      city: z.string().optional(),
      format: z.enum(["5v5", "8v8", "11v11"]).optional(),
    })).query(async ({ input }) => {
      return db.getChallenges(input);
    }),

    create: protectedProcedure.input(z.object({
      city: z.string().min(1),
      format: z.enum(["5v5", "8v8", "11v11"]),
      preferredDate: z.string().optional(),
      message: z.string().max(280).optional(),
    })).mutation(async ({ ctx, input }) => {
      const captain = await db.getPlayerByUserId(ctx.user.id);
      if (!captain || !captain.isCaptain || !captain.teamId) throw new Error("Only team captains can post challenges");
      // Check if team already has an open challenge
      const existing = await db.getTeamChallenges(captain.teamId);
      const hasOpen = existing.some((c) => c.status === "open");
      if (hasOpen) throw new Error("Your team already has an open challenge. Cancel it first.");
      const id = await db.createChallenge({
        teamId: captain.teamId,
        city: input.city,
        format: input.format,
        preferredDate: input.preferredDate,
        message: input.message,
        status: "open",
      });
      return { id };
    }),

    accept: protectedProcedure.input(z.object({ challengeId: z.number() })).mutation(async ({ ctx, input }) => {
      const captain = await db.getPlayerByUserId(ctx.user.id);
      if (!captain || !captain.isCaptain || !captain.teamId) throw new Error("Only team captains can accept challenges");
      const challenge = await db.getChallengeById(input.challengeId);
      if (!challenge) throw new Error("Challenge not found");
      if (challenge.status !== "open") throw new Error("Challenge is no longer open");
      if (challenge.teamId === captain.teamId) throw new Error("You cannot accept your own challenge");
      // Create a confirmed friendly match between the two teams
      const matchDate = new Date();
      matchDate.setDate(matchDate.getDate() + 7); // Default: 1 week from now
      const format = challenge.format;
      const maxPerTeam = format === "5v5" ? 5 : format === "8v8" ? 8 : 11;
      const matchId = await db.createMatch({
        type: "friendly",
        status: "confirmed",
        city: challenge.city,
        pitchName: "TBD",
        matchDate,
        format,
        maxPlayers: maxPerTeam * 2,
        maxPlayersPerTeam: maxPerTeam,
        teamAId: challenge.teamId,
        teamBId: captain.teamId,
        createdBy: captain.id,
      });
      // Auto-add both captains to the match
      const challengerCaptain = await db.getPlayerById((await db.getTeamById(challenge.teamId))!.captainId);
      if (challengerCaptain) {
        await db.addPlayerToMatch(matchId, challengerCaptain.id, challenge.teamId, "A", "approved");
      }
      await db.addPlayerToMatch(matchId, captain.id, captain.teamId, "B", "approved");
      // Mark challenge as accepted
      await db.updateChallenge(input.challengeId, { status: "accepted", matchId });
      // Notify the challenger captain
      if (challengerCaptain) {
        await db.createNotification(
          challengerCaptain.id,
          "challenge_accepted",
          "Challenge Accepted!",
          `${captain.fullName}'s team accepted your challenge! A match has been created.`,
          JSON.stringify({ matchId })
        );
      }
      return { matchId };
    }),

    cancel: protectedProcedure.input(z.object({ challengeId: z.number() })).mutation(async ({ ctx, input }) => {
      const captain = await db.getPlayerByUserId(ctx.user.id);
      if (!captain || !captain.isCaptain) throw new Error("Only captains can cancel challenges");
      const challenge = await db.getChallengeById(input.challengeId);
      if (!challenge) throw new Error("Challenge not found");
      if (challenge.teamId !== captain.teamId) throw new Error("You can only cancel your own challenges");
      await db.updateChallenge(input.challengeId, { status: "cancelled" });
      return { success: true };
    }),

    myTeamChallenge: protectedProcedure.query(async ({ ctx }) => {
      const captain = await db.getPlayerByUserId(ctx.user.id);
      if (!captain || !captain.teamId) return null;
      const challenges = await db.getTeamChallenges(captain.teamId);
      const open = challenges.find((c) => c.status === "open");
      return open ?? null;
    }),
  }),
});
export type AppRouter = typeof appRouter;
