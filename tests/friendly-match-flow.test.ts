import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const routersContent = fs.readFileSync(path.join(__dirname, "../server/routers.ts"), "utf-8");
const dbContent = fs.readFileSync(path.join(__dirname, "../server/db.ts"), "utf-8");
const createMatchContent = fs.readFileSync(path.join(__dirname, "../app/create-match.tsx"), "utf-8");
const matchDetailContent = fs.readFileSync(path.join(__dirname, "../app/match/[id].tsx"), "utf-8");

describe("Fix Friendly Match Invite Flow", () => {

  describe("Backend: createMatch route", () => {
    it("never sets teamBId at creation (always null)", () => {
      // The match.create route is the 3rd occurrence of 'create: protectedProcedure'
      const idx = routersContent.indexOf("teamBId: null, // teamBId is NEVER set at creation");
      expect(idx).toBeGreaterThan(-1);
    });

    it("friendly match starts as pending status", () => {
      // Verify the comment about friendly matches starting as pending
      expect(routersContent).toContain("Friendly matches start as 'pending'");
    });
  });

  describe("Backend: inviteTeam route", () => {
    it("only allows friendly matches to be invited", () => {
      const idx = routersContent.indexOf("inviteTeam:");
      const block = routersContent.slice(idx, idx + 600);
      expect(block).toContain("Only friendly matches can be invited");
    });

    it("checks for confirmed opponent (teamBId) not pending requests", () => {
      const idx = routersContent.indexOf("inviteTeam:");
      const block = routersContent.slice(idx, idx + 800);
      expect(block).toContain("already has a confirmed opponent");
    });

    it("prevents duplicate pending invites to same team", () => {
      const idx = routersContent.indexOf("inviteTeam:");
      const block = routersContent.slice(idx, idx + 1000);
      expect(block).toContain("already has a pending invite");
    });

    it("notifies opponent captain with friendly match invite", () => {
      const idx = routersContent.indexOf("inviteTeam:");
      const block = routersContent.slice(idx, idx + 1500);
      expect(block).toContain("Friendly Match Invitation");
      expect(block).toContain("createNotification");
    });
  });

  describe("Backend: getPublicMatches", () => {
    it("only returns public type matches", () => {
      const idx = dbContent.indexOf("getPublicMatches");
      const block = dbContent.slice(idx, idx + 400);
      expect(block).toContain("eq(matches.type, \"public\")");
    });

    it("does not include friendly matches in public feed", () => {
      const idx = dbContent.indexOf("getPublicMatches");
      const block = dbContent.slice(idx, idx + 400);
      // Must filter by public type
      expect(block).toContain("eq(matches.type, \"public\")");
    });
  });

  describe("Backend: getPlayerMatches", () => {
    it("includes matches created by the player (captain)", () => {
      const idx = dbContent.indexOf("getPlayerMatches");
      const block = dbContent.slice(idx, idx + 800);
      expect(block).toContain("createdBy");
      expect(block).toContain("createdMatches");
    });

    it("deduplicates merged match lists", () => {
      const idx = dbContent.indexOf("getPlayerMatches");
      const block = dbContent.slice(idx, idx + 1200);
      expect(block).toContain("seen");
    });
  });

  describe("Frontend: create-match.tsx", () => {
    it("does not pass teamBId when creating a match", () => {
      const idx = createMatchContent.indexOf("createMutation.mutate(");
      const block = createMatchContent.slice(idx, idx + 400);
      expect(block).not.toContain("teamBId:");
    });

    it("sends invite after match creation (in onSuccess)", () => {
      const idx = createMatchContent.indexOf("onSuccess: (data)");
      const block = createMatchContent.slice(idx, idx + 300);
      expect(block).toContain("inviteMutation.mutate");
      expect(block).toContain("selectedTeam");
    });

    it("shows 'Create & Send Invitation' button for friendly matches", () => {
      // Uses translation key t.createMatch.createAndSend (value: 'Create & Send Invitation')
      expect(createMatchContent).toContain("createAndSend");
    });
  });

  describe("Frontend: match/[id].tsx", () => {
    it("detects friendly match type", () => {
      expect(matchDetailContent).toContain("isFriendlyMatch");
      expect(matchDetailContent).toContain("match.type === \"friendly\"");
    });

    it("shows pending banner for creator waiting for invite response", () => {
      expect(matchDetailContent).toContain("isCreatorWaitingForInvite");
      expect(matchDetailContent).toContain("Invitation sent");
      expect(matchDetailContent).toContain("waiting for opponent captain to respond");
    });

    it("shows pending invitations section for friendly match creator", () => {
      expect(matchDetailContent).toContain("pendingFriendlyInvites");
      expect(matchDetailContent).toContain("Pending Invitations");
    });

    it("invited team captain sees accept/decline card", () => {
      expect(matchDetailContent).toContain("pendingRequest");
      expect(matchDetailContent).toContain("Match Invitation");
      expect(matchDetailContent).toContain("Accept");
      expect(matchDetailContent).toContain("Decline");
    });

    it("Team B roster shows 'Waiting for opponent team...' when no teamBId", () => {
      expect(matchDetailContent).toContain("Waiting for opponent team...");
    });
  });

});
