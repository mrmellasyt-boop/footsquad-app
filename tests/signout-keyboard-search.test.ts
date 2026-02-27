import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const profileFile = fs.readFileSync(path.join(__dirname, "../app/(tabs)/profile.tsx"), "utf-8");
const freeAgentsFile = fs.readFileSync(path.join(__dirname, "../app/free-agents.tsx"), "utf-8");
const createMatchFile = fs.readFileSync(path.join(__dirname, "../app/create-match.tsx"), "utf-8");
const teamDetailFile = fs.readFileSync(path.join(__dirname, "../app/team/[id].tsx"), "utf-8");
const loginFile = fs.readFileSync(path.join(__dirname, "../app/login.tsx"), "utf-8");
const chatFile = fs.readFileSync(path.join(__dirname, "../app/(tabs)/chat.tsx"), "utf-8");
const dmFile = fs.readFileSync(path.join(__dirname, "../app/dm/[id].tsx"), "utf-8");
const routersFile = fs.readFileSync(path.join(__dirname, "../server/routers.ts"), "utf-8");
const dbFile = fs.readFileSync(path.join(__dirname, "../server/db.ts"), "utf-8");

describe("Fix: Signout navigates to login", () => {
  it("logout button calls logout() then router.replace('/login')", () => {
    expect(profileFile).toContain("await logout()");
    expect(profileFile).toContain("router.replace(\"/login\"");
  });

  it("logout and replace are in the same onPress handler", () => {
    const logoutBlock = profileFile.slice(
      profileFile.indexOf("await logout()") - 100,
      profileFile.indexOf("await logout()") + 200
    );
    expect(logoutBlock).toContain("router.replace");
  });

  it("logout is async (uses await)", () => {
    expect(profileFile).toContain("async () => {");
    expect(profileFile).toContain("await logout()");
  });
});

describe("Fix: KeyboardAvoidingView in key screens", () => {
  it("login.tsx uses KeyboardAvoidingView", () => {
    expect(loginFile).toContain("KeyboardAvoidingView");
    expect(loginFile).toContain("behavior={Platform.OS === \"ios\" ? \"padding\"");
  });

  it("chat.tsx uses KeyboardAvoidingView", () => {
    expect(chatFile).toContain("KeyboardAvoidingView");
    expect(chatFile).toContain("behavior={Platform.OS === \"ios\" ? \"padding\"");
  });

  it("dm/[id].tsx uses KeyboardAvoidingView", () => {
    expect(dmFile).toContain("KeyboardAvoidingView");
    expect(dmFile).toContain("behavior={Platform.OS === \"ios\" ? \"padding\"");
  });

  it("free-agents.tsx Create Post modal uses KeyboardAvoidingView", () => {
    expect(freeAgentsFile).toContain("KeyboardAvoidingView");
    expect(freeAgentsFile).toContain("behavior={Platform.OS === \"ios\" ? \"padding\" : \"height\"}");
  });

  it("free-agents.tsx has matching open/close KeyboardAvoidingView tags", () => {
    const opens = (freeAgentsFile.match(/<KeyboardAvoidingView/g) || []).length;
    const closes = (freeAgentsFile.match(/<\/KeyboardAvoidingView>/g) || []).length;
    expect(opens).toBe(closes);
  });

  it("create-match.tsx Team Search modal uses KeyboardAvoidingView", () => {
    expect(createMatchFile).toContain("KeyboardAvoidingView");
    expect(createMatchFile).toContain("behavior={Platform.OS === \"ios\" ? \"padding\" : \"height\"}");
  });

  it("create-match.tsx has matching open/close KeyboardAvoidingView tags", () => {
    const opens = (createMatchFile.match(/<KeyboardAvoidingView/g) || []).length;
    const closes = (createMatchFile.match(/<\/KeyboardAvoidingView>/g) || []).length;
    expect(opens).toBe(closes);
  });

  it("team/[id].tsx Add Player modal uses KeyboardAvoidingView", () => {
    expect(teamDetailFile).toContain("KeyboardAvoidingView");
    expect(teamDetailFile).toContain("behavior={Platform.OS === \"ios\" ? \"padding\" : \"height\"}");
  });

  it("team/[id].tsx has matching open/close KeyboardAvoidingView tags", () => {
    const opens = (teamDetailFile.match(/<KeyboardAvoidingView/g) || []).length;
    const closes = (teamDetailFile.match(/<\/KeyboardAvoidingView>/g) || []).length;
    expect(opens).toBe(closes);
  });
});

describe("Fix: Player Search in Add Player", () => {
  it("db.ts has searchPlayers function with LIKE query", () => {
    expect(dbFile).toContain("async function searchPlayers");
    expect(dbFile).toContain("like(players.fullName");
    expect(dbFile).toContain("like(players.city");
  });

  it("db.ts imports 'like' and 'or' from drizzle-orm", () => {
    const importLine = dbFile.split("\n")[0];
    expect(importLine).toContain("like");
    expect(importLine).toContain("or");
  });

  it("routers.ts has player.search route", () => {
    const playerBlock = routersFile.slice(
      routersFile.indexOf("player: router({"),
      routersFile.indexOf("// ─── TEAM ───")
    );
    expect(playerBlock).toContain("search: publicProcedure");
    expect(playerBlock).toContain("query: z.string().min(1)");
  });

  it("team/[id].tsx uses trpc.player.search instead of freeAgents", () => {
    expect(teamDetailFile).toContain("trpc.player.search.useQuery");
    expect(teamDetailFile).not.toContain("trpc.player.freeAgents.useQuery");
  });

  it("team/[id].tsx only searches when query >= 2 chars", () => {
    expect(teamDetailFile).toContain("searchQuery.length >= 2");
    expect(teamDetailFile).toContain("enabled: showAddPlayer && searchQuery.length >= 2");
  });

  it("team/[id].tsx shows 'Type at least 2 characters' hint", () => {
    expect(teamDetailFile).toContain("Type at least 2 characters to search");
  });

  it("team/[id].tsx shows loading indicator while searching", () => {
    expect(teamDetailFile).toContain("isSearching");
    expect(teamDetailFile).toContain("ActivityIndicator");
  });

  it("team/[id].tsx shows 'No players found' when no results", () => {
    expect(teamDetailFile).toContain("No players found");
  });

  it("search input has autoFocus for immediate keyboard popup", () => {
    expect(teamDetailFile).toContain("autoFocus");
  });
});
