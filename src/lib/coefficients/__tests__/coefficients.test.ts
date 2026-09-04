import { describe, it, expect } from "vitest";
import {
  computeUefaBlockFromRanking,
  getCountryUefaBlock,
  getUefaAllocation,
  UEFA_BLOCK_DEFAULTS,
} from "../uefa-defaults";
import {
  CONMEBOL_DEFAULTS,
  getConmebolAllocation,
} from "../conmebol-defaults";

describe("UEFA defaults", () => {
  it("rank 1-5 are block A", () => {
    for (const r of [1, 3, 5]) {
      expect(computeUefaBlockFromRanking(r)).toBe("A");
    }
  });

  it("rank 6 is block B", () => {
    expect(computeUefaBlockFromRanking(6)).toBe("B");
  });

  it("rank 7-15 are block C", () => {
    for (const r of [7, 10, 15]) {
      expect(computeUefaBlockFromRanking(r)).toBe("C");
    }
  });

  it("rank 16+ are block D", () => {
    for (const r of [16, 30, 55]) {
      expect(computeUefaBlockFromRanking(r)).toBe("D");
    }
  });

  it("Block A has 3 Champions direct, 0 playoff, 1 Europa, 1 Conference", () => {
    expect(UEFA_BLOCK_DEFAULTS.A.championsDirect).toBe(3);
    expect(UEFA_BLOCK_DEFAULTS.A.championsPlayoffSlots).toBe(0);
    expect(UEFA_BLOCK_DEFAULTS.A.championsQualifying).toBe(0);
    expect(UEFA_BLOCK_DEFAULTS.A.europa).toBe(1);
    expect(UEFA_BLOCK_DEFAULTS.A.conference).toBe(1);
  });

  it("Block B has 2 Champions direct, 0 playoff", () => {
    expect(UEFA_BLOCK_DEFAULTS.B.championsDirect).toBe(2);
    expect(UEFA_BLOCK_DEFAULTS.B.championsPlayoffSlots).toBe(0);
    expect(UEFA_BLOCK_DEFAULTS.B.championsQualifying).toBe(0);
  });

  it("Block C has 0 Champions direct + 1 Champions playoff", () => {
    expect(UEFA_BLOCK_DEFAULTS.C.championsDirect).toBe(0);
    expect(UEFA_BLOCK_DEFAULTS.C.championsPlayoffSlots).toBe(1);
    expect(UEFA_BLOCK_DEFAULTS.C.championsQualifying).toBe(0);
  });

  it("Block D has 0 Champions direct + 0 Champions playoff + 1 Champions qualifying", () => {
    expect(UEFA_BLOCK_DEFAULTS.D.championsDirect).toBe(0);
    expect(UEFA_BLOCK_DEFAULTS.D.championsPlayoffSlots).toBe(0);
    expect(UEFA_BLOCK_DEFAULTS.D.championsQualifying).toBe(1);
  });

  it("getCountryUefaBlock returns correct block for known countries", () => {
    expect(getCountryUefaBlock("England")).toBe("A");
    expect(getCountryUefaBlock("France")).toBe("B");
    expect(getCountryUefaBlock("Norway")).toBe("C");
    expect(getCountryUefaBlock("Ireland")).toBe("D");
  });

  it("getCountryUefaBlock acepta países en español (BD)", () => {
    expect(getCountryUefaBlock("Inglaterra")).toBe("A");
    expect(getCountryUefaBlock("España")).toBe("A");
    expect(getCountryUefaBlock("Alemania")).toBe("A");
    expect(getCountryUefaBlock("Francia")).toBe("B");
    expect(getCountryUefaBlock("Noruega")).toBe("C");
    expect(getCountryUefaBlock("Irlanda")).toBe("D");
  });

  it("getUefaAllocation devuelve spots correctos para país en español", () => {
    const eng = getUefaAllocation("Inglaterra");
    expect(eng).not.toBeNull();
    expect(eng!.championsDirect).toBe(3);
    expect(eng!.europa).toBe(1);
    expect(eng!.conference).toBe(1);
  });

  it("getUefaAllocation returns null for non-UEFA country", () => {
    expect(getUefaAllocation("Brazil")).toBeNull();
  });
});

describe("Conmebol defaults", () => {
  it("Argentina tiene 9 Libertadores qualifying + 12 Sudamericana", () => {
    expect(CONMEBOL_DEFAULTS.Argentina.libertadoresDirect).toBe(0);
    expect(CONMEBOL_DEFAULTS.Argentina.libertadoresQualifying).toBe(9);
    expect(CONMEBOL_DEFAULTS.Argentina.sudamericana).toBe(12);
    expect(CONMEBOL_DEFAULTS.Argentina.extraFromSudamericanaWinner).toBe(false);
    expect(CONMEBOL_DEFAULTS.Argentina.usesReclasiTable).toBe(false);
  });

  it("Brasil, Chile y Colombia NO están en CONMEBOL_DEFAULTS (no son ligas jugables en EA FC 27)", () => {
    expect(CONMEBOL_DEFAULTS.Brasil).toBeUndefined();
    expect(CONMEBOL_DEFAULTS.Chile).toBeUndefined();
    expect(CONMEBOL_DEFAULTS.Colombia).toBeUndefined();
  });

  it("getConmebolAllocation devuelve null para Brasil/Chile/Colombia", () => {
    expect(getConmebolAllocation("Brasil")).toBeNull();
    expect(getConmebolAllocation("Brazil")).toBeNull();
    expect(getConmebolAllocation("Chile")).toBeNull();
    expect(getConmebolAllocation("Colombia")).toBeNull();
  });

  it("getConmebolAllocation returns null for non-Conmebol country", () => {
    expect(getConmebolAllocation("Spain")).toBeNull();
  });

  it("getConmebolAllocation acepta países en español (BD)", () => {
    expect(getConmebolAllocation("Argentina")).not.toBeNull();
    expect(getConmebolAllocation("Argentina")!.libertadoresQualifying).toBe(9);
    expect(getConmebolAllocation("Argentina")!.sudamericana).toBe(12);
  });

  it("getConmebolAllocation devuelve null para país europeo", () => {
    expect(getConmebolAllocation("España")).toBeNull();
  });
});
