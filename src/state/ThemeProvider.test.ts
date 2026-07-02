import { describe, expect, it } from "vitest";
import { resolveAccentId } from "./ThemeProvider";

describe("resolveAccentId", () => {
  it("passes through valid accent ids", () => {
    expect(resolveAccentId("blue")).toBe("blue");
    expect(resolveAccentId("classic")).toBe("classic");
    expect(resolveAccentId("turquoise")).toBe("turquoise");
  });

  it("migrates legacy rose to pink", () => {
    expect(resolveAccentId("rose")).toBe("pink");
  });

  it("migrates legacy wife to pink", () => {
    expect(resolveAccentId("wife")).toBe("pink");
  });

  it("falls back to classic for missing or invalid values", () => {
    expect(resolveAccentId(null)).toBe("classic");
    expect(resolveAccentId(undefined)).toBe("classic");
    expect(resolveAccentId("")).toBe("classic");
    expect(resolveAccentId("not-a-real-accent")).toBe("classic");
  });
});
