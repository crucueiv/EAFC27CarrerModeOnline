# EAFC27 Career Mode Online

Aplicación web multijugador de **Modo Carrera Manager Online** construida con Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma ORM y PostgreSQL (Neon). Incluye autenticación Google OAuth, onboarding completo, mercado de fichajes, plantilla, calendario de partidos, sistema de correos, gestión de entrenadores vía API-Sports, préstamos, alineaciones, competiciones internacionales y panel de administración.

---

## 🏗️ Arquitectura

- **`src/app/`** — Páginas del App Router y Route Handlers:
  - Onboarding: perfil (/onboarding/profile), selección de liga (/onboarding/league-selection), selección de equipo (/onboarding/team-selection), join-team (api/onboarding/join-team)
  - Dashboard (/dashboard), Plantilla (/squad), Transferencias (/transfers), Calendario (/calendar), Partidos (/match/[id] y /match/[id]/lineup), Admin (/admin), Alineaciones (/lineup), Préstamos (/transfers/loans), Competencias (/competitions)
  - API: equipos, ligas, correos, traspasos, préstamos, alineaciones, calendario, administración, cron, nacional, competiciones, jugadores, managers, auth
- **`src/domain/`** — Lógica pura sin dependencias:
  - `simulateMatch.ts`: Motor de simulación de partidos
  - `canUserAdvance.ts`: Verificador de avance de jornada
- **`src/lib/`** — Utilidades y servicios:
  - `auth.ts`: Autenticación NextAuth + Google OAuth + JWT
  - `transfers/search.ts`: Búsqueda server-side paginada en Prisma
  - `transfers/pricingEngine.ts`: Motor financiero (valor, cláusula, sueldo)
  - `managers/getOrFetchManager.ts`: Gestión de entrenadores (DB → API-Sports → fallback genérico)
  - `emails/templates.ts`: Plantillas de correos de negociación y cláusula
  - `inbox/inboxStore.ts`: Cliente async para bandeja de entrada
  - `ratings/eaClient.ts`: Integración con la API de EA Sports FC
  - `catalog/importEaCatalog.ts`: Importación de catálogo con mapeo apiSportsId
- **`src/components/`** — Componentes UI:
  - `transfers/PlayerCardRow.tsx`, `PlayerDetailModal.tsx`, `ClubNegotiationModal.tsx`, `TransferFilters.tsx`
  - `inbox/InboxModal.tsx`
  - `nav/HeaderNav.tsx`
- **`prisma/schema.prisma`** — Modelo de datos: Users, Leagues, Teams, Players, Rosters, Transfers, Matches, EmailMessages, Managers, etc.

---

## ⚡ Instalación

1. **Requisitos**: Node.js 20+
2. **Base de Datos (Neon)**: Copia `.env.example` a `.env.local` con `DATABASE_URL` y `DATABASE_URL_UNPOOLED`
3. **Variables de entorno adicionales**:
   - `API_SPORTS_KEY`: Clave de API-Football para entrenadores
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: OAuth de Google
   - `NEXTAUTH_SECRET` / `NEXTAUTH_URL`: NextAuth.js

```bash
npm install
npx prisma generate
npx prisma db push
npm run db:seed          # Importa catálogo EA Sports FC
npm run typecheck
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run typecheck` | Verificación de tipos TypeScript |
| `npm run db:seed` | Importa catálogo EA en Neon |
| `npm run db:backfill-search` | Normaliza nombres para búsquedas |
| `npm run db:remove-female` | Elimina registros de fútbol femenino |
| `npm run db:recalculate-roles` | Recalcula roles de plantilla |

---

## 📋 Funcionalidades

### 🔐 Autenticación y Onboarding
- Login con Google OAuth (NextAuth.js + JWT)
- Flujo de onboarding: crear perfil → elegir liga → elegir equipo
- Guard JWT actualizado con `useSession().update()` al seleccionar equipo
- Redirecciones automáticas según estado del usuario (middleware)

### 📊 Dashboard
- Cabecera con logo del club (easysbc), logo de la liga (easysbc) y avatar del usuario
- Tarjetas: jugadores, media del equipo, presupuesto
- Top 5 jugadores con foto (Prisma `avatarUrl` → fallback EA drop-api), posición e insignia de media circular
- Últimos 5 partidos con indicador Victoria/Empate/Derrota
- Posición en liga (listado de equipos)

### 👥 Plantilla
- Jugadores reales del club agrupados por posición (Portero, Defensa, Centrocampista, Ataque)
- Posiciones en español (`POR`, `DFC`, `MC`, `DC`, etc.)
- Rol asignado (Clave, Importante, Rotación)

### ⚽ Mercado de Fichajes
- Búsqueda server-side paginada con filtros por nombre, posición, rango de media, stats, precio, liga, equipo, nacionalidad y agentes libres
- Solo muestra jugadores masculinos (filtro eliminado de la UI)
- Ficha detallada del jugador con avatar, stats, ojeo scouting, valor de mercado
- **Compra por cláusula de rescisión**: descuenta presupuesto, crea registro `Transfer`, envía email de negociación contractual
- **Negociación con club**: modal tipo llamada telefónica con sistema de tensión, ofertas/contrarofertas, acuerdo alcanzado → crea `Transfer` + email de negociación
- Agentes libres con filtro dedicado e icono especial

### 📬 Sistema de Correos
- Bandeja de entrada con lista de emails, indicador de no leídos, marcado de leídos
- Badge de notificación en el header con polling cada 15 segundos
- Tipos: `RELEASE_CLAUSE` (cláusula), `CLUB_NEGOTIATION` (negociación)
- Plantillas con texto profesional en español (sin markdown `**`)
- Email generado automáticamente al pagar cláusula o completar traspaso

### 🧑‍🏫 Sistema de Entrenadores
- `getOrFetchManager`: DB → API-Sports → fallback genérico guardado en DB
- Selección del entrenador actual por fecha de inicio más reciente
- Fallback con nombre determinista (30 nombres + 30 apellidos españoles) y avatar genérico
- Cache en DB: una vez guardado, nunca vuelve a llamar a la API

### 🔄 Importación de Datos
- Catálogo EA Sports FC con importación paginada
- Mapeo `eaId → apiSportsId` desde JSON de Cloudinary (672 equipos)
- Filtrado secundario de ligas femeninas en la API de ligas
- Roles calculados automáticamente (85+ Clave, 77-84 Importante, <77 Rotación)
- Formaciones iniciales (db:seed-formations) y colores (db:import-colors)
- Nacionales (db:seed-national-teams)

### 🤝 Sistema de Préstamos (Loans)
- Propuesta de préstamo (`/loans/offer`): jugador, club objetivo, duración, opción de compra
- Respuesta (`/loans/respond`): aceptación, rechazo o contraoferta
- Activación (`/loans/activation`) y expiración (`/loans/expire`)
- Email de préstamo (`/loans/email`) y respuesta a email (`/loans/email/respond`, `/loans/email/deliver`)
- Compra de opción (`/loans/buy-option`): ejercicio de cláusula de opción de compra
- Lista de préstamos activos (`/loans/active`) y forzar finalización (`/admin/loans/force-finish`)
- Negociación de préstamo con motor de tensión (`loanNegotiationEngine`)

### 📅 Calendario y Temporadas
- Calendario completo por jornada con fechas de apertura y cierre (`/calendar/advance`, `api/calendar/max-allowed`)
- Avance manual (admin) con verificación `canUserAdvance`
- Transición de temporada (`/api/cron/season-transition`) y cierre (`season-closure`)
- Grupos de carrera (`careerGroup`) para ligas con formato de grupos (champion, continental, relegación)
- Fixtures deterministas (`fixture-generator`) por `(careerGroupId + seasonId)` con semilla fija
- Promoción y relegación (`promotion-service`, `relegation-service`) según formato de liga
- Splits especiales (`split-service`): Bélgica (`Math.ceil/2`), K League (acumulativo), Austria (`*0.5`)
- Zonas de campeonato (`zones`): Champion (#FFD700), Continental Direct/Qualifying, Secondary, Conference, Playoff, Direct Promotion/Relegation
- Copas nacionales (`/api/admin/domestic-cup/match/[id]`) con bracket completo (10 copas)

### 🏆 Competencias Internacionales
- Formato de 48 ligas (`catalog.ts`) con `kind`: `SINGLE_TABLE`, `SINGLE_TABLE_PLAYOFF`, `SPLIT_GROUPS`, `TWO_SHORT_TOURNAMENTS`, `CONFERENCE_PLAYOFF`
- Cupos por coeficiente UEFA (`coefficients/`, `resolveContinentSpots.ts`) y Conmebol (`conmebol-defaults.ts`)
- Torneos continentales: Champions League, Europa League, Conference League, Sudamericana, Libertadores (`continental-tournaments.ts`, archivos JSON participantes)
- Argentina: zonas A/B + clásicos interzonales, Tabla Anual, cupo extra si ganó Sudamericana previa (`argentina-*.ts`)
- Colombia: dos torneos cortos + Tabla de Reclasificación (`colombia-reclasi.ts`)
- Calendario comprimido (MLS) con `calendarSpanWeeks` y `matchweekIntervalDays`

### 🛡️ Admin y Gestión
- Panel de administración (`/admin`) con gestión de temporadas, reseteo (`/api/admin/reset-season`), cierre (`/api/admin/seasons/[id]/close`), transición (`/api/admin/seasons/[id]/transition`)
- Actualización de presupuesto (`/api/admin/update-budget`), puntos (`/api/admin/update-points-config`), calendarios (`/api/admin/calendars`)
- Procesamiento de transfers pendientes (`/api/admin/process-pending-transfers`), negociación (`/api/admin/negotiations`) y cancelación (`/api/admin/negotiations/cancel`)
- Gestión de ventanas de transferencia (`seedTransferWindows`)
- Estado de la temporada (`/api/admin/state`), eventos (`/api/admin/events`), equipos (`/api/admin/teams`), usuarios (`/api/admin/users`, `/api/admin/users/lookup`)
- Ratings y debug (`/api/admin/ratings`, `/api/debug/standings/[eaId]`, `/api/debug/clear-continent-cache`)
- Fuerza de finalización de transferencias (`force-finish-transfer`), préstamos (`force-finish`), préstamos expirados (`loans/expire`)

### ⚽ Simulación de Partidos
- API de simulación (`/api/matches/simulate`) con motor determinista
- Detalle de partido (`/match/[id]`) con alineación (`/match/[id]/lineup`)
- Modo de partido (`match-modes.ts`) y cálculo de resultados por posición

### 🌍 Nacionales y Temas
- Equipos nacionales (`/api/national-teams`) con clasificaciones continentales
- Temas de club (`clubTheme.ts`) y colores de ligas (`db:import-colors`)

---

## 📁 Árbol de Directorios (simplificado)

```text
prisma/
  schema.prisma
  seed.ts
scripts/
  backfillSearchNames.ts
  recalculateRosterRoles.ts
  removeFemalePlayers.ts
src/
  app/
    onboarding/          # Perfil, selección de liga/equipo
    dashboard/page.tsx   # Dashboard principal
    squad/page.tsx       # Plantilla agrupada por posición
    transfers/page.tsx   # Mercado de fichajes
    calendar/page.tsx    # Calendario de partidos
    admin/               # Panel de administración
    lineup/page.tsx      # Alineaciones
    transfers/loans/page.tsx # Préstamos
    competitions/page.tsx # Competencias
    match/[id]/page.tsx  # Detalle de partido
    match/[id]/lineup/page.tsx # Alineación del partido
    api/
      leagues/           # API de ligas (con filtro femenino)
      teams/             # API de equipos (con getOrFetchManager)
      emails/            # API de correos (GET/PATCH)
      transfers/
        search/          # Búsqueda de jugadores
        buyout/          # Compra por cláusula
        complete/        # Completar traspaso negociado
      onboarding/
        select-team/     # Selección de equipo
        profile/         # Crear perfil
  components/
    transfers/           # PlayerCardRow, PlayerDetailModal, ClubNegotiationModal, TransferFilters
    inbox/InboxModal.tsx
    nav/HeaderNav.tsx
  lib/
    auth.ts              # NextAuth + Google OAuth + JWT
    prisma.ts
    managers/getOrFetchManager.ts
    emails/templates.ts
    inbox/inboxStore.ts
    transfers/search.ts, pricingEngine.ts, negotiationEngine.ts
    ratings/eaClient.ts, easysbcClient.ts, positions.ts
    catalog/importEaCatalog.ts
    constants/position-translation.ts, continents.ts
    demoData.ts
  domain/
    calendar/canUserAdvance.ts
    matches/simulateMatch.ts
```

---

## 🔧 Variables de Entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | URL pooled de Neon |
| `DATABASE_URL_UNPOOLED` | URL directa de Neon |
| `API_SPORTS_KEY` | Clave API-Football para entrenadores |
| `GOOGLE_CLIENT_ID` | Client ID de Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Client Secret de Google OAuth |
| `NEXTAUTH_SECRET` | Secreto de NextAuth.js |
| `NEXTAUTH_URL` | URL base (http://localhost:3000 en dev) |
| `EA_RATINGS_TIMEOUT_MS` | Timeout para la API de EA (default: 8000ms) |
| `EA_IMPORT_MAX_PLAYERS` | Límite de jugadores a importar (default: 1.000.000) |
| `EAFC_DEBUG` | Modo debug de la aplicación (opcional) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Nombre de cloudinary para avatares |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Preset de subida de avatares |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Credenciales de Google Auth |
| `AUTH_SECRET` / `AUTH_TRUST_HOST` | Configuración de autenticación interna |
