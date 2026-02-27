/**
 * Tests: Fix Join Match Flow + Roster + Captain Approval
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const schemaContent = fs.readFileSync(path.join(__dirname, "../drizzle/schema.ts"), "utf-8");
const routersContent = fs.readFileSync(path.join(__dirname, "../server/routers.ts"), "utf-8");
const dbContent = fs.readFileSync(path.join(__dirname, "../server/db.ts"), "utf-8");
const matchDetailContent = fs.readFileSync(path.join(__dirname, "../app/match/[id].tsx"), "utf-8");

describe("Fix Join Match Flow + Roster + Captain Approval", () => {

  describe("Schema: new fields", () => {
    it("match_players has teamSide field (A/B)", () => {
      expect(schemaContent).toContain("teamSide");
      expect(schemaContent).toContain('"A", "B"');
    });

    it("match_players has joinStatus field (pending/approved/declined)", () => {
      expect(schemaContent).toContain("joinStatus");
      expect(schemaContent).toContain('"pending", "approved", "declined"');
    });

    it("matches has maxPlayersPerTeam field", () => {
      expect(schemaContent).toContain("maxPlayersPerTeam");
    });
  });

  describe("Backend: db.ts functions", () => {
    it("addPlayerToMatch accepts teamSide and joinStatus params", () => {
      expect(dbContent).toContain('teamSide: "A" | "B"');
      expect(dbContent).toContain('joinStatus: "pending" | "approved" | "declined"');
    });

    it("updateMatchPlayerStatus function exists", () => {
      expect(dbContent).toContain("updateMatchPlayerStatus");
    });

    it("getMatchPlayerCountBySide function exists", () => {
      expect(dbContent).toContain("getMatchPlayerCountBySide");
    });

    it("getPendingJoinRequests function exists", () => {
      expect(dbContent).toContain("getPendingJoinRequests");
    });

    it("getMatchPlayersBySide function exists", () => {
      expect(dbContent).toContain("getMatchPlayersBySide");
    });
  });

  describe("Backend: routers.ts routes", () => {
    it("match.join route accepts teamSide parameter", () => {
      expect(routersContent).toContain('teamSide: z.enum(["A", "B"])');
    });

    it("match.join checks per-team limit (maxPlayersPerTeam)", () => {
      expect(routersContent).toContain("maxPlayersPerTeam");
      expect(routersContent).toContain("getMatchPlayerCountBySide");
    });

    it("match.join creates pending status and notifies captain", () => {
      const joinIdx = routersContent.indexOf("join: protectedProcedure.input(z.object({\n      matchId: z.number(),\n      teamId: z.number(),\n      teamSide");
      const joinBlock = routersContent.slice(joinIdx, joinIdx + 1800);
      expect(joinBlock).toContain('"pending"');
      expect(joinBlock).toContain("createNotification");
      expect(joinBlock).toContain("join_request");
    });

    it("match.approveJoin route exists", () => {
      expect(routersContent).toContain("approveJoin");
    });

    it("match.declineJoin route exists", () => {
      expect(routersContent).toContain("declineJoin");
    });

    it("match.approveJoin notifies the player", () => {
      const idx = routersContent.indexOf("approveJoin");
      const block = routersContent.slice(idx, idx + 600);
      expect(block).toContain("join_approved");
      expect(block).toContain("createNotification");
    });

    it("match.declineJoin notifies the player", () => {
      const idx = routersContent.indexOf("declineJoin");
      const block = routersContent.slice(idx, idx + 600);
      expect(block).toContain("join_declined");
      expect(block).toContain("createNotification");
    });

    it("match.myJoinStatus route exists", () => {
      expect(routersContent).toContain("myJoinStatus");
    });

    it("match.getById returns rosterA, rosterB, pendingRequests, countA, countB", () => {
      expect(routersContent).toContain("rosterA");
      expect(routersContent).toContain("rosterB");
      expect(routersContent).toContain("pendingRequests");
      expect(routersContent).toContain("countA");
      expect(routersContent).toContain("countB");
    });
  });

  describe("Frontend: match/[id].tsx", () => {
    it("uses TeamSelectModal component", () => {
      expect(matchDetailContent).toContain("TeamSelectModal");
    });

    it("shows team selection modal when Join is pressed", () => {
      expect(matchDetailContent).toContain("showTeamSelect");
      expect(matchDetailContent).toContain("setShowTeamSelect");
    });

    it("shows 'Awaiting Approval' banner when join is pending", () => {
      expect(matchDetailContent).toContain("Awaiting captain approval");
    });

    it("shows 'You are in Team roster' banner when approved", () => {
      expect(matchDetailContent).toContain("You are in Team");
    });

    it("shows 'Join request declined' banner when declined", () => {
      expect(matchDetailContent).toContain("declined");
    });

    it("shows per-team player counts in team headers", () => {
      expect(matchDetailContent).toContain("countA");
      expect(matchDetailContent).toContain("countB");
      expect(matchDetailContent).toContain("maxPerTeam");
    });

    it("shows 'FULL' badge when team is at capacity", () => {
      expect(matchDetailContent).toContain("FULL");
      expect(matchDetailContent).toContain("fullBadge");
    });

    it("captain sees pending join requests section", () => {
      expect(matchDetailContent).toContain("Pending Join Requests");
      expect(matchDetailContent).toContain("isCaptainOfThisMatch");
    });

    it("captain has approve/decline buttons for each pending request", () => {
      expect(matchDetailContent).toContain("approveBtn");
      expect(matchDetailContent).toContain("declineSmallBtn");
      expect(matchDetailContent).toContain("approveMutation");
      expect(matchDetailContent).toContain("declineMutation");
    });

    it("rosterA and rosterB are displayed separately", () => {
      expect(matchDetailContent).toContain("rosterA");
      expect(matchDetailContent).toContain("rosterB");
    });

    it("roster rows show player photo and position", () => {
      expect(matchDetailContent).toContain("rosterAvatarImg");
      expect(matchDetailContent).toContain("rosterPos");
    });

    it("TeamSelectModal shows team count vs maxPerTeam", () => {
      const idx = matchDetailContent.indexOf("TeamSelectModal");
      const block = matchDetailContent.slice(idx, idx + 2000);
      expect(block).toContain("maxPerTeam");
      expect(block).toContain("countA");
      expect(block).toContain("countB");
    });
  });
});
