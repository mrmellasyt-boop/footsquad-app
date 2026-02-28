import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const createMatchFile = fs.readFileSync(path.join(__dirname, "../app/create-match.tsx"), "utf-8");
const dbFile = fs.readFileSync(path.join(__dirname, "../server/db.ts"), "utf-8");

describe("Fix: Date/Time Picker", () => {
  it("imports DateTimePicker from @react-native-community/datetimepicker", () => {
    expect(createMatchFile).toContain("@react-native-community/datetimepicker");
  });

  it("no longer uses free-text input for date (YYYY-MM-DD HH:MM placeholder removed)", () => {
    expect(createMatchFile).not.toContain("YYYY-MM-DD HH:MM");
  });

  it("uses selectedDate state (not matchDate string)", () => {
    expect(createMatchFile).toContain("selectedDate");
    expect(createMatchFile).not.toContain("const [matchDate, setMatchDate]");
  });

  it("shows DateTimePicker with mode='date'", () => {
    expect(createMatchFile).toContain("mode=\"date\"");
  });

  it("shows DateTimePicker with mode='time'", () => {
    expect(createMatchFile).toContain("mode=\"time\"");
  });

  it("sets minimumDate to prevent past dates", () => {
    expect(createMatchFile).toContain("minimumDate");
  });

  it("validates that selectedDate is required before submit", () => {
    expect(createMatchFile).toContain("!selectedDate");
    expect(createMatchFile).toContain("Date and time are required");
  });

  it("validates that match date must be in the future", () => {
    expect(createMatchFile).toContain("selectedDate <= new Date()");
    expect(createMatchFile).toContain("Invalid Date");
  });

  it("shows required asterisk on Date & Time label", () => {
    expect(createMatchFile).toContain("Date & Time");
    expect(createMatchFile).toContain("required");
  });

  it("disables create button when selectedDate is null", () => {
    expect(createMatchFile).toContain("isFormValid");
    expect(createMatchFile).toContain("!isFormValid");
  });

  it("formats date for display using formatDate helper", () => {
    expect(createMatchFile).toContain("formatDate");
    expect(createMatchFile).toContain("formatTime");
  });

  it("handles iOS two-step picker (date then time) with confirmIOSDateTime", () => {
    expect(createMatchFile).toContain("confirmIOSDateTime");
    expect(createMatchFile).toContain("Platform.OS === \"ios\"");
  });

  it("handles Android two-step picker (date then time via chain)", () => {
    expect(createMatchFile).toContain("setShowTimePicker(true)");
  });
});

describe("Fix: Expired Matches Filtering", () => {
  it("getPublicMatches filters out expired matches (gte matchDate now)", () => {
    const block = dbFile.slice(dbFile.indexOf("async function getPublicMatches"), dbFile.indexOf("async function getPlayerMatches"));
    expect(block).toContain("gte(matches.matchDate, now)");
  });

  it("getPublicMatches uses const now = new Date()", () => {
    const block = dbFile.slice(dbFile.indexOf("async function getPublicMatches"), dbFile.indexOf("async function getPlayerMatches"));
    expect(block).toContain("const now = new Date()");
  });

  it("getUpcomingMatches already filters expired matches", () => {
    const block = dbFile.slice(dbFile.indexOf("async function getUpcomingMatches"), dbFile.indexOf("async function getPublicMatches"));
    expect(block).toContain("gte(matches.matchDate, now)");
  });

  it("getPlayerMatches excludes cancelled matches", () => {
    const block = dbFile.slice(dbFile.indexOf("async function getPlayerMatches"), dbFile.indexOf("async function getMatchesAsTeamB"));
    // New logic: only confirmed/completed/in_progress (implicitly excludes cancelled and pending)
    expect(block).toContain("inArray(matches.status, confirmedStatuses)");
  });

  it("getPlayerMatches keeps completed matches (no expiry filter on player history)", () => {
    const block = dbFile.slice(dbFile.indexOf("async function getPlayerMatches"), dbFile.indexOf("async function updateMatch"));
    // Should NOT filter by matchDate >= now for player history (they see past matches too)
    expect(block).not.toContain("gte(matches.matchDate, now)");
  });
});
