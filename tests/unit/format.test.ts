import { describe, it, expect } from "vitest";
import { formatBytes, formatDuration, getDateGroup } from "@/lib/format";

describe("formatBytes", () => {
  it("formats zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});

describe("formatDuration", () => {
  it("formats sub-millisecond", () => {
    expect(formatDuration(0.5)).toBe("<1 ms");
  });

  it("formats milliseconds", () => {
    expect(formatDuration(124)).toBe("124 ms");
  });

  it("formats seconds", () => {
    expect(formatDuration(2500)).toBe("2.5 s");
  });

  it("formats minutes", () => {
    expect(formatDuration(90000)).toBe("1.5 min");
  });
});

describe("getDateGroup", () => {
  it("returns 'Today' for current date", () => {
    expect(getDateGroup(Date.now())).toBe("Today");
  });

  it("returns 'Yesterday' for yesterday", () => {
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    expect(getDateGroup(yesterday)).toBe("Yesterday");
  });
});
