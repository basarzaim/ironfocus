import { describe, expect, it } from "vitest";
import { pruneLogsByRetention, resolveVisualQuality } from "./userPreferences";

describe("userPreferences", () => {
  it("prunes logs older than retention window", () => {
    const result = pruneLogsByRetention(
      [
        { id: "old", date: "2020-01-01" },
        { id: "new", date: "2026-06-30" },
      ],
      90,
      new Date("2026-06-30T12:00:00.000Z"),
    );

    expect(result.removedCount).toBe(1);
    expect(result.kept).toEqual(["new"]);
  });

  it("resolves low quality when reduced motion is enabled", () => {
    expect(resolveVisualQuality("high", true)).toBe("low");
    expect(resolveVisualQuality("high", false)).toBe("high");
    expect(resolveVisualQuality("low", false)).toBe("low");
  });
});
