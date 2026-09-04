# Motor de Avance Temporal y Sincronización de Calendario

## Componentes

```
┌────────────────────────────────────────────────────────────────┐
│  src/domain/calendar/                                          │
│    utcDate.ts                    Helpers UTC puros             │
│    calculateMaxAllowedDatePure.ts Cap puro (listas)            │
│    calculateMaxAllowedDate.ts     Cap con Prisma                │
│    canUserAdvanceToDate.ts        Verificación de avance        │
├────────────────────────────────────────────────────────────────┤
│  src/lib/calendar/                                             │
│    calendarDb.ts                  withSerializableTransaction  │
│    seedTransferWindows.ts         Materializa ventanas          │
│    advanceService.ts              advanceUserToDate             │
│    seasonTransitionService.ts     Pipeline 30 jun → 5 jul       │
├────────────────────────────────────────────────────────────────┤
│  src/app/api/                                                  │
│    calendar/advance/              POST  refactorizado           │
│    calendar/max-allowed/          GET                          │
│    onboarding/join-team/          POST                         │
│    cron/season-transition/        POST/GET  cron               │
│    admin/seasons/[id]/transition/ POST  manual admin           │
└────────────────────────────────────────────────────────────────┘
```

## Esquema de datos (Prisma)

- `Season`: fechas canónicas inmutables, status.
- `TransferWindow`: N por Season, fechas inmutables, status mutable.
- `TeamCalendarState`: 1 por (team, season), `currentDate`, `maxAllowedDate`, `isLocked`, `lockReason`, `lockMetadata`, `version`.
- `CareerGroupClock`: reloj global de sincronización, `pendingSyncWindowId`.
- `TournamentStage`: nuevos flags `isGroupPhase`, `isKnockout`, `requiresAllGroupMatchesComplete`.

## Reglas de avance

1. `currentDate` no puede superar `maxAllowedDate`.
2. `maxAllowedDate` = min(
   `nextPendingMatch.scheduledAt` (PvP añade opponent),
   `nextTransferWindowOpensAt - 1d` (fuera de mercado),
   `season.endDate`,
   `pendingTournamentMinDate - 1d` (fase pendiente)
   )
3. `canAdvance` ⟺ `targetDate <= maxAllowedDate`.
4. Transición de temporada: lock el 30 jun, reset entre 1-4 jul, open el 5 jul.
5. Onboarding: solo con `TransferWindow.status = OPEN && opensOnboarding = true`.

## Concurrencia

- Toda mutación pasa por `withSerializableTransaction` + `SELECT … FOR UPDATE`.
- `withTeamCalendarLock` blinda el `TeamCalendarState` antes de mutar.
- `withMatchAndTeamsLock` blinda el `Match` y ambos `TeamCalendarState`.
- Doble verificación: `version` incrementable en `TeamCalendarState`.

## Tests

- `src/domain/calendar/__tests__/utcDate.test.ts` (7 casos)
- `src/domain/calendar/__tests__/calculateMaxAllowedDate.test.ts` (7 casos)
- `src/domain/calendar/__tests__/canUserAdvanceToDate.test.ts` (4 smoke)

## Migración

Tras hacer `prisma generate` se debe crear la migración en la base de datos:

```
npx prisma migrate dev --name add_calendar_engine
```

Generará el SQL con los nuevos modelos `TransferWindow`, `TeamCalendarState`, `CareerGroupClock`, el enum `TransferWindowStatus` y los flags de `TournamentStage`.
