# CRON — Transición de Temporada

## Endpoint

`POST /api/cron/season-transition?careerGroupId=<id>`

- Header `Authorization: Bearer ${CRON_SECRET}` (variable de entorno).
- Idempotente: puede ejecutarse múltiples veces sin efectos colaterales.

## Programación recomendada

- **Frecuencia**: cada 1 hora.
- **Razón**: la transición depende de la fecha real; una vez que `now >= 5 jul`, el primer cron del día la ejecuta. La idempotencia garantiza seguridad al aumentar la frecuencia.
- **Plataformas**:
  - **Vercel Cron**: `vercel.json` con `crons: [{ path: "/api/cron/season-transition", schedule: "0 * * * *" }]`.
  - **GitHub Actions**: `schedule: cron: "0 * * * *"` → `curl -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" https://<host>/api/cron/season-transition?careerGroupId=...`.

## Variables de entorno

- `CRON_SECRET`: token bearer. Si está vacío en desarrollo, el endpoint es accesible sin header (solo `NODE_ENV !== "production"`).

## Lazy fallback

`advanceUserToDate` no ejecuta la transición automáticamente. Si un usuario intenta avanzar el 6 de julio y el cron no se ha ejecutado aún, `canUserAdvanceToDate` detecta la fase de transición (`now` ∈ [30 jun, 5 jul)) y devuelve `SEASON_END_LOCK`. Una vez el cron corre, la nueva temporada queda activa.
