import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Fix Package 3: Free Agent Board - Create Post", () => {
  describe("Schema: note field", () => {
    it("players schema has note field", () => {
      const content = fs.readFileSync(path.join(__dirname, "../drizzle/schema.ts"), "utf-8");
      expect(content).toContain("note: text");
    });
  });

  describe("Backend: postAvailability route", () => {
    it("routers.ts has postAvailability mutation", () => {
      const content = fs.readFileSync(path.join(__dirname, "../server/routers.ts"), "utf-8");
      expect(content).toContain("postAvailability");
    });

    it("postAvailability accepts city, position, availableTime, preferredFormat, note", () => {
      const content = fs.readFileSync(path.join(__dirname, "../server/routers.ts"), "utf-8");
      const idx = content.indexOf("postAvailability");
      const block = content.slice(idx, idx + 600);
      expect(block).toContain("city");
      expect(block).toContain("position");
      expect(block).toContain("availableTime");
      expect(block).toContain("preferredFormat");
      expect(block).toContain("note");
    });

    it("postAvailability sets isFreeAgent and isAvailable to true", () => {
      const content = fs.readFileSync(path.join(__dirname, "../server/routers.ts"), "utf-8");
      const idx = content.indexOf("postAvailability");
      const block = content.slice(idx, idx + 900);
      expect(block).toContain("isFreeAgent: true");
      expect(block).toContain("isAvailable: true");
    });

    it("player.update route accepts note field", () => {
      const content = fs.readFileSync(path.join(__dirname, "../server/routers.ts"), "utf-8");
      // note should appear in the update route schema
      expect(content).toContain("note: z.string()");
    });
  });

  describe("Free Agents Screen: Create Post UI", () => {
    it("free-agents.tsx has Create Availability Post button", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/free-agents.tsx"), "utf-8");
      expect(content).toContain("Post Your Availability");
    });

    it("free-agents.tsx has Create Post modal", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/free-agents.tsx"), "utf-8");
      expect(content).toContain("showCreatePost");
      expect(content).toContain("Post Availability");
    });

    it("Create Post form has all required fields", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/free-agents.tsx"), "utf-8");
      expect(content).toContain("formCity");
      expect(content).toContain("formPosition");
      expect(content).toContain("formAvailTime");
      expect(content).toContain("formFormat");
      expect(content).toContain("formNote");
    });

    it("form uses postAvailability mutation", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/free-agents.tsx"), "utf-8");
      expect(content).toContain("postAvailability");
    });

    it("agent cards navigate to /free-agent/[id] detail screen", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/free-agents.tsx"), "utf-8");
      expect(content).toContain("/free-agent/");
    });

    it("agent cards display note when present", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/free-agents.tsx"), "utf-8");
      expect(content).toContain("item.note");
    });

    it("Create Post button only visible when authenticated", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/free-agents.tsx"), "utf-8");
      expect(content).toContain("isAuthenticated");
      // createBanner should be inside isAuthenticated block
      const authIdx = content.indexOf("isAuthenticated && (");
      const bannerIdx = content.indexOf("createBanner");
      expect(bannerIdx).toBeGreaterThan(authIdx);
    });

    it("form has preview card showing live preview", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/free-agents.tsx"), "utf-8");
      expect(content).toContain("previewCard");
      expect(content).toContain("Preview");
    });

    it("form resets after successful post", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/free-agents.tsx"), "utf-8");
      expect(content).toContain("resetForm");
    });
  });

  describe("Free Agent Detail Screen", () => {
    it("free-agent/[id].tsx exists", () => {
      const exists = fs.existsSync(path.join(__dirname, "../app/free-agent/[id].tsx"));
      expect(exists).toBe(true);
    });

    it("detail screen shows FREE AGENT badge", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/free-agent/[id].tsx"), "utf-8");
      expect(content).toContain("FREE AGENT");
    });

    it("detail screen has Message button", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/free-agent/[id].tsx"), "utf-8");
      expect(content).toContain("Message");
      expect(content).toContain("handleMessage");
    });

    it("detail screen has Invite to Match button for captains", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/free-agent/[id].tsx"), "utf-8");
      expect(content).toContain("Invite to Match");
      expect(content).toContain("isCaptain");
    });

    it("detail screen shows availability info (time, format)", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/free-agent/[id].tsx"), "utf-8");
      expect(content).toContain("availableTime");
      expect(content).toContain("preferredFormat");
    });

    it("detail screen shows player note", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/free-agent/[id].tsx"), "utf-8");
      expect(content).toContain(".note");
    });

    it("detail screen shows player stats (matches, points, rating, motm)", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/free-agent/[id].tsx"), "utf-8");
      expect(content).toContain("totalMatches");
      expect(content).toContain("totalPoints");
      expect(content).toContain("motmCount");
    });

    it("invite modal shows captain's open matches", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/free-agent/[id].tsx"), "utf-8");
      expect(content).toContain("showInviteModal");
      expect(content).toContain("myMatches");
      expect(content).toContain("openMatches");
    });

    it("detail screen has Follow button", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/free-agent/[id].tsx"), "utf-8");
      expect(content).toContain("Follow");
      expect(content).toContain("followMutation");
    });

    it("detail screen links to full player profile", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/free-agent/[id].tsx"), "utf-8");
      expect(content).toContain("View Full Profile");
      expect(content).toContain("/player/");
    });
  });
});
