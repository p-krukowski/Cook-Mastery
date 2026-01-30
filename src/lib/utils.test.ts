import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("filters falsy values", () => {
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
  });

  it("merges tailwind classes (later wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

