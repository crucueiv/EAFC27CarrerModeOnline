import { describe, it, expect } from "vitest";
import { DOMESTIC_CUP_CATALOG, getDomesticCupForLeague } from "../domestic-cup-catalog";

describe("DOMESTIC_CUP_CATALOG", () => {
  it("has 10 cups", () => {
    expect(DOMESTIC_CUP_CATALOG).toHaveLength(10);
  });

  it("includes FA Cup, Copa del Rey, Coppa Italia, DFB-Pokal", () => {
    const names = DOMESTIC_CUP_CATALOG.map((c) => c.name);
    expect(names).toContain("FA Cup");
    expect(names).toContain("Copa del Rey");
    expect(names).toContain("Coppa Italia");
    expect(names).toContain("DFB-Pokal");
  });

  it("includes Argentina and Colombia cups", () => {
    const names = DOMESTIC_CUP_CATALOG.map((c) => c.name);
    expect(names).toContain("Copa Argentina");
    expect(names).toContain("Copa Colombia");
  });
});

describe("getDomesticCupForLeague", () => {
  it("returns the cup for Spain (eaId 53)", () => {
    const cup = getDomesticCupForLeague("53");
    expect(cup?.name).toBe("Copa del Rey");
    expect(cup?.affectsContinentSlot).toBe("CONFERENCE");
  });

  it("returns null for leagues without cup", () => {
    expect(getDomesticCupForLeague("999")).toBeNull();
  });
});
