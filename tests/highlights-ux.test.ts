import { describe, it, expect } from "vitest";
import * as fs from "fs";

describe("Fix Package 1: Highlights UX", () => {

  describe("Home Best Moment Carousel", () => {
    it("should use FlatList horizontal for carousel (not single card)", () => {
      const content = fs.readFileSync("app/(tabs)/index.tsx", "utf-8");
      // Should have FlatList with horizontal for highlights
      expect(content).toContain("horizontal");
      // Should show top10 not just topHighlight
      expect(content).toContain("top10");
      // Should have 9:16 ratio constants
      expect(content).toContain("CARD_WIDTH");
      expect(content).toContain("CARD_HEIGHT");
      expect(content).toContain("16 / 9");
    });

    it("should navigate to highlight detail on press", () => {
      const content = fs.readFileSync("app/(tabs)/index.tsx", "utf-8");
      expect(content).toContain("/highlight/");
    });

    it("should have See All button linking to /highlights", () => {
      const content = fs.readFileSync("app/(tabs)/index.tsx", "utf-8");
      expect(content).toContain("/highlights");
      expect(content).toContain("See All");
    });

    it("should snap to card width for smooth scrolling", () => {
      const content = fs.readFileSync("app/(tabs)/index.tsx", "utf-8");
      expect(content).toContain("snapToInterval");
      expect(content).toContain("decelerationRate");
    });
  });

  describe("Highlight Detail Screen", () => {
    it("should exist at app/highlight/[id].tsx", () => {
      expect(fs.existsSync("app/highlight/[id].tsx")).toBe(true);
    });

    it("should have media viewer for both photo and video", () => {
      const content = fs.readFileSync("app/highlight/[id].tsx", "utf-8");
      expect(content).toContain("mediaType === \"photo\"");
      expect(content).toContain("mediaType === \"video\"");
      expect(content).toContain("VideoView");
    });

    it("should have working like button with count", () => {
      const content = fs.readFileSync("app/highlight/[id].tsx", "utf-8");
      expect(content).toContain("likeMutation");
      expect(content).toContain("highlight.like");
      expect(content).toContain("likeCount");
    });

    it("should display player info with city", () => {
      const content = fs.readFileSync("app/highlight/[id].tsx", "utf-8");
      expect(content).toContain("playerName");
      expect(content).toContain("cityText");
      expect(content).toContain("player?.city");
    });

    it("should show time remaining (48h countdown)", () => {
      const content = fs.readFileSync("app/highlight/[id].tsx", "utf-8");
      expect(content).toContain("timeLeft");
      expect(content).toContain("expiresAt");
    });
  });

  describe("All Highlights Screen", () => {
    it("should exist at app/highlights.tsx", () => {
      expect(fs.existsSync("app/highlights.tsx")).toBe(true);
    });

    it("should have city filter", () => {
      const content = fs.readFileSync("app/highlights.tsx", "utf-8");
      expect(content).toContain("cityFilter");
      expect(content).toContain("City");
    });

    it("should have team filter", () => {
      const content = fs.readFileSync("app/highlights.tsx", "utf-8");
      expect(content).toContain("teamFilter");
      expect(content).toContain("Team");
    });

    it("should display 2-column grid with 9:16 cards", () => {
      const content = fs.readFileSync("app/highlights.tsx", "utf-8");
      expect(content).toContain("numColumns={2}");
      expect(content).toContain("16 / 9");
      expect(content).toContain("CARD_W");
      expect(content).toContain("CARD_H");
    });

    it("should navigate to highlight detail on card press", () => {
      const content = fs.readFileSync("app/highlights.tsx", "utf-8");
      expect(content).toContain("/highlight/");
    });

    it("should filter highlights by city and team", () => {
      const content = fs.readFileSync("app/highlights.tsx", "utf-8");
      expect(content).toContain("filtered");
      expect(content).toContain("useMemo");
      expect(content).toContain("matchCity");
      expect(content).toContain("matchTeam");
    });
  });

  describe("Player Profile Highlights Section", () => {
    it("should query highlights in ProfileView", () => {
      const content = fs.readFileSync("app/(tabs)/profile.tsx", "utf-8");
      expect(content).toContain("allHighlights");
      expect(content).toContain("highlight.list");
    });

    it("should filter highlights to show only current player's", () => {
      const content = fs.readFileSync("app/(tabs)/profile.tsx", "utf-8");
      expect(content).toContain("myHighlights");
      expect(content).toContain("player.id");
    });

    it("should show 48H badge on profile highlights section", () => {
      const content = fs.readFileSync("app/(tabs)/profile.tsx", "utf-8");
      expect(content).toContain("My Highlights");
      expect(content).toContain("48H");
    });

    it("should have Post New Highlight button in profile", () => {
      const content = fs.readFileSync("app/(tabs)/profile.tsx", "utf-8");
      expect(content).toContain("Post New Highlight");
      expect(content).toContain("upload-highlight");
    });
  });
});

// Video trim endpoint tests
describe("Video Trim Endpoint", () => {
  it("should have /api/upload/video-trim route registered in oauth.ts", () => {
    const fs = require("fs");
    const content = fs.readFileSync("server/_core/oauth.ts", "utf-8");
    expect(content).toContain("/api/upload/video-trim");
  });

  it("should use ffmpeg with -ss and -t flags for trimming", () => {
    const fs = require("fs");
    const content = fs.readFileSync("server/_core/oauth.ts", "utf-8");
    expect(content).toContain('"-ss"');
    expect(content).toContain('"-t"');
    expect(content).toContain('"-c", "copy"');
  });

  it("should clean up temp files after trim (finally block)", () => {
    const fs = require("fs");
    const content = fs.readFileSync("server/_core/oauth.ts", "utf-8");
    expect(content).toContain("fs.unlinkSync(tmpInput)");
    expect(content).toContain("fs.unlinkSync(tmpOutput)");
  });

  it("should export uploadVideoWithTrim from api.ts", () => {
    const fs = require("fs");
    const content = fs.readFileSync("lib/_core/api.ts", "utf-8");
    expect(content).toContain("export async function uploadVideoWithTrim");
  });

  it("should fall back to regular upload when no trim params", () => {
    const fs = require("fs");
    const content = fs.readFileSync("lib/_core/api.ts", "utf-8");
    expect(content).toContain("return uploadFile(uri, mimeType)");
  });

  it("should use trimStart/trimEnd in upload-highlight.tsx", () => {
    const fs = require("fs");
    const content = fs.readFileSync("app/upload-highlight.tsx", "utf-8");
    expect(content).toContain("uploadVideoWithTrim");
    expect(content).toContain("trimStart");
    expect(content).toContain("trimEnd");
  });
});
