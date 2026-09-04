import { describe, it, expect } from "vitest";
import { getZoneForRank } from "../getZoneForRank";
import { getLeagueFormatSpec } from "@/lib/league-formats/catalog";
import type { ContinentSpots } from "@/lib/coefficients/resolveContinentSpots";

const uefaASpots: ContinentSpots = {
  championsDirect: 3,
  championsQualifying: 0,
  championsPlayoffSlots: 0,
  europa: 1,
  conference: 1,
  libertadoresDirect: 0,
  libertadoresQualifying: 0,
  sudamericana: 0,
  extraFromSudamericanaWinner: false,
  usesReclasiTable: false,
};

describe("getZoneForRank - Premier League (Single Table, Bloque A)", () => {
  const format = getLeagueFormatSpec("13")!;
  const totalTeams = 20;
  const isTopDivision = true;
  const hasRelegationZone = true;
  const continent = "Europe";

  it("rank 1 is CHAMPION", () => {
    expect(
      getZoneForRank({ rank: 1, totalTeams, format, spots: uefaASpots, isTopDivision, hasRelegationZone, continent }),
    ).toBe("CHAMPION");
  });

  it("ranks 2-4 are CONTINENTAL_DIRECT", () => {
    for (let r = 2; r <= 4; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: uefaASpots, isTopDivision, hasRelegationZone, continent }),
      ).toBe("CONTINENTAL_DIRECT");
    }
  });

  it("rank 5 is SECONDARY_DIRECT", () => {
    expect(
      getZoneForRank({ rank: 5, totalTeams, format, spots: uefaASpots, isTopDivision, hasRelegationZone, continent }),
    ).toBe("SECONDARY_DIRECT");
  });

  it("rank 6 is CONFERENCE_DIRECT", () => {
    expect(
      getZoneForRank({ rank: 6, totalTeams, format, spots: uefaASpots, isTopDivision, hasRelegationZone, continent }),
    ).toBe("CONFERENCE_DIRECT");
  });

  it("ranks 7-17 are MID_TABLE", () => {
    for (let r = 7; r <= 17; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: uefaASpots, isTopDivision, hasRelegationZone, continent }),
      ).toBe("MID_TABLE");
    }
  });

  it("ranks 18-20 are RELEGATION_DIRECT", () => {
    for (let r = 18; r <= 20; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: uefaASpots, isTopDivision, hasRelegationZone, continent }),
      ).toBe("RELEGATION_DIRECT");
    }
  });
});

describe("getZoneForRank - EFL Championship (promotion + relegation)", () => {
  const format = getLeagueFormatSpec("14")!;
  const totalTeams = 24;
  const noContinentSpots: ContinentSpots = {
    championsDirect: 0,
    championsQualifying: 0,
    championsPlayoffSlots: 0,
    europa: 0,
    conference: 0,
    libertadoresDirect: 0,
    libertadoresQualifying: 0,
    sudamericana: 0,
    extraFromSudamericanaWinner: false,
    usesReclasiTable: false,
  };
  const isTopDivision = false;
  const hasRelegationZone = false;
  const continent = "Europe";

  it("rank 1 is CHAMPION", () => {
    expect(
      getZoneForRank({ rank: 1, totalTeams, format, spots: noContinentSpots, isTopDivision, hasRelegationZone, continent }),
    ).toBe("CHAMPION");
  });

  it("rank 2 is DIRECT_PROMOTION (2nd promoted direct)", () => {
    expect(
      getZoneForRank({ rank: 2, totalTeams, format, spots: noContinentSpots, isTopDivision, hasRelegationZone, continent }),
    ).toBe("DIRECT_PROMOTION");
  });

  it("ranks 3-6 are PLAYOFF_PROMOTION", () => {
    for (let r = 3; r <= 6; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: noContinentSpots, isTopDivision, hasRelegationZone, continent }),
      ).toBe("PLAYOFF_PROMOTION");
    }
  });

  it("ranks 22-24 are MID_TABLE (no relegation zone, lower division has no inferior league)", () => {
    for (let r = 22; r <= 24; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: noContinentSpots, isTopDivision, hasRelegationZone, continent }),
      ).toBe("MID_TABLE");
    }
  });
});

describe("getZoneForRank - Bundesliga (relegation playoff)", () => {
  const format = getLeagueFormatSpec("19")!;
  const totalTeams = 18;
  const isTopDivision = true;
  const hasRelegationZone = true;
  const continent = "Europe";

  it("rank 16 is PLAYOFF_RELEGATION (amber)", () => {
    expect(
      getZoneForRank({ rank: 16, totalTeams, format, spots: uefaASpots, isTopDivision, hasRelegationZone, continent }),
    ).toBe("PLAYOFF_RELEGATION");
  });

  it("ranks 17-18 are RELEGATION_DIRECT", () => {
    for (let r = 17; r <= 18; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: uefaASpots, isTopDivision, hasRelegationZone, continent }),
      ).toBe("RELEGATION_DIRECT");
    }
  });
});

describe("getZoneForRank - Ligue 1 (Bloque B)", () => {
  const format = getLeagueFormatSpec("16")!;
  const totalTeams = 18;
  const bloqueB: ContinentSpots = {
    championsDirect: 2,
    championsPlayoffSlots: 0,
    championsQualifying: 0,
    europa: 1,
    conference: 1,
    libertadoresDirect: 0,
    libertadoresQualifying: 0,
    sudamericana: 0,
    extraFromSudamericanaWinner: false,
    usesReclasiTable: false,
  };
  const isTopDivision = true;
  const hasRelegationZone = true;
  const continent = "Europe";

  it("rank 4 es SECONDARY_DIRECT (Europa League)", () => {
    expect(
      getZoneForRank({ rank: 4, totalTeams, format, spots: bloqueB, isTopDivision, hasRelegationZone, continent }),
    ).toBe("SECONDARY_DIRECT");
  });

  it("rank 5 es CONFERENCE_DIRECT", () => {
    expect(
      getZoneForRank({ rank: 5, totalTeams, format, spots: bloqueB, isTopDivision, hasRelegationZone, continent }),
    ).toBe("CONFERENCE_DIRECT");
  });

  it("rank 16 es PLAYOFF_RELEGATION", () => {
    expect(
      getZoneForRank({ rank: 16, totalTeams, format, spots: bloqueB, isTopDivision, hasRelegationZone, continent }),
    ).toBe("PLAYOFF_RELEGATION");
  });
});

describe("getZoneForRank - Argentine (Annual Table)", () => {
  const format = getLeagueFormatSpec("353")!;
  const totalTeams = 30;
  const isTopDivision = true;
  const hasRelegationZone = true;
  const continent = "South America";

  it("no slots are direct (annual table has 30 teams but rules use Libre/Sudamericana)", () => {
    const result = getZoneForRank({ rank: 1, totalTeams, format, spots: uefaASpots, isTopDivision, hasRelegationZone, continent });
    expect(result).toBe("CHAMPION");
  });
});

describe("getZoneForRank - Asia top division (sin competiciones continentales relevantes)", () => {
  const format = getLeagueFormatSpec("350")!;
  const totalTeams = 18;
  const asiaSpots: ContinentSpots = {
    championsDirect: 0,
    championsQualifying: 0,
    championsPlayoffSlots: 0,
    europa: 0,
    conference: 0,
    libertadoresDirect: 0,
    libertadoresQualifying: 0,
    sudamericana: 0,
    extraFromSudamericanaWinner: false,
    usesReclasiTable: false,
  };
  const isTopDivision = true;
  const hasRelegationZone = true;
  const continent = "Asia";

  it("rank 1 es CHAMPION", () => {
    expect(
      getZoneForRank({ rank: 1, totalTeams, format, spots: asiaSpots, isTopDivision, hasRelegationZone, continent }),
    ).toBe("CHAMPION");
  });

  it("ranks intermedios son MID_TABLE (no hay bandas continentales en Asia)", () => {
    for (let r = 2; r <= 15; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: asiaSpots, isTopDivision, hasRelegationZone, continent }),
      ).toBe("MID_TABLE");
    }
  });
});

describe("getZoneForRank - Liga top tier sin descenso por no tener liga inferior", () => {
  const format = getLeagueFormatSpec("308")!;
  const totalTeams = 18;
  const isTopDivision = true;
  const hasRelegationZone = false;
  const continent = "Europe";

  it("ranks bajos son MID_TABLE porque no hay liga inferior en el país", () => {
    for (let r = 16; r <= 18; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: uefaASpots, isTopDivision, hasRelegationZone, continent }),
      ).toBe("MID_TABLE");
    }
  });
});

describe("getZoneForRank - Asignación con 0 partidos (inicio de temporada)", () => {
  const format = getLeagueFormatSpec("13")!;
  const totalTeams = 20;
  const isTopDivision = true;
  const hasRelegationZone = true;
  const continent = "Europe";

  it("rank 1 sigue siendo CHAMPION aunque no haya partidos", () => {
    expect(
      getZoneForRank({ rank: 1, totalTeams, format, spots: uefaASpots, isTopDivision, hasRelegationZone, continent }),
    ).toBe("CHAMPION");
  });

  it("ranks 2-4 siguen siendo CONTINENTAL_DIRECT aunque no haya partidos", () => {
    for (let r = 2; r <= 4; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: uefaASpots, isTopDivision, hasRelegationZone, continent }),
      ).toBe("CONTINENTAL_DIRECT");
    }
  });
});

describe("getZoneForRank - SPLIT_GROUPS (K-League Final A/B)", () => {
  const format = getLeagueFormatSpec("83")!;
  const totalTeams = 12;
  const isTopDivision = true;
  const hasRelegationZone = true;
  const continent = "Asia";

  it("ranks 1-6 son SPLIT_UPPER", () => {
    for (let r = 1; r <= 6; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: uefaASpots, isTopDivision, hasRelegationZone, continent }),
      ).toBe("SPLIT_UPPER");
    }
  });

  it("ranks 7-12 son SPLIT_LOWER", () => {
    for (let r = 7; r <= 12; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: uefaASpots, isTopDivision, hasRelegationZone, continent }),
      ).toBe("SPLIT_LOWER");
    }
  });
});

describe("getZoneForRank - SPLIT_GROUPS (Cyprus Grupo A/B)", () => {
  const format = getLeagueFormatSpec("2210")!;
  const totalTeams = 14;
  const isTopDivision = true;
  const hasRelegationZone = true;
  const continent = "Europe";

  it("ranks 1-6 son SPLIT_UPPER", () => {
    for (let r = 1; r <= 6; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: uefaASpots, isTopDivision, hasRelegationZone, continent }),
      ).toBe("SPLIT_UPPER");
    }
  });

  it("ranks 7-14 son SPLIT_LOWER", () => {
    for (let r = 7; r <= 14; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: uefaASpots, isTopDivision, hasRelegationZone, continent }),
      ).toBe("SPLIT_LOWER");
    }
  });

  it("splitConfig prevalece sobre Champions/Europa/Conference (no se asignan continentales en SPLIT)", () => {
    for (let r = 2; r <= 6; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: uefaASpots, isTopDivision, hasRelegationZone, continent }),
      ).toBe("SPLIT_UPPER");
    }
  });
});

describe("getZoneForRank - continente en español (BD)", () => {
  const format = getLeagueFormatSpec("53")!;
  const totalTeams = 20;
  const isTopDivision = true;
  const hasRelegationZone = true;
  const continent = "Europa";
  const laLigaSpots: ContinentSpots = {
    ...uefaASpots,
  };

  it("rank 1 sigue siendo CHAMPION aunque el continente esté en español", () => {
    expect(
      getZoneForRank({ rank: 1, totalTeams, format, spots: laLigaSpots, isTopDivision, hasRelegationZone, continent }),
    ).toBe("CHAMPION");
  });

  it("ranks 2-4 son CONTINENTAL_DIRECT con continente='Europa'", () => {
    for (let r = 2; r <= 4; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: laLigaSpots, isTopDivision, hasRelegationZone, continent }),
      ).toBe("CONTINENTAL_DIRECT");
    }
  });

  it("rank 5 es SECONDARY_DIRECT con continente='Europa'", () => {
    expect(
      getZoneForRank({ rank: 5, totalTeams, format, spots: laLigaSpots, isTopDivision, hasRelegationZone, continent }),
    ).toBe("SECONDARY_DIRECT");
  });

  it("rank 6 es CONFERENCE_DIRECT con continente='Europa'", () => {
    expect(
      getZoneForRank({ rank: 6, totalTeams, format, spots: laLigaSpots, isTopDivision, hasRelegationZone, continent }),
    ).toBe("CONFERENCE_DIRECT");
  });
});

describe("getZoneForRank - CONMEBOL con continente='Sudamérica'", () => {
  const format = getLeagueFormatSpec("353")!;
  const totalTeams = 30;
  const isTopDivision = true;
  const hasRelegationZone = true;
  const continent = "Sudamérica";
  const argSpots: ContinentSpots = {
    championsDirect: 0,
    championsQualifying: 0,
    championsPlayoffSlots: 0,
    europa: 0,
    conference: 0,
    libertadoresDirect: 0,
    libertadoresQualifying: 6,
    sudamericana: 6,
    extraFromSudamericanaWinner: true,
    usesReclasiTable: false,
  };

  it("rank 1 es CHAMPION", () => {
    expect(
      getZoneForRank({ rank: 1, totalTeams, format, spots: argSpots, isTopDivision, hasRelegationZone, continent }),
    ).toBe("CHAMPION");
  });

  it("ranks 2-7 son CONTINENTAL_QUALIFYING (Libertadores vía clasificación)", () => {
    for (let r = 2; r <= 7; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: argSpots, isTopDivision, hasRelegationZone, continent }),
      ).toBe("CONTINENTAL_QUALIFYING");
    }
  });

  it("ranks 8-13 son SECONDARY_DIRECT (Sudamericana)", () => {
    for (let r = 8; r <= 13; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: argSpots, isTopDivision, hasRelegationZone, continent }),
      ).toBe("SECONDARY_DIRECT");
    }
  });
});

describe("getZoneForRank - UEFA Bloque D sin playoff (Azerbaiyán)", () => {
  const format = getLeagueFormatSpec("2244")!;
  const totalTeams = 10;
  const bloqueD: ContinentSpots = {
    championsDirect: 0,
    championsPlayoffSlots: 0,
    championsQualifying: 1,
    europa: 1,
    conference: 1,
    libertadoresDirect: 0,
    libertadoresQualifying: 0,
    sudamericana: 0,
    extraFromSudamericanaWinner: false,
    usesReclasiTable: false,
  };
  const isTopDivision = true;
  const hasRelegationZone = false;
  const continent = "Europe";

  it("rank 1 es CHAMPION", () => {
    expect(
      getZoneForRank({ rank: 1, totalTeams, format, spots: bloqueD, isTopDivision, hasRelegationZone, continent }),
    ).toBe("CHAMPION");
  });

  it("rank 2 es CONTINENTAL_QUALIFYING (Champions clasificación)", () => {
    expect(
      getZoneForRank({ rank: 2, totalTeams, format, spots: bloqueD, isTopDivision, hasRelegationZone, continent }),
    ).toBe("CONTINENTAL_QUALIFYING");
  });

  it("rank 3 es SECONDARY_DIRECT (Europa)", () => {
    expect(
      getZoneForRank({ rank: 3, totalTeams, format, spots: bloqueD, isTopDivision, hasRelegationZone, continent }),
    ).toBe("SECONDARY_DIRECT");
  });

  it("rank 4 es CONFERENCE_DIRECT", () => {
    expect(
      getZoneForRank({ rank: 4, totalTeams, format, spots: bloqueD, isTopDivision, hasRelegationZone, continent }),
    ).toBe("CONFERENCE_DIRECT");
  });
});

describe("getZoneForRank - UEFA Bloque C con 1 playoff slot (Eredivisie)", () => {
  const format = getLeagueFormatSpec("10")!;
  const totalTeams = 18;
  const bloqueC: ContinentSpots = {
    championsDirect: 0,
    championsPlayoffSlots: 1,
    championsQualifying: 0,
    europa: 1,
    conference: 1,
    libertadoresDirect: 0,
    libertadoresQualifying: 0,
    sudamericana: 0,
    extraFromSudamericanaWinner: false,
    usesReclasiTable: false,
  };
  const isTopDivision = true;
  const hasRelegationZone = true;
  const continent = "Europe";

  it("rank 1 es CHAMPION", () => {
    expect(
      getZoneForRank({ rank: 1, totalTeams, format, spots: bloqueC, isTopDivision, hasRelegationZone, continent }),
    ).toBe("CHAMPION");
  });

  it("rank 2 es CONTINENTAL_PLAYOFF (Champions ronda previa, sub-campeón)", () => {
    expect(
      getZoneForRank({ rank: 2, totalTeams, format, spots: bloqueC, isTopDivision, hasRelegationZone, continent }),
    ).toBe("CONTINENTAL_PLAYOFF");
  });

  it("rank 3 es SECONDARY_DIRECT (Europa)", () => {
    expect(
      getZoneForRank({ rank: 3, totalTeams, format, spots: bloqueC, isTopDivision, hasRelegationZone, continent }),
    ).toBe("SECONDARY_DIRECT");
  });

  it("rank 4 es CONFERENCE_DIRECT", () => {
    expect(
      getZoneForRank({ rank: 4, totalTeams, format, spots: bloqueC, isTopDivision, hasRelegationZone, continent }),
    ).toBe("CONFERENCE_DIRECT");
  });
});

describe("getZoneForRank - Argentina con cupos 9 Libertadores + 12 Sudamericana", () => {
  const format = getLeagueFormatSpec("353")!;
  const totalTeams = 30;
  const isTopDivision = true;
  const hasRelegationZone = true;
  const continent = "Sudamérica";
  const argSpotsNew: ContinentSpots = {
    championsDirect: 0,
    championsQualifying: 0,
    championsPlayoffSlots: 0,
    europa: 0,
    conference: 0,
    libertadoresDirect: 0,
    libertadoresQualifying: 9,
    sudamericana: 12,
    extraFromSudamericanaWinner: false,
    usesReclasiTable: false,
  };

  it("rank 1 es CHAMPION (con badge Libertadores por ser top CONMEBOL)", () => {
    expect(
      getZoneForRank({ rank: 1, totalTeams, format, spots: argSpotsNew, isTopDivision, hasRelegationZone, continent }),
    ).toBe("CHAMPION");
  });

  it("ranks 2-10 son CONTINENTAL_QUALIFYING (Libertadores clasificación)", () => {
    for (let r = 2; r <= 10; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: argSpotsNew, isTopDivision, hasRelegationZone, continent }),
      ).toBe("CONTINENTAL_QUALIFYING");
    }
  });

  it("ranks 11-22 son SECONDARY_DIRECT (Sudamericana)", () => {
    for (let r = 11; r <= 22; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: argSpotsNew, isTopDivision, hasRelegationZone, continent }),
      ).toBe("SECONDARY_DIRECT");
    }
  });

  it("ranks 23-30 son MID_TABLE (sin plaza continental)", () => {
    for (let r = 23; r <= 30; r++) {
      expect(
        getZoneForRank({ rank: r, totalTeams, format, spots: argSpotsNew, isTopDivision, hasRelegationZone, continent }),
      ).toBe("MID_TABLE");
    }
  });
});
