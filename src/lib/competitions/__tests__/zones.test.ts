import { describe, it, expect } from "vitest";
import { ZONE_CATALOG, ZONE_ORDER, getZoneStyle } from "../zones";

describe("ZONE_CATALOG", () => {
  it("has 15 zones", () => {
    expect(Object.keys(ZONE_CATALOG)).toHaveLength(15);
  });

  it("each zone has hex and label and tailwind", () => {
    for (const zone of Object.values(ZONE_CATALOG)) {
      expect(zone.hex).toMatch(/^#[0-9A-F]{6}$/i);
      expect(zone.label.length).toBeGreaterThan(0);
      expect(zone.tailwind.border).toBeTruthy();
    }
  });

  it("PLAYOFF_RELEGATION uses amber color (#F2A900)", () => {
    const zone = ZONE_CATALOG.PLAYOFF_RELEGATION;
    expect(zone.hex).toBe("#F2A900");
    expect(zone.tailwind.border).toBe("border-amber-500");
  });

  it("CHAMPION uses gold color (#FFD700)", () => {
    expect(ZONE_CATALOG.CHAMPION.hex).toBe("#FFD700");
  });
});

describe("ZONE_ORDER", () => {
  it("has 15 entries in order", () => {
    expect(ZONE_ORDER).toHaveLength(15);
    expect(ZONE_ORDER[0]).toBe("CHAMPION");
    expect(ZONE_ORDER[ZONE_ORDER.length - 1]).toBe("RELEGATION_DIRECT");
  });
});

describe("CONTINENTAL_PLAYOFF", () => {
  it("existe en ZONE_CATALOG con badge Champions y etiqueta por continente", () => {
    const zone = ZONE_CATALOG.CONTINENTAL_PLAYOFF;
    expect(zone).toBeDefined();
    expect(zone.hex).toBe("#1E3A8A");
    const styleUEFA = getZoneStyle("CONTINENTAL_PLAYOFF", "Europe");
    expect(styleUEFA.label).toBe("Champions League (ronda previa)");
    const styleCONMEBOL = getZoneStyle("CONTINENTAL_PLAYOFF", "Sudamérica");
    expect(styleCONMEBOL.label).toBe("Copa Libertadores (ronda previa)");
  });
});

describe("getZoneStyle", () => {
  it("returns style for any zone", () => {
    const style = getZoneStyle("CHAMPION");
    expect(style.label).toBe("Campeón");
  });
});
