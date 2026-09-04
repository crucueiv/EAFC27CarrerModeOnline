import Image from "next/image";
import {
  getLeagueBandClasses,
  isAnnualTableLeague,
  type CompetitionLeague,
  type CompetitionBand,
} from "@/lib/competitions";
import { getZoneStyle, getBadgeForZone } from "@/lib/competitions/zones";

export default function StandingsTable({
  league,
  highlightTeamId,
  maxHeight = "420px",
  showHeader = true,
}: {
  league: CompetitionLeague;
  highlightTeamId?: string;
  maxHeight?: string;
  showHeader?: boolean;
}) {
  if (league.teams.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 text-center text-sm text-[var(--theme-muted)]">
        No hay equipos en esta liga.
      </div>
    );
  }

  const split = league.format?.splitConfig ?? null;
  const upperStyle = getZoneStyle("SPLIT_UPPER", league.continent);
  const lowerStyle = getZoneStyle("SPLIT_LOWER", league.continent);

  return (
    <div
      className="overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] shadow-sm"
    >
      {showHeader && (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--theme-border)] bg-[var(--theme-background)] px-4 py-3">
          <div className="flex items-center gap-3">
            {league.imageUrl && (
              <div className="relative h-8 w-8 overflow-hidden rounded-md bg-white ring-1 ring-[var(--theme-border)]">
                <Image src={league.imageUrl} alt={league.name} fill unoptimized className="object-contain" sizes="32px" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-[var(--theme-foreground)]">{league.name}</h3>
              <p className="text-xs text-[var(--theme-muted)]">
                {league.country} · {league.continent} · {league.teams.length} equipos
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto" style={{ maxHeight }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--theme-background)] text-xs uppercase tracking-wider text-[var(--theme-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Equipo</th>
              <th className="px-2 py-2 text-center" title="Competición continental">Cont.</th>
              <th className="px-2 py-2 text-center" title="Partidos jugados">PJ</th>
              <th className="px-2 py-2 text-center" title="Victorias">G</th>
              <th className="px-2 py-2 text-center" title="Empates">E</th>
              <th className="px-2 py-2 text-center" title="Derrotas">P</th>
              <th className="px-2 py-2 text-center" title="Goles a favor">GF</th>
              <th className="px-2 py-2 text-center" title="Goles en contra">GC</th>
              <th className="px-2 py-2 text-center" title="Diferencia de goles">DG</th>
              <th className="px-3 py-2 text-center font-bold" title="Puntos">Pts</th>
            </tr>
          </thead>
          <tbody>
            {league.teams.map((team) => {
              const band = getLeagueBandClasses(team.band as CompetitionBand, league.continent);
              const isHighlighted = team.teamId === highlightTeamId;
              const inSplit = team.group !== null;
              const splitStyle = team.group === "UPPER" ? upperStyle : team.group === "LOWER" ? lowerStyle : null;
              const groupPillStyle = splitStyle?.tailwind.pill ?? "";
              const groupLabel = team.group === "UPPER" ? split?.upperGroupName : team.group === "LOWER" ? split?.lowerGroupName : null;
              const groupBorderClass = splitStyle?.tailwind.border ?? "";
              const badge = getBadgeForZone(team.band as CompetitionBand, league.continent, league.isTopDivision);
              const showAnnualPills = isAnnualTableLeague(league.format) && team.annualChampionSource;
              return (
                <tr
                  key={team.teamId}
                  className={`${band.row} ${isHighlighted ? "ring-1 ring-inset ring-[var(--theme-accent)]" : ""} border-b border-[var(--theme-border)] last:border-0`}
                >
                  <td className="px-3 py-2 align-middle">
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-right text-sm font-bold text-[var(--theme-foreground)]">{team.rank}</span>
                      <span className={`h-1.5 w-1.5 rounded-full ${band.accent}`} />
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <div className="flex items-center gap-2">
                      {team.imageUrl ? (
                        <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-[var(--theme-border)]">
                          <Image src={team.imageUrl} alt={team.teamName} fill unoptimized className="object-contain" sizes="24px" />
                        </div>
                      ) : (
                        <div className="h-6 w-6 shrink-0 rounded-full bg-[var(--theme-background)]" />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 truncate font-semibold text-[var(--theme-foreground)]">
                          <span className="truncate">{team.teamName}</span>
                          {isHighlighted && (
                            <span className="rounded-full bg-[var(--theme-accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--theme-accent)]">
                              Tu equipo
                            </span>
                          )}
                          {showAnnualPills && team.annualChampionSource === "APERTURA" && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 ring-1 ring-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-500/40">
                              Campeón Apertura
                            </span>
                          )}
                          {showAnnualPills && team.annualChampionSource === "CLAUSURA" && (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-800 ring-1 ring-rose-300 dark:bg-rose-500/20 dark:text-rose-200 dark:ring-rose-500/40">
                              Campeón Clausura
                            </span>
                          )}
                          {showAnnualPills && team.annualChampionSource === "ANUAL" && (
                            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold uppercase text-yellow-800 ring-1 ring-yellow-400 dark:bg-yellow-500/20 dark:text-yellow-100 dark:ring-yellow-500/40">
                              Campeón Anual
                            </span>
                          )}
                          {inSplit && groupLabel && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${groupPillStyle} ${groupBorderClass} border`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                              {groupLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 align-middle">
                    {badge ? (
                      <div className="flex items-center justify-center" title={badge.alt}>
                        <Image
                          src={badge.url}
                          alt={badge.alt}
                          width={22}
                          height={22}
                          unoptimized
                          className="h-[22px] w-[22px] object-contain"
                        />
                      </div>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-center text-[var(--theme-foreground)]">{team.played}</td>
                  <td className="px-2 py-2 text-center text-[var(--theme-foreground)]">{team.wins}</td>
                  <td className="px-2 py-2 text-center text-[var(--theme-foreground)]">{team.draws}</td>
                  <td className="px-2 py-2 text-center text-[var(--theme-foreground)]">{team.losses}</td>
                  <td className="px-2 py-2 text-center text-[var(--theme-foreground)]">{team.goalsFor}</td>
                  <td className="px-2 py-2 text-center text-[var(--theme-foreground)]">{team.goalsAgainst}</td>
                  <td className="px-2 py-2 text-center font-semibold text-[var(--theme-foreground)]">
                    {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                  </td>
                  <td className="px-3 py-2 text-center text-base font-black text-[var(--theme-foreground)]">{team.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
