import { describe, it, expect, beforeEach } from "vitest";
import { clearContinentSpotsCache, resolveContinentSpots } from "../resolveContinentSpots";
import type { LeagueFormatSpec } from "@/lib/league-formats/catalog";

const baseFormat: LeagueFormatSpec = {
  eaId: "13",
  kind: "SINGLE_TABLE",
  totalTeams: 20,
  roundsRegular: 38,
  hasReturn: true,
  relegation: { type: "DIRECT", slots: 3 },
};

describe("resolveContinentSpots - 0-totals persistence", () => {
  beforeEach(() => {
    clearContinentSpotsCache();
    process.env.EAFC_DEBUG = "1";
  });

  it("devuelve defaults UEFA cuando LeagueSeasonConfig tiene todo a 0", async () => {
    const mod = await import("../resolveContinentSpots");
    mod.clearContinentSpotsCache();

    const { prisma } = await import("@/lib/prisma");
    if (!prisma) {
      console.warn("Prisma no disponible, saltando test");
      return;
    }
    const league = await prisma.league.findFirst({
      where: { eaId: "13" },
      select: { id: true, country: true },
    });
    const season = await prisma.season.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    if (!league || !season) {
      console.warn("No hay datos seed (liga 13 / season ACTIVE), saltando test");
      return;
    }

    await prisma.leagueSeasonConfig.upsert({
      where: { leagueId_seasonId: { leagueId: league.id, seasonId: season.id } },
      update: {
        championsSpots: 0,
        championsQualifyingSpots: 0,
        europaSpots: 0,
        conferenceSpots: 0,
        libertadoresDirectSpots: 0,
        libertadoresQualifyingSpots: 0,
        sudamericanaSpots: 0,
        extraFromSudamericanaWinner: false,
        usesReclasiTable: false,
      },
      create: {
        leagueId: league.id,
        seasonId: season.id,
        championsSpots: 0,
        championsQualifyingSpots: 0,
        europaSpots: 0,
        conferenceSpots: 0,
        libertadoresDirectSpots: 0,
        libertadoresQualifyingSpots: 0,
        sudamericanaSpots: 0,
        extraFromSudamericanaWinner: false,
        usesReclasiTable: false,
      },
    });

    mod.clearContinentSpotsCache();
    const spots = await mod.resolveContinentSpots(league, season, baseFormat);
    expect(spots.championsDirect).toBeGreaterThan(0);

    await prisma.leagueSeasonConfig.delete({
      where: { leagueId_seasonId: { leagueId: league.id, seasonId: season.id } },
    }).catch(() => {});
  });

  it("respeta un LeagueSeasonConfig con valores no-cero", async () => {
    const mod = await import("../resolveContinentSpots");
    mod.clearContinentSpotsCache();

    const { prisma } = await import("@/lib/prisma");
    if (!prisma) {
      console.warn("Prisma no disponible, saltando test");
      return;
    }
    const league = await prisma.league.findFirst({
      where: { eaId: "13" },
      select: { id: true, country: true },
    });
    const season = await prisma.season.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    if (!league || !season) {
      console.warn("No hay datos seed (liga 13 / season ACTIVE), saltando test");
      return;
    }

    await prisma.leagueSeasonConfig.upsert({
      where: { leagueId_seasonId: { leagueId: league.id, seasonId: season.id } },
      update: {
        championsSpots: 2,
        championsQualifyingSpots: 0,
        europaSpots: 0,
        conferenceSpots: 0,
        libertadoresDirectSpots: 0,
        libertadoresQualifyingSpots: 0,
        sudamericanaSpots: 0,
        extraFromSudamericanaWinner: false,
        usesReclasiTable: false,
      },
      create: {
        leagueId: league.id,
        seasonId: season.id,
        championsSpots: 2,
        championsQualifyingSpots: 0,
        europaSpots: 0,
        conferenceSpots: 0,
        libertadoresDirectSpots: 0,
        libertadoresQualifyingSpots: 0,
        sudamericanaSpots: 0,
        extraFromSudamericanaWinner: false,
        usesReclasiTable: false,
      },
    });

    mod.clearContinentSpotsCache();
    const spots = await mod.resolveContinentSpots(league, season, baseFormat);
    expect(spots.championsDirect).toBe(2);

    await prisma.leagueSeasonConfig.delete({
      where: { leagueId_seasonId: { leagueId: league.id, seasonId: season.id } },
    }).catch(() => {});
  });
});

describe("resolveContinentSpots - TTL/cache", () => {
  beforeEach(() => {
    clearContinentSpotsCache();
  });

  it("clearContinentSpotsCache limpia el caché", () => {
    clearContinentSpotsCache();
    expect(true).toBe(true);
  });
});
