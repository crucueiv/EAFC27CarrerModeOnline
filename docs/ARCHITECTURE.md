# Arquitectura de Ligas y Competiciones — EAFC27 Career Mode Online

## Visión general

El sistema de ligas y competiciones se estructura en 3 capas:

```
┌─────────────────────────────────────────────────────────────┐
│  Capa 1: Definición estática del formato de liga           │
│  (catálogo en código TS)                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Capa 2: Configuración por temporada                        │
│  (cupos UEFA/Conmebol por coeficiente de país)              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Capa 3: Estado de la temporada actual                      │
│  (zona de campeonato, playoff, resultados parciales)        │
└─────────────────────────────────────────────────────────────┘
```

## Módulos

### `src/lib/league-formats/catalog.ts`
Catálogo de las 48 ligas del EA FC 27 con su formato. Define:
- `kind`: `SINGLE_TABLE`, `SINGLE_TABLE_PLAYOFF`, `SPLIT_GROUPS`, `TWO_SHORT_TOURNAMENTS`, `CONFERENCE_PLAYOFF`
- `totalTeams`, `roundsRegular`, `hasReturn`
- `promotion`, `relegation`: cupos de ascenso y descenso
- `splitConfig`: configuración del split (Bélgica, K League, etc.)
- `homeAndAwayBonus`: modificadores especiales (Math.ceil/2 en Bélgica, acumulativo en K League)
- `calendarSpanWeeks`, `matchweekIntervalDays`: para calendarios comprimidos tipo MLS
- `higherLeagueEaId`: para pirámides

### `src/lib/competitions/zones.ts`
Las **12 zonas** con sus colores hex según el documento:
- `CHAMPION` (#FFD700)
- `CONTINENTAL_DIRECT` (#0B3D91) / `CONTINENTAL_QUALIFYING` (#4FA8FF)
- `SECONDARY_DIRECT` (#FF7A00) / `SECONDARY_QUALIFYING` (#FFB366)
- `CONFERENCE_DIRECT` (#2E9E44) / `CONFERENCE_QUALIFYING` (#8FD19E)
- `MID_TABLE` (#F2F2F2)
- `PLAYOFF_PROMOTION` (#8E44AD)
- `DIRECT_PROMOTION` (#17A398)
- `PLAYOFF_RELEGATION` (#F2A900, ámbar)
- `RELEGATION_DIRECT` (#D32F2F)

### `src/lib/competitions/getZoneForRank.ts`
Función pura que, dado un rank, formato de liga y cupos continentales, devuelve la zona.

### `src/lib/competitions/fixture-generator.ts`
Generador de calendario round-robin con semilla determinista `hash(careerGroupId + seasonId)`. Garantiza:
- Ida completa antes de vuelta completa
- Calendario reproducible por (career group, temporada)
- Distribución de fechas uniforme o comprimida (MLS)

### `src/lib/coefficients/`
- `uefa-defaults.ts`: bloques A/B/C/D según ranking de coeficiente UEFA
- `conmebol-defaults.ts`: cupos de Libertadores/Sudamericana por país
- `resolveContinentSpots.ts`: cupos por temporada con cache 5min

### `src/lib/competitions/promotion-service.ts` + `relegation-service.ts`
Servicios de evaluación de ascensos y descensos.

### `src/lib/competitions/split-service.ts`
Manejo del split:
- Bélgica: divide puntos entre 2 con `Math.ceil`
- K League: acumula puntos
- Austria: split con multiplicador 0.5

### `src/lib/competitions/argentina-*.ts`
Argentina: zonas A/B + clásico interzonal, Tabla Anual, "Campeón de Liga" honorífico, cupo extra Libertadores si Argentina ganó la Sudamericana previa.

### `src/lib/competitions/colombia-reclasi.ts`
Colombia: dos torneos cortos + Tabla de Reclasificación (suma de fase regular Apertura + Finalización).

### `src/lib/competitions/domestic-cup.ts` + `domestic-cup-catalog.ts`
10 copas nacionales con bracket completo. Admin decide los resultados manualmente.

### `src/lib/competitions/continental-tournaments.ts`
Estructura de UCL, UEL, UECL (Swiss League), Libertadores, Sudamericana (knockout). No se simulan partidos en esta fase.

### `src/lib/matches/match-modes.ts` + `series.ts`
Modos de partido: `CPU_VS_CPU` (auto), `PLAYER_VS_CPU` (player decide), `PLAYER_VS_PLAYER` (ambos confirman). Series best-of-3 / best-of-5.

### `src/lib/competitions/season-closure.ts`
Cerrar temporada: evalúa ascensos, descensos, crea tournaments inter-league para cruces de permanencia.

## Schema Prisma

- `LeagueFormat`: 1:1 con `League` (formato)
- `LeagueSeasonConfig`: cupos continentales por temporada
- `CountryCoefficient`: ranking UEFA por temporada
- `Trophy`: trofeos honoríficos (Campeón de Liga, Supporters' Shield, etc.)
- `Tournament.scope`: `CUP` | `LEAGUE` | `INTER_LEAGUE_PLAYOFF` | `CONTINENTAL` | `DOMESTIC_CUP`
- `TournamentStage.matchFormat`: `SINGLE` | `TWO_LEGGED` | `BEST_OF_3` | `BEST_OF_5`
- `Match.mode`: `CPU_VS_CPU` | `PLAYER_VS_CPU` | `PLAYER_VS_PLAYER`
- `Match.seriesId`/`gameNumber`: para best-of-3
- `DomesticCup` + `DomesticCupWinner`

## Flujo de una temporada

1. **Admin crea temporada** (futuro) o `createSeason()` genera Tournament + Stage + Match con `mode` calculado.
2. **Cada partido tiene un modo** según si los equipos son de players o CPU.
3. **CPU vs CPU** se simula automáticamente al llegar `scheduledAt`.
4. **Player vs CPU/Player** espera input del player.
5. **Cierre de temporada**: admin llama `POST /api/admin/seasons/[id]/close`. Evalúa ascensos, descensos, crea inter-league tournaments.
6. **Torneos continentales**: `createContinentalTournamentWithStages()` crea UCL/UEL/UECL/Lib/Sud con sus stages.

## Tests

92 tests unitarios en `src/lib/competitions/__tests__/` y `src/lib/coefficients/__tests__/`. Cobertura: 50% global (muchos servicios solo corren contra BD real).
