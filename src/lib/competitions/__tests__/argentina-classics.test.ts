import { describe, it, expect } from "vitest";
import { splitArgentinaZones, getArgentinaClassicRival } from "../argentina-classics";

describe("splitArgentinaZones", () => {
  it("splits 30 teams into 15/15", () => {
    const teams = Array.from({ length: 30 }, (_, i) => `t${i + 1}`);
    const { zoneA, zoneB } = splitArgentinaZones(teams);
    expect(zoneA).toHaveLength(15);
    expect(zoneB).toHaveLength(15);
  });

  it("no overlap between zones", () => {
    const teams = Array.from({ length: 30 }, (_, i) => `t${i + 1}`);
    const { zoneA, zoneB } = splitArgentinaZones(teams);
    const overlap = zoneA.filter((t) => zoneB.includes(t));
    expect(overlap).toHaveLength(0);
  });
});

describe("getArgentinaClassicRival", () => {
  it("Boca Juniors rival is River Plate", () => {
    expect(getArgentinaClassicRival("Boca Juniors")).toBe("River Plate");
  });

  it("River Plate rival is Boca Juniors", () => {
    expect(getArgentinaClassicRival("River Plate")).toBe("Boca Juniors");
  });

  it("unknown team returns null", () => {
    expect(getArgentinaClassicRival("Unknown FC")).toBeNull();
  });
});
