import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Fix Package 2: Team Logo Display", () => {
  describe("Style: overflow hidden on teamLogo", () => {
    it("index.tsx teamLogo has overflow hidden", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/(tabs)/index.tsx"), "utf-8");
      // Find the teamLogo style block
      const match = content.match(/teamLogo:\s*\{([^}]+)\}/);
      expect(match).not.toBeNull();
      expect(match![1]).toContain("overflow");
      expect(match![1]).toContain("hidden");
    });

    it("index.tsx teamLogo has borderRadius 24", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/(tabs)/index.tsx"), "utf-8");
      const match = content.match(/teamLogo:\s*\{([^}]+)\}/);
      expect(match).not.toBeNull();
      expect(match![1]).toContain("borderRadius: 24");
    });

    it("matches.tsx teamLogo has overflow hidden", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/(tabs)/matches.tsx"), "utf-8");
      const match = content.match(/teamLogo:\s*\{([^}]+)\}/);
      expect(match).not.toBeNull();
      expect(match![1]).toContain("overflow");
      expect(match![1]).toContain("hidden");
    });

    it("matches.tsx teamLogoPlaceholder has border", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/(tabs)/matches.tsx"), "utf-8");
      const match = content.match(/teamLogoPlaceholder:\s*\{([^}]+)\}/);
      expect(match).not.toBeNull();
      expect(match![1]).toContain("borderWidth");
    });

    it("match/[id].tsx teamLogo has overflow hidden", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/match/[id].tsx"), "utf-8");
      expect(content).toContain("overflow: \"hidden\"");
      // Check teamLogo specifically
      const match = content.match(/teamLogo:\s*\{([^}]+)\}/);
      expect(match).not.toBeNull();
      expect(match![1]).toContain("overflow");
    });

    it("team/[id].tsx teamLogo container has overflow hidden", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/team/[id].tsx"), "utf-8");
      const match = content.match(/teamLogo:\s*\{([^}]+)\}/);
      expect(match).not.toBeNull();
      expect(match![1]).toContain("overflow: \"hidden\"");
    });
  });

  describe("Frontend: logoUrl conditional rendering", () => {
    it("index.tsx uses match.teamA?.logoUrl for conditional rendering", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/(tabs)/index.tsx"), "utf-8");
      expect(content).toContain("match.teamA?.logoUrl");
      expect(content).toContain("match.teamB?.logoUrl");
    });

    it("matches.tsx uses match.teamA?.logoUrl for conditional rendering", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/(tabs)/matches.tsx"), "utf-8");
      expect(content).toContain("match.teamA?.logoUrl");
      expect(content).toContain("match.teamB?.logoUrl");
    });

    it("match/[id].tsx uses match.teamA?.logoUrl for conditional rendering", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/match/[id].tsx"), "utf-8");
      expect(content).toContain("match.teamA?.logoUrl");
      expect(content).toContain("match.teamB?.logoUrl");
    });

    it("team/[id].tsx uses team.logoUrl for conditional rendering", () => {
      const content = fs.readFileSync(path.join(__dirname, "../app/team/[id].tsx"), "utf-8");
      expect(content).toContain("team.logoUrl");
    });

    it("all screens have fallback placeholder when logoUrl is missing", () => {
      const indexContent = fs.readFileSync(path.join(__dirname, "../app/(tabs)/index.tsx"), "utf-8");
      const matchesContent = fs.readFileSync(path.join(__dirname, "../app/(tabs)/matches.tsx"), "utf-8");
      const matchDetailContent = fs.readFileSync(path.join(__dirname, "../app/match/[id].tsx"), "utf-8");

      // Each screen should have teamLogoPlaceholder as fallback
      expect(indexContent).toContain("teamLogoPlaceholder");
      expect(matchesContent).toContain("teamLogoPlaceholder");
      expect(matchDetailContent).toContain("teamLogoPlaceholder");
    });
  });

  describe("Backend: logoUrl in team queries", () => {
    it("schema has logoUrl field on teams table", () => {
      const content = fs.readFileSync(path.join(__dirname, "../drizzle/schema.ts"), "utf-8");
      expect(content).toContain("logoUrl");
      // Should be in teams table context
      const teamsIdx = content.indexOf("export const teams");
      const logoIdx = content.indexOf("logoUrl", teamsIdx);
      expect(logoIdx).toBeGreaterThan(teamsIdx);
    });

    it("getTeamById returns full team object including logoUrl", () => {
      const content = fs.readFileSync(path.join(__dirname, "../server/db.ts"), "utf-8");
      // getTeamById uses db.select().from(teams) which returns all columns including logoUrl
      expect(content).toContain("getTeamById");
      expect(content).toContain("db.select().from(teams)");
    });

    it("match routes enrich teamA and teamB with getTeamById", () => {
      const content = fs.readFileSync(path.join(__dirname, "../server/routers.ts"), "utf-8");
      // upcoming, publicFeed, myMatches, getById all call getTeamById
      expect(content).toContain("await db.getTeamById(m.teamAId)");
      expect(content).toContain("await db.getTeamById(m.teamBId)");
    });

    it("team.updateLogo route exists in routers", () => {
      const content = fs.readFileSync(path.join(__dirname, "../server/routers.ts"), "utf-8");
      expect(content).toContain("updateLogo");
    });
  });
});
