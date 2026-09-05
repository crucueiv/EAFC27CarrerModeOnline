import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  resolveUserClubTeamId,
  isPlayerOnUserTeam,
  assertNotOwnPlayer,
  isHumanManagedTeam,
} from "@/lib/transfers/ownership";

function makeMockPrisma(impl: {
  managedTeam?: { id: string } | null;
  userClubTeamId?: string | null;
  activeRoster?: { id: string } | null;
  loanedPlayer?: { id: string } | null;
}): PrismaClient {
  const team = {
    findFirst: vi.fn().mockResolvedValue(impl.managedTeam ?? null),
    findUnique: vi.fn().mockResolvedValue(impl.managedTeam ?? null),
  };
  const user = {
    findUnique: vi.fn().mockResolvedValue(
      impl.userClubTeamId !== undefined ? { clubTeamId: impl.userClubTeamId } : null,
    ),
  };
  const roster = {
    findFirst: vi.fn().mockResolvedValue(impl.activeRoster ?? null),
  };
  const player = {
    findFirst: vi.fn().mockResolvedValue(impl.loanedPlayer ?? null),
  };
  return { team, user, roster, player } as unknown as PrismaClient;
}

describe("resolveUserClubTeamId", () => {
  it("prioriza Team.managerId sobre User.clubTeamId", async () => {
    const prisma = makeMockPrisma({
      managedTeam: { id: "team-managed" },
      userClubTeamId: "team-user",
    });
    const result = await resolveUserClubTeamId("u1", prisma);
    expect(result).toBe("team-managed");
  });

  it("cae a User.clubTeamId si no hay equipo gestionado", async () => {
    const prisma = makeMockPrisma({
      managedTeam: null,
      userClubTeamId: "team-user",
    });
    const result = await resolveUserClubTeamId("u1", prisma);
    expect(result).toBe("team-user");
  });

  it("devuelve null si no hay equipo", async () => {
    const prisma = makeMockPrisma({ managedTeam: null, userClubTeamId: null });
    const result = await resolveUserClubTeamId("u1", prisma);
    expect(result).toBeNull();
  });
});

describe("isPlayerOnUserTeam", () => {
  it("devuelve isOwn=true si hay roster activo en el equipo del usuario", async () => {
    const prisma = makeMockPrisma({
      managedTeam: { id: "team-mine" },
      activeRoster: { id: "r1" },
    });
    const r = await isPlayerOnUserTeam({ playerId: "p1", userId: "u1", prismaClient: prisma });
    expect(r).toEqual({ isOwn: true, teamId: "team-mine", reason: "ROSTER" });
  });

  it("devuelve isOwn=true si el jugador está cedido a mi club", async () => {
    const prisma = makeMockPrisma({
      managedTeam: { id: "team-mine" },
      activeRoster: null,
      loanedPlayer: { id: "p1" },
    });
    const r = await isPlayerOnUserTeam({ playerId: "p1", userId: "u1", prismaClient: prisma });
    expect(r).toEqual({ isOwn: true, teamId: "team-mine", reason: "LOAN" });
  });

  it("devuelve isOwn=false si el jugador está en otro club", async () => {
    const prisma = makeMockPrisma({
      managedTeam: { id: "team-mine" },
      activeRoster: null,
      loanedPlayer: null,
    });
    const r = await isPlayerOnUserTeam({ playerId: "p1", userId: "u1", prismaClient: prisma });
    expect(r).toEqual({ isOwn: false });
  });
});

describe("assertNotOwnPlayer", () => {
  it("devuelve ok=true si el jugador no es propio", async () => {
    const prisma = makeMockPrisma({
      managedTeam: { id: "team-mine" },
      activeRoster: null,
      loanedPlayer: null,
    });
    const r = await assertNotOwnPlayer({ playerId: "p1", userId: "u1", prismaClient: prisma });
    expect(r.ok).toBe(true);
  });

  it("devuelve ok=false con reason=PLAYER_ALREADY_OWNED si es propio", async () => {
    const prisma = makeMockPrisma({
      managedTeam: { id: "team-mine" },
      activeRoster: { id: "r1" },
    });
    const r = await assertNotOwnPlayer({ playerId: "p1", userId: "u1", prismaClient: prisma });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("PLAYER_ALREADY_OWNED");
      expect(r.ownership).toBe("ROSTER");
    }
  });
});

describe("isHumanManagedTeam", () => {
  it("true si managerId es string no vacío", () => {
    expect(isHumanManagedTeam({ managerId: "user-abc" })).toBe(true);
  });
  it("false si managerId es null", () => {
    expect(isHumanManagedTeam({ managerId: null })).toBe(false);
  });
  it("false si managerId es string vacío", () => {
    expect(isHumanManagedTeam({ managerId: "" })).toBe(false);
  });
  it("false si team es null", () => {
    expect(isHumanManagedTeam(null)).toBe(false);
  });
  it("false si team es undefined", () => {
    expect(isHumanManagedTeam(undefined)).toBe(false);
  });
});
