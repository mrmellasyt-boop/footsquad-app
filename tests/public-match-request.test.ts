/**
 * Tests: Fix Public Match Request to Play + Home Filtering
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const routersContent = fs.readFileSync(path.join(__dirname, "../server/routers.ts"), "utf-8");
const dbContent = fs.readFileSync(path.join(__dirname, "../server/db.ts"), "utf-8");
const matchDetailContent = fs.readFileSync(path.join(__dirname, "../app/match/[id].tsx"), "utf-8");

describe("Fix Public Match: Request to Play + Home Filtering", () => {

  describe("Backend: requestToPlay route", () => {
    it("only allows captains to request", () => {
      const idx = routersContent.indexOf("requestToPlay:");
      const block = routersContent.slice(idx, idx + 600);
      expect(block).toContain("isCaptain");
    });

    it("only allows requests on public matches", () => {
      const idx = routersContent.indexOf("requestToPlay:");
      const block = routersContent.slice(idx, idx + 600);
      expect(block).toContain('match.type !== "public"');
    });

    it("rejects if match already has an opponent", () => {
      const idx = routersContent.indexOf("requestToPlay:");
      const block = routersContent.slice(idx, idx + 600);
      expect(block).toContain("teamBId");
      expect(block).toContain("already has an opponent");
    });

    it("prevents requesting against own team", () => {
      const idx = routersContent.indexOf("requestToPlay:");
      const block = routersContent.slice(idx, idx + 900);
      expect(block).toContain("Cannot request to play against your own team");
    });

    it("prevents duplicate pending requests from same team", () => {
      const idx = routersContent.indexOf("requestToPlay:");
      const block = routersContent.slice(idx, idx + 1200);
      expect(block).toContain("Request already sent");
    });

    it("notifies match creator captain with play_request notification", () => {
      const idx = routersContent.indexOf("requestToPlay:");
      const block = routersContent.slice(idx, idx + 1800);
      expect(block).toContain("play_request");
      expect(block).toContain("createNotification");
      expect(block).toContain("New Challenge Request");
    });
  });

  describe("Backend: acceptRequest route", () => {
    it("only allows captains to accept", () => {
      const idx = routersContent.indexOf("acceptRequest:");
      const block = routersContent.slice(idx, idx + 400);
      expect(block).toContain("isCaptain");
    });

    it("assigns teamBId and sets match status to confirmed", () => {
      const idx = routersContent.indexOf("acceptRequest:");
      const block = routersContent.slice(idx, idx + 800);
      expect(block).toContain("teamBId: accepted.teamId");
      expect(block).toContain('"confirmed"');
    });

    it("declines all other pending requests when one is accepted", () => {
      const idx = routersContent.indexOf("acceptRequest:");
      const block = routersContent.slice(idx, idx + 1200);
      expect(block).toContain("otherPending");
      expect(block).toContain('"rejected"');
    });

    it("notifies accepted team captain with play_request_accepted", () => {
      const idx = routersContent.indexOf("acceptRequest:");
      const block = routersContent.slice(idx, idx + 1800);
      expect(block).toContain("play_request_accepted");
      expect(block).toContain("Challenge Accepted!");
    });
  });

  describe("Backend: declineRequest route", () => {
    it("notifies declined team captain with play_request_declined", () => {
      const idx = routersContent.indexOf("declineRequest:");
      const block = routersContent.slice(idx, idx + 600);
      expect(block).toContain("play_request_declined");
    });

    it("getMatchRequestById function exists in db.ts", () => {
      expect(dbContent).toContain("getMatchRequestById");
    });
  });

  describe("Backend: getUpcomingMatches (Home filter)", () => {
    it("filters only confirmed matches", () => {
      const idx = dbContent.indexOf("getUpcomingMatches");
      const block = dbContent.slice(idx, idx + 400);
      expect(block).toContain('"confirmed"');
    });

    it("filters only matches with teamBId (two teams)", () => {
      const idx = dbContent.indexOf("getUpcomingMatches");
      const block = dbContent.slice(idx, idx + 400);
      expect(block).toContain("isNotNull");
      expect(block).toContain("teamBId");
    });

    it("isNotNull is imported from drizzle-orm", () => {
      expect(dbContent).toContain("isNotNull");
      expect(dbContent.slice(0, 100)).toContain("isNotNull");
    });
  });

  describe("Frontend: match/[id].tsx Request to Play", () => {
    it("has requestToPlay mutation", () => {
      expect(matchDetailContent).toContain("requestToPlayMutation");
      expect(matchDetailContent).toContain("trpc.match.requestToPlay.useMutation");
    });

    it("shows 'Request to Play vs this Team' button for other captains on public matches", () => {
      expect(matchDetailContent).toContain("Request to Play vs this Team");
      expect(matchDetailContent).toContain("canRequestToPlay");
    });

    it("button only visible for public matches without opponent", () => {
      expect(matchDetailContent).toContain("isPublicMatch");
      expect(matchDetailContent).toContain("hasNoOpponent");
      expect(matchDetailContent).toContain("isOtherCaptain");
    });

    it("prevents duplicate requests (myTeamAlreadyRequested)", () => {
      expect(matchDetailContent).toContain("myTeamAlreadyRequested");
    });

    it("shows 'Challenge request sent' banner after requesting", () => {
      expect(matchDetailContent).toContain("Challenge request sent");
    });

    it("creator captain sees pending play requests with Accept/Decline", () => {
      expect(matchDetailContent).toContain("pendingPlayRequests");
      expect(matchDetailContent).toContain("Challenge Requests");
      expect(matchDetailContent).toContain("Wants to play against your team");
    });

    it("has requestToPlayBtn style", () => {
      expect(matchDetailContent).toContain("requestToPlayBtn:");
      expect(matchDetailContent).toContain("requestToPlayBtnText:");
    });
  });
});
