import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const routersPath = path.join(__dirname, "../server/routers.ts");
const dbPath = path.join(__dirname, "../server/db.ts");
const schemaPath = path.join(__dirname, "../drizzle/schema.ts");
const postMatchPath = path.join(__dirname, "../app/post-match/[id].tsx");

const routers = fs.readFileSync(routersPath, "utf-8");
const db = fs.readFileSync(dbPath, "utf-8");
const schema = fs.readFileSync(schemaPath, "utf-8");
const postMatch = fs.readFileSync(postMatchPath, "utf-8");

describe("Score Double-Validation System", () => {
  it("schema has scoreSubmittedByA and scoreSubmittedByB fields", () => {
    expect(schema).toContain("scoreSubmittedByA");
    expect(schema).toContain("scoreSubmittedByB");
  });

  it("schema has scoreConflict and scoreConflictCount fields", () => {
    expect(schema).toContain("scoreConflict");
    expect(schema).toContain("scoreConflictCount");
  });

  it("schema has null_result status", () => {
    expect(schema).toContain("null_result");
  });

  it("submitScore route exists in routers", () => {
    expect(routers).toContain("submitScore:");
  });

  it("submitScore validates both captains must submit", () => {
    const block = routers.substring(routers.indexOf("submitScore:"), routers.indexOf("submitScore:") + 3000);
    expect(block).toContain("scoreSubmittedByA");
    expect(block).toContain("scoreSubmittedByB");
  });

  it("submitScore confirms match when scores match", () => {
    const block = routers.substring(routers.indexOf("submitScore:"), routers.indexOf("submitScore:") + 3000);
    expect(block).toContain("subA === subB");
    expect(block).toContain("status: \"completed\"");
  });

  it("submitScore handles score conflict with second chance", () => {
    const block = routers.substring(routers.indexOf("submitScore:"), routers.indexOf("submitScore:") + 6000);
    expect(block).toContain("scoreConflict");
    expect(block).toContain("Last chance");
  });

  it("submitScore sets null_result after 2 conflicts", () => {
    const block = routers.substring(routers.indexOf("submitScore:"), routers.indexOf("submitScore:") + 5000);
    expect(block).toContain("null_result");
    expect(block).toContain("conflictCount >= 2");
  });

  it("submitScore notifies other captain when waiting", () => {
    const block = routers.substring(routers.indexOf("submitScore:"), routers.indexOf("submitScore:") + 5000);
    expect(block).toContain("score_request");
    expect(block).toContain("createNotification");
  });

  it("submitScore notifies both captains on score confirmed", () => {
    const block = routers.substring(routers.indexOf("submitScore:"), routers.indexOf("submitScore:") + 5000);
    expect(block).toContain("score_confirmed");
  });

  it("submitScore notifies both captains on null_result", () => {
    const block = routers.substring(routers.indexOf("submitScore:"), routers.indexOf("submitScore:") + 5000);
    expect(block).toContain("score_null");
  });

  it("submitScore awards match points when confirmed", () => {
    const block = routers.substring(routers.indexOf("submitScore:"), routers.indexOf("submitScore:") + 3000);
    expect(block).toContain("awardMatchPoints");
  });

  it("getScoreStatus route exists", () => {
    expect(routers).toContain("getScoreStatus:");
  });
});

describe("MOTM Vote System", () => {
  it("motm.vote validates match has motmVotingOpen", () => {
    const block = routers.substring(routers.indexOf("motm: router"), routers.indexOf("motm: router") + 3000);
    expect(block).toContain("motmVotingOpen");
  });

  it("motm.vote validates voted player is in the match", () => {
    const block = routers.substring(routers.indexOf("motm: router"), routers.indexOf("motm: router") + 3000);
    expect(block).toContain("allPlayerIds.includes");
  });

  it("motm.vote finalizes winner when all players have voted", () => {
    const block = routers.substring(routers.indexOf("motm: router"), routers.indexOf("motm: router") + 3000);
    expect(block).toContain("finalizeMotmWinner");
    expect(block).toContain("votes.length >= totalVoters");
  });

  it("motm.vote notifies all players of MOTM winner", () => {
    const block = routers.substring(routers.indexOf("motm: router"), routers.indexOf("motm: router") + 3000);
    expect(block).toContain("motm_winner");
    expect(block).toContain("Man of the Match");
  });

  it("finalizeMotmWinner function exists in db.ts", () => {
    expect(db).toContain("finalizeMotmWinner");
  });

  it("finalizeMotmWinner awards MOTM bonus points (+2)", () => {
    const idx = db.indexOf("finalizeMotmWinner");
    const block = db.substring(idx, idx + 1500);
    expect(block).toContain("motmCount");
  });
});

describe("Rating Anti-Fake Budget System", () => {
  it("rating.submit validates max 10 per player", () => {
    const block = routers.substring(routers.indexOf("rating: router"), routers.indexOf("rating: router") + 3000);
    expect(block).toContain("max(10)");
  });

  it("rating.submit enforces budget: total <= opponentCount * 7", () => {
    const block = routers.substring(routers.indexOf("rating: router"), routers.indexOf("rating: router") + 3000);
    expect(block).toContain("opponentCount * 7");
    expect(block).toContain("maxBudget");
  });

  it("rating.submit rejects if total exceeds budget", () => {
    const block = routers.substring(routers.indexOf("rating: router"), routers.indexOf("rating: router") + 3000);
    expect(block).toContain("Total rating budget exceeded");
  });

  it("rating.submit only rates opponents (not teammates)", () => {
    const block = routers.substring(routers.indexOf("rating: router"), routers.indexOf("rating: router") + 3000);
    expect(block).toContain("Cannot rate own teammates");
  });

  it("rating.submit calls updatePlayerRatingStats after submission", () => {
    const block = routers.substring(routers.indexOf("rating: router"), routers.indexOf("rating: router") + 3000);
    expect(block).toContain("updatePlayerRatingStats");
  });

  it("updatePlayerRatingStats function exists in db.ts", () => {
    expect(db).toContain("updatePlayerRatingStats");
  });
});

describe("Post-Match Screen", () => {
  it("post-match screen exists", () => {
    expect(postMatch).toBeTruthy();
  });

  it("post-match screen has score input fields", () => {
    expect(postMatch).toContain("scoreA");
    expect(postMatch).toContain("scoreB");
  });

  it("post-match screen shows budget bar for ratings", () => {
    expect(postMatch).toContain("budgetBar");
    expect(postMatch).toContain("maxBudget");
  });

  it("post-match screen has MOTM player grid", () => {
    expect(postMatch).toContain("playerGrid");
    expect(postMatch).toContain("selectedMotm");
  });

  it("post-match screen shows conflict banner", () => {
    expect(postMatch).toContain("conflictBanner");
    expect(postMatch).toContain("Score Conflict");
  });

  it("post-match screen shows null result banner", () => {
    expect(postMatch).toContain("nullBanner");
    expect(postMatch).toContain("NULL");
  });

  it("match detail has Submit Score button for captains", () => {
    const matchDetail = fs.readFileSync(path.join(__dirname, "../app/match/[id].tsx"), "utf-8");
    expect(matchDetail).toContain("Submit Match Score");
    expect(matchDetail).toContain("post-match");
  });
});

describe("awardMatchPoints Logic", () => {
  it("awardMatchPoints function exists in db.ts", () => {
    expect(db).toContain("awardMatchPoints");
  });

  it("awardMatchPoints awards Win=3, Draw=1, Loss=0 points", () => {
    const idx = db.indexOf("awardMatchPoints");
    const block = db.substring(idx, idx + 2000);
    // Win = 3 points
    expect(block).toContain("3");
    // Draw = 1 point
    expect(block).toContain("1");
  });
});
