import { describe, it, expect } from "vitest";
import { navigationConfig } from "@/lib/navigationConfig";

describe("navigationConfig", () => {
  it("should have all required sections", () => {
    const sectionNames = navigationConfig.map((s) => s.section);
    expect(sectionNames).toContain("Cockpit");
    expect(sectionNames).toContain("KI-Tools");
  });

  it("should have unique paths for all items", () => {
    const paths = navigationConfig.flatMap((s) => s.items.map((i) => i.path));
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });

  it("should have feature slugs only on gated items", () => {
    const items = navigationConfig.flatMap((s) => s.items);
    const gated = items.filter((i) => i.featureSlug);
    expect(gated.length).toBeGreaterThan(0);

    const ungated = items.filter((i) => !i.featureSlug);
    expect(ungated.length).toBeGreaterThan(0);
  });
});
