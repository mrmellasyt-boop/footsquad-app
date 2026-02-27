import { describe, it, expect } from "vitest";

// ─── Test 1: Auth email+password schema ───
describe("Email+Password Auth", () => {
  it("should have signup, login, changePassword functions in api.ts", () => {
    const fs = require("fs");
    const apiContent = fs.readFileSync("lib/_core/api.ts", "utf-8");
    expect(apiContent).toContain("export async function signup");
    expect(apiContent).toContain("export async function login");
    expect(apiContent).toContain("export async function changePassword");
  });

  it("should have uploadFile function for media uploads", () => {
    const fs = require("fs");
    const apiContent = fs.readFileSync("lib/_core/api.ts", "utf-8");
    expect(apiContent).toContain("export async function uploadFile");
  });

  it("login screen should not contain OAuth references", async () => {
    const fs = require("fs");
    const loginContent = fs.readFileSync("app/login.tsx", "utf-8");
    expect(loginContent).not.toContain("startOAuthLogin");
    expect(loginContent).not.toContain("WebBrowser");
    expect(loginContent).not.toContain("openAuthSessionAsync");
    expect(loginContent).toContain("email");
    expect(loginContent).toContain("password");
    expect(loginContent).toContain("signup");
    expect(loginContent).toContain("login");
  });
});

// ─── Test 2: Profile edit ───
describe("Profile Edit", () => {
  it("profile screen should have edit mode and change password", () => {
    const fs = require("fs");
    const profileContent = fs.readFileSync("app/(tabs)/profile.tsx", "utf-8");
    expect(profileContent).toContain("showEdit");
    expect(profileContent).toContain("changePassword");
    expect(profileContent).toContain("GalleryPicker");
    expect(profileContent).not.toContain("startOAuthLogin");
  });
});

// ─── Test 3: Team management ───
describe("Team Management", () => {
  it("team detail should have addPlayer and removePlayer functionality", () => {
    const fs = require("fs");
    const teamContent = fs.readFileSync("app/team/[id].tsx", "utf-8");
    expect(teamContent).toContain("addPlayer");
    expect(teamContent).toContain("removePlayer");
    expect(teamContent).toContain("updateLogo");
    expect(teamContent).toContain("GalleryPicker");
    expect(teamContent).toContain("isCaptain");
  });

  it("routers should have team management routes", () => {
    const fs = require("fs");
    const routerContent = fs.readFileSync("server/routers.ts", "utf-8");
    expect(routerContent).toContain("addPlayer:");
    expect(routerContent).toContain("removePlayer:");
    expect(routerContent).toContain("updateLogo:");
  });
});

// ─── Test 4: Friendly match invitation ───
describe("Friendly Match Invitation", () => {
  it("create-match should have team search for friendly matches", () => {
    const fs = require("fs");
    const createMatchContent = fs.readFileSync("app/create-match.tsx", "utf-8");
    expect(createMatchContent).toContain("teamSearchQuery");
    expect(createMatchContent).toContain("selectedTeam");
    expect(createMatchContent).toContain("inviteTeam");
    expect(createMatchContent).toContain("Search team");
  });

  it("match detail should have accept/decline for invitations", () => {
    const fs = require("fs");
    const matchContent = fs.readFileSync("app/match/[id].tsx", "utf-8");
    expect(matchContent).toContain("acceptRequest");
    expect(matchContent).toContain("declineRequest");
    expect(matchContent).toContain("pendingRequest");
    expect(matchContent).toContain("Match Invitation");
  });

  it("routers should have inviteTeam and declineRequest routes", () => {
    const fs = require("fs");
    const routerContent = fs.readFileSync("server/routers.ts", "utf-8");
    expect(routerContent).toContain("inviteTeam:");
    expect(routerContent).toContain("declineRequest:");
    expect(routerContent).toContain("createNotification");
  });
});

// ─── Test 5: Highlight upload ───
describe("Highlight Upload", () => {
  it("should have upload-highlight screen with photo and video options", () => {
    const fs = require("fs");
    const highlightContent = fs.readFileSync("app/upload-highlight.tsx", "utf-8");
    expect(highlightContent).toContain("GalleryPicker");
    expect(highlightContent).toContain("handlePicked");
    expect(highlightContent).toContain("uploadFile");
    expect(highlightContent).toContain("48");
    expect(highlightContent).toContain("mediaType");
  });

  it("home screen should have Post Highlight button", () => {
    const fs = require("fs");
    const homeContent = fs.readFileSync("app/(tabs)/index.tsx", "utf-8");
    expect(homeContent).toContain("upload-highlight");
    expect(homeContent).toContain("Post Highlight");
  });

  it("highlight backend should auto-expire after 48h", () => {
    const fs = require("fs");
    const dbContent = fs.readFileSync("server/db.ts", "utf-8");
    // Verify 48 hour expiry is set
    expect(dbContent).toContain("48 * 60 * 60 * 1000");
    // Verify active highlights filter by expiresAt
    expect(dbContent).toContain("expiresAt");
  });
});

// ─── Test 6: No OAuth remnants ───
describe("No OAuth/External Auth", () => {
  it("should not have OAuth login in any tab screen", () => {
    const fs = require("fs");
    const files = [
      "app/(tabs)/index.tsx",
      "app/(tabs)/profile.tsx",
      "app/(tabs)/matches.tsx",
      "app/(tabs)/leaderboard.tsx",
      "app/(tabs)/chat.tsx",
    ];
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toContain("startOAuthLogin");
      expect(content).not.toContain("WebBrowser.openAuthSessionAsync");
    }
  });
});

// ─── Test 7: Database schema has passwordHash ───
describe("Database Schema", () => {
  it("users table should have passwordHash field", () => {
    const fs = require("fs");
    const schemaContent = fs.readFileSync("drizzle/schema.ts", "utf-8");
    expect(schemaContent).toContain("passwordHash");
  });
});
